BLUEPRINT 10: Single-plan pricing — $97/mo or $970/yr, full access, zero setup fee

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Touches pricing UI, plan limits, activation page, and adds monthly quotas — cross-cutting, needs Sonnet.)

GOAL

MagnetEngine sells exactly one plan: $97/month or $970/year (2 months free), zero setup fee, 30-day money-back guarantee. The landing page and the /activate page each show a single pricing card with a Monthly/Annual toggle. Every activated user gets full access, limited only by monthly usage quotas: 500 leads/month and 3 campaigns/month. No tier upsells remain visible anywhere in the product.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/components/Pricing.tsx` — the landing 3-card grid to replace (keep the section shell, header structure, trust bar, and Cal.com demo button; the Cal.com `data-cal-*` attributes must survive).
  - `src/pages/PendingActivationPage.tsx` — the 3-card /activate page to replace with one card + toggle; keep the header, 3-step strip, and "Already paid?" check-status card.
  - `src/lib/plans.ts` — `PlanTier`, `PLAN_LIMITS` (3 tiers), `PAYMENT_LINKS`, `UPGRADE_CONTACT`.
  - `src/pages/DashboardShell.tsx` — `handleAddLeads` (line ~132, where the monthly quotas get enforced), `handleLeadsSent` (~150, per-send plan cap that becomes dead), `handleGenerateDMs` (~237, DM credit check stays).
  - `src/lib/db.ts` — `getDMUsageLocal`/`incrementDMUsage` (lines ~281–300): the localStorage monthly-counter pattern to copy for leads/campaigns quotas.
  - `src/pages/ProfilePage.tsx` line ~152 — renders `{tier} Plan`.
- Real inputs, in full — the pricing content, VERBATIM:
  - Headline (replaces "One Deal Pays For Itself"): `One plan. Full access. Zero setup fee.`
  - Toggle: two segments labeled `Monthly` and `Annual`. Monthly shows price `$97` suffix `/month`. Annual shows price `$970` suffix `/year` plus an emerald badge `2 months free`.
  - Under the price, both modes: `Cancel anytime. 30-day money-back guarantee.`
  - Features header: `What's included:` — then exactly these 8 rows:
    1. `500 leads/month`
    2. `3 campaigns/month`
    3. `All AI providers (Claude, OpenAI, Gemini)`
    4. `Production Mode sending`
    5. `Full approval queue + CRM`
    6. `CSV/JSON export`
    7. `3 pre-built niche scripts`
    8. `Direct Slack access to founder`
  - Bonus box (emerald-tinted callout at the bottom of the card): `Founding Member Bonus: I'll personally optimize your first campaign with you on a 30-minute call.`
  - Landing CTA: `Get Started` → `<Link to="/login?mode=signup">`. Trust-bar guarantee line becomes: `30-Day Money-Back Guarantee — Not happy? Full refund. No questions asked.` Demo button text becomes: `Questions? Book a free 15-min demo call`.
