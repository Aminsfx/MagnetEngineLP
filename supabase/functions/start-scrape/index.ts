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
//
// The actor input schemas live in ../_shared/apify.ts.

import { json, servePost } from "../_shared/http.ts";
import { APIFY_BASE, buildActorRun } from "../_shared/apify.ts";

servePost("start-scrape", async ({ body }) => {
  const apiKey = Deno.env.get("APIFY_API_KEY");
  if (!apiKey) return json(500, { error: "APIFY_API_KEY not configured on the server" });

  const run = buildActorRun(body);
  if (!run) return json(400, { error: 'invalid mode — expected "keyword" or "followers"' });

  const res = await fetch(`${APIFY_BASE}/acts/${run.actorId}/runs?token=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(run.input),
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
});
