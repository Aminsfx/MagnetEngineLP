BLUEPRINT 2: CSV lead import (Apify/scraper exports)

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Column-mapping logic and data cleaning have enough edge cases to warrant Sonnet.)

GOAL

A third tab "Import CSV" exists in the Campaign Builder. The user drops in a CSV exported from Apify (or any Instagram scraper), the app auto-maps the columns, shows a 5-row preview, and "Add to Queue" turns the rows into Leads in the Approval Queue — identical in shape to scraped leads.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/campaign/CampaignBuilder.tsx` — the tab state is `useState<'search' | 'followers'>` at line ~57; `handleAddToQueue` (line ~189) shows the plan-cap + toast pattern to copy; `onLeadsScraped(toAdd)` is the callback that adds leads.
  - `src/lib/types.ts` — the `Lead` interface (all fields) and the existing-but-unused `ColumnMapping` interface.
  - `src/lib/apify.ts` lines 23–45 — `mapItem()` shows how scraped rows become Leads (`id: crypto.randomUUID()`, `campaignId`, default flags).
- Real inputs, in full:
  - `papaparse` v5 and `@types/papaparse` are ALREADY dependencies — do not install anything.
  - CSV sources are Apify `instagram-search-scraper` / follower-scraper exports. Typical headers: `username`, `fullName`, `biography`, `followersCount`, `followsCount`, `postsCount`, `private`, `verified`, `profilePicUrl`, `businessCategoryName`, `city`. Hand-made sheets may instead use `handle`, `name`, `bio`, `followers`, `ig`, `instagram`.
  - Auto-map header aliases (case-insensitive, ignore spaces/underscores):
    - handle ← username, handle, ig, instagram, user_name, account
    - name ← fullName, name, full_name, display_name
    - followers ← followersCount, followers, follower_count
    - bio ← biography, bio, description, about
    - isPrivate ← private, isPrivate, is_private
- Data shapes / examples:
  - Input row `{username: "@fitwithmarco", fullName: "Marco R", followersCount: "12,400", biography: "Gym owner | Coach", private: "false"}` → output Lead: `{id: <uuid>, campaignId: <one uuid per import>, handle: "fitwithmarco", name: "Marco R", followers: 12400, bio: "Gym owner | Coach", isPrivate: false, status: 'cold', dmSent: false, replied: false, createdAt: <now ISO — only if the Lead type has this field when you build>}` — all other Lead fields omitted/undefined.
  - Follower parsing must handle: `12,400` → 12400; `12.4K`/`12.4k` → 12400; `1.2M` → 1200000; empty/garbage → 0.
  - isPrivate parsing: `true`/`TRUE`/`1`/`yes` → true; everything else → false.
  - Handle cleaning: strip leading `@`, trim, lowercase, drop full URLs down to the path segment (`https://instagram.com/foo/` → `foo`). Rows with an empty handle after cleaning are skipped and counted.
- Gotchas:
  - `ColumnMapping` in types.ts already exists with exactly the five optional fields you need (`name, handle, followers, bio, isPrivate` — each holding a CSV header name). Use it; do not redefine.
  - The plan cap: copy the exact pattern from `handleAddToQueue` — `limits.maxLeadsPerCampaign` from `usePlan()`; slice + toast `Starter plan: capped at ${planCap} leads. Upgrade to Pro for unlimited.`
  - CampaignBuilder has its own local toast (`showToast`), not the shared Toast hook — reuse the local one by lifting the import UI into CampaignBuilder's tab body, OR pass `showToast` down. Decision: implement the import UI as a new component `CsvImport.tsx` that receives `onLeadsReady: (leads: Lead[]) => void` and renders its own inline success/error text (emerald/red, text-xs) instead of using any toast — simplest, no prop drilling.
  - Duplicate handling: dedupe within the file by handle (keep first). Do NOT dedupe against existing queue leads — lead ids are UUIDs and the queue tolerates duplicates; out of scope.

CONSTRAINTS (the limits)

