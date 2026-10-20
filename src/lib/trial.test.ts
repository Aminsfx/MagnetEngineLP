import { describe, it, expect } from 'vitest';
import { TRIAL_ALLOWANCE, inTrial, trialEndFrom, trialLeft } from '../../supabase/functions/_shared/trial.ts';
import { isTrialLimit } from './trial';
import { FunctionError } from './functions';

const now = new Date('2026-10-20T12:00:00Z');
const at = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

describe('the trial allowance', () => {
  it('is 500 leads and 500 DMs', () => {
    expect(TRIAL_ALLOWANCE).toEqual({ leads: 500, dms: 500 });
  });

  it('reads a trialing membership as a trial ending at its period end', () => {
    expect(trialEndFrom({ status: 'trialing', renewal_period_start: at(0), renewal_period_end: at(3) }, now)).toBe(at(3));
  });

  it('reads a 3-day period as a trial even without the trialing status', () => {
    expect(trialEndFrom({ status: 'active', current_period_start: at(0), current_period_end: at(3) }, now)).toBe(at(3));
  });

  it('does not read a paid month or year as a trial', () => {
    expect(trialEndFrom({ status: 'active', renewal_period_start: at(0), renewal_period_end: at(30) }, now)).toBeNull();
    expect(trialEndFrom({ status: 'active', renewal_period_start: at(0), renewal_period_end: at(365) }, now)).toBeNull();
  });

  it('still gives a trialing membership with no dates three days', () => {
    expect(trialEndFrom({ status: 'trialing' }, now)).toBe(at(3));
  });

  it('counts an account as in trial only before its end, and never without one', () => {
    expect(inTrial(at(1), now)).toBe(true);
    expect(inTrial(at(-1), now)).toBe(false);
    // Accounts from before the trial allowance existed have no end date.
    expect(inTrial(null, now)).toBe(false);
    expect(inTrial(undefined, now)).toBe(false);
  });

  it('never reports less than nothing left', () => {
    expect(trialLeft('leads', 120)).toBe(380);
    expect(trialLeft('leads', 700)).toBe(0);
    expect(trialLeft('dms', 0)).toBe(500);
  });

  it('recognises the trial-limit answer from an Edge Function', () => {
    expect(isTrialLimit(new FunctionError('spent', { code: 'trial_limit' }))).toBe(true);
    expect(isTrialLimit(new FunctionError('quota', { code: 'scrape_quota' }))).toBe(false);
    expect(isTrialLimit(new Error('trial_limit'))).toBe(false);
  });
});
