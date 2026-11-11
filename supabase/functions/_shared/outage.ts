// When the AI provider refuses for a reason on the Owner's side of the account.
//
// On 2026-11-10 the Claude account ran out of credit in the middle of an
// Operator's run. Claude answered 400 "Your credit balance is too low", callClaude
// threw it like any other error, servePost answered 500 "Something went wrong on
// our side... Try again in a minute", and the Operator was left to guess. Trying
// again in a minute could not have helped: until the Owner tops up the credit or
// fixes the key, every request fails the same way.
//
// This module holds no Deno globals by contract: src/lib/outage.test.ts imports
// it, which both runs it in vitest and pulls it into `npm run typecheck`.

/** What is wrong: the account has no money on it, or the key is refused. */
export type OutageCause = "credit" | "key";

/**
 * Read a provider's error response for an outage only the Owner can end.
 *
 * Returns null for everything else, which stays an ordinary error: an
 * overloaded or rate-limited provider (429, 529, 5xx) is worth retrying, and a
 * 400 about the request itself is a bug to find in the log, not an outage.
 */
export function outageCause(status: number, body: string): OutageCause | null {
  const text = body.toLowerCase();
  // Anthropic: 400 invalid_request_error "Your credit balance is too low", or
  // 402 billing_error. OpenAI: 429 with code insufficient_quota (its plain rate
  // limit is also a 429, so the code is what tells them apart).
  if (
    status === 402 ||
    text.includes("credit balance") ||
    text.includes("insufficient_quota") ||
    text.includes("billing_error")
  ) return "credit";
  // A revoked, mistyped or under-permissioned key: 401 or 403 from all three,
  // and Gemini's 400 API_KEY_INVALID.
  if (status === 401 || status === 403 || text.includes("api_key_invalid") || text.includes("api key not valid")) {
    return "key";
  }
  return null;
}

/** Thrown by `complete()` when `outageCause` names one. */
export class AiOutage extends Error {
  readonly kind: OutageCause;
  readonly status: number;

  constructor(kind: OutageCause, status: number, detail: string) {
    super(detail);
    this.name = "AiOutage";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * The code on the 503. The browser needs no branch of its own for it: like
 * every failure that is not about one Lead, it stops the run and keeps what was
 * already written, and the toast carries `AI_OUTAGE_ERROR`.
 */
export const AI_OUTAGE = "ai_unavailable";

/**
 * What an Operator is told. It names no provider (CLAUDE.md, Security
 * Constraints) and promises nothing about when: only the Owner can end it.
 */
export const AI_OUTAGE_ERROR =
  "AI writing is paused on our side. Nothing was counted, and everything not written yet is still waiting. Try again later.";

/** What the Owner reads in the function log: the cause and what fixes it. */
export function outageLog(fn: string, provider: string, outage: AiOutage): string {
  const fix = outage.kind === "credit"
    ? "the account is out of credit: top it up in the provider's billing page"
    : "the API key was refused: set a working one with `supabase secrets set`";
  return `[${fn}] AI OUTAGE, nothing can be written until this is fixed: ${provider} ${outage.status}, ${fix}. ${outage.message}`;
}
