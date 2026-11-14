// Who may spend the Owner's money: the AI providers (generate-dm,
// generate-reply) and HikerAPI (scrape).
//
// Sign-up is open to anyone, and until 2026-11-13 these functions checked only
// that the caller was signed in. The dashboard sends an Operator without an
// active plan to /activate, but that is the browser's decision: anyone with an
// account's session token could call the functions directly and write DMs
// (1,500 a month), replies (no limit) and lead lookups (5,000 a month) on the
// Owner's keys, every month, from as many free accounts as they cared to make.
//
// This module holds no Deno globals by contract: src/lib/access.test.ts
// imports it, which runs it under vitest and pulls it into `npm run typecheck`.

/** The `code` an Operator without an active plan is answered with. */
export const SUBSCRIPTION_INACTIVE = "subscription_inactive";

/** What they are told. It names no provider (CLAUDE.md, Security Constraints). */
export const SUBSCRIPTION_INACTIVE_ERROR =
  "Your plan isn't active, so this can't run. Start or renew it on the Activate page: everything you've saved is kept.";

/** The `code` for a plan that could not be read at all. */
export const PLAN_UNCONFIRMED = "plan_unconfirmed";

export const PLAN_UNCONFIRMED_ERROR =
  "We couldn't confirm your plan just now, so nothing ran and nothing was counted. Try again in a minute.";

/** The row as `subscriptions` holds it, or null when the account has none. */
export interface SubscriptionRow {
  status?: string | null;
}

/**
 * Whether this account may spend. Only an active plan may: 'pending' (signed
 * up, never paid), 'cancelled', no row and anything unrecognised may not. A
 * free trial is an active plan with an allowance, and spends through it.
 * The Owner's accounts (ADMIN_EMAILS) always may, so a missing row can never
 * lock the Owner out of their own product.
 */
export function maySpend(row: SubscriptionRow | null | undefined, isOwner: boolean): boolean {
  if (isOwner) return true;
  return row?.status === "active";
}
