// Polar.sh webhook → automatic subscription activation.
//
// Deploy: supabase functions deploy polar-webhook --no-verify-jwt
// Secrets: POLAR_WEBHOOK_SECRET, POLAR_PRODUCT_ID_MONTHLY, POLAR_PRODUCT_ID_ANNUAL
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.)
//
// Security model: the `subscriptions` table has no client-side write policy —
// only this function (service role) and the owner can activate accounts.
// Signature verification is mandatory; unverified bodies are never processed.

import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:standardwebhooks@1.0.0";

const HANDLED_EVENTS = [
  "order.paid",
  "subscription.active",
  "subscription.canceled",
  "subscription.revoked",
];

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const rawSecret = Deno.env.get("POLAR_WEBHOOK_SECRET") ?? "";
  if (!rawSecret) return json(500, { error: "POLAR_WEBHOOK_SECRET not set" });
  const secret = rawSecret.startsWith("whsec_") ? rawSecret.slice(6) : rawSecret;

  const body = await req.text();

  // ── Verify Standard Webhooks signature (Polar uses svix-style headers) ──
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

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const type = event.type ?? "";
  if (!HANDLED_EVENTS.includes(type)) {
    return json(202, { skipped: true, reason: `unhandled event type: ${type}` });
  }

  // Payload versions vary slightly — cover the known shapes.
  const data = (event.data ?? {}) as Record<string, any>;
  const email: string | undefined = (
    data.customer?.email ?? data.user?.email ?? undefined
  )?.toLowerCase?.();
  const productId: string | undefined =
    data.product_id ?? data.product?.id ?? data.items?.[0]?.product_id;

  if (!email) {
    console.warn(`[polar-webhook] ${type}: no customer email in payload`);
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
    console.error(`[polar-webhook] RPC error: ${rpcError.message}`);
    return json(500, { error: rpcError.message });
  }
  if (!userId) {
    console.warn(`[polar-webhook] ${type}: no user matches ${email} — activate manually`);
    return json(202, { skipped: "no matching user" });
  }

  if (type === "order.paid" || type === "subscription.active") {
    const knownProducts = [
      Deno.env.get("POLAR_PRODUCT_ID_MONTHLY"),
      Deno.env.get("POLAR_PRODUCT_ID_ANNUAL"),
    ].filter(Boolean);
    if (productId && knownProducts.length > 0 && !knownProducts.includes(productId)) {
      console.warn(`[polar-webhook] unknown product ${productId} — activating anyway`);
    }

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
    return json(202, { ok: true, activated: email });
  }

  // subscription.canceled / subscription.revoked → revoke access
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return json(500, { error: error.message });
  return json(202, { ok: true, revoked: email });
});
