import { describe, it, expect } from 'vitest';
import { PRICES } from './plans';
import { PLAN_PRICES, planLabel } from '../../supabase/functions/_shared/prices.ts';

/**
 * The app shows PRICES; the Edge Functions email, alert and report from
 * PLAN_PRICES. They are two files because one runs in the browser and one in
 * Deno, and this is what keeps them one price: the payment-confirmed email
 * once said $197/mo for a $147 plan because a function typed its own figure.
 */
describe('plan prices', () => {
  it('match what the app shows on /activate', () => {
    expect(PLAN_PRICES.monthly).toBe(PRICES.monthly.amount);
    expect(PLAN_PRICES.annual).toBe(PRICES.annual.amount);
  });

  it('name the plan in the email with the price the buyer paid', () => {
    expect(planLabel('monthly')).toBe(`Monthly (${PRICES.monthly.label}/mo)`);
    expect(planLabel('annual')).toBe(`Annual (${PRICES.annual.label}/yr)`);
  });
});
