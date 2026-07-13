// Start an Apify scrape run — server-side so APIFY_API_KEY never reaches the browser.
//
// Deploy: supabase functions deploy start-scrape          (gateway JWT check ON)
// Secrets: APIFY_API_KEY (required), APIFY_FOLLOWERS_ACTOR_ID (optional)
//
// POST JSON (keyword mode):
//   { mode: 'keyword', search, searchType, searchLimit, enhanceUserSearchWithFacebookPage }
// POST JSON (followers mode):
//   { mode: 'followers', usernames, type, maxItem, profileEnriched }
// → { runId: string }

import { createClient } from "npm:@supabase/supabase-js@2";

const APIFY_BASE = "https://api.apify.com/v2";
const KEYWORD_ACTOR = "apify~instagram-search-scraper";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  // Require an authenticated user — only signed-in users may spend Apify credits.
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!jwt) return json(401, { error: "missing bearer token" });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
  if (authErr || !user) return json(401, { error: "authentication required" });

  const apiKey = Deno.env.get("APIFY_API_KEY");
  if (!apiKey) return json(500, { error: "APIFY_API_KEY not configured on the server" });

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid JSON body" });
  }

  const mode = body?.mode;
  let actorId: string;
  let input: Record<string, unknown>;

  if (mode === "keyword") {
    const searchLimit = Math.max(1, Math.min(250, Number(body.searchLimit) || 50));
    actorId = KEYWORD_ACTOR;
    input = {
      search: body.search,
      searchType: body.searchType,
      searchLimit,
      enhanceUserSearchWithFacebookPage: body.enhanceUserSearchWithFacebookPage ?? false,
    };
  } else if (mode === "followers") {
    actorId = Deno.env.get("APIFY_FOLLOWERS_ACTOR_ID") ?? "asIjo32NQuUHP4Fnc";
    input = {
      username: body.usernames,
      type: body.type,
      maxItem: body.maxItem,
      profileEnriched: body.profileEnriched ?? false,
    };
  } else {
    return json(400, { error: 'invalid mode — expected "keyword" or "followers"' });
  }

  try {
    const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // deno-lint-ignore no-explicit-any
      throw new Error(`Apify ${res.status}: ${JSON.stringify((err as any)?.error?.message ?? err)}`);
    }
    const data = await res.json();
    const runId: string = data?.data?.id;
    if (!runId) throw new Error("No run ID returned from Apify");
    return json(200, { runId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed to start scrape";
    console.error("[start-scrape]", msg);
    return json(500, { error: msg });
  }
});
