BLUEPRINT 4: Reply Battlecards (intent-based follow-up suggestions when a lead replies)

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Touches three files with state flowing between them; needs Sonnet.)

GOAL

When a lead is marked "Replied" in the Approval Queue, an expandable battlecard panel appears under that row with three ready-to-send responses — Interested / "How much?" / Not now — each with a copy button and an "Open profile" link. The Interested and price cards insert the user's booking link from a new Settings field. This closes the gap between "they replied" and "call booked" with zero AI cost (static templates, instant).

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/campaign/ApprovalQueue.tsx` — the row table; "Mark as Replied" button at line ~489 (`onUpdateLead?.({ ...lead, replied: true })`); "Mark as Positive Reply" at ~499. Rows are `<tr>` elements in a `<tbody>` — the battlecard panel must be an extra full-width `<tr><td colSpan={5}>` directly after a replied lead's row.
  - `src/lib/types.ts` — `AppConfig` interface (you will add one optional field) and `Lead` (uses `replied`, `positiveReply`, `handle`, `name`).
  - `src/components/settings/SettingsPanel.tsx` — the "Lead Filtering Rules" card (line ~408) shows the exact input styling; you'll add a new card ABOVE the Save button.
  - `src/pages/DashboardShell.tsx` — `config` flows into ApprovalQueue already via the `config` prop; `handleUpdateConfig` persists config. No shell changes needed.
- Real inputs, in full — the three battlecards, copy to use VERBATIM (`{calendar}` is replaced by `config.calendarLink`, `{firstName}` by the first word of `lead.name` or `@handle` if name empty):
  1. label: `🔥 They're interested` · reply: `Awesome — easiest next step is a quick 15-min call so I can show you exactly how this would work for you, {firstName}. Grab any time that suits you here: {calendar}`
  2. label: `💰 They asked the price` · reply: `Good question — it depends on what you actually need, so a number on its own wouldn't mean much. Easier to show you on a quick call and you can decide from there: {calendar}`
  3. label: `⏸ Not right now` · reply: `No worries at all, {firstName}. Mind if I circle back in a couple of weeks? Either way — wishing you a big month 🤝`
- Data shapes / examples: lead `{name: "Marco R", handle: "fitwithmarco", replied: true}` + `config.calendarLink = "https://calendly.com/me/15min"` → card 1 renders `...for you, Marco. Grab any time that suits you here: https://calendly.com/me/15min`.
- Gotchas:
  - `AppConfig` is persisted as a whole JSON blob (Supabase `configs.data` / localStorage) — adding an optional field is backward-compatible, no migration needed.
  - If `config.calendarLink` is empty/undefined: still show cards 1 and 2 but substitute `{calendar}` with the literal text `[add your booking link in Settings → Booking Link]`, and render an amber hint line under the cards: `Tip: add your Calendly/booking link in Settings so these replies paste ready-to-send.`
  - Clipboard: use `navigator.clipboard.writeText(...)` with a `.catch(() => {})`; flip the button label to `Copied ✓` for 2 seconds (local state per card).
  - Copying card 1 should ALSO mark the lead as positive: call `onUpdateLead?.({ ...lead, positiveReply: true })` — this feeds the existing stats pipeline. Cards 2 and 3 copy only.
  - "Open profile" is `<a href={`https://instagram.com/${lead.handle}/`} target="_blank" rel="noopener noreferrer">`.

CONSTRAINTS (the limits)

