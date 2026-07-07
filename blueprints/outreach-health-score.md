BLUEPRINT 8: Accountability Dashboard — weekly Outreach Health Score

BUILDER: Claude Haiku, working alone, cold start, cannot ask questions. (One new self-contained component with fully specified rules and thresholds — mechanical.)

GOAL

The dashboard shows a red/yellow/green "Outreach Health" card that scores the user's BEHAVIOR this week (pipeline fed, queue cleared, outreach active, follow-ups covered) — not their results — so an idle user sees red and logs back in to fix it.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/dashboard/OnboardingChecklist.tsx` — an existing dashboard card computed from `leads` + `config`; match its card structure and tone.
  - `src/pages/DashboardShell.tsx` — the `/dashboard` route JSX (line ~388): `<OnboardingChecklist leads={leads} config={config} />` then `<MetricsGrid ...>`. Your card mounts between them.
  - `src/lib/types.ts` — `Lead` fields available: `dmSent, dmDate, replied, replyDate, followedUp, followUp1Date, dmContent, approved, rejected, campaignId`. NOTE: Lead has NO `createdAt` — do not invent one; the rules below only use fields that exist.
- Real inputs, in full — the four checks, implement these thresholds literally (a check returns 'green' | 'yellow' | 'red' plus a one-line status string):
  1. **Outreach active** — DMs sent in the last 7 days = leads where `dmSent && dmDate` and `dmDate` within 7 days of now. ≥20 → green `"{n} DMs sent this week — keep the streak"`; 1–19 → yellow `"Only {n} DMs this week — aim for 20+"`; 0 → red `"No DMs sent this week — launch a campaign"`.
  2. **Queue cleared** — ready count = leads with `dmContent && !approved && !rejected`. <10 → green `"Approval queue is clear"`; 10–29 → yellow `"{n} DMs waiting for review"`; ≥30 → red `"{n} DMs stuck in your queue — review them"`.
  3. **Replies handled** — unhandled = leads with `replied && !positiveReply && !booked && !followedUp`. 0 → green `"All replies handled"`; 1–4 → yellow `"{n} replies need a response"`; ≥5 → red `"{n} replies waiting — money is sitting in your inbox"`.
  4. **Follow-up coverage** — stale = leads where `dmSent && dmDate` older than 3 days AND `!replied && !followedUp`. 0 → green `"No leads slipping through"`; 1–9 → yellow `"{n} leads need a follow-up"`; ≥10 → red `"{n} silent leads with no follow-up — most deals close on touch 2-3"`.
- Overall score: green=2 points, yellow=1, red=0, summed over the four checks (max 8). Overall status: ≥6 → GREEN label `Healthy`, 3–5 → YELLOW label `Slipping`, ≤2 → RED label `At risk`.
- Data shapes / examples: 25 DMs this week, 5 in queue, 0 unhandled replies, 12 stale leads → green(2)+green(2)+green(2)+red(0) = 6 → overall `Healthy` (green) but the fourth row still shows its red line.
- Gotchas:
  - "Within 7 days": `new Date(l.dmDate).getTime() >= Date.now() - 7*86_400_000`. Guard invalid dates with `Number.isFinite`.
  - When `leads.length === 0`, render the card with a single neutral line `Add your first leads to start tracking outreach health.` and no score ring.
  - Color tokens (match AIAnalyst's `insightStyle`): green `text-emerald-400 bg-emerald-500/8 border-emerald-500/20`, yellow `text-amber-400 bg-amber-500/8 border-amber-500/20`, red `text-red-400 bg-red-500/8 border-red-500/20`.

CONSTRAINTS (the limits)

- Must stay inside: `src/components/dashboard/HealthScore.tsx` (new), `src/pages/DashboardShell.tsx` (one line to mount it).
- Must not change: `types.ts`, `filters.ts`, stats, OnboardingChecklist, MetricsGrid, AIAnalyst.
- Stack / tools to respect: React 19, Tailwind dark theme, lucide-react only (`Activity`, `CheckCircle`, `AlertTriangle`, `XCircle`).
- Non-negotiables: pure computation from the `leads` prop — no state persistence, no AI calls, no date libraries; card visual language matches the repo (gradient 1px border wrapper `rounded-[1.5rem] p-[1px]`, inner `bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6`, `boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)'`).

STEP-BY-STEP PLAN (in build order)

1. Create `src/components/dashboard/HealthScore.tsx` exporting `HealthScore: React.FC<{ leads: Lead[] }>`. Top of file: `type Rag = 'green' | 'yellow' | 'red';` and a pure exported function `computeHealth(leads: Lead[], now?: Date): { checks: { label: string; rag: Rag; line: string }[]; score: number; overall: Rag; overallLabel: string }` implementing the four checks + scoring exactly as in CONTEXT. Check labels (left column, uppercase 10px style): `OUTREACH`, `QUEUE`, `REPLIES`, `FOLLOW-UPS`.
2. Render: header row with `Activity` icon (emerald box like other cards), kicker `THIS WEEK` (10px tracking-widest zinc-600), title `Outreach Health`; right-aligned overall pill: `{overallLabel} · {score}/8` in the overall color token. Body: four rows, each `flex items-center justify-between gap-3 p-3 rounded-xl border` in that check's color token — left: label; right: the status line (text-[11px], icon `CheckCircle` for green / `AlertTriangle` for yellow / `XCircle` for red, w-3.5).
3. Edit `src/pages/DashboardShell.tsx`: import HealthScore; in the `/dashboard` route, directly under `<OnboardingChecklist ... />`, add `<HealthScore leads={leads} />`.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/components/dashboard/HealthScore.tsx` (create), `src/pages/DashboardShell.tsx` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/outreach-health-score.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: all thresholds, every status line string, labels, the empty-state line, and the color tokens.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] `computeHealth` returns the worked example from CONTEXT exactly (score 6, overall green, fourth check red) — verify by reasoning through the function or a quick console test in dev.
[ ] Empty leads → neutral card, no score pill, no crash; invalid `dmDate` strings don't throw.
[ ] All four rows always render (each in its own color), overall pill matches the 6/3 thresholds.
[ ] Card appears on /dashboard between the checklist and the metrics grid, visually consistent with neighboring cards.
[ ] Nothing in CONSTRAINTS was violated (no new Lead fields used, only two files touched).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
