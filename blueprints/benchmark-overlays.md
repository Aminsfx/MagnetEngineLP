BLUEPRINT 9: Benchmark overlays on dashboard metrics

BUILDER: Claude Haiku, working alone, cold start, cannot ask questions. (Extends one presentational component with fully specified values — mechanical.)

GOAL

The three rate cards on the dashboard (Reply Rate, Positive Reply Rate, Booking Rate) each show an industry-benchmark comparison line — e.g. `vs 8% industry avg — top 25%` — so users instantly know if a number is good without any AI. (Note: the existing "AI Analyst" card is ALREADY rule-based with zero API calls — leave it alone; this adds benchmarks alongside it.)

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/dashboard/MetricsGrid.tsx` — the whole file (174 lines). `MetricCard` takes `title, value, subtext, change, icon, glowColor, iconBg, delay`. The three target cards are Reply Rate (line ~115), Positive Reply Rate (~124), Booking Rate (~135). Stats arrive as whole-number percentages (`stats.replyRate` etc., already rounded).
- Real inputs, in full — the benchmark table (hardcode as a module-level const; these are cold-DM industry norms used across the app's copy — AIAnalyst already cites "industry avg: 5-10%" for replies):
  ```typescript
  const BENCHMARKS = {
      replyRate:         { avg: 8,  good: 15 },  // % of DMs getting any reply
      positiveReplyRate: { avg: 40, good: 55 },  // % of replies that are positive
      bookingRate:       { avg: 6,  good: 20 },  // % of positive replies that book
  };
  ```
  Tier logic (only when the corresponding denominator activity exists — see Gotchas): value ≥ good → `top 25%` (emerald); value ≥ avg → `above average` (emerald); value > 0 → `below 8% avg — try shorter DMs` for replyRate / `below 40% avg — tighten targeting` for positiveReplyRate / `below 6% avg — add your booking link` for bookingRate (amber); value === 0 → no overlay line at all.
- Data shapes / examples: `stats.replyRate = 12` → line `vs 8% avg — above average` in emerald. `stats.bookingRate = 4` → `below 6% avg — add your booking link` in amber. `stats.replyRate = 0` → card unchanged.
- Gotchas:
  - `MetricCard` has one `subtext` slot already used ("any reply to DM sent" etc.). Do NOT overload it: add a NEW optional prop `benchmark?: { text: string; tone: 'good' | 'bad' }` to `MetricCard`, rendered UNDER the existing subtext as its own line: `text-[10px] mt-1 font-medium` + `text-emerald-400` for good / `text-amber-400` for bad.
  - Zero-activity noise: with no DMs sent, all rates are 0 — the `value === 0 → no line` rule prevents shaming a brand-new account. Implement via a helper `benchmarkFor(key, value)` returning `undefined` for 0.
  - Percent values are numbers like `12`, not `0.12`.

CONSTRAINTS (the limits)

- Must stay inside: `src/components/dashboard/MetricsGrid.tsx` (single file).
- Must not change: `AIAnalyst.tsx`, `DashboardStats` type, `filters.ts` calculations, the five non-rate cards, any card layout/animation.
- Stack / tools to respect: React 19, Tailwind; no new icons, no new dependencies.
- Non-negotiables: benchmark copy exactly as specified; no AI/API calls; the line must not change card height enough to misalign the grid (it's a 10px line inside an auto-height card — fine as-is).

STEP-BY-STEP PLAN (in build order)

1. `src/components/dashboard/MetricsGrid.tsx` — add the `BENCHMARKS` const and a helper:
   ```typescript
   function benchmarkFor(key: keyof typeof BENCHMARKS, value: number): { text: string; tone: 'good' | 'bad' } | undefined
   ```
   implementing the tier logic and the three exact "below avg" strings from CONTEXT; `≥ good` → `{ text: `vs ${avg}% avg — top 25%`, tone: 'good' }`; `≥ avg` → `{ text: `vs ${avg}% avg — above average`, tone: 'good' }`.
2. Extend `MetricCardProps` with `benchmark?: { text: string; tone: 'good' | 'bad' }` and render it under subtext per the Gotchas styling.
3. Pass `benchmark={benchmarkFor('replyRate', stats.replyRate)}` to the Reply Rate card, and likewise `positiveReplyRate` and `bookingRate` to their cards. Leave the other five cards untouched.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/components/dashboard/MetricsGrid.tsx` (edit only).
- The one prompt to hand the builder to kick this off: "Open blueprints/benchmark-overlays.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the BENCHMARKS const, all five display strings, the class names.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] Reply 12% → emerald "vs 8% avg — above average"; Reply 16% → "top 25%"; Booking 4% → amber "below 6% avg — add your booking link"; Rate 0% → no benchmark line.
[ ] The five non-rate cards render byte-identical to before (no prop passed → no line).
[ ] Grid alignment unchanged at lg (4 columns) and mobile (2 columns).
[ ] Nothing in CONSTRAINTS was violated (one file touched, no AI calls).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
