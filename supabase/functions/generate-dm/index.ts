// AI DM generation — server-side proxy so provider API keys never reach the browser.
//
// Deploy: supabase functions deploy generate-dm            (gateway JWT check ON)
// Secrets: CLAUDE_API_KEY (and/or OPENAI_API_KEY, GEMINI_API_KEY)
//
// Auth: the Supabase gateway requires a valid user JWT (deployed WITHOUT
// --no-verify-jwt), and servePost re-verifies it in-function, so only signed-in
// Operators can spend the Owner's AI credits.
//
// POST JSON: { lead, systemPrompt, provider: 'openai'|'claude'|'gemini' }
// → { dm: string, provider: string, used: number, limit: number }
//   a DM that passed the gate (_shared/dm.ts) and is ready to send as it is.
// → { skip: true, reason: string, dm: "", used, limit }
//   this Lead is not someone to write to. Nothing is spent on it. `dm: ""`
//   rides along so a dashboard still on an older bundle reads it as "no DM".
//   502 { error, code: "empty_completion" } when no sendable DM came back even
//   after a second attempt — no quota is spent, and the code tells the client
//   this is about one Lead rather than the whole workspace.
//   402 { error, code: "trial_limit" } when a free-trial account has written
//   its 500 DMs (_shared/trial.ts) — the app sends it to pay in full.
//   503 { error, code: "ai_unavailable" } when the provider account is out of
//   credit or its key is refused (_shared/outage.ts). Nothing is billed, and
//   the cause and its fix are in the function log for the Owner.

import { json, servePost } from "../_shared/http.ts";
import { readTrial, spendTrial, trialLimitResponse } from "../_shared/allowance.ts";
import { trialLeft } from "../_shared/trial.ts";
import {
  complete,
  createAiSessionId,
  createAiTraceId,
  isProvider,
  resolveProvider,
  NO_PROVIDER_ERROR,
} from "../_shared/ai.ts";
import type { Completion } from "../_shared/ai.ts";
import { AI_OUTAGE, AI_OUTAGE_ERROR, AiOutage, outageLog } from "../_shared/outage.ts";
import { cleanCompletion } from "../_shared/completion.ts";
import { withHumanVoice } from "../_shared/voice.ts";
import {
  businessNameIn,
  buildBrief,
  canGive,
  checkDm,
  DM_SCHEMA,
  nothingToRead,
  NOT_AN_ANSWER,
  NOTHING_TO_READ,
  offerIsAboutProfiles,
  pickOpening,
  readDraft,
  retryBrief,
  skipReason,
  withDmContract,
  writesInEnglish,
} from "../_shared/dm.ts";

/** Character ceiling on a DM. The gate's word limit is far below it. */
const DM_LIMIT = 1000;

/**
 * Room for the whole answer: a verdict, a one-line reason, the detail and a DM
 * of at most 25 words come to about 120 tokens. It was 140 for a bare DM.
 */
const ANSWER_TOKENS = 300;

/**
 * The first attempt runs hot so 250 Leads do not get 250 messages with one
 * rhythm: sameness across a batch is the tell, and temperature is the only
 * lever on it. The second attempt is a correction, not a fresh roll, so it
 * runs cooler.
 */
const TEMPERATURE = [0.95, 0.6];

/** Monthly DM-generation allowance. Must match PLAN_LIMITS.maxDMGenerations. */
const MONTHLY_DM_LIMIT = Number(Deno.env.get("MONTHLY_DM_LIMIT")) || 1500;

const monthKey = () => new Date().toISOString().slice(0, 7);

interface Body {
  // deno-lint-ignore no-explicit-any
  lead?: any;
  systemPrompt?: string;
  provider?: string;
}

