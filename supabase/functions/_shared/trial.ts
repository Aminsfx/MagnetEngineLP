// The free trial's allowance: what a new account may do in its 3-day trial
// before it pays in full (owner decision, 2026-10-20).
//
// A trial is recorded only when a membership is first activated, so accounts
// that started before this shipped have no trial end date and no allowance
// ("new users only"). The allowance is spent on the server — `scrape` counts
// profiles found, `generate-dm` counts DMs written — because the client is
// the Operator's own browser. Every first DM is written by generate-dm, so
// capping DMs written caps first DMs sent.
//
// No Deno globals here by contract: src/lib/trial.test.ts imports this file,
// and the app reads TRIAL_ALLOWANCE from it.

export const TRIAL_ALLOWANCE = { leads: 500, dms: 500 } as const;

/** The code `scrape` and `generate-dm` answer with once an allowance is spent. */
export const TRIAL_LIMIT = "trial_limit";

const DAY_MS = 86_400_000;

/**
 * A billing period this short is a trial, whatever its status says. A paid
 * period is a month or a year; the trial is 3 days.
 */
const TRIAL_PERIOD_MAX_DAYS = 7;

/** The membership fields this file reads, as Whop's webhook sends them. */
export interface MembershipLike {
  status?: unknown;
  renewal_period_start?: unknown;
  renewal_period_end?: unknown;
  current_period_start?: unknown;
  current_period_end?: unknown;
}

const asTime = (v: unknown): number | null => {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
};

/**
 * When this membership's trial ends, as ISO, or null when it is not a trial.
 * Whop marks a trial `status: "trialing"`; a period of a week or less is read
 * as a trial too, in case an event carries the period but not that status.
 */
export function trialEndFrom(m: MembershipLike, now: Date = new Date()): string | null {
  const end = asTime(m.renewal_period_end) ?? asTime(m.current_period_end);
  const start = asTime(m.renewal_period_start) ?? asTime(m.current_period_start);

  const trialing = m.status === "trialing";
  const shortPeriod = end !== null && start !== null && end - start <= TRIAL_PERIOD_MAX_DAYS * DAY_MS;
  if (!trialing && !shortPeriod) return null;

  // A trialing membership with no readable end still gets an allowance.
  return new Date(end ?? now.getTime() + 3 * DAY_MS).toISOString();
}

/** Is the account still inside its trial? Null means it never had one. */
export function inTrial(trialEndsAt: string | null | undefined, now: Date = new Date()): boolean {
  const end = asTime(trialEndsAt);
  return end !== null && end > now.getTime();
}

/** What is left of one allowance, never below zero. */
export function trialLeft(kind: keyof typeof TRIAL_ALLOWANCE, used: number): number {
  return Math.max(0, TRIAL_ALLOWANCE[kind] - Math.max(0, used));
}