- Must stay inside: `src/components/campaign/ReplyBattlecards.tsx` (new), `src/components/campaign/ApprovalQueue.tsx` (render wiring), `src/lib/types.ts` (add `calendarLink?: string;` to AppConfig with comment `// Booking/Calendly link inserted into reply battlecards`), `src/components/settings/SettingsPanel.tsx` (one new settings card).
- Must not change: DashboardShell, db.ts, filters, stats calculations, any existing button behavior in ApprovalQueue.
- Stack / tools to respect: React 19 function components, Tailwind dark theme, lucide-react icons only (`MessageCircleReply` or `MessagesSquare`, `Copy`, `Check`, `ExternalLink`, `CalendarClock`).
- Non-negotiables: NO AI calls (static templates only); panel must not shift table column widths (full-width colSpan row); match design system (cards `bg-white/[0.02] border border-white/6 rounded-xl`, labels `text-[10px] uppercase tracking-wider text-zinc-600`).

STEP-BY-STEP PLAN (in build order)

1. `src/lib/types.ts` — add `calendarLink?: string;` to `AppConfig` (after `dmTone`, with the comment above).
2. Create `src/components/campaign/ReplyBattlecards.tsx` exporting `ReplyBattlecards: React.FC<{ lead: Lead; calendarLink?: string; onUpdateLead?: (lead: Lead) => void }>`. Define the three cards as a module-level const with the verbatim copy from CONTEXT. Render: a horizontal 3-column grid (stack on mobile: `grid grid-cols-1 md:grid-cols-3 gap-3`), each card showing the label, the fully substituted reply text (`text-xs text-zinc-300 leading-relaxed`), and a footer with a Copy button (`Copy reply` → `Copied ✓`) — card 1's copy also fires `onUpdateLead` with `positiveReply: true`. Above the grid, one header row: left `Reply battlecards — pick the one that matches their reply` (text-[11px] zinc-500), right the Open profile link. Below the grid, the amber hint line when no calendarLink (see Gotchas).
3. `src/components/campaign/ApprovalQueue.tsx`:
   - Add local state `battlecardsFor: string | null` (lead id).
   - In the Actions cell, for leads where `lead.replied` is true, add a button (icon `MessagesSquare`, title `Reply battlecards`, same styling as the other icon buttons, cyan hover) toggling `battlecardsFor` between `lead.id` and `null`.
   - After each lead's `</tr>`, when `battlecardsFor === lead.id`, render:
     `<tr><td colSpan={5} className="px-5 py-4 bg-white/[0.015] border-t border-white/5"><ReplyBattlecards lead={lead} calendarLink={config.calendarLink} onUpdateLead={onUpdateLead} /></td></tr>`
   - When the user clicks "Mark as Replied", also set `battlecardsFor` to that lead's id so the cards appear immediately.
4. `src/components/settings/SettingsPanel.tsx` — add a new card between "Lead Filtering Rules" and the Save button: header icon `CalendarClock` in emerald, title `Booking Link`, subtitle `Inserted into your reply battlecards in the Approval Queue`. One input: label `Calendly / booking page URL`, `type="url"`, `placeholder="https://calendly.com/yourname/15min"`, `value={config.calendarLink ?? ''}`, `onChange={e => onUpdateConfig({ ...config, calendarLink: e.target.value })}`, styled exactly like the Min Followers input.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/components/campaign/ReplyBattlecards.tsx` (create), `src/components/campaign/ApprovalQueue.tsx` (edit), `src/lib/types.ts` (edit), `src/components/settings/SettingsPanel.tsx` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/reply-battlecards.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the three battlecard labels + replies, the no-link substitution text, the amber hint, the Settings labels/placeholder.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] Marking a lead as Replied immediately shows the 3-card panel under its row; the toggle button shows/hides it for any replied lead.
[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] Edge cases: empty `lead.name` falls back to `@handle` for {firstName}; missing calendarLink shows the bracket text + amber hint; copy works and reverts label after ~2s.
[ ] Copying card 1 sets `positiveReply: true` on the lead (visible: the "Mark as Positive Reply" button disappears and stats update).
[ ] Settings shows the Booking Link card; entering a URL persists (reload keeps it — it rides the existing config save path).
[ ] Nothing in CONSTRAINTS was violated (no AI call added, no table layout breakage, only the four named files touched).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
