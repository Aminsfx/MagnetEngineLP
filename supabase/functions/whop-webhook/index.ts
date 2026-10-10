// Whop webhook → automatic subscription activation.
//
// Deploy: supabase functions deploy whop-webhook --no-verify-jwt
// Secrets: WHOP_WEBHOOK_SECRET (required), WHOP_PLAN_ID_MONTHLY, WHOP_PLAN_ID_ANNUAL (optional sanity check),
//          MIXPANEL_TOKEN (optional — billing events in Mixpanel)
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.)
//
// Security model: the `subscriptions` table has no client-side write policy —
// only this function / admin-api (service role) and the owner can activate
// accounts. Signature verification is mandatory; unverified bodies are never
// processed. Whop signs webhooks with the Standard Webhooks spec (same as
// svix): headers `webhook-id`, `webhook-timestamp`, `webhook-signature`,
// HMAC-SHA256, signature format `v1,<base64>`.
//
// Matching is by email: the Whop checkout on /activate is prefilled and locked
// to the customer's MagnetEngine signup email, so payloads match accounts.

import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { onboardingEmail, paymentConfirmedEmail, sendEmail } from "../_shared/emails.ts";
import { notifyOwner, runInBackground } from "../_shared/notify.ts";
import { segmentIds, syncContact } from "../_shared/contacts.ts";
import { setServerProfile, trackServer } from "../_shared/mixpanel.ts";

// Activation is gated to the canonical "membership became valid" event AND a
// recognized plan id (see below). payment.succeeded is intentionally NOT an
// activation trigger — it fires for any payment/amount/product in the Whop
// company and would let a cheaper/free offering unlock the paid tier.
const ACTIVATE_EVENTS = ["membership.activated"];
const REVOKE_EVENTS = ["membership.deactivated"];
// Analytics only: a failed charge never changes access here — access follows
// membership.deactivated alone.
const PAYMENT_FAILED_EVENTS = ["payment.failed"];
const HANDLED_EVENTS = [...ACTIVATE_EVENTS, ...REVOKE_EVENTS, ...PAYMENT_FAILED_EVENTS];

// Mirrors PRICES in src/lib/plans.ts (whole dollars) — Mixpanel's revenue.
const PLAN_PRICES = { monthly: 147, annual: 1470 } as const;

