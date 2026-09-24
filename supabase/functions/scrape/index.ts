// Instagram lead scraping — server-side so HIKERAPI_KEY never reaches the browser.
//
// Deploy: supabase functions deploy scrape                  (gateway JWT check ON)
// Secrets: HIKERAPI_KEY (required), MONTHLY_SCRAPE_LIMIT (optional, default 5000)
// Tables:  scrape_usage + increment_scrape_usage — supabase/migrations/0002_scrape_usage.sql
//
// POST JSON, one of:
//   { op: "page", source: { kind, query }, cursor?: string }
//     → { rows: ProfileRow[], complete: boolean, cursor: string | null,
//         target?: string, missing?: string[], used, limit }
//   { op: "enrich", ids: string[] }                           (at most 10)
//     → { rows: ProfileRow[], used, limit }
//
// The browser drives the loop, one page per call: HikerAPI answers each request
// synchronously, so there is no run to poll, and a page per call keeps every
// invocation short, lets the Operator watch real progress, and lets Stop stop
// spending immediately.
//
// Errors carry a `code` the client branches on:
//   404 not_found, 422 private_target — about this one query: noted, run continues
//   429 scrape_quota                  — the month's lookups are spent
//   503 scrape_unavailable / scrape_busy, 502 scrape_upstream — about the whole run
//
// No Operator-facing message names the provider (CLAUDE.md: clients never see
// internal integrations). The real cause goes to this function's log.

import { json, servePost, serviceClient } from "../_shared/http.ts";
import {
  decodeCursor,
  encodeCursor,
  ENRICH_BATCH,
  enrichRequest,
  extractUsers,
  HikerError,
  hikerGet,
  type HikerRequest,
  mapLimit,
  needsTarget,
  pageRequest,
  parseSource,
  profileRequest,
  type ProfileRow,
  readNextPage,
  readTarget,
  resolveRequest,
  type Source,
  toRow,
} from "../_shared/hiker.ts";

/**
 * Upstream requests one Operator may spend per month. Every one costs the
 * Owner money, and the loop is client-driven, so without this a signed-in
 * browser could spend the Owner's HikerAPI balance in an afternoon. 5,000
 * covers the 1,500-lead monthly quota with every lead enriched, plus paging
 * and the leads the Settings filters throw away.
 */
const MONTHLY_SCRAPE_LIMIT = Number(Deno.env.get("MONTHLY_SCRAPE_LIMIT")) || 5000;

const monthKey = () => new Date().toISOString().slice(0, 7);

type Sb = ReturnType<typeof serviceClient>;

async function usedThisMonth(sb: Sb, userId: string, month: string): Promise<number> {
  const { data, error } = await sb
    .from("scrape_usage")
    .select("requests")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  // Missing table = migration 0002 not run. Say so loudly, but don't take
  // lead search down over bookkeeping.
  if (error) console.error("[scrape] reading scrape_usage failed — is migration 0002 applied?", error.message);
  return data?.requests ?? 0;
}

async function bill(sb: Sb, userId: string, month: string, units: number): Promise<void> {
  const { error } = await sb.rpc("increment_scrape_usage", {
    p_user_id: userId,
    p_month: month,
    p_count: units,
  });
  if (error) console.error("[scrape] increment_scrape_usage failed:", error.message);
}

/**
 * How many lookups to run at once: the account's own rate limit (1/s on the
 * free tier, 15/s paid), read once per isolate from /sys/balance, which is
 * not billed.
 */
let rate: number | undefined;
async function concurrency(key: string): Promise<number> {
  if (rate === undefined) {
    try {
      const { data } = await hikerGet(key, { path: "/sys/balance", params: {} });
      const b = data as { rate?: number; requests?: number; amount?: number };
      rate = Number(b?.rate) || 1;
      if (typeof b?.requests === "number" && b.requests < 2000) {
        console.warn(`[scrape] HikerAPI balance is low: ${b.requests} requests left ($${b.amount}).`);
      }
    } catch {
      rate = 1;
    }
  }
  return Math.max(1, Math.min(ENRICH_BATCH, rate));
}

function notFound(src: Source): Response {
  const q = src.query;
  const error = {
    keyword: `No accounts matched "${q}".`,
    hashtag: `#${q} has no recent posts.`,
    followers: `There's no Instagram account called @${q}.`,
    following: `There's no Instagram account called @${q}.`,
    similar: `There's no Instagram account called @${q}.`,
    likers: "That post couldn't be found — it may be private or deleted.",
    commenters: "That post couldn't be found — it may be private or deleted.",
    location: `No Instagram place matches "${q}".`,
    profiles: "None of those accounts exist.",
  }[src.kind];
  return json(404, { error, code: "not_found" });
}

function upstreamFailure(e: HikerError): Response {
  console.error(`[scrape] ${e.code}: ${e.message}`);
  switch (e.code) {
    case "upstream_auth":
    case "upstream_balance":
      return json(503, { error: "Lead search is unavailable right now — please contact support.", code: "scrape_unavailable" });
    case "upstream_rate":
      return json(503, { error: "Instagram lookups are busy right now — wait a minute and try again.", code: "scrape_busy" });
    default:
      return json(502, { error: "Instagram didn't answer that lookup — try again.", code: "scrape_upstream" });
  }
}

