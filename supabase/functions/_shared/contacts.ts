// Resend Contacts sync — keeps MagnetEngine users in Resend segments so the
// Owner can email all of them with a Broadcast (Resend dashboard → Broadcasts),
// which handles the unsubscribe link + list hygiene for us.
//
// Used by: auth-email-hook (new signup → "all users"), whop-webhook + admin-api
// (activation → "customers"), admin-api `sync-contacts` (one-off backfill).
//
// Secrets (supabase secrets set …):
//   RESEND_API_KEY            — same key as transactional email
//   RESEND_SEGMENT_ALL        — segment id every user is added to
//   RESEND_SEGMENT_CUSTOMERS  — optional; segment id for paying members
//
// We never send `unsubscribed`, so syncing can't re-subscribe someone who
// clicked unsubscribe in a Broadcast. Never throws.

const RESEND_API = "https://api.resend.com";

export interface ContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export type SegmentKind = "all" | "customers";

/** Segment ids for the given kinds, skipping any that aren't configured. */
export function segmentIds(kinds: SegmentKind[]): string[] {
  const env: Record<SegmentKind, string> = {
    all: "RESEND_SEGMENT_ALL",
    customers: "RESEND_SEGMENT_CUSTOMERS",
  };
  return kinds.map((k) => Deno.env.get(env[k]) ?? "").filter(Boolean);
}

async function resend(path: string, apiKey: string, body?: unknown): Promise<Response> {
  const init: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  let res = await fetch(`${RESEND_API}${path}`, init);
  if (res.status === 429) {
    // Default limit is a handful of requests/second per team — back off once.
    await new Promise((r) => setTimeout(r, 1100));
    res = await fetch(`${RESEND_API}${path}`, init);
  }
  return res;
}

/** Create the contact in the given segments; if it already exists, add the
 * existing contact to those segments instead. */
export async function syncContact(
  contact: ContactInput,
  segments: string[],
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || segments.length === 0) {
    return { ok: false, error: "RESEND_API_KEY or segment id not set" };
  }
  const email = contact.email.trim().toLowerCase();

  try {
    const created = await resend("/contacts", apiKey, {
      email,
      ...(contact.firstName ? { first_name: contact.firstName } : {}),
      ...(contact.lastName ? { last_name: contact.lastName } : {}),
      segments: segments.map((id) => ({ id })),
    });
    if (created.ok) return { ok: true };
    const createDetail = await created.text().catch(() => "");

    // Most likely "already exists" — attach the existing contact to each segment.
    for (const id of segments) {
      const added = await resend(`/contacts/${encodeURIComponent(email)}/segments/${id}`, apiKey);
      if (!added.ok) {
        const detail = await added.text().catch(() => "");
        console.error(
          `[contacts] ${email}: create ${created.status} (${createDetail}); add-to-segment ${added.status} (${detail})`,
        );
        return { ok: false, error: `Resend responded ${added.status}` };
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network error";
    console.error(`[contacts] sync failed for ${email}: ${msg}`);
    return { ok: false, error: msg };
  }
}
