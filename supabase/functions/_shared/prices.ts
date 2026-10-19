// What the one plan costs, for the Edge Functions: the payment-confirmed email,
// the owner's payment alert, PostHog revenue and the /admin MRR estimate.
//
// The app shows the same prices from PRICES in src/lib/plans.ts, and
// src/lib/prices.test.ts holds the two together. Before this file each
// function typed its own figure, and the email went on saying $197/mo after
// the plan moved to $147.
//
// No Deno globals here by contract: the test imports this file.

export type BillingCycle = "monthly" | "annual";

/** Whole US dollars per billing period. */
export const PLAN_PRICES: Record<BillingCycle, number> = { monthly: 147, annual: 1470 };

/** "Monthly ($147/mo)" / "Annual ($1,470/yr)" — how an email names the plan. */
export function planLabel(cycle: BillingCycle): string {
  const amount = `$${PLAN_PRICES[cycle].toLocaleString("en-US")}`;
  return cycle === "annual" ? `Annual (${amount}/yr)` : `Monthly (${amount}/mo)`;
}
