// Owner-only admin API for the /admin page.
//
// Deploy: supabase functions deploy admin-api        (keep gateway JWT check ON)
// Secrets: ADMIN_EMAILS — comma-separated owner emails (lowercase compare)
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.)
//
// Auth model (two layers):
//   1. The gateway requires a valid Supabase JWT (function deployed WITHOUT
//      --no-verify-jwt).
//   2. This function resolves the JWT to a user and requires their email to be
//      in the ADMIN_EMAILS secret. Everyone else gets 403.
// All privileged reads/writes then use the service-role client (bypasses RLS).
//
// POST JSON: { action: 'overview' | 'users' | 'activate' | 'revoke',
//              email?, page?, perPage? }

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const MONTHLY_PRICE = 197;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Layer 2 auth: resolve JWT → user → admin allowlist ──────────────────
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!jwt) return json(401, { error: "missing bearer token" });

  const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
  if (authErr || !user?.email) return json(401, { error: "invalid token" });

  const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return json(403, { error: "not an admin" });
  }

  // ── Parse request ────────────────────────────────────────────────────────
  let body: { action?: string; email?: string; page?: number; perPage?: number };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid JSON body" });
  }

  const action = body.action ?? "";

  try {
    // ── overview ────────────────────────────────────────────────────────────
    if (action === "overview") {
      // Count all auth users by paging (fine at this scale).
      let totalUsers = 0;
      let page = 1;
      for (;;) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        totalUsers += data.users.length;
        if (data.users.length < 1000) break;
        page += 1;
      }

      const { data: subs, error: subsErr } = await sb
        .from("subscriptions")
        .select("status");
      if (subsErr) throw subsErr;

      const active = (subs ?? []).filter((s) => s.status === "active").length;
      const cancelled = (subs ?? []).filter((s) => s.status === "cancelled").length;
      const pending = Math.max(0, totalUsers - active - cancelled);

      // DMs generated this month — read server-side dm_usage defensively
      // (current app tracks usage client-side, so this may be 0).
      let dmsThisMonth = 0;
      try {
        const month = new Date().toISOString().slice(0, 7);
        const { data: usage } = await sb.from("dm_usage").select("used").eq("month", month);
        dmsThisMonth = (usage ?? []).reduce((sum, r) => sum + (r.used ?? 0), 0);
      } catch {
        dmsThisMonth = 0;
      }

      return json(200, {
        totalUsers,
        subscriptions: { active, pending, cancelled },
        estMRR: active * MONTHLY_PRICE,
        dmsThisMonth,
      });
    }

    // ── users ────────────────────────────────────────────────────────────────
    if (action === "users") {
      const page = Math.max(1, Number(body.page) || 1);
      const perPage = Math.min(200, Math.max(1, Number(body.perPage) || 100));

      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const ids = data.users.map((u) => u.id);
      const { data: subs, error: subsErr } = await sb
        .from("subscriptions")
        .select("user_id, plan, status")
        .in("user_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
      if (subsErr) throw subsErr;

      const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));
      const users = data.users.map((u) => {
        const sub = subByUser.get(u.id);
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
        return {
          id: u.id,
          email: u.email ?? "",
          name: name || null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          status: sub?.status ?? "pending",
          plan: sub?.plan ?? null,
        };
      });

      return json(200, { users, page, perPage, hasMore: data.users.length === perPage });
    }

    // ── activate / revoke ────────────────────────────────────────────────────
    if (action === "activate" || action === "revoke") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email) return json(400, { error: "email is required" });

      const { data: userId, error: rpcErr } = await sb.rpc("get_user_id_by_email", {
        p_email: email,
      });
      if (rpcErr) throw rpcErr;
      if (!userId) {
        return json(404, {
          error: "No account found for that email — ask the customer to sign up first.",
        });
      }

      if (action === "activate") {
        const { error } = await sb.from("subscriptions").upsert(
          { user_id: userId, plan: "pro", status: "active", updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
        if (error) throw error;
        return json(200, { ok: true, activated: email });
      }

      const { error } = await sb
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      return json(200, { ok: true, revoked: email });
    }

    return json(400, { error: `unknown action: ${action}` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "internal error";
    console.error(`[admin-api] ${action} failed:`, msg);
    return json(500, { error: msg });
  }
});
