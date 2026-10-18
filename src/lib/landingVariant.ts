/**
 * Which landing page a visitor came through, for the owner's A/B test.
 *
 * Three pages sell the same product: A at `/`, B at `/lp/b`, C at `/lp/c`.
 * A fourth, `/lp/dfy`, sells the done-for-you service instead of the software;
 * it is tagged the same way so its sign-ups can be told apart.
 * The first one a visitor sees is remembered in this browser and written into
 * the new Supabase user's metadata as `landing_variant`, so paying customers
 * can be counted per page —
 * `select raw_user_meta_data->>'landing_variant', count(*) from auth.users group by 1;`
 *
 * First touch, not last: a visitor who arrives on B from an ad and comes back
 * later by typing the domain (which shows A) is still B's.
 *
 * Browser storage can be missing or throw (private windows, blocked cookies);
 * every access is guarded and the only cost is an untagged visit.
 */

export type LandingVariant = 'a' | 'b' | 'c' | 'dfy';

/** Where each variant lives. A is the site's front door; App.tsx routes these. */
export const LANDING_PATH: Record<LandingVariant, string> = { a: '/', b: '/lp/b', c: '/lp/c', dfy: '/lp/dfy' };

const KEY = 'me_landing_variant';

const isVariant = (v: unknown): v is LandingVariant => v === 'a' || v === 'b' || v === 'c' || v === 'dfy';

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
    try {
        if (!isVariant(localStorage.getItem(KEY))) localStorage.setItem(KEY, v);
    } catch {
        /* storage unavailable: this visit goes untagged */
    }
}
