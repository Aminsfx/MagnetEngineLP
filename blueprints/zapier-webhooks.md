BLUEPRINT 7: Zapier + outbound webhooks (push Positive Reply / Booked Call events)

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Event-transition detection inside existing callbacks needs care not to double-fire.)

GOAL

Users paste a webhook URL (Zapier Catch Hook, Make, Slack workflow, etc.) into Settings and pick which events to push. From then on, whenever a lead transitions to replied / positive reply / booked, the app fires a JSON POST to that URL — wiring MagnetEngine into their existing stack. A "Mark booked" action is added so the booked event actually has a trigger.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/pages/DashboardShell.tsx` — `handleUpdateLead` (line ~145) is the single place replied/positiveReply/booked transitions flow through (ApprovalQueue calls `onUpdateLead` with the changed lead). This is where events are detected.
  - `src/components/campaign/ApprovalQueue.tsx` — Actions cell (~line 488–507): "Mark as Replied" and "Mark as Positive Reply" buttons; you'll add "Mark as Booked" after them following the same pattern.
  - `src/lib/types.ts` — `AppConfig` (you add two fields) and `Lead` (`replied`, `positiveReply`, `booked`, `replyDate`).
  - `src/components/settings/SettingsPanel.tsx` — add an "Integrations" card; copy the input/checkbox styling from "Lead Filtering Rules".
- Real inputs, in full:
  - New AppConfig fields:
    ```typescript
    webhookUrl?: string;                    // Zapier/Make catch-hook URL for outbound events
    webhookEvents?: { replied: boolean; positiveReply: boolean; booked: boolean };
    ```
    Default when undefined: treat as `{ replied: false, positiveReply: true, booked: true }`.
  - Outbound payload shape (exact):
    ```json
    {
      "event": "positive_reply",
      "timestamp": "2026-07-07T18:00:00.000Z",
      "lead": { "handle": "fitwithmarco", "name": "Marco R", "followers": 12400, "campaignId": "uuid", "dmContent": "..." }
    }
    ```
    `event` ∈ `"replied" | "positive_reply" | "booked"`.
- Data shapes / examples: user marks a replied lead as positive → one POST with `event: "positive_reply"` fires; marking the same lead positive again is impossible (button disappears), so no duplicate fires.
- Gotchas:
  - CORS: Zapier/Make hooks don't return CORS headers. Fire with `fetch(url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(payload) })` — `no-cors` + text/plain avoids preflight entirely; Zapier parses JSON bodies regardless of content-type. Fire-and-forget with `.catch(() => {})`; NEVER await it in the UI path and never block or toast on failure.
  - Transition detection must compare OLD vs NEW lead inside `handleUpdateLead`: find the previous lead in state BEFORE mapping (e.g. `const prev = leads.find(l => l.id === updated.id)` won't work inside the setLeads callback with stale closure — read prev from the `setLeads(prev => ...)` array). Fire when `!old.replied && updated.replied` → 'replied'; `!old.positiveReply && updated.positiveReply` → 'positive_reply'; `!old.booked && updated.booked` → 'booked'. Multiple transitions in one update fire multiple events.
  - `handleUpdateLead` is also called for other edits (e.g. dmContent via battlecards if built) — the transition guard makes this safe.
  - The webhook module must be silent when `webhookUrl` is empty or the event's toggle is off.
  - Zapier URLs look like `https://hooks.zapier.com/hooks/catch/123456/abcdef/` — validate loosely: must start with `https://`; show inline amber note otherwise, but still save (user may use http on internal tools — no, decision: require https, refuse to fire on non-https, still allow typing).
- Also add the missing trigger: leads with `positiveReply && !booked` get a "Mark as Booked" icon button in ApprovalQueue (icon `CalendarCheck`, title `Mark as Booked`, emerald hover) calling `onUpdateLead?.({ ...lead, booked: true })`.

CONSTRAINTS (the limits)