// deno-lint-ignore no-explicit-any
async function getFirstName(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return (data?.user?.user_metadata?.first_name as string | undefined) || null;
  } catch {
    return null;
  }
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const rawSecret = Deno.env.get("WHOP_WEBHOOK_SECRET") ?? "";
  if (!rawSecret) return json(500, { error: "WHOP_WEBHOOK_SECRET not set" });
  // standardwebhooks expects a base64 secret. `whsec_`-prefixed secrets are
  // already base64 after the prefix; raw Whop secrets need encoding first.
  const secret = rawSecret.startsWith("whsec_") ? rawSecret.slice(6) : btoa(rawSecret);

  const body = await req.text();
  const webhookId = req.headers.get("webhook-id") ?? "";

  // ── Verify Standard Webhooks signature ──────────────────────────────────
  try {
    const wh = new Webhook(secret);
    wh.verify(body, {
      "webhook-id": webhookId,
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    });
  } catch {
    return json(403, { error: "invalid signature" });
  }

  let event: { type?: string; action?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  // Whop payloads carry the event name in `type` (v1); tolerate `action` too.
  const type = event.type ?? event.action ?? "";
  if (!HANDLED_EVENTS.includes(type)) {
    return json(202, { skipped: true, reason: `unhandled event type: ${type}` });
  }

  // deno-lint-ignore no-explicit-any
  const data = (event.data ?? {}) as Record<string, any>;
  // Memberships carry `user`/`member`; a payment may carry `customer_email`.
  const email: string | undefined = (
    data.user?.email ?? data.member?.email ?? data.customer_email ?? undefined
  )?.toLowerCase?.();
  const planId: string | undefined = data.plan?.id ?? data.plan_id;

  if (!email) {
    console.warn(`[whop-webhook] ${type}: no customer email in payload`);
    return json(202, { skipped: true, reason: "no customer email" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userId, error: rpcError } = await supabase.rpc(
    "get_user_id_by_email",
    { p_email: email },
  );

  if (rpcError) {
    console.error(`[whop-webhook] RPC error: ${rpcError.message}`);
    return json(500, { error: rpcError.message });
  }
  if (!userId) {
    console.warn(`[whop-webhook] ${type}: no user matches ${email} — activate manually via /admin`);
    if (ACTIVATE_EVENTS.includes(type)) {
      await notifyOwner({
        title: "⚠️ Payment with no matching account",
        lines: [`Whop email: ${email}`, `Plan: ${planId ?? "(none)"}`, "Find their signup email and activate them in /admin."],
      });
    }
    return json(202, { skipped: "no matching user" });
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (PAYMENT_FAILED_EVENTS.includes(type)) {
    // Only a paying customer's failed charge is a renewal failure. A refused
    // first checkout is already tracked in the browser (`payment_failed` on
    // /activate), where the Operator saw it happen.
    if (existing?.status === "active") {
      await trackServer(userId, "renewal_payment_failed", {
        ...(data.decline_code ? { error_code: String(data.decline_code) } : {}),
        ...(data.failure_message ? { error_message: String(data.failure_message) } : {}),
      }, webhookId);
    }
    return json(202, { ok: true, tracked: existing?.status === "active" });
  }

  if (ACTIVATE_EVENTS.includes(type)) {
    // Hard gate: only the two configured plans grant access. Any other plan in
    // the Whop company (free tier, add-ons, unrelated products) is ignored, so
    // a signed event for a cheaper offering can't unlock the paid tier. If the
    // plan secrets aren't configured, fail closed (activate no one) — the owner
    // can still activate manually from /admin.
    const knownPlans = [
      Deno.env.get("WHOP_PLAN_ID_MONTHLY"),
      Deno.env.get("WHOP_PLAN_ID_ANNUAL"),
    ].filter(Boolean);
    if (!planId || knownPlans.length === 0 || !knownPlans.includes(planId)) {
      console.warn(
        `[whop-webhook] ${type} for ${email}: plan ${planId ?? "(none)"} not in configured plans — skipping (activate via /admin if legit)`,
      );
      await notifyOwner({
        title: "⚠️ Payment on an unrecognized plan",
        lines: [email, `Plan: ${planId ?? "(none)"}`, "Not activated — activate in /admin if legit."],
      });
      return json(202, { skipped: "unrecognized plan" });
    }

    // Was this account already active? Renewals re-fire membership.activated —
    // only a pending/cancelled → active transition should trigger the
    // payment-confirmed + onboarding emails.
    const firstActivation = existing?.status !== "active";

    // Single-plan model: 'pro' is the stored value for every activation.
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "pro",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return json(500, { error: error.message });

    const billingCycle = planId === Deno.env.get("WHOP_PLAN_ID_ANNUAL") ? "annual" : "monthly";
    await trackServer(
      userId,
      firstActivation ? "subscription_started" : "subscription_renewed",
      { billing_cycle: billingCycle, price: PLAN_PRICES[billingCycle] },
      webhookId,
    );
    await setServerProfile(userId, {
      plan: "pro",
      subscription_status: "active",
      billing_cycle: billingCycle,
      ...(firstActivation ? { subscribed_at: new Date().toISOString() } : {}),
    });

    // Post-payment email sequence (best-effort — never fails the webhook):
    //   1. payment confirmed, immediately
    //   2. onboarding / setup guide, 15 minutes later
    if (firstActivation) {
      const firstName = await getFirstName(supabase, userId);
      const planLabel = billingCycle === "annual"
        ? "Annual ($1,970/yr)"
        : "Monthly ($197/mo)";
      await sendEmail(email, paymentConfirmedEmail(firstName, planLabel), {
        idempotencyKey: `payment-confirmed/${userId}`,
      });
      await sendEmail(email, onboardingEmail(firstName), {
        scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        idempotencyKey: `onboarding/${userId}`,
      });

      await notifyOwner({
        title: "💰 New payment",
        lines: [firstName ? `${firstName} <${email}>` : email, `Plan: ${planLabel}`],
      });
      await runInBackground(
        syncContact({ email, firstName }, segmentIds(["all", "customers"])),
      );
    }

    return json(202, { ok: true, activated: email, emailed: firstActivation });
  }

  // membership.deactivated → revoke access
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return json(500, { error: error.message });
  // Count only a real active → cancelled change, not a repeat delivery or an
  // account that never paid.
  if (existing?.status === "active") {
    await trackServer(userId, "subscription_cancelled", {}, webhookId);
    await setServerProfile(userId, { subscription_status: "cancelled" });
  }
  await notifyOwner({ title: "❌ Membership cancelled", lines: [email, "Access revoked."] });
  return json(202, { ok: true, revoked: email });
});