const isRow = (r: ProfileRow | null): r is ProfileRow => r !== null;
const isNotFound = (e: unknown) => e instanceof HikerError && e.code === "not_found";

type Get = (req: HikerRequest) => Promise<unknown>;

interface Body {
  op?: string;
  source?: unknown;
  cursor?: unknown;
  ids?: unknown;
}

async function page(body: Body, get: Get, key: string): Promise<Response | Record<string, unknown>> {
  const src = parseSource(body.source);
  if (!src) return json(400, { error: "That search is empty or not in a form Instagram accepts.", code: "bad_source" });

  if (src.kind === "profiles") {
    const missing: string[] = [];
    const rows = await mapLimit(src.query.split(","), await concurrency(key), async (name) => {
      try {
        return toRow(await get(profileRequest(name)));
      } catch (e) {
        if (!isNotFound(e)) throw e;
        missing.push(name);
        return null;
      }
    });
    return { rows: rows.filter(isRow), complete: true, cursor: null, missing };
  }

  const cur = decodeCursor(body.cursor);
  if (needsTarget(src.kind) && !cur.t) {
    let data: unknown;
    try {
      data = await get(resolveRequest(src)!);
    } catch (e) {
      if (isNotFound(e)) return notFound(src);
      throw e;
    }
    const target = readTarget(src, data);
    if (!target) return notFound(src);
    if (target.isPrivate && (src.kind === "followers" || src.kind === "following")) {
      return json(422, {
        error: `${target.label} is private — Instagram doesn't show its ${src.kind} list to anyone.`,
        code: "private_target",
      });
    }
    cur.t = target.id;
    cur.l = target.label;
  }

  let data: unknown;
  try {
    data = await get(pageRequest(src, cur));
  } catch (e) {
    if (isNotFound(e)) return notFound(src);
    throw e;
  }

  const rows = extractUsers(src.kind, data, cur.t).map(toRow).filter(isRow);
  if (rows.length === 0 && !cur.p) {
    // Either a genuinely empty list or a payload shape extractUsers doesn't
    // know. The keys are what tells those apart when reading the log.
    const keys = Array.isArray(data) ? `array(${data.length})` : Object.keys(data ?? {}).join(",");
    console.warn(`[scrape] ${src.kind} "${src.query}": first page had no users (keys: ${keys})`);
  }

  const next = readNextPage(src.kind, data);
  return {
    rows,
    complete: false,
    cursor: next ? encodeCursor({ ...cur, p: next }) : null,
    target: cur.l,
  };
}

async function enrich(body: Body, get: Get, key: string): Promise<Response | Record<string, unknown>> {
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && /^\d{1,25}$/.test(id)))]
    : [];
  if (ids.length === 0 || ids.length > ENRICH_BATCH) {
    return json(400, { error: `ids must be 1–${ENRICH_BATCH} numeric user ids`, code: "bad_ids" });
  }

  const rows = await mapLimit(ids, await concurrency(key), async (id) => {
    try {
      return toRow(await get(enrichRequest(id)));
    } catch (e) {
      // One deleted or flaky profile is not a reason to lose the other nine:
      // the client keeps the short row it already has.
      if (e instanceof HikerError && (e.code === "not_found" || e.code === "upstream_error")) return null;
      throw e;
    }
  });
  return { rows: rows.filter(isRow) };
}

servePost<Body>("scrape", async ({ body, user, sb }) => {
  const key = Deno.env.get("HIKERAPI_KEY");
  if (!key) {
    console.error("[scrape] HIKERAPI_KEY is not set — `supabase secrets set HIKERAPI_KEY=...`");
    return json(503, { error: "Lead search isn't set up on the server yet — please contact support.", code: "scrape_unavailable" });
  }

  const op = body?.op;
  if (op !== "page" && op !== "enrich") return json(400, { error: 'op must be "page" or "enrich"' });

  const month = monthKey();
  const used = await usedThisMonth(sb, user.id, month);
  if (used >= MONTHLY_SCRAPE_LIMIT) {
    return json(429, {
      error: `You've used this month's ${MONTHLY_SCRAPE_LIMIT.toLocaleString("en-US")} profile lookups. They reset on the 1st.`,
      code: "scrape_quota",
      used,
      limit: MONTHLY_SCRAPE_LIMIT,
    });
  }

  // Every billed upstream request is counted, including ones spent before a
  // later request in the same call failed — HikerAPI bills them either way.
  let units = 0;
  const get: Get = async (req) => {
    const res = await hikerGet(key, req);
    units += res.units;
    return res.data;
  };

  try {
    const result = op === "page" ? await page(body, get, key) : await enrich(body, get, key);
    if (result instanceof Response) return result;
    return json(200, { ...result, used: used + units, limit: MONTHLY_SCRAPE_LIMIT });
  } catch (e) {
    if (e instanceof HikerError) return upstreamFailure(e);
    throw e;
  } finally {
    if (units > 0) await bill(sb, user.id, month, units);
  }
});
