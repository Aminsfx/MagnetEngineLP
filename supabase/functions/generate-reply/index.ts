// AI reply generation for the inbox (AI SDR) — server-side proxy so provider
// API keys never reach the browser.
//
// Deploy: supabase functions deploy generate-reply       (gateway JWT check ON)
// Secrets: CLAUDE_API_KEY (and/or OPENAI_API_KEY, GEMINI_API_KEY) — shared with generate-dm.
//
// Auth: like generate-dm, the Supabase gateway requires a valid user JWT (see
// supabase/config.toml → [functions.generate-reply] verify_jwt = true), and
// servePost re-verifies in-function.
//
// POST JSON: {
//   messages: [{ direction: 'in'|'out', text }],
//   contact:  { handle, name?, bio? },
//   systemPrompt: string,
//   calendarLink?: string,
//   timeZone?: string,      // the Operator's IANA zone, for the two call days
//   steps?: ReplyStep[],    // a copilot angle narrowing the moves; otherwise _shared/reply.ts decides
//   provider: 'openai'|'claude'|'gemini'
// } → { reply, intent, step, provider }
//   502 { error, code: "no_reply" } when no reply passed `checkReply` even
//   after a correction. Nothing is sent, which autopilot depends on.
//   503 { error, code: "ai_unavailable" } when the provider account is out of
//   credit or its key is refused (_shared/outage.ts).

import { json, servePost } from "../_shared/http.ts";
import { AI_OUTAGE, AI_OUTAGE_ERROR, AiOutage, outageLog } from "../_shared/outage.ts";
import {
  complete,
  createAiSessionId,
  createAiTraceId,
  isProvider,
  resolveProvider,
  NO_PROVIDER_ERROR,
} from "../_shared/ai.ts";
import type { Completion } from "../_shared/ai.ts";
import { replyEnvelope } from "../_shared/completion.ts";
import { withHumanVoice } from "../_shared/voice.ts";
import {
  checkReply,
  isReplyStep,
  openSteps,
  readConversation,
  readStep,
  replyBrief,
  replyContract,
  replyRetry,
  REPLY_SCHEMA,
} from "../_shared/reply.ts";
import type { ReplyStep } from "../_shared/reply.ts";

const INTENTS = ["interested", "objection", "not_interested", "neutral", "booked"] as const;
type Intent = (typeof INTENTS)[number];

/** Character ceiling on one inbox reply. */
const REPLY_LIMIT = 800;

/** Temperature per attempt: the second is a correction, not a fresh roll. */
const TEMPERATURE = [0.5, 0.3];

