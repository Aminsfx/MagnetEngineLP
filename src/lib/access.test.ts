import { describe, it, expect } from 'vitest';
import { maySpend, SUBSCRIPTION_INACTIVE_ERROR, PLAN_UNCONFIRMED_ERROR } from '../../supabase/functions/_shared/access.ts';

// The regression: generate-dm, generate-reply and scrape checked only that the
// caller was signed in. Sign-up is open, so any account that never paid could
// call them with its session token and spend the Owner's AI and lookup credit.
describe('who may spend the Owner\'s keys', () => {
  it('lets an active plan through, trial or paid', () => {
    expect(maySpend({ status: 'active' }, false)).toBe(true);
  });

  it('refuses an account that signed up and never paid', () => {
    expect(maySpend({ status: 'pending' }, false)).toBe(false);
  });

  it('refuses a cancelled plan', () => {
    expect(maySpend({ status: 'cancelled' }, false)).toBe(false);
  });

  it('refuses an account with no subscription row at all', () => {
    expect(maySpend(null, false)).toBe(false);
    expect(maySpend(undefined, false)).toBe(false);
    expect(maySpend({ status: null }, false)).toBe(false);
  });

  it('never locks the Owner out of their own product', () => {
    expect(maySpend(null, true)).toBe(true);
    expect(maySpend({ status: 'pending' }, true)).toBe(true);
  });

  it('tells the Operator what to do, and names no provider', () => {
    for (const message of [SUBSCRIPTION_INACTIVE_ERROR, PLAN_UNCONFIRMED_ERROR]) {
      expect(message).not.toMatch(/claude|openai|gemini|anthropic|hiker|apify|supabase/i);
    }
    expect(SUBSCRIPTION_INACTIVE_ERROR).toMatch(/Activate/);
  });
});
