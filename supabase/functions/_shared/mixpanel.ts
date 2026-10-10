// Server-side Mixpanel — billing events the browser can't see.
//
// Used by: whop-webhook (subscription started / renewed / cancelled, renewal
// payment failed). Whop takes payment in its own iframe and tells us the
// outcome by webhook, so revenue and churn can only be tracked from here.
//
// Secret (supabase secrets set …) — optional:
//   MIXPANEL_TOKEN — the same project token as VITE_MIXPANEL_TOKEN; unset = off
//
// distinct_id is the Supabase user id, the same id the browser passes to
// mixpanel.identify — so these events land on the profile that already holds
// the visitor's page views and checkout events.
//
// Like owner alerts, analytics never throws and never holds up the webhook
// response: every send goes through runInBackground.

import { runInBackground } from "./notify.ts";

// The project lives in Mixpanel's EU data residency; the US host rejects it.
const API = "https://api-eu.mixpanel.com";

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const text = await res.text().catch(() => "");
  // Both endpoints answer 200 with "0" when they reject the payload.
  if (!res.ok || text.trim() === "0") console.error(`[mixpanel] ${path} ${res.status}: ${text}`);
}

/** `$insert_id` allows only ≤36 alphanumerics/dashes; a hash fits any key. */
async function toInsertId(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tracks one event. `dedupeKey` makes the send idempotent — pass the webhook
 * id, so Whop's retries of one delivery count once.
 */
export function trackServer(
  distinctId: string,
  event: string,
  props: Record<string, unknown>,
  dedupeKey: string,
): Promise<void> {
  const token = Deno.env.get("MIXPANEL_TOKEN");
  if (!token) return Promise.resolve();
  const time = Date.now();
  return runInBackground(toInsertId(`${event}:${dedupeKey}`).then((insertId) =>
    post("/track", [{
      event,
      properties: {
        ...props,
        token,
        distinct_id: distinctId,
        time,
        $insert_id: insertId,
        platform: "server",
      },
    }])
  ));
}

/** Sets fields on the user's Mixpanel profile. */
export function setServerProfile(distinctId: string, props: Record<string, unknown>): Promise<void> {
  const token = Deno.env.get("MIXPANEL_TOKEN");
  if (!token) return Promise.resolve();
  return runInBackground(post("/engage#profile-set", [{
    $token: token,
    $distinct_id: distinctId,
    $set: props,
  }]));
}
