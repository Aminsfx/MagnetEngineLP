BLUEPRINT 6: Follow-up auto-send (make the sequencer actually send)

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Date math + state threading across shell/component/lib; needs Sonnet.)

GOAL

The Follow-Up Sequencer stops being UI-only: a "Send due follow-ups" button computes which leads are due a follow-up step (based on the saved sequence, each lead's send dates, and reply status), renders the templates, and dispatches them to the Chrome extension through the exact same channel initial DMs use. Sent follow-ups are stamped on the lead so they are never re-sent and count toward the daily cap.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/campaign/FollowUpSequencer.tsx` — the sequence editor. It saves `FollowUpSequence` via `db.upsertSequence` but nothing ever sends. Its info note (line ~200) already promises "The Chrome extension will send these follow-ups automatically" — this blueprint makes that true (semi-automatically: one click).
  - `src/lib/types.ts` — `Lead` has `dmSent, dmDate, replied, followedUp, followUp1Date, followUp2Date, followUp3Date`; `FollowUpStep {delayDays, messageTemplate, condition: 'no_reply'|'always'}`; `FollowUpSequence {steps (max 3), active}`.
  - `src/components/campaign/ApprovalQueue.tsx` line ~134 `handleSendToExtension` — THE dispatch pattern to copy exactly: `window.postMessage({ type: 'MAGNET_ENGINE_CAMPAIGN', payload: { leads: [{handle, message}], mode } }, '*')`. The extension content script relays it; nothing extension-side needs changing.
  - `src/pages/DashboardShell.tsx` — `handleLeadsSent` (line ~150) shows the daily-cap pattern (`storage.getDailySends()`, `storage.incrementDailySends`, `config.dailySendCap`); `<FollowUpSequencer />` is rendered with NO props at line ~476 — you will add props.
  - `src/lib/storage.ts` — `getDailySends` / `incrementDailySends`.
- Real inputs, in full — the due-computation rules (these ARE the spec, implement literally):
  - Only consider leads where `dmSent === true` and `dmDate` exists.
  - For step index `i` (0-based, max 3 steps): the "anchor date" is `dmDate` for i=0, `followUp1Date` for i=1, `followUp2Date` for i=2.
  - A lead is due step `i` when: the anchor date exists AND `followUp{i+1}Date` is empty AND `now >= anchor + step.delayDays days` AND (`step.condition === 'always'` OR `lead.replied === false`).
  - A lead gets at most ONE step per send batch (the earliest due one).
  - Template rendering: replace all `{{handle}}` with `@` + handle and `{{name}}` with `lead.name` (falling back to `@handle` if name empty) — same as `renderPreview` in FollowUpSequencer.
  - Sequence must be `active === true`; use the first sequence (the app currently edits a single default sequence).
- Data shapes / examples:
  - Lead `{handle:'fitwithmarco', name:'Marco R', dmSent:true, dmDate:'2026-07-01T10:00:00Z', replied:false}` + step0 `{delayDays:3, condition:'no_reply', messageTemplate:'Hey {{handle}} 👋 ...'}` at now=2026-07-07 → due: step 0, message `Hey @fitwithmarco 👋 ...`, and after sending the lead gets `followUp1Date: <now ISO>, followedUp: true`.
  - Same lead with `replied: true` → NOT due (condition no_reply).
- Gotchas:
  - The extension queue payload only carries `{handle, message}` — the web app must stamp `followUpXDate` at dispatch time (optimistic), exactly like initial sends stamp `dmSent` at dispatch. Accept that a failed extension delivery still counts; consistent with existing behavior.
  - Daily cap is shared with initial DMs: reuse `storage.getDailySends()` / `incrementDailySends(n)` and `config.dailySendCap ?? 40`; slice the due list to the remaining allowance and toast when trimmed.
  - `FollowUpSequencer` currently receives no props — DashboardShell must pass `leads`, `config`, and a new callback. Keep the sequencer's existing editor untouched; add a send panel above it.
  - Plan gating already wraps the route (`limits.canAccessFollowUps`) — add nothing.
  - Date math: `new Date(anchor).getTime() + delayDays * 86_400_000 <= Date.now()`.

CONSTRAINTS (the limits)

- Must stay inside: `src/lib/followups.ts` (new), `src/components/campaign/FollowUpSequencer.tsx` (add props + send panel), `src/pages/DashboardShell.tsx` (pass props + one new handler).
- Must not change: anything under `extension/` (zero changes — reuse the existing message channel), `types.ts`, `db.ts`, `ApprovalQueue.tsx`, the sequence editor UI/save flow.
- Stack / tools to respect: React 19, existing `storage` util, lucide-react icons (`Send`, `CalendarClock`), Tailwind dark theme.
- Non-negotiables: never send a step twice to the same lead (the `followUp{i+1}Date` guard is the mechanism); respect the daily cap; follow-ups dispatch in `'production'` mode string unless `limits.isTestModeOnly` is true, in which case `'test'`.

STEP-BY-STEP PLAN (in build order)

1. Create `src/lib/followups.ts`:
   ```typescript
   export interface DueFollowUp { lead: Lead; stepIndex: 0 | 1 | 2; message: string; }
   export function renderTemplate(template: string, lead: Lead): string
   export function computeDueFollowUps(leads: Lead[], sequence: FollowUpSequence | null, now?: Date): DueFollowUp[]
   export function stampFollowUp(lead: Lead, stepIndex: 0 | 1 | 2, sentAt: string): Lead
   ```
   `computeDueFollowUps` implements the rules in CONTEXT verbatim (returns [] when sequence is null/inactive/has no steps). `stampFollowUp` returns a copy with `followedUp: true` and the matching `followUp{n}Date = sentAt`.
2. `src/pages/DashboardShell.tsx` — add `handleFollowUpsSent = useCallback(async (due: DueFollowUp[]) => ...)`: apply the daily-cap slice (same pattern as `handleLeadsSent`, including the two toast strings with "follow-up" wording: `Daily send limit reached (${cap} DMs/day). Resets at midnight.` and `Daily cap almost reached — sending ${allowed.length} of ${due.length} follow-ups.`), post ONE `window.postMessage({ type: 'MAGNET_ENGINE_CAMPAIGN', payload: { leads: allowed.map(d => ({ handle: d.lead.handle, message: d.message })), mode: limits.isTestModeOnly ? 'test' : 'production' } }, '*')`, stamp each allowed lead via `stampFollowUp` into a batch, `setLeads` merge + `db.upsertLeads(batch, user.id)`, `storage.incrementDailySends(allowed.length)` + `setDailySendCount`, success toast `${allowed.length} follow-up${allowed.length!==1?'s':''} sent to extension.` Return the allowed count.
3. `src/pages/DashboardShell.tsx` — change the route render to `<FollowUpSequencer leads={leads} onSendFollowUps={handleFollowUpsSent} />`.
4. `src/components/campaign/FollowUpSequencer.tsx` — accept the new props `{ leads: Lead[]; onSendFollowUps: (due: DueFollowUp[]) => Promise<number> }`. Above the existing editor grid, add a full-width "Due now" card (same gradient-border card style as the header card): left side `CalendarClock` icon + `Due follow-ups` + live count line `X leads are due a follow-up step` (computed via `useMemo(() => computeDueFollowUps(leads, activeSeq), [leads, activeSeq])` — pass the CURRENT unsaved `activeSeq` so what you see is what sends, and only when `activeSeq?.active`); right side a button `Send due follow-ups (X)` (emerald primary style, `Send` icon, disabled when X === 0 or a send is in flight). On click: `await onSendFollowUps(due)`. When the sequence is paused, replace the count line with `Sequence is paused — resume it to send.` and disable the button.
5. In the same card, under the count, render up to 3 preview lines (`text-[11px] text-zinc-500 font-mono truncate`): `@handle → Day N: first 60 chars of message…` so the user sees exactly what will go out.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/lib/followups.ts` (create), `src/pages/DashboardShell.tsx` (edit), `src/components/campaign/FollowUpSequencer.tsx` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/follow-up-autosend.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the due-computation rules, the function signatures in step 1, all toast strings and button/label copy in steps 2 and 4.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] With a lead `dmSent` 4 days ago, no reply, and a saved active step Day 3 'no_reply': the Due card shows count 1 and the correct rendered preview; clicking sends one postMessage and stamps `followUp1Date` + `followedUp` (verify in localStorage dev mode).
[ ] Edge cases: replied lead skipped for 'no_reply' steps but included for 'always' steps; already-stamped steps never re-sent; a lead due steps 1 AND 2 sends only the earliest; paused sequence sends nothing.
[ ] Daily cap: with cap nearly reached, the batch is trimmed and the trim toast shows; counter in the header increments by the sent amount.
[ ] Zero diffs under `extension/`.
[ ] Nothing in CONSTRAINTS was violated.

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
