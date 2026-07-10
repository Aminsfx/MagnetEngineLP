# MagnetEngine — AI Lead Automation SaaS

## Project Overview
MagnetEngine is a React SaaS app that helps users find Instagram leads, generate AI-crafted DMs, manage an approval queue, and (via a browser extension) auto-send approved messages. There is **no custom backend server** — Supabase provides auth + Postgres persistence (with a localStorage fallback when unconfigured), and all third-party API calls currently go directly from the browser.

## Tech Stack
- **React 19 + TypeScript**
- **Vite 6** — dev server on port 3000, env vars via `VITE_` prefix (`import.meta.env`)
- **Tailwind CSS v3 (build-time)** — `tailwind.config.js` + `postcss.config.js`, directives in `index.css`. Dark theme, emerald/cyan/zinc palette, `#030A06` near-black background. Do NOT re-add the CDN `<script>`.
- **React Router v7** — public: `/` (landing), `/login`, `/reset-password`, `/privacy`, `/terms`; signed-in: `/activate` (payment pending); paid: dashboard shell (`/dashboard`, `/campaign`, `/queue`, `/follow-ups`, `/calculator`, `/settings`, `/profile`)
- **Code splitting** — all pages are `React.lazy` in `App.tsx`; heavy vendors split via `manualChunks` in `vite.config.ts`
- **Recharts** — last-7-days outreach chart (real data from lead `dmDate`/`replyDate`)
- **Lucide React** — icons
- **Apify** — `apify~instagram-search-scraper` actor for lead scraping

## Repository Layout
```
src/
  App.tsx                        # Slim router: lazy routes + auth/payment guards
  pages/
    LandingPage.tsx              # Marketing landing page
    LoginPage.tsx                # Sign in / sign up / forgot-password (Supabase)
    ResetPasswordPage.tsx        # Password-recovery landing (from email link)
    PendingActivationPage.tsx    # /activate — payment links + "check status"
    DashboardShell.tsx           # Dashboard shell: state, lead callbacks, sub-routes
    ProfilePage.tsx              # Account, change password, real plan badge
  components/
    campaign/
      CampaignBuilder.tsx        # Apify search UI — scrape leads
      ApprovalQueue.tsx          # Review / edit / approve / reject DMs
      FollowUpSequencer.tsx      # Multi-touch sequences (Pro+)
    dashboard/
      MetricsGrid.tsx            # Funnel-stage metric cards
      AIAnalyst.tsx              # Rule-based insights from DashboardStats
      ConversionChart.tsx        # Last-7-days sends/replies chart (real data)
      OnboardingChecklist.tsx    # First-run checklist
    calculator/RevenueCalculator.tsx
    settings/
      SettingsPanel.tsx          # AI Prompt Wizard + Lead Filtering Rules
    common/UpgradePrompt.tsx     # Plan-gate CTA
    Sidebar.tsx                  # Left nav
    Hero.tsx / Features.tsx / Pricing.tsx / FAQ.tsx / CTA.tsx / SocialProof.tsx
    LiveWorkflowDemo.tsx         # Animated demo on landing page
    Logo.tsx                     # Brand logo component
  contexts/
    AuthContext.tsx              # Supabase session + signIn/signUp/signOut/resetPassword
    PlanContext.tsx              # tier + status ('pending'|'active'|'cancelled') + refresh()
  lib/
    types.ts                     # All shared TypeScript interfaces
    plans.ts                     # PlanTier, PlanLimits, SubscriptionStatus, BILLING_LINKS
    apify.ts                     # Apify API client (scrape + poll)
    storage.ts                   # localStorage read/write with obfuscation
    api.ts                       # AI DM generation helpers
    db.ts                        # Supabase persistence (incl. subscriptions)
    filters.ts                   # filterLeads() + calculateStats()
extension/                       # Chrome MV3 extension (drip DM execution)
```
Removed as dead code (git history has them): `src/components/crm/*`, `src/lib/csv.ts`, `src/pages/DashboardPage.tsx`, root-level `components/` duplicates.

## Access Gating (payment before access)
- Sign-up creates the Supabase user, then routes to `/activate` — **not** the dashboard.
- `PlanContext` reads the `subscriptions` table: no row (or `status != 'active'`) → `pending` → `ProtectedRoute` redirects to `/activate`.
- The owner activates an account after confirming payment (SQL upsert in README). No client-side write path to `subscriptions` exists on purpose.
- Payment buttons on `/activate` use `BILLING_LINKS` from `src/lib/plans.ts` (single plan: $97/mo or $970/yr), fed by `VITE_PAYMENT_LINK_MONTHLY|ANNUAL` env vars; fallback is the `UPGRADE_CONTACT` mailto.
- Without Supabase env vars (local dev): subscription is treated as `active` starter so the app runs standalone.

## Key Data Types (src/lib/types.ts)
```typescript
Lead {
  id, campaignId, handle, name, followers, following, postsCount,
  profilePicUrl, verified, businessAccount, businessCategory, city, bio,
  isPrivate, status ('cold'|'warm'|'won'),
  dmSent, replied, positiveReply, booked, followedUp,
  approved, rejected, dmContent, dmDate, replyDate,
  followUp1Date, followUp2Date, followUp3Date, dealValue
}

DashboardStats {
  totalLeads, dmsSent,
  replyRate,          // % DMs that got any reply
  positiveReplyRate,  // % replies that were positive
  bookingRate,        // % positive replies that booked
  followUpRate,       // % DMs with follow-up
  leadsContacted,     // = dmsSent
  activeCampaigns     // distinct campaignId count
}

AppConfig {
  systemPrompt, includeKeywords[], excludeKeywords[],
  minFollowers, maxFollowers, accountType,
  selectedAIProvider, businessName, businessNiche,
  targetAudience, valueProposition, exampleDM, dmTone,
  onboardingComplete
}

APIKeys { openai?, claude?, gemini? }  // NO apify — backend-managed
```

