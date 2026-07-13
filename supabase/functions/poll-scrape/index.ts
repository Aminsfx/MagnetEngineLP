// Poll an Apify run and return its dataset on completion — server-side so
// APIFY_API_KEY never reaches the browser. The client polls this repeatedly.
//
// Deploy: supabase functions deploy poll-scrape           (gateway JWT check ON)
// Secrets: APIFY_API_KEY (required)
//
// POST JSON: { runId: string }
// → { status: 'RUNNING'|'SUCCEEDED'|'FAILED'|..., items?: any[] }
//   `items` (the raw dataset) is included only when status === 'SUCCEEDED'.

import { createClient } from "npm:@supabase/supabase-js@2";

const APIFY_BASE = "https://api.apify.com/v2";

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

  // Require an authenticated user.
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

  const runId = body?.runId;
  if (!runId || typeof runId !== "string") return json(400, { error: "runId is required" });

  try {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${apiKey}`);
    if (!res.ok) {
      // Transient — let the client keep polling.
      return json(200, { status: "RUNNING" });
    }
    const statusData = await res.json();
    const status: string = statusData?.data?.status ?? "RUNNING";

    if (status === "SUCCEEDED") {
      const datasetId: string = statusData?.data?.defaultDatasetId;
      const itemsRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${apiKey}&clean=true`,
      );
      if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);
      const items = await itemsRes.json();
      return json(200, { status, items });
    }

    return json(200, { status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "poll failed";
    console.error("[poll-scrape]", msg);
    return json(500, { error: msg });
  }
});
