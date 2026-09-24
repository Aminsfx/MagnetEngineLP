// Instagram lead sources, served by HikerAPI.
//
// Deliberately free of Deno globals, on the same contract as completion.ts:
// the `scrape` Edge Function imports it, the browser imports its types and
// constants (so the source list exists exactly once), and
// `src/lib/hiker.test.ts` imports it to run the response parsing against the
// payload shapes HikerAPI actually returns. A `Deno.` reference here fails
// `npm run typecheck`, which is intended.
//
// HikerAPI is synchronous REST — one request answers with one page — where the
// Apify actors it replaced were start-a-run-then-poll. There is no run to poll:
// the client asks for one page at a time, and the cursor it hands back is all
// the state there is.
//
// Most list endpoints answer with a *short* user (username, name, picture) and
// no bio or follower count. The DM prompt reads the bio and the Settings
// filters read the follower count, so a short row is looked up again by id
// (`enrich`). Rows from the full-profile endpoints never need that.

export const HIKER_BASE = "https://api.hikerapi.com";

/** Per-query ceiling. The landing pages promise "up to 250 profiles per search". */
export const MAX_PER_QUERY = 250;

/** Profiles looked up per call — one upstream request each. */
export const ENRICH_BATCH = 10;

export const SOURCE_KINDS = [
  "keyword",
  "hashtag",
  "followers",
  "following",
  "likers",
  "commenters",
  "location",
  "similar",
  "profiles",
] as const;

export type SourceKind = typeof SOURCE_KINDS[number];

/** One thing to scrape: a search term, a hashtag, an account, a post, a place. */
export interface Source {
  kind: SourceKind;
  /** Normalised: a bare username, a bare hashtag, a post shortcode, a place name… */
  query: string;
}

/**
 * The only shape a scraped profile leaves the server in.
 *
 * Field names are HikerAPI's own, trimmed from a 200-field user object to what
 * a Lead can hold. `intake()` knows these names — there is no translation
 * step between the two, because a translation step is how the Apify field
 * names drifted (see ab58b53).
 */
export interface ProfileRow {
  pk: string;
  username: string;
  full_name?: string;
  biography?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
  category?: string;
  profile_pic_url?: string;
  city_name?: string;
}

// ─── Parsing what the Operator typed ─────────────────────────────────────────

const USERNAME = /^[a-z0-9._]{1,30}$/;

