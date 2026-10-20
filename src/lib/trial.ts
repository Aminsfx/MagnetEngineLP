/**
 * The app's side of the free-trial allowance. The rules and the numbers live
 * in supabase/functions/_shared/trial.ts, which the Edge Functions that spend
 * the allowance also import.
 */
import { TRIAL_ALLOWANCE, TRIAL_LIMIT, inTrial } from '../../supabase/functions/_shared/trial.ts';

export { TRIAL_ALLOWANCE, inTrial };

/** Where a trial account that has spent its allowance goes to pay in full. */
export const TRIAL_UPGRADE_PATH = '/activate?upgrade=trial';

/**
 * Did an Edge Function refuse because the trial allowance is spent? Read
 * structurally, like isEmptyCompletion: it is the function's code that counts.
 */
export const isTrialLimit = (error: unknown): boolean =>
    typeof error === 'object' && error !== null
    && (error as { code?: unknown }).code === TRIAL_LIMIT;