function sanitize(text: string): string {
  return (text ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .substring(0, 600);
}

function buildSystem(base: string, calendarLink: string | undefined): string {
  // The humanizer rules go on before the contract, so OUTPUT FORMAT stays the
  // last thing the model reads. A saved persona that already has them (v6
  // onward) is left as it is.
  return `${withHumanVoice(base, "reply")}\n\n${replyContract(calendarLink)}`;
}

// deno-lint-ignore no-explicit-any
function buildTranscript(messages: any[], contact: any, brief: string): string {
  const recent = (Array.isArray(messages) ? messages : []).slice(-20);
  const lines = recent.map((m) => `${m.direction === "in" ? "Them" : "You"}: ${sanitize(m.text)}`);
  const who = `@${contact?.handle ?? "prospect"}${contact?.name ? ` (${contact.name})` : ""}`;
  return `Conversation with ${who}:\n\n${lines.join("\n")}\n\n${brief}\n\nWrite your next reply now as JSON.`;
}

/**
 * The reply and its intent, from whatever the model actually returned.
 *
 * Envelope parsing and cleanup both live in `_shared/completion.ts`; what stays
 * here is validating the intent against the list the Inbox understands.
 *
 * This used to append the booking link to every reply classed "interested",
 * which is how a question went out with the link stapled under it. The link
 * now goes out only at step send_link, written by the model and held there by
 * `checkReply`.
 */
function parseResult(raw: string, truncated: boolean): { reply: string; intent: Intent } {
  const parsed = replyEnvelope(raw, { limit: REPLY_LIMIT, truncated });
  const intent: Intent = INTENTS.includes(parsed.intent as Intent)
    ? (parsed.intent as Intent)
    : "neutral";
  return { reply: parsed.reply, intent };
}

interface Body {
  // deno-lint-ignore no-explicit-any
  messages?: any[];
  // deno-lint-ignore no-explicit-any
  contact?: any;
  systemPrompt?: string;
  calendarLink?: string;
  timeZone?: string;
  steps?: unknown[];
  provider?: string;
}

servePost<Body>("generate-reply", async ({ body, user }) => {
  const { messages, contact, systemPrompt, calendarLink, timeZone, steps, provider } = body ?? {};
  if (!Array.isArray(messages) || !contact?.handle || !systemPrompt || !isProvider(provider)) {
    return json(400, { error: "missing or invalid fields: messages, contact, systemPrompt, provider" });
  }

  const resolved = resolveProvider(provider);
  if (!resolved) return json(500, { error: NO_PROVIDER_ERROR });

  // The contact handle is hashed into the session ID rather than captured as
  // analytics metadata; every reply turn in this inbox conversation reuses it.
  const aiTrace = {
    distinctId: user.id,
    traceId: createAiTraceId(),
    sessionId: await createAiSessionId("reply", user.id, String(contact.handle)),
    spanName: "generate_reply" as const,
  };

  // Where the conversation is, read off the thread and the calendar. A copilot
  // angle may narrow the moves ("ask about the pain", "go for the call"): the
  // Operator asking for one outranks the question count.
  const thread = messages.map((m) => ({
    direction: m?.direction === "in" ? ("in" as const) : ("out" as const),
    text: String(m?.text ?? ""),
  }));
  const zone = typeof timeZone === "string" && timeZone ? timeZone : undefined;
  const state = readConversation(thread, calendarLink, new Date(), zone);
  const narrowed = Array.isArray(steps) ? steps.filter(isReplyStep) : [];
  const open: ReplyStep[] = narrowed.length ? narrowed : openSteps(state);
  const brief = buildTranscript(messages, contact, replyBrief(state, open, !!calendarLink?.trim()));
  const system = buildSystem(systemPrompt, calendarLink);

  // One attempt, then one correction. A reply reaches the prospect only by
  // passing the gate, because autopilot sends it with nobody reading first.
  let result: { reply: string; intent: Intent; step: ReplyStep } | null = null;
  let refused = "";
  let problems: string[] = [];
  let raw = "";

  for (let attempt = 0; attempt < TEMPERATURE.length && !result; attempt++) {
    let completion: Completion;
    try {
      completion = await complete({
        provider: resolved.provider,
        key: resolved.key,
        system,
        user: attempt === 0 ? brief : replyRetry(brief, refused, problems),
        maxTokens: 400,
        temperature: TEMPERATURE[attempt],
        aiTrace,
        jsonSchema: REPLY_SCHEMA,
      });
    } catch (e) {
      // Out of credit, or the key refused: no reply can be drafted until the
      // Owner fixes it, which "try again in a minute" did not say.
      if (e instanceof AiOutage) {
        console.error(outageLog("generate-reply", resolved.provider, e));
        return json(503, { error: AI_OUTAGE_ERROR, code: AI_OUTAGE });
      }
      throw e;
    }
    raw = completion.text;
    const parsed = parseResult(raw, completion.truncated);
    const step = readStep(raw);
    problems = checkReply(parsed.reply, step, open, calendarLink, state.callDays);
    if (problems.length === 0 && step) result = { ...parsed, step };
    else refused = parsed.reply;
  }

  // Nothing sendable after the correction: send nothing. The Inbox shows the
  // suggestion as failed, and autopilot leaves the thread for the Operator.
  if (!result) {
    console.error(
      `[generate-reply] no sendable reply after a correction (provider=${resolved.provider}, problems=${
        JSON.stringify(problems)
      }, raw=${JSON.stringify(raw).slice(0, 400)})`,
    );
    return json(502, {
      error: "The AI could not write a reply that was ready to send. Nothing went out, try again.",
      code: "no_reply",
    });
  }

  return json(200, { ...result, provider: resolved.provider });
});
