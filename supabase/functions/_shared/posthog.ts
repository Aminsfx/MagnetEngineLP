// Server-side PostHog — billing events the browser can't see.
//
// Used by: whop-webhook (subscription_started). Whop takes payment in its own
// iframe and confirms it by webhook, so the payment step of the funnel can only
// be trusted from here.
//
// Secrets (supabase secrets set …) — optional, shared with _shared/ai.ts:
//   POSTHOG_PROJECT_TOKEN — the same phc_ project key as VITE_POSTHOG_KEY; unset = off
//   POSTHOG_HOST          — e.g. https://us.i.posthog.com
//
// distinct_id is the Supabase user id, the same id the browser passes to
// posthog.identify — so these events land on the person who already holds the
// visitor's page views and sign-up.
//
// Analytics never throws and never holds up the webhook response: every send
// goes through runInBackground.

import { runInBackground } from "./notify.ts";

export function captureServer(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const token = Deno.env.get("POSTHOG_PROJECT_TOKEN");
  const host = Deno.env.get("POSTHOG_HOST");
  if (!token || !host) return Promise.resolve();
  return runInBackground(
    fetch(`${host.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        event,
        distinct_id: distinctId,
        properties: { ...properties, platform: "server" },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    }).then(async (res) => {
      if (!res.ok) console.error(`[posthog] ${event} ${res.status}: ${await res.text().catch(() => "")}`);
    }),
  );
}