servePost<Body>("generate-dm", async ({ body, user, sb }) => {
  const { lead, systemPrompt, provider } = body ?? {};
  if (!lead?.handle || !systemPrompt || !isProvider(provider)) {
    return json(400, { error: "missing or invalid fields: lead, systemPrompt, provider" });
  }

  // Quota is checked HERE, not in the browser. It used to be a localStorage
  // counter, so clearing site data reset the Owner's paid allowance.
  const month = monthKey();
  const { data: usage } = await sb
    .from("dm_usage")
    .select("used")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  const used = usage?.used ?? 0;
  if (used >= MONTHLY_DM_LIMIT) {
    return json(429, {
      error: `Monthly DM generation limit reached (${MONTHLY_DM_LIMIT}). Resets on the 1st.`,
      used,
      limit: MONTHLY_DM_LIMIT,
    });
  }

  // A free trial writes at most 500 DMs. Every first DM is written here, so
  // this is also what caps the DMs a trial can send.
  const trial = await readTrial(sb, user.id);
  if (trial.active && trialLeft("dms", trial.dms) === 0) return trialLimitResponse("dms");

  // A Lead the writer passed over, restored by the Operator, is written to
  // whatever its profile holds: their word outranks the writer's.
  const fitConfirmed = lead.fitConfirmed === true;

  /** This Lead gets no DM. Free: nothing was written, so nothing is counted. */
  const skip = (reason: string, ranOn?: string) =>
    json(200, { skip: true, reason, dm: "", provider: ranOn, used, limit: MONTHLY_DM_LIMIT });

  // An emoji for a bio and no sign of a business: there is nothing to write
  // from, and asking a model to try is how "this one is better skipped" came to
  // be typed where a DM goes. Decided before any provider is called.
  if (!fitConfirmed && nothingToRead(lead)) return skip(NOTHING_TO_READ);

  const resolved = resolveProvider(provider);
  if (!resolved) return json(500, { error: NO_PROVIDER_ERROR });

  // A retried DM is still one generation turn. The session hash groups repeated
  // work for this operator/lead without exposing the lead's handle as metadata.
  const aiTrace = {
    distinctId: user.id,
    traceId: createAiTraceId(),
    sessionId: await createAiSessionId("dm", user.id, String(lead.handle)),
    spanName: "generate_dm" as const,
  };

  // The saved prompt gets the humanizer rules unless it already carries them (a
  // hand-edited or older prompt is never rebuilt in the browser), and always
  // gets the answer contract last, where it outranks a stored "your entire
  // response is the DM".
  const system = withDmContract(withHumanVoice(systemPrompt, "dm"));

  const give = canGive(system);
  const brief = buildBrief(
    { ...lead, handle: String(lead.handle), fitConfirmed },
    pickOpening(String(lead.handle), give),
  );
  const gate = {
    handle: String(lead.handle),
    businessName: businessNameIn(system),
    offerIsAboutProfiles: offerIsAboutProfiles(system),
    english: writesInEnglish(system),
    canGive: give,
  };

  // One attempt, then one correction. A message reaches the Lead only by
  // passing the gate: the model's verdict and its reasons have fields of their
  // own, and text that is not a finished DM is refused rather than repaired.
  // The second attempt is told exactly what was wrong with the first, which
  // fixes a 31-word DM far more reliably than rolling again would.
  let dm = "";
  let raw = "";
  let refused = "";
  let problems: string[] = [];

  for (let attempt = 0; attempt < TEMPERATURE.length && !dm; attempt++) {
    let completion: Completion;
    try {
      completion = await complete({
        provider: resolved.provider,
        key: resolved.key,
        system,
        user: attempt === 0 ? brief : retryBrief(brief, refused, problems),
        maxTokens: ANSWER_TOKENS,
        temperature: TEMPERATURE[attempt],
        aiTrace,
        jsonSchema: DM_SCHEMA,
      });
    } catch (e) {
      // Out of credit, or the key refused: every Lead after this one fails the
      // same way until the Owner fixes it, so say that plainly and bill nothing.
      if (e instanceof AiOutage) {
        console.error(outageLog("generate-dm", resolved.provider, e));
        return json(503, { error: AI_OUTAGE_ERROR, code: AI_OUTAGE });
      }
      throw e;
    }
    raw = completion.text;

    // No object, or one the token cap cut off: there is no DM in it to judge.
    // The raw text is never used in its place, because prose about the Lead is
    // exactly what an answer that ignored the fields contains.
    const draft = readDraft(raw);
    if (!draft) {
      refused = "";
      problems = [NOT_AN_ANSWER];
      continue;
    }

    if (!draft.fit && !fitConfirmed) return skip(skipReason(draft.reason), resolved.provider);

    const candidate = cleanCompletion(draft.dm, { limit: DM_LIMIT });
    problems = checkDm(candidate, gate);
    if (problems.length === 0) dm = candidate;
    else refused = candidate;
  }

  // Nothing sendable after the correction. It is a failed generation: say so
  // with a code the client can act on, log what was wrong so the gate can be
  // tuned from here, and do not bill for it. `empty_completion` is paired with
  // the same literal in src/lib/api.ts, where it tells the batch to leave this
  // Lead in To write and carry on — it is about this Lead, not the workspace.
  if (!dm) {
    console.error(
      `[generate-dm] no sendable DM after a correction (provider=${resolved.provider}, problems=${
        JSON.stringify(problems)
      }, raw=${JSON.stringify(raw).slice(0, 400)})`,
    );
    return json(502, {
      error: "The AI could not write a DM that was ready to send. Nothing was counted against your quota — try again.",
      code: "empty_completion",
    });
  }

  // Count it only after the provider actually billed us AND we have a message
  // to show for it. Atomic, so concurrent generations can't lose a count.
  const { data: newUsed, error: countError } = await sb.rpc("increment_dm_usage", {
    p_user_id: user.id,
    p_month: month,
    p_count: 1,
  });
  // The DM is still handed over: the Operator must not lose a message over
  // bookkeeping. But the failure is said out loud. Until migration 0005 this
  // call failed on every DM (dm_usage had no updated_at column), nothing
  // logged it, and the count read 0 on every sign-in while the monthly limit
  // went unenforced.
  if (countError) {
    console.error(`[generate-dm] increment_dm_usage failed, this DM was not counted: ${countError.message}`);
  }
  if (trial.active) await spendTrial(sb, user.id, { dms: 1 });

  // Report which provider actually ran — the requested one is only a preference
  // when the Owner hasn't configured its key.
  return json(200, {
    dm,
    provider: resolved.provider,
    used: newUsed ?? used + 1,
    limit: MONTHLY_DM_LIMIT,
  });
});
