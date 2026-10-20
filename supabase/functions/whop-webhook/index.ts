// Whop webhook → automatic subscription activation.
//
// Deploy: supabase functions deploy whop-webhook --no-verify-jwt
// Secrets: WHOP_WEBHOOK_SECRET (required), WHOP_PLAN_ID_MONTHLY, WHOP_PLAN_ID_ANNUAL (the trial plans),
//          WHOP_PLAN_ID_MONTHLY_NOW, WHOP_PLAN_ID_ANNUAL_NOW (optional — the no-trial "pay in full now" plans),
//          WHOP_API_KEY (optional — ends a trial membership once its account pays in full early),
//          POSTHOG_PROJECT_TOKEN + POSTHOG_HOST (optional — the funnel's payment step)
//
// Trials: a first activation of a trialing membership records trial_ends_at,
// which is what the 500-lead / 500-DM trial allowance keys on (_shared/trial.ts).
// A pay-now plan activating during that trial ends it: trial_ends_at is
// cleared and the old trialing membership is cancelled, so the account isn't
// charged again when the trial would have converted.
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
import { captureServer } from "../_shared/posthog.ts";
import { PLAN_PRICES, planLabel as labelFor } from "../_shared/prices.ts";
import { inTrial, trialEndFrom } from "../_shared/trial.ts";

// Activation is gated to the canonical "membership became valid" event AND a
// recognized plan id (see below). payment.succeeded is intentionally NOT an
// activation trigger — it fires for any payment/amount/product in the Whop
// company and would let a cheaper/free offering unlock the paid tier.
const ACTIVATE_EVENTS = ["membership.activated"];
const REVOKE_EVENTS = ["membership.deactivated"];
const HANDLED_EVENTS = [...ACTIVATE_EVENTS, ...REVOKE_EVENTS];

// deno-lint-ignore no-explicit-any
async function getFirstName(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return (data?.user?.user_metadata?.first_name as string | undefined) || null;
  } catch {
    return null;
  }
}

/**
 * End the trialing membership an account just paid in full early, so Whop
 * doesn't charge it again when the trial would have converted. Without
 * WHOP_API_KEY, or if Whop refuses, the Owner is told to cancel it by hand.
 */
async function endTrialMembership(membershipId: string, email: string): Promise<void> {
  const byHand = [
    email,
    `Cancel their trial membership ${membershipId} in Whop now, or they'll be charged again when the trial ends.`,
  ];
  const key = Deno.env.get("WHOP_API_KEY");
  if (!key) {
    await notifyOwner({ title: "⚠️ Trial paid early — cancel the trial by hand", lines: byHand });
    return;
  }
  try {
    const res = await fetch(`https://api.whop.com/api/v1/memberships/${encodeURIComponent(membershipId)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // false = end now: a trialing membership ends without being charged.
      body: JSON.stringify({ cancel_at_period_end: false, reason: "Trial ended early: paid in full" }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error(`[whop-webhook] cancelling trial membership ${membershipId} failed:`, e);
    await notifyOwner({ title: "⚠️ Couldn't cancel a paid-early trial", lines: byHand });
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

  // ── Verify Standard Webhooks signature ──────────────────────────────────
  try {
    const wh = new Webhook(secret);
    wh.verify(body, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
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
  const email: string | undefined = (
    data.user?.email ?? data.member?.email ?? undefined
  )?.toLowerCase?.();
  const planId: string | undefined = data.plan?.id ?? data.plan_id;
  const membershipId: string | undefined =
    typeof data.id === "string" && data.id.startsWith("mem_") ? data.id : undefined;

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

  if (ACTIVATE_EVENTS.includes(type)) {
    // Hard gate: only the two configured plans grant access. Any other plan in
    // the Whop company (free tier, add-ons, unrelated products) is ignored, so
    // a signed event for a cheaper offering can't unlock the paid tier. If the
    // plan secrets aren't configured, fail closed (activate no one) — the owner
    // can still activate manually from /admin.
    const annualPlans = [
      Deno.env.get("WHOP_PLAN_ID_ANNUAL"),
      Deno.env.get("WHOP_PLAN_ID_ANNUAL_NOW"),
    ].filter(Boolean);
    const knownPlans = [
      Deno.env.get("WHOP_PLAN_ID_MONTHLY"),
      Deno.env.get("WHOP_PLAN_ID_MONTHLY_NOW"),
      ...annualPlans,
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
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("status, trial_ends_at, whop_membership_id")
      .eq("user_id", userId)
      .maybeSingle();
    const firstActivation = existing?.status !== "active";
    const billingCycle = annualPlans.includes(planId) ? "annual" : "monthly";

    // The trial is recorded only on a first activation, so accounts that were
    // already active when the allowance shipped never get one. A different,
    // non-trial membership arriving while the trial runs is the account paying
    // in full early: the trial ends here.
    const paidEarly = !firstActivation && inTrial(existing?.trial_ends_at) && !!membershipId &&
      membershipId !== existing?.whop_membership_id && trialEndFrom(data) === null;

    // Single-plan model: 'pro' is the stored value for every activation.
    const row: Record<string, unknown> = {
      user_id: userId,
      plan: "pro",
      status: "active",
      updated_at: new Date().toISOString(),
    };
    if (membershipId) row.whop_membership_id = membershipId;
    if (firstActivation) row.trial_ends_at = trialEndFrom(data);
    if (paidEarly) row.trial_ends_at = null;

    let { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });
    if (error && /trial_ends_at|whop_membership_id/.test(error.message)) {
      // Migration 0003 not applied yet: activate anyway, without the trial.
      console.error("[whop-webhook] subscriptions is missing the trial columns — apply migration 0003:", error.message);
      delete row.trial_ends_at;
      delete row.whop_membership_id;
      ({ error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" }));
    }
    if (error) return json(500, { error: error.message });

    if (paidEarly) {
      const trialMembership = existing?.whop_membership_id as string | null | undefined;
      if (trialMembership) {
        await endTrialMembership(trialMembership, email);
      } else {
        await notifyOwner({
          title: "⚠️ Trial paid early — cancel the trial by hand",
          lines: [email, "Their trial membership wasn't recorded. Cancel it in Whop, or they'll be charged again when it ends."],
        });
      }
      await notifyOwner({ title: "⬆️ Trial paid in full early", lines: [email, `Plan: ${labelFor(billingCycle)}`] });
    }

    // Post-payment email sequence (best-effort — never fails the webhook):
    //   1. payment confirmed, immediately
    //   2. onboarding / setup guide, 15 minutes later
    if (firstActivation) {
      // The funnel's payment step: Whop's own confirmation, so it is the event
      // revenue is summed from (`price`). Renewals re-fire membership.activated
      // and are not counted.
      await captureServer(userId, "subscription_started", {
        billing_cycle: billingCycle,
        price: PLAN_PRICES[billingCycle],
        currency: "USD",
        $set: { plan: "pro", subscription_status: "active", billing_cycle: billingCycle },
      });

      const firstName = await getFirstName(supabase, userId);
      const planLabel = labelFor(billingCycle);
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

  // membership.deactivated → revoke access, unless it is a membership the
  // account has moved off: the trial cancelled after paying in full early.
  const { data: current } = await supabase
    .from("subscriptions")
    .select("whop_membership_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipId && current?.whop_membership_id && membershipId !== current.whop_membership_id) {
    return json(202, { skipped: "superseded membership", membership: membershipId });
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return json(500, { error: error.message });
  await notifyOwner({ title: "❌ Membership cancelled", lines: [email, "Access revoked."] });
  return json(202, { ok: true, revoked: email });
});