- Must stay inside: `src/lib/webhooks.ts` (new), `src/lib/types.ts` (two AppConfig fields), `src/pages/DashboardShell.tsx` (transition detection in `handleUpdateLead` only), `src/components/settings/SettingsPanel.tsx` (Integrations card), `src/components/campaign/ApprovalQueue.tsx` (Mark as Booked button only).
- Must not change: `db.ts`, `filters.ts`, stats logic, the extension, any send flow.
- Stack / tools to respect: native fetch, lucide-react (`Webhook` icon exists in lucide — use it; plus `CalendarCheck`), Tailwind dark theme.
- Non-negotiables: webhook failures must never break or slow lead updates (fire-and-forget); no secrets involved; payload contains only the five lead fields listed — never the whole Lead object (bio etc. stays private by default).

STEP-BY-STEP PLAN (in build order)

1. `src/lib/types.ts` — add the two fields to `AppConfig` exactly as in CONTEXT.
2. Create `src/lib/webhooks.ts`:
   ```typescript
   export type WebhookEvent = 'replied' | 'positive_reply' | 'booked';
   export function fireWebhook(config: AppConfig, event: WebhookEvent, lead: Lead): void
   export function detectTransitions(oldLead: Lead, newLead: Lead): WebhookEvent[]
   ```
   `fireWebhook`: resolve toggles with the default from CONTEXT (map event → toggle key: replied→replied, positive_reply→positiveReply, booked→booked); return early unless `config.webhookUrl?.startsWith('https://')` and the toggle is on; build the exact payload; fetch per the Gotchas recipe.
3. `src/pages/DashboardShell.tsx` — in `handleUpdateLead`, inside the `setLeads(prev => ...)` mapper, capture the old lead; after state update, for each `detectTransitions(old, updated)` result call `fireWebhook(config, event, updated)`. Add `config` to the callback's dependency array.
4. `src/components/campaign/ApprovalQueue.tsx` — add the "Mark as Booked" button per CONTEXT (after the Mark as Positive Reply button, same class pattern, shown when `lead.positiveReply && !lead.booked`). Also render a static emerald `Booked ✓` text badge (text-[10px]) in the Status cell when `lead.booked` — append inside the existing status cell under the current pill.
5. `src/components/settings/SettingsPanel.tsx` — new card between Lead Filtering Rules and the Save button (or after the Booking Link card if it exists): header icon `Webhook` (cyan), title `Integrations — Zapier / Make`, subtitle `Push events to your CRM, Slack, or email the moment they happen`. Contents: (a) input label `Webhook URL (Zapier Catch Hook, Make, etc.)`, placeholder `https://hooks.zapier.com/hooks/catch/…`, value `config.webhookUrl ?? ''`, onChange updates config; amber note under it when non-empty and not starting with `https://`: `Must be an https:// URL — events won't fire until it is.`; (b) three checkboxes labeled `Lead replied`, `Positive reply`, `Call booked`, checked per the resolved toggles, each onChange writing the full `webhookEvents` object; (c) helper line (`text-[11px] text-zinc-600`): `Each event POSTs JSON: { event, timestamp, lead: { handle, name, followers, campaignId, dmContent } }. In Zapier, use "Webhooks by Zapier → Catch Hook".`

EXACT INPUTS TO USE

- Files to open or create, by name: `src/lib/webhooks.ts` (create), `src/lib/types.ts`, `src/pages/DashboardShell.tsx`, `src/components/settings/SettingsPanel.tsx`, `src/components/campaign/ApprovalQueue.tsx` (all edits).
- The one prompt to hand the builder to kick this off: "Open blueprints/zapier-webhooks.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the AppConfig fields, payload JSON shape, fetch recipe, defaults `{replied:false, positiveReply:true, booked:true}`, and every UI string in step 5.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] With a URL configured and `positive_reply` on: marking a lead positive fires exactly one POST (verify in devtools Network with a webhook.site or Zapier URL); marking replied fires none by default.
[ ] Edge cases: empty URL → zero fetches; non-https URL → zero fetches + amber note; webhook target down → UI unaffected (no error surfaced, lead still updates).
[ ] "Mark as Booked" appears only for positive-reply leads, sets `booked`, shows the Booked ✓ badge, and fires the `booked` event when enabled.
[ ] Settings card persists across reload (rides existing config persistence).
[ ] Nothing in CONSTRAINTS was violated (payload limited to the five fields; no await on fetch in the update path).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
