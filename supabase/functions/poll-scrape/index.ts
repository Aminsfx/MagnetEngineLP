// Poll an Apify run and return its dataset on completion — server-side so
// APIFY_API_KEY never reaches the browser. The client polls this repeatedly.
//
// Deploy: supabase functions deploy poll-scrape           (gateway JWT check ON)
// Secrets: APIFY_API_KEY (required)
//
// POST JSON: { runId: string }
// → { status: 'RUNNING'|'SUCCEEDED'|'FAILED'|..., statusMessage?: string, items?: any[] }
//   `items` (the raw dataset) is included only when status === 'SUCCEEDED'.
//   `statusMessage` is the actor's own last word on the run ("scraped 0 items",
//   "account is private", …). A SUCCEEDED run with an empty dataset is the one
//   failure the client cannot otherwise explain, so it is passed through rather
//   than dropped here — the Operator sees the run's reason, not our guess.

import { json, servePost } from "../_shared/http.ts";
import { APIFY_BASE } from "../_shared/apify.ts";

interface Body {
  runId?: string;
}

servePost<Body>("poll-scrape", async ({ body }) => {
  const apiKey = Deno.env.get("APIFY_API_KEY");
  if (!apiKey) return json(500, { error: "APIFY_API_KEY not configured on the server" });

  const runId = body?.runId;
  if (!runId || typeof runId !== "string") return json(400, { error: "runId is required" });

  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${apiKey}`);
  if (!res.ok) {
    // Transient — let the client keep polling.
    return json(200, { status: "RUNNING" });
  }
  const statusData = await res.json();
  const status: string = statusData?.data?.status ?? "RUNNING";
  const statusMessage: string | undefined = statusData?.data?.statusMessage ?? undefined;

  if (status === "SUCCEEDED") {
    const datasetId: string = statusData?.data?.defaultDatasetId;
    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${apiKey}&clean=true`,
    );
    if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);
    const items = await itemsRes.json();
    return json(200, { status, statusMessage, items });
  }

  return json(200, { status, statusMessage });
});
