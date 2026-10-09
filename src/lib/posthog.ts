/**
 * PostHog product analytics — the one place the app talks to it.
 *
 * Off unless `VITE_POSTHOG_PROJECT_TOKEN` is set: every export is then a no-op,
 * so a build without it sends nothing. The token (`phc_...`) is public by
 * design, safe in the bundle like the Supabase anon key.
 *
 * Pageviews follow client-side navigation on their own (`defaults` turns on
 * history-change capture), so no route code calls this module.
 */
import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

let enabled = false;

/** Called once from index.tsx, before the app renders. */
export function initPostHog(): void {
    if (!KEY || enabled) return;
    posthog.init(KEY, {
        api_host: HOST,
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
    });
    enabled = true;
}

/** Ties this browser's events to a signed-in account; `null` on sign-out. */
export function identifyUser(user: { id: string; email?: string | null } | null): void {
    if (!enabled) return;
    if (user) posthog.identify(user.id, user.email ? { email: user.email } : undefined);
    else if (posthog._isIdentified()) posthog.reset();
}

/** Attached to every later event from this browser (e.g. the landing variant). */
export function registerProperties(props: Record<string, unknown>): void {
    if (enabled) posthog.register(props);
}

export function captureEvent(name: string, props: Record<string, unknown> = {}): void {
    if (enabled) posthog.capture(name, props);
}
