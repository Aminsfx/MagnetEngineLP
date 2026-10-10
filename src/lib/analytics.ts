/**
 * Mixpanel product analytics — the one place the app talks to it.
 *
 * Tracks every visitor from the first page load; there is no consent prompt
 * (owner decision, 2026-10-09). Off entirely unless `VITE_MIXPANEL_TOKEN` is
 * set: every export is then a no-op. The token is public by design, safe in
 * the bundle like the Supabase anon key.
 *
 * Identity: `identifyUser` on sign-in, sign-up and every reload while signed
 * in (AuthContext), `resetUser` on sign-out. The id is the Supabase user id —
 * never the email, which can change.
 */
import mixpanel from 'mixpanel-browser';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;

let ready = false;
/** Super properties, re-applied after `reset()` wipes them. */
const supers: Record<string, unknown> = { platform: 'web' };

/** Called once from index.tsx, before the app renders. */
export function initAnalytics(): void {
    if (!TOKEN || ready) return;
    mixpanel.init(TOKEN, {
        // The project lives in Mixpanel's EU data residency; the default US
        // host would reject its events.
        api_host: 'https://api-eu.mixpanel.com',
        autocapture: true,
        // Every session is replayed. Replay masks all text and inputs by
        // default — keep it that way: the dashboard renders prospects' bios
        // and DMs, which must never reach a recording.
        record_sessions_percent: 100,
        track_pageview: 'url-with-path',
        persistence: 'localStorage',
        debug: import.meta.env.DEV,
    });
    mixpanel.register(supers);
    ready = true;
    // A consent banner shipped briefly (ee16d6c) and opted every visitor out
    // until they accepted; that record outlives the banner, so clear it — and
    // count the page view init just dropped because of it.
    if (mixpanel.has_opted_out_tracking()) {
        mixpanel.clear_opt_in_out_tracking();
        mixpanel.track_pageview();
    }
    try {
        localStorage.removeItem('me_analytics_consent');
    } catch {
        /* storage unavailable */
    }
}

/** Links this browser's events to an account. Safe to call on every reload. */
export function identifyUser(user: { id: string; email?: string | null }): void {
    if (!ready) return;
    mixpanel.identify(user.id);
    if (user.email) mixpanel.people.set({ $email: user.email });
}

/** On sign-out: the next person on this browser starts as a new visitor. */
export function resetUser(): void {
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
    if (ready) mixpanel.people.set(props);
}

export function track(event: string, props: Record<string, unknown> = {}): void {
    if (ready) mixpanel.track(event, props);
}