- Data shapes / examples:
  - New single limits object (replaces all three tiers' values — keep the `PlanTier` TYPE and the `PLAN_LIMITS` record shape so nothing else breaks; all three keys point to the SAME object):
    ```typescript
    const MEMBER_LIMITS: PlanLimits = {
        maxLeadsPerCampaign: null,
        allowedAIProviders: ['openai', 'gemini', 'claude'],
        canAdjustDailyCap: true,
        maxDailyCap: 200,
        canAccessFollowUps: true,
        canUsePresets: true,
        isTestModeOnly: false,
        maxDMGenerations: 500,
        maxLeadsPerMonth: 500,      // NEW field on PlanLimits
        maxCampaignsPerMonth: 3,    // NEW field on PlanLimits
    };
    ```
  - Payment links: replace `PAYMENT_LINKS` with
    ```typescript
    export type BillingCycle = 'monthly' | 'annual';
    export const BILLING_LINKS: Record<BillingCycle, string> = {
        monthly: (import.meta.env.VITE_PAYMENT_LINK_MONTHLY as string) ?? '',
        annual: (import.meta.env.VITE_PAYMENT_LINK_ANNUAL as string) ?? '',
    };
    ```
    Keep `UPGRADE_CONTACT` as the no-link fallback.
  - Quota example: user has imported 450 leads this month, adds a 100-lead scrape → 50 are added with toast `Monthly lead limit: added 50 of 100 (500/month on your plan).`; at 500 → block with toast `You've reached your 500 leads/month limit. Resets on the 1st.` Campaign example: 4th `handleAddLeads` call in a month → blocked with `You've used all 3 campaigns this month. Resets on the 1st.` (each `handleAddLeads` call with a fresh campaignId = one campaign; CSV imports count too).
- Gotchas:
  - DO NOT touch the Supabase `subscriptions` table or its check constraint — existing rows keep plan values 'starter'/'pro'/'agency'; since all tiers now resolve to `MEMBER_LIMITS`, old rows automatically get full access. New activations (Polar webhook, blueprint 1) store `'pro'`.
  - `ProfilePage` line ~152: change the badge text from `{tier} Plan` to the literal `Member Plan` (stop reading `tier` for display; the `usePlan()` import may stay if still used elsewhere in the file — check before removing).
  - Upsell strings that become dead code because their gates can no longer trigger (`maxLeadsPerCampaign` is now null, `isTestModeOnly` false, `canUsePresets`/`canAccessFollowUps` true): the `UpgradePrompt` usages in DashboardShell (~479), SettingsPanel (~218, ~495), CampaignBuilder (~450), ApprovalQueue (~238) and the `Upgrade to Pro` toasts in DashboardShell (~155) and CampaignBuilder (~202). REMOVE these usages and their now-unreachable conditional branches (render the gated feature unconditionally). Keep the `UpgradePrompt` component file itself (harmless, may return for add-ons).
  - `PendingActivationPage` currently maps `PLAN_OPTIONS` — delete that const entirely.
  - The DM-generation monthly toast (DashboardShell ~240) stays; only the number changes via `maxDMGenerations: 500`.
  - Blueprint 1 (`blueprints/polar-auto-activation.md`) has been updated to two Polar products (monthly/annual) — if you are building both blueprints, build THIS one first.
  - The toggle is client state only (`useState<BillingCycle>('monthly')`); default Monthly.
- Sanity constant: annual $970 = 10 × $97 → "2 months free" is literally true; do not "correct" it.

CONSTRAINTS (the limits)

- Must stay inside: `src/components/Pricing.tsx`, `src/pages/PendingActivationPage.tsx`, `src/lib/plans.ts`, `src/lib/types.ts` (nothing needed — PlanLimits lives in plans.ts), `src/lib/db.ts` (two new counter helpers), `src/pages/DashboardShell.tsx` (quota enforcement + dead-gate removal), `src/pages/ProfilePage.tsx` (badge text), `src/components/settings/SettingsPanel.tsx`, `src/components/campaign/CampaignBuilder.tsx`, `src/components/campaign/ApprovalQueue.tsx` (dead-gate removal only), `.env.example`.
- Must not change: Supabase schema/SQL, `PlanContext.tsx`, `AuthContext`, the extension, LoginPage, the Cal.com button attributes, `FollowUpSequencer` internals.
- Stack / tools to respect: React 19, Tailwind dark theme, lucide-react (`Check`, `Shield`, `Calendar`, `Sparkles`, `CreditCard`, `Mail`, `Gift`).
- Non-negotiables: all pricing copy verbatim from CONTEXT; quotas enforced client-side via the localStorage monthly-counter pattern (consistent with DM usage — known limitation, acceptable); no tier names ("Starter"/"Pro"/"Agency") visible anywhere in rendered UI after this change (`git grep` the JSX to verify).

STEP-BY-STEP PLAN (in build order)

1. `src/lib/plans.ts` — add `maxLeadsPerMonth: number` and `maxCampaignsPerMonth: number` to `PlanLimits`; define `MEMBER_LIMITS` per CONTEXT; set `PLAN_LIMITS = { starter: MEMBER_LIMITS, pro: MEMBER_LIMITS, agency: MEMBER_LIMITS }`; replace `PAYMENT_LINKS` with `BillingCycle` + `BILLING_LINKS` per CONTEXT; keep `PlanTier`, `SubscriptionStatus`, `Subscription`, `getPlanLimits`, `UPGRADE_CONTACT` unchanged.
2. `src/lib/db.ts` — copy the `getDMUsageLocal` pattern into two new members: `getMonthlyLeadCount(userId): number` / `incrementMonthlyLeadCount(userId, n): number` (key `leads_added_${userId}_${YYYY-MM}`) and `getMonthlyCampaignCount(userId): number` / `incrementMonthlyCampaignCount(userId): number` (key `campaigns_${userId}_${YYYY-MM}`).
3. `src/pages/DashboardShell.tsx` — rewrite `handleAddLeads`: if `db.getMonthlyCampaignCount(user.id) >= limits.maxCampaignsPerMonth` → toast the campaign-block string from CONTEXT and return; compute `remaining = limits.maxLeadsPerMonth - db.getMonthlyLeadCount(user.id)`; if `remaining <= 0` → toast the lead-block string and return; slice `newLeads` to `remaining` (toast the partial string when trimmed); proceed with the existing merge + upsert; then `incrementMonthlyLeadCount(user.id, added.length)` and `incrementMonthlyCampaignCount(user.id)`. Guard: when `!user` (dev mode) skip all quota logic.
4. `src/pages/DashboardShell.tsx` — remove the dead plan-cap block in `handleLeadsSent` (lines ~151–156, `planCap` is always null now; keep the daily-cap logic intact) and replace the follow-ups route gate (~475–481) with an unconditional `<FollowUpSequencer />`, deleting the `UpgradePrompt` import if unused.
5. `src/components/Pricing.tsx` — replace the `tiers` array + grid with one centered card (`max-w-lg mx-auto`, reuse the highlight card styling: `bg-[#050A08] border-2 border-emerald-500/30 rounded-3xl p-8` with the emerald glow div): badge `Founding Member` (emerald pill), toggle (two buttons in a `bg-white/3 border border-white/5 rounded-xl p-1` group; active segment `bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg`), price block per CONTEXT, guarantee line, `What's included:` + 8 Check rows, the Founding Member Bonus callout (`bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4`, `Gift` icon, bold `Founding Member Bonus:` prefix), CTA `Get Started`. Update headline and trust-bar/demo-button copy per CONTEXT. Delete the "Not sure which plan?" wording.
6. `src/pages/PendingActivationPage.tsx` — delete `PLAN_OPTIONS`; render one card with the same toggle + price + 8 features + bonus callout; one payment button: label `Pay $97/month` or `Pay $970/year` per toggle, `href` = `BILLING_LINKS[billing]` with `customer_email=<user.email>` appended when a link exists (same `sep = base.includes('?') ? '&' : '?'` logic as blueprint 1), falling back to `UPGRADE_CONTACT` with a `Mail` icon and label `Contact us to pay`. Keep the header, step strip, and check-status card untouched. Import `BILLING_LINKS, type BillingCycle` instead of `PAYMENT_LINKS, type PlanTier`.
7. `src/components/settings/SettingsPanel.tsx` — remove the preset gate wrapper (~213–220: render `<PresetPicker>` directly) and the daily-cap `UpgradePrompt` (~495; the input is always enabled now). `src/components/campaign/CampaignBuilder.tsx` — remove the plan-cap slice + toast in `handleAddToQueue` (~199–203) and the `UpgradePrompt` at ~450. `src/components/campaign/ApprovalQueue.tsx` — remove the `forcedTestMode` ternary branch (~232–239), keeping only the free toggle (the `forcedTestMode` prop can stay in the interface; it's always false now). Delete unused `UpgradePrompt` imports everywhere you removed the last usage.
8. `src/pages/ProfilePage.tsx` — badge text → `Member Plan`.
9. `.env.example` — replace the three `VITE_PAYMENT_LINK_STARTER|PRO|AGENCY` lines with `VITE_PAYMENT_LINK_MONTHLY=` and `VITE_PAYMENT_LINK_ANNUAL=` under the comment `# Polar.sh checkout links — one plan, two billing cycles (see docs/POLAR_SETUP.md)`.

EXACT INPUTS TO USE

- Files to open or create, by name: the eleven files listed in CONSTRAINTS "Must stay inside" (all edits, no new files).
- The one prompt to hand the builder to kick this off: "Open blueprints/single-plan-pricing.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: headline, toggle labels, prices, guarantee line, the 8 feature rows, the bonus sentence, CTA labels, all three quota toast strings, `MEMBER_LIMITS`, `BILLING_LINKS`.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] Landing page shows ONE pricing card; toggle flips $97/month ↔ $970/year with the `2 months free` badge on annual; all 8 features + bonus + guarantee render verbatim; Cal.com demo button still has its `data-cal-*` attributes.
[ ] /activate shows the same single card; pay button href points at the billing-matched link with `customer_email` appended; fallback mailto when no link configured.
[ ] Quotas: 4th campaign in a month blocked with the exact toast; leads trimmed at the 500/month boundary with the exact partial toast; dev mode (no user) unaffected.
[ ] `grep -rn "Starter\|Agency\|Upgrade to Pro" src/` shows no user-visible tier upsell strings remaining in rendered JSX (type names and DB values in plans.ts/db.ts are fine).
[ ] Presets, follow-ups, production mode, and the daily-cap input are all usable with no upgrade overlays.
[ ] Nothing in CONSTRAINTS was violated (no schema change, PlanContext untouched).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