/** A username from "@Name", "name" or a profile URL; '' when there isn't one. */
export function toUsername(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (s.includes("instagram.com")) {
    s = s.replace(/[?#].*$/, "").replace(/\/+$/, "");
    s = s.slice(s.lastIndexOf("/") + 1);
  }
  s = s.replace(/^@/, "").trim();
  return USERNAME.test(s) ? s : "";
}

/** A post shortcode from a /p/, /reel/ or /tv/ link, or a bare shortcode. */
export function toShortcode(raw: string): string {
  const s = raw.trim();
  const m = s.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(s) && !s.includes(".") ? s : "";
}

/** Split a comma- or newline-separated list, dropping blanks. */
export function splitList(raw: string): string[] {
  return raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Validate and normalise a source from the request body. Everything that
 * reaches HikerAPI passed through here, so an Operator can only ever cause the
 * requests this module builds — never an arbitrary path.
 */
export function parseSource(raw: unknown): Source | null {
  if (!raw || typeof raw !== "object") return null;
  const { kind, query } = raw as { kind?: unknown; query?: unknown };
  if (typeof kind !== "string" || !(SOURCE_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof query !== "string" || query.length > 2000) return null;
  const k = kind as SourceKind;

  let q = "";
  switch (k) {
    case "keyword":
    case "location":
      q = query.trim().slice(0, 100);
      break;
    case "hashtag":
      q = query.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase().slice(0, 100);
      break;
    case "followers":
    case "following":
    case "similar":
      q = toUsername(query);
      break;
    case "likers":
    case "commenters":
      q = toShortcode(query);
      break;
    case "profiles": {
      // Up to one batch of usernames per call; the client chunks longer lists.
      const names = [...new Set(query.split(/[\s,]+/).map(toUsername).filter(Boolean))];
      q = names.slice(0, ENRICH_BATCH).join(",");
      break;
    }
  }
  return q ? { kind: k, query: q } : null;
}

// ─── Cursors ─────────────────────────────────────────────────────────────────

/**
 * Where a paged source got to. `t` is the resolved target (a user id, a media
 * id, a location pk) so the username → id lookup is paid for once per source,
 * not once per page; `p` is the upstream page token.
 */
export interface Cursor {
  t?: string;
  p?: string;
  /** Human label for the resolved target, e.g. the place name that matched. */
  l?: string;
}

export function encodeCursor(c: Cursor): string {
  return JSON.stringify(c);
}

export function decodeCursor(raw: unknown): Cursor {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const c = JSON.parse(raw);
    const str = (v: unknown) => (typeof v === "string" && v.length <= 500 ? v : undefined);
    return { t: str(c?.t), p: str(c?.p), l: str(c?.l) };
  } catch {
    return {};
  }
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface HikerRequest {
  path: string;
  params: Record<string, string>;
}

/** Sources whose list endpoint needs an id the Operator did not type. */
export function needsTarget(kind: SourceKind): boolean {
  return kind === "followers" || kind === "following" || kind === "similar" ||
    kind === "likers" || kind === "commenters" || kind === "location";
}

/** The lookup that turns the Operator's input into the id the list endpoint takes. */
export function resolveRequest(src: Source): HikerRequest | null {
  switch (src.kind) {
    case "followers":
    case "following":
    case "similar":
      return { path: "/v1/user/by/username", params: { username: src.query } };
    case "likers":
    case "commenters":
      return { path: "/v1/media/pk/from/code", params: { code: src.query } };
    case "location":
      // v2, not v3: v3 answers "Miami" with venues (a speedway, a hospital)
      // and never the city itself; v2 lists the city first.
      return { path: "/v2/fbsearch/places", params: { query: src.query, safe_int: "true" } };
    default:
      return null;
  }
}

/**
 * Instagram shows an outsider roughly the first 50 followers of any account
 * (`should_limit_list_of_followers: true`, no next page) — measured live on
 * g2, v1 and gql alike, for a 100k account as much as a 1M one. Following
 * lists still page.
 */
export const FOLLOWERS_VISIBLE = 50;

export interface Target {
  id: string;
  label: string;
  /** Instagram lists no followers for a private account, to anyone. */
  isPrivate?: boolean;
}

/** Read the resolved target out of `resolveRequest`'s answer; null when nothing matched. */
export function readTarget(src: Source, data: unknown): Target | null {
  switch (src.kind) {
    case "followers":
    case "following":
    case "similar": {
      const u = unwrapUser(data);
      const id = u ? idOf(u) : "";
      if (!u || !id) return null;
      return { id, label: `@${String(u.username ?? src.query)}`, isPrivate: u.is_private === true };
    }
    case "likers":
    case "commenters": {
      const id = typeof data === "string" || typeof data === "number" ? String(data) : "";
      return id ? { id, label: "the post" } : null;
    }
    case "location": {
      const items = (data as { items?: unknown })?.items;
      if (!Array.isArray(items)) return null;
      // The closest name wins, first among equals: "Miami" over "Miami, FL"
      // over "Miami South Beach" over anything that merely mentions Miami.
      const q = src.query.toLowerCase();
      const score = (t: string) => (t === q ? 3 : t.startsWith(`${q},`) ? 2 : t.startsWith(q) ? 1 : 0);
      let best: Target | null = null;
      let bestScore = -1;
      for (const item of items) {
        const loc = (item as { location?: Record<string, unknown> })?.location;
        const pk = loc?.pk ?? loc?.facebook_places_id;
        if (pk === undefined || pk === null || pk === "") continue;
        const title = String((item as { title?: unknown }).title ?? loc?.name ?? src.query);
        const s = score(title.toLowerCase());
        if (s > bestScore) {
          best = { id: String(pk), label: title };
          bestScore = s;
        }
      }
      return best;
    }
    default:
      return null;
  }
}

/** One page of a source. `target` is required for the kinds `needsTarget` names. */
export function pageRequest(src: Source, cur: Cursor): HikerRequest {
  const page = (key: string) => (cur.p ? { [key]: cur.p } : {});
  const t = cur.t ?? "";
  switch (src.kind) {
    case "keyword":
      return { path: "/v2/fbsearch/accounts", params: { query: src.query, ...page("page_token") } };
    case "hashtag":
      return { path: "/v2/hashtag/medias/recent", params: { name: src.query, safe_int: "true", ...page("page_id") } };
    case "followers":
      return { path: "/g2/user/followers", params: { user_id: t, ...page("page_id") } };
    case "following":
      return { path: "/g2/user/following", params: { user_id: t, ...page("page_id") } };
    case "likers":
      return { path: "/v2/media/likers", params: { id: t, safe_int: "true" } };
    case "commenters":
      return { path: "/v2/media/comments", params: { id: t, safe_int: "true", ...page("page_id") } };
    case "location":
      return { path: "/v1/location/medias/recent/chunk", params: { location_pk: t, ...page("max_id") } };
    case "similar":
      return { path: "/v2/user/suggested/profiles", params: { user_id: t, safe_int: "true" } };
    case "profiles":
      // Not paged: the function looks each username up with profileRequest.
      return profileRequest(src.query.split(",")[0]);
  }
}

/** A full profile by username — the `profiles` source. */
export function profileRequest(username: string): HikerRequest {
  return { path: "/v1/user/by/username", params: { username } };
}

/** A full profile by id — `enrich`. */
export function enrichRequest(id: string): HikerRequest {
  return { path: "/v1/user/by/id", params: { id } };
}

/** The next page token, or null when the source is exhausted or unpaged. */
export function readNextPage(kind: SourceKind, data: unknown): string | null {
  const d = data as Record<string, unknown> | null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  switch (kind) {
    case "keyword":
      return d?.has_more === false ? null : str(d?.page_token);
    case "hashtag":
    case "followers":
    case "following":
    case "commenters":
      return str(d?.next_page_id);
    case "location":
      // v1 chunk endpoints answer [items, next_max_id].
      return Array.isArray(data) ? str(data[1]) : null;
    default:
      return null;
  }
}

// ─── Reading users out of a page ─────────────────────────────────────────────

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isUser(v: unknown): v is Obj {
  return isObj(v) && typeof v.username === "string" && v.username !== "" &&
    (v.pk !== undefined || v.pk_id !== undefined || v.id !== undefined);
}

function idOf(u: Obj): string {
  const id = u.pk ?? u.pk_id ?? u.id;
  return id === undefined || id === null ? "" : String(id);
}

/** v2 profile endpoints wrap the user as `{ user: {...}, status }`; v1 does not. */
function unwrapUser(data: unknown): Obj | null {
  if (isUser(data)) return data;
  if (isObj(data) && isUser(data.user)) return data.user;
  return null;
}

/** A post: it has a shortcode and an author. */
function isMedia(v: unknown): v is Obj {
  return isObj(v) && typeof v.code === "string" && (isUser(v.user) || isUser(v.owner));
}

/** Depth-first walk over every object and array in a payload. */
function walk(node: unknown, visit: (node: unknown, key: string) => void, key = "", depth = 0): void {
  if (depth > 14 || !node || typeof node !== "object") return;
  visit(node, key);
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, key, depth + 1);
  } else {
    for (const [k, child] of Object.entries(node)) walk(child, visit, k, depth + 1);
  }
}

/**
 * Every user a page is *about*, in page order.
 *
 * Pages carry other people too — a hashtag post names the accounts tagged in
 * it and a preview of its commenters; a comment names whoever it replies to —
 * so each kind reads users from one place only, rather than from anything
 * user-shaped. That is the difference between "people who posted #smma" and
 * "everyone mentioned near a #smma post".
 */
export function extractUsers(kind: SourceKind, data: unknown, exclude?: string): Obj[] {
  const out: Obj[] = [];
  const push = (u: unknown) => {
    if (isUser(u) && idOf(u) !== exclude) out.push(u);
  };

  switch (kind) {
    case "hashtag":
    case "location":
      // The author of each post. Carousel children repeat it; the dedupe below drops them.
      walk(data, (n) => {
        if (isMedia(n)) push(n.user ?? n.owner);
      });
      break;
    case "commenters":
      walk(data, (n, key) => {
        if (Array.isArray(n) && /comments$/.test(key)) for (const c of n) if (isObj(c)) push(c.user);
      });
      break;
    case "similar":
      // Suggestion payloads nest users under several keys; anything user-shaped
      // is a suggestion, apart from the seed account itself.
      walk(data, (n) => {
        if (isUser(n)) push(n);
      });
      break;
    case "profiles":
      push(unwrapUser(data));
      break;
    default:
      // keyword, followers, following, likers: a `users` array, whose items are
      // either users or `{ position, user }` wrappers.
      walk(data, (n, key) => {
        if (Array.isArray(n) && key === "users") {
          for (const item of n) push(isUser(item) ? item : isObj(item) ? item.user : undefined);
        }
      });
  }

  const seen = new Set<string>();
  return out.filter((u) => {
    const name = String(u.username).toLowerCase();
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

// ─── Trimming a user to a row ────────────────────────────────────────────────

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

/** A HikerAPI user (short or full, v1 or v2) as a ProfileRow; null without a username. */
export function toRow(raw: unknown): ProfileRow | null {
  const u = unwrapUser(raw);
  if (!u) return null;
  const pk = idOf(u);
  if (!pk) return null;

  // account_type 2 is a business profile; 3 is a creator, which is not.
  const business = bool(u.is_business) ?? (u.account_type === 2 ? true : undefined);

  const row: ProfileRow = {
    pk,
    username: String(u.username),
    full_name: str(u.full_name),
    biography: str(u.biography),
    follower_count: int(u.follower_count),
    following_count: int(u.following_count),
    media_count: int(u.media_count),
    is_private: bool(u.is_private),
    is_verified: bool(u.is_verified),
    is_business: business,
    category: str(u.category_name) ?? str(u.category) ?? str(u.business_category_name),
    profile_pic_url: str(u.profile_pic_url),
    city_name: str(u.city_name),
  };
  for (const k of Object.keys(row) as (keyof ProfileRow)[]) {
    if (row[k] === undefined) delete row[k];
  }
  return row;
}

// ─── The HTTP call ───────────────────────────────────────────────────────────

/**
 * What went wrong upstream, as something the function can map to a status.
 * The Operator never sees these messages — they name the provider — only the
 * function's logs do.
 */
export type HikerErrorCode =
  | "not_found"
  | "upstream_auth"
  | "upstream_balance"
  | "upstream_rate"
  | "upstream_error";

export class HikerError extends Error {
  constructor(message: string, readonly code: HikerErrorCode, readonly status = 0) {
    super(message);
    this.name = "HikerError";
  }
}

export interface HikerResponse {
  data: unknown;
  /** Request units billed — HikerAPI's `x-hiker-info: reqs=N`, else 1. */
  units: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Billed units from `x-hiker-info: reqs=N`. Only successful requests are billed. */
export function billedUnits(header: string | null): number {
  const m = header?.match(/reqs=(\d+)/);
  return m ? Number(m[1]) : 1;
}

/**
 * GET one HikerAPI endpoint. The key travels as a header, never in the URL,
 * so it cannot surface in a logged request line.
 *
 * 429 backs off and retries (the free tier allows one request a second); a
 * 5xx retries once, because HikerAPI does not bill 5xx and a flaky upstream
 * page usually answers the second time.
 */
export async function hikerGet(
  key: string,
  req: HikerRequest,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<HikerResponse> {
  const doFetch = opts.fetchImpl ?? fetch;
  const qs = new URLSearchParams(Object.entries(req.params).filter(([, v]) => v !== ""));
  const url = `${HIKER_BASE}${req.path}?${qs}`;

  let serverErrors = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    let res: Response;
    try {
      res = await doFetch(url, {
        headers: { "x-access-key": key, accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
    } catch (e) {
      if (serverErrors++ < 1) continue;
      throw new HikerError(`${req.path}: ${e instanceof Error ? e.message : "network error"}`, "upstream_error");
    }

    if (res.ok) {
      return { data: await res.json(), units: billedUnits(res.headers.get("x-hiker-info")) };
    }

    const detail = (await res.text().catch(() => "")).slice(0, 200);
    const what = `${req.path} → ${res.status} ${detail}`;
    if (res.status === 429 && attempt < 4) {
      await sleep(1100 * (attempt + 1));
      continue;
    }
    if (res.status >= 500 && serverErrors++ < 1) {
      await sleep(800);
      continue;
    }
    if (res.status === 404) throw new HikerError(what, "not_found", 404);
    if (res.status === 401 || res.status === 403) throw new HikerError(what, "upstream_auth", res.status);
    if (res.status === 402) throw new HikerError(what, "upstream_balance", 402);
    if (res.status === 429) throw new HikerError(what, "upstream_rate", 429);
    throw new HikerError(what, "upstream_error", res.status);
  }
  throw new HikerError(`${req.path}: gave up after retries`, "upstream_rate", 429);
}

/** Run `fn` over `items` with at most `limit` in flight, keeping input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
