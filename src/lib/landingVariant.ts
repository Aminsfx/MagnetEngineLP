/**
 * Which landing page a visitor came through, for the owner's A/B test.
 *
 * Three pages sell the same product: A at `/`, B at `/lp/b`, C at `/lp/c`.
 * The first one a visitor sees is remembered in this browser and carried to
 * two places the owner can read:
 *  - Google Analytics: a `landing_variant` user property plus the events
 *    `start_trial_click` (a trial button on a landing page) and `sign_up`
 *    (an account created), each tagged with the variant;
 *  - Supabase: `landing_variant` in the new user's metadata, so paying
 *    customers can be counted per page —
 *    `select raw_user_meta_data->>'landing_variant', count(*) from auth.users group by 1;`
 *
 * First touch, not last: a visitor who arrives on B from an ad and comes back
 * later by typing the domain (which shows A) is still B's.
 *
 * Browser storage can be missing or throw (private windows, blocked cookies);
 * every access is guarded and the only cost is an untagged visit.
 */

export type LandingVariant = 'a' | 'b' | 'c';

/** Where each variant lives. A is the site's front door; App.tsx routes these. */
export const LANDING_PATH: Record<LandingVariant, string> = { a: '/', b: '/lp/b', c: '/lp/c' };

const KEY = 'me_landing_variant';

type Gtag = (command: string, ...args: unknown[]) => void;
const gtag = (): Gtag | null => {
    const g = (window as unknown as { gtag?: Gtag }).gtag;
    return typeof g === 'function' ? g : null;
};

const isVariant = (v: unknown): v is LandingVariant => v === 'a' || v === 'b' || v === 'c';

/** The variant this browser first landed on, or null if it never saw one. */
export function landingVariant(): LandingVariant | null {
    try {
        const v = localStorage.getItem(KEY);
        return isVariant(v) ? v : null;
    } catch {
        return null;
    }
}

/** Called by a landing page on mount. Keeps the first variant seen. */
export function rememberLandingVariant(v: LandingVariant): void {
    let first: LandingVariant = v;
    try {
        const stored = localStorage.getItem(KEY);
        if (isVariant(stored)) first = stored;
        else localStorage.setItem(KEY, v);
    } catch {
        /* storage unavailable: tag this visit only */
    }
    gtag()?.('set', 'user_properties', { landing_variant: first });
}

/** A Google Analytics event, tagged with the landing variant when there is one. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
    const variant = landingVariant();
    gtag()?.('event', name, variant ? { ...params, landing_variant: variant } : params);
}
