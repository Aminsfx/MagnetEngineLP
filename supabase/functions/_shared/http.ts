// Shared request handling for the Edge Functions.
//
// Every function used to carry its own copy of this ~40-line preamble: the CORS
// object, the json() helper, the OPTIONS/method guard, the bearer-token
// extraction, and the JWT verification. Five copies meant a change to the auth
// policy or the allowed origin was five edits, and the security-critical part —
// the JWT check — was one of the things being copy-pasted.

import { createClient } from "npm:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Service-role client — bypasses RLS, so never hand it to unverified callers. */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface AuthedUser {
  id: string;
  email?: string;
}

export interface HandlerContext<B> {
  body: B;
  user: AuthedUser;
  /** Service-role client, already constructed. */
  sb: ReturnType<typeof serviceClient>;
}

export interface ServeOptions {
  /** Also require the caller's email to be in the ADMIN_EMAILS secret. */
  adminOnly?: boolean;
}

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/**
 * A JWT-gated POST endpoint.
 *
 * Handles preflight, method, bearer extraction, JWT verification, JSON parsing,
 * the admin allowlist when asked, and uncaught errors — so the handler only
 * contains what the function is actually for. `name` is used in error logs.
 */
export function servePost<B = Record<string, unknown>>(
  name: string,
  handler: (ctx: HandlerContext<B>) => Promise<Response>,
  options: ServeOptions = {},
): void {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!jwt) return json(401, { error: "missing bearer token" });

    const sb = serviceClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
    if (authErr || !user) return json(401, { error: "authentication required" });

    if (options.adminOnly && !isAdmin(user.email)) {
      return json(403, { error: "not an admin" });
    }

    let body: B;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid JSON body" });
    }

    try {
      return await handler({ body, user: { id: user.id, email: user.email }, sb });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "request failed";
      console.error(`[${name}]`, msg);
      return json(500, { error: msg });
    }
  });
}
