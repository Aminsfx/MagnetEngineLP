/**
 * Mixpanel product analytics — the one place the app talks to it.
 *
 * Consent first. MagnetEngine has EU, UK and California visitors, so Mixpanel
 * starts opted OUT and sends nothing until the visitor accepts the consent
 * banner (`ConsentBanner`). The choice is kept here under our own key, because
 * Mixpanel's `opt_out_tracking_by_default` writes an opt-out record on init
 * that looks the same as a visitor who said no — the banner could not tell
 * "never asked" from "declined".
 *
 * Off entirely unless `VITE_MIXPANEL_TOKEN` is set: every export is then a
 * no-op and the banner never shows. The token is public by design, safe in
 * the bundle like the Supabase anon key.
 *
 * Identity: `identifyUser` on sign-in, sign-up and every reload while signed
 * in (AuthContext), `resetUser` on sign-out. The id is the Supabase user id —
 * never the email, which can change.
 */
import mixpanel from 'mixpanel-browser';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
const CONSENT_KEY = 'me_analytics_consent';

export type Consent = 'granted' | 'denied' | 'unset';

let ready = false;
/** Who is signed in, so consent given later can still link them. */
let currentUser: { id: string; email?: string | null } | null = null;
/** Super properties, re-applied after `reset()` wipes them. */
const supers: Record<string, unknown> = { platform: 'web' };

function readConsent(): Consent {
    try {
        const v = localStorage.getItem(CONSENT_KEY);
        return v === 'granted' || v === 'denied' ? v : 'unset';
    } catch {
        return 'unset';
    }
}

const granted = () => ready && readConsent() === 'granted';

/** Called once from index.tsx, before the app renders. */
export function initAnalytics(): void {
    if (!TOKEN || ready) return;
    mixpanel.init(TOKEN, {
        opt_out_tracking_by_default: true,
        track_pageview: 'url-with-path',
        persistence: 'localStorage',
        debug: import.meta.env.DEV,
    });
    mixpanel.register(supers);
    ready = true;
    // A visitor who accepted on an earlier visit carries on being tracked.
    if (readConsent() === 'granted') mixpanel.opt_in_tracking();
}

/** Whether the consent banner has anything to ask. */
export function analyticsEnabled(): boolean {
    return ready;
}

export function consent(): Consent {
    return readConsent();
}

export function setConsent(choice: 'granted' | 'denied'): void {
    try {
        localStorage.setItem(CONSENT_KEY, choice);
    } catch {
        /* storage unavailable: the choice holds for this page only */
    }
    if (!ready) return;
    if (choice === 'granted') {
        mixpanel.opt_in_tracking();
        if (currentUser) identifyUser(currentUser);
    } else {
        mixpanel.opt_out_tracking();
    }
}

/** Links this browser's events to an account. Safe to call on every reload. */
export function identifyUser(user: { id: string; email?: string | null }): void {
    currentUser = user;
    if (!granted()) return;
    mixpanel.identify(user.id);
    if (user.email) mixpanel.people.set({ $email: user.email });
}

/** On sign-out: the next person on this browser starts as a new visitor. */
export function resetUser(): void {
    currentUser = null;
    if (!ready) return;
    mixpanel.reset();
    mixpanel.register(supers);
}

/** Properties attached to every later event (e.g. the landing variant). */
export function registerSuper(props: Record<string, unknown>): void {
    Object.assign(supers, props);
    if (ready) mixpanel.register(props);
}

/** Sets profile fields on the identified user. Call after `identifyUser`. */
export function setProfile(props: Record<string, unknown>): void {
    if (granted() && currentUser) mixpanel.people.set(props);
}

export function track(event: string, props: Record<string, unknown> = {}): void {
    if (granted()) mixpanel.track(event, props);
}
