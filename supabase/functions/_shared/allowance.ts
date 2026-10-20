// Reading and spending the free trial's allowance, for the Edge Functions
// that spend it (`scrape`: leads, `generate-dm`: DMs). The rules are in
// trial.ts; tables in supabase/migrations/0003_trial_allowance.sql.

import { json, type serviceClient } from "./http.ts";
import { inTrial, TRIAL_ALLOWANCE, TRIAL_LIMIT } from "./trial.ts";

type Sb = ReturnType<typeof serviceClient>;

export interface TrialState {
  /** Inside a recorded trial right now. False for paid and pre-allowance accounts. */
  active: boolean;
  leads: number;
  dms: number;
}

const NO_TRIAL: TrialState = { active: false, leads: 0, dms: 0 };

/**
 * The account's trial and what it has spent. Bookkeeping that fails reads as
 * "no trial": a missing migration must not take lead search or DMs down for
 * paying accounts, and the error says what to run.
 */
export async function readTrial(sb: Sb, userId: string): Promise<TrialState> {
  const { data: sub, error } = await sb
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[trial] reading subscriptions.trial_ends_at failed — is migration 0003 applied?", error.message);
    return NO_TRIAL;
  }
  if (!inTrial(sub?.trial_ends_at)) return NO_TRIAL;

  const { data: usage, error: usageError } = await sb
    .from("trial_usage")
    .select("leads, dms")
    .eq("user_id", userId)
    .maybeSingle();
  if (usageError) console.error("[trial] reading trial_usage failed:", usageError.message);
  return { active: true, leads: usage?.leads ?? 0, dms: usage?.dms ?? 0 };
}

/** Count what a call spent. Atomic on the database side. */
export async function spendTrial(sb: Sb, userId: string, spent: { leads?: number; dms?: number }): Promise<void> {
  const { error } = await sb.rpc("increment_trial_usage", {
    p_user_id: userId,
    p_leads: spent.leads ?? 0,
    p_dms: spent.dms ?? 0,
  });
  if (error) console.error("[trial] increment_trial_usage failed:", error.message);
}

/** The answer once an allowance is spent: the app sends the Operator to pay in full. */
export function trialLimitResponse(kind: "leads" | "dms"): Response {
  const n = TRIAL_ALLOWANCE[kind];
  const error = kind === "leads"
    ? `Your free trial includes ${n} leads, and you've found them all. Start your plan now to keep searching — everything you've found is saved.`
    : `Your free trial includes ${n} DMs, and you've written them all. Start your plan now to keep going — every DM you've written is saved.`;
  return json(402, { error, code: TRIAL_LIMIT, kind, limit: n });
}