- Must stay inside: `src/components/campaign/CsvImport.tsx` (new), `src/components/campaign/CampaignBuilder.tsx` (tab wiring only).
- Must not change: `src/lib/types.ts` (ColumnMapping already fits), `src/lib/apify.ts`, `DashboardShell.tsx`, any other component.
- Stack / tools to respect: papaparse (`Papa.parse(file, { header: true, skipEmptyLines: true, complete })`), Tailwind classes matching the existing dark theme, lucide-react icons only (`Upload`, `FileSpreadsheet`, `ArrowRight`, `AlertCircle`, `CheckCircle`).
- Non-negotiables: no new dependencies; no file upload to any server (parse in-browser only); match the design system — cards `bg-[#050A08] border border-white/5 rounded-2xl`, inputs `bg-[#030604] border border-white/8 rounded-xl`, primary buttons `bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl`.

STEP-BY-STEP PLAN (in build order)

1. Create `src/components/campaign/CsvImport.tsx` exporting `CsvImport: React.FC<{ onLeadsReady: (leads: Lead[]) => void; maxLeads: number | null }>`. Internal state: `rows: Record<string,string>[]`, `headers: string[]`, `mapping: ColumnMapping`, `fileName: string`, `error: string`, `imported: number | null`, `skipped: number`.
2. In the same file add pure helpers (top of file, exported for potential reuse): `parseFollowers(raw: string): number`, `parseBool(raw: string): boolean`, `cleanHandle(raw: string): string`, `autoMap(headers: string[]): ColumnMapping` — implementing exactly the alias table and parsing rules from CONTEXT. `autoMap` normalizes headers via `h.toLowerCase().replace(/[\s_]/g,'')` before matching.
3. UI, top to bottom inside one themed card: (a) a file input styled as a dashed drop-zone (`<label>` wrapping `<input type="file" accept=".csv" className="hidden">`), text: "Drop a CSV here or click to browse — exports from Apify or any scraper work" ; (b) after parse: five `<select>`s labeled Handle (required), Name, Followers, Bio, Private — options are the CSV headers plus "— not in file —", pre-selected from `autoMap`; (c) a preview table of the first 5 mapped rows with columns Handle / Name / Followers / Bio; (d) footer row: `<n> rows found · <skipped> skipped (no handle)` and the button `Add <n> to Queue`.
4. On file select: `Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => ... })`; store `r.data` and `r.meta.fields`; run `autoMap`; if no header maps to handle, set error text: "Couldn't find a username column. Pick it manually below." (mapping UI still shows).
5. On "Add to Queue": build one `campaignId = crypto.randomUUID()`; map every row through the helpers into `Lead` objects (`status:'cold', dmSent:false, replied:false, isPrivate` from mapping or false); skip empty handles; dedupe by handle; if `maxLeads !== null` slice to it and show inline note `Starter plan: capped at ${maxLeads} leads. Upgrade to Pro for unlimited.`; call `onLeadsReady(leads)`; set `imported = leads.length`; reset rows/headers so the zone is ready for the next file. Success line (emerald, CheckCircle icon): `✓ <n> leads added to the Approval Queue`.
6. Edit `src/components/campaign/CampaignBuilder.tsx`: (a) change tab state to `useState<'search' | 'followers' | 'import'>`; (b) add a third tab button labeled `Import CSV` styled identically to the existing two tab buttons (find the existing tab-switcher JSX and copy one button); (c) when `tab === 'import'` render `<CsvImport maxLeads={limits.maxLeadsPerCampaign} onLeadsReady={(leads) => { onLeadsScraped(leads); }} />` in place of the search form + results.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/components/campaign/CsvImport.tsx` (create), `src/components/campaign/CampaignBuilder.tsx` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/csv-lead-import.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: drop-zone text, error string, cap note, and success line from steps 3–5; the alias table from CONTEXT.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] A third "Import CSV" tab appears in Campaign Builder and switching tabs does not break search/followers tabs.
[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] Edge cases handled: `12.4K`→12400, `1.2M`→1200000, `12,400`→12400, garbage→0; `@handle`, URL, and uppercase handles cleaned; rows without a handle skipped and counted; duplicate handles within one file deduped.
[ ] A CSV with headers `username,fullName,biography,followersCount,private` auto-maps all five selects with zero manual clicks.
[ ] Plan cap enforced with the exact Starter copy; leads appear in the Approval Queue as 'Pending' (no dmContent) after import.
[ ] Nothing in CONSTRAINTS was violated (no new deps, no other files touched, dark-theme classes used).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