## Apify Integration (src/lib/apify.ts)
- **Actor**: `apify~instagram-search-scraper`
- **Input schema** (exact field names):
  - `search` — comma-separated search terms (string)
  - `searchType` — `"user" | "hashtag" | "place"`
  - `searchLimit` — 1–250 (actor hard cap; 250 is the maximum)
  - `enhanceUserSearchWithFacebookPage` — boolean (enriches top 10 user results)
- **Flow**: POST to start run → poll `actor-runs/{runId}` every 5 s → fetch dataset items on SUCCEEDED
- **Timeout**: 4 min (48 polls × 5 s)
- **API key**: stored in `.env` as `VITE_APIFY_API_KEY`, read via `import.meta.env.VITE_APIFY_API_KEY`

## Environment Variables (.env — gitignored)
```
VITE_APIFY_API_KEY=<your_key>          # Admin-managed, never shown to end users
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_<key>   # Publishable/anon key from Supabase dashboard
VITE_OPENAI_API_KEY / VITE_CLAUDE_API_KEY / VITE_GEMINI_API_KEY   # AI providers (owner-managed)
VITE_PAYMENT_LINK_MONTHLY / _ANNUAL          # Polar checkout links for /activate ($97/mo · $970/yr)
```
Template: `.env.example` (committed, no real values).
⚠️ All `VITE_*` values are embedded in the shipped JS bundle — see README → Security for the key-exposure caveat and the Edge Function migration plan.

## Supabase Integration
- **Package**: `@supabase/supabase-js` v2 (in dependencies)
- **Client**: `src/lib/supabase.ts` — reads from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- **Auth**: `src/lib/auth.ts` — email/password sign-in, sign-up, sign-out, session
- **Context**: `src/contexts/AuthContext.tsx` — `AuthProvider` wraps the whole app in `index.tsx`
- **DB**: `src/lib/db.ts` — cloud persistence layer (leads, configs, follow_up_sequences tables)
  - Falls back to localStorage automatically when env vars are not set
  - Batches upserts in groups of 200 to avoid Supabase request-size limits
- **Protected routes**: `ProtectedRoute` in `App.tsx` redirects to `/login` when not authenticated and to `/activate` when the subscription isn't `active`; `RequireUser` guards `/activate` itself
- **Password reset**: `resetPasswordForEmail` → email link → `/reset-password` → `auth.updateUser`

### Required SQL (run once in Supabase SQL editor)
```sql
-- Leads
create table if not exists leads (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Users see own leads" on leads for all using (auth.uid() = user_id);

-- Config
create table if not exists configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table configs enable row level security;
create policy "Users see own config" on configs for all using (auth.uid() = user_id);

-- Follow-up sequences
create table if not exists follow_up_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id text,
  steps jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table follow_up_sequences enable row level security;
create policy "Users see own sequences" on follow_up_sequences for all using (auth.uid() = user_id);

-- Subscriptions (payment gating; owner-activated — users can only READ their row)
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter','pro','agency')),
  status text not null default 'pending' check (status in ('pending','active','cancelled')),
  updated_at timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "Users read own subscription" on subscriptions
  for select using (auth.uid() = user_id);
```

## Security Constraints — MUST NEVER CHANGE
> "I will personally add the Apify API keys on the backend, so clients should NOT see or manage API keys anywhere in the app."
> "API keys should only exist on the backend/admin side because I will manage and pay for them myself."
> "Clients should never see: Apify keys, OpenAI keys, Automation keys, Any internal integrations."

**Enforcement:**
- Settings page has zero API key management UI
- `APIKeys` type has no `apify` field
- Apify key only lives in `.env` / `apify.ts` module constant
- AI provider keys (OpenAI/Claude/Gemini) can optionally be set by the owner in `localStorage` directly; no UI form

## Filter Architecture
`DashboardShell.tsx` runs `filterUtils.filterLeads(leads, config)` on every state change → `filteredLeads`.  
Filters (min/max followers, include/exclude keywords, account type) live in `Settings → Lead Filtering Rules`.  
`CampaignBuilder` has **no filter UI** — it only exposes what the Apify actor natively accepts.

## Common Commands
```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```

## Design System
- Background: `#030A06` (near-black with green tint)
- Accent: `emerald-400/500` (primary), `cyan-400` (secondary), `violet-400` (tertiary)
- Cards: `rounded-[1.5rem]` with 1px gradient border + `inset 0 1px 1px rgba(255,255,255,0.04)` box-shadow
- Text scale: `text-[10px]` labels → `text-sm` body → `text-2xl` metric values
- Toast: custom hook (`useRef` timer), bottom-right, auto-dismiss 4 s

## Notable Decisions
1. **Real Supabase auth + manual payment gating** — sign-up works for anyone, but the dashboard requires an owner-activated `subscriptions` row (see Access Gating above). Local dev without Supabase env vars bypasses both.
2. **localStorage as fallback persistence** — Supabase when configured; leads/config survive refresh either way
3. **AI DM generation is template-based** in the wizard step; live AI calls use the selected provider key from localStorage
4. **CampaignBuilder fallback**: if user scrapes results but selects none, clicking "Add to Queue" adds all results (prevents silent no-op)
5. **250 lead cap**: Apify actor enforces this server-side; UI dropdown max is 250
