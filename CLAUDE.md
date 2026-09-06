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
    routes.ts                    # DASHBOARD_ROUTES — the ONE list of dashboard pages
    useOutreach.ts               # Outreach engine: the whole Lead lifecycle, one interface
    store.ts                     # WorkspaceStore seam — createStore() picks the adapter
    db.ts                        # Supabase adapter (row mapping, batching, subscriptions)
    storage.ts                   # Browser-local bits only (dev fallback, DM delay)
    intake.ts                    # Lead intake — the only way a Lead is constructed
    prompt.ts                    # DM + reply prompt construction (pure strings)
    inbox.ts                     # Inbox log: hydration ordering + snapshot merging
    outcome.ts                   # What a Conversation reveals about its Lead
    extensionProtocol.ts         # App side of the app↔extension seam (typed)
    plans.ts                     # PLAN_LIMITS, SubscriptionStatus, WHOP_PLAN_IDS, PRICES, isAdminEmail
    apify.ts                     # Apify client (start + poll, via Edge Functions)
    api.ts                       # generate-dm / generate-reply callers
    filters.ts                   # filterLeads() + calculateStats()
extension/
  protocol.js                    # Wire protocol — shared by worker, content script, popup
  background.js / content.js / popup.js
supabase/
  functions/_shared/             # http.ts (servePost), ai.ts (providers), apify.ts, emails.ts
  migrations/0001_usage.sql      # dm_usage + usage_counters
CONTEXT.md                       # Domain glossary — read before naming anything
```
Removed as dead code (git history has them): `src/components/crm/*`, `src/lib/csv.ts`, `src/pages/DashboardPage.tsx`, root-level `components/` duplicates.

## Seams (don't reach around these)
- **Persistence** — call `createStore(userId)` and use the `WorkspaceStore`. Never
  branch on `if (user)` or import `storage`/`db` at a call site; the adapter choice
  is made once, in `store.ts`.
- **App ↔ extension** — message names live in `extension/protocol.js`; the app uses
  `src/lib/extensionProtocol.ts`. A test asserts the two agree, so never write a
  `MAGNET_ENGINE_*` string literal anywhere else. That test only proves the two
  agree *in the repo* — in the field the dashboard updates on deploy and the
  extension days later, so the installed copy announces itself over a
  **Handshake** (`MAGNET_ENGINE_HELLO` → `HELLO_BACK`, carrying
  `MAGNET_PROTOCOL.VERSION` and the names it accepts). Bump `VERSION` on both
  sides when you add a message name. `sendCampaign` returns a `Handoff`, not
  `void`: check `delivered` and show `reason` — never report success for a
  handoff an old or missing extension will ignore, and never stamp a Lead
  (`followedUp`, an outbound Message) off a refused one.
- **Lead construction** — sources hand raw rows to `intake()`. A Handle is lowercase,
  `@`-less and unique *by construction*; don't re-normalise at call sites.
- **Inbox → Lead** — a Conversation reaches the Lead behind it only as an
  `Outcome` (`src/lib/outcome.ts` → `outreach.recordOutcomes`). Never write
  `replied`/`booked` onto a Lead from inbox code directly: `recordOutcomes` is
  what fires the outbound webhooks, and it is silent when a Lead already
  reflects its Outcome — which matters because Ingestion re-reads every
  Conversation on every poll. Pass the whole batch; it folds several threads
  for one handle together (Instagram serves a message request as a second
  thread) and writes once. An Outcome never sets `dmSent` — only the extension
  confirms a send.
- **Edge Functions** — use `servePost` from `_shared/http.ts` for JWT-gated POST
  endpoints rather than re-copying the CORS/auth preamble.

## Access Gating (payment before access)
- Sign-up creates the Supabase user, then routes to `/activate` — **not** the dashboard.
- `PlanContext` reads the `subscriptions` table: no row (or `status != 'active'`) → `pending` → `ProtectedRoute` redirects to `/activate`.
- Payment is an **embedded Whop checkout** on `/activate` (single plan: $197/mo or $1,970/yr via `WHOP_PLAN_IDS`/`PRICES` in `src/lib/plans.ts`, fed by `VITE_WHOP_PLAN_ID_MONTHLY|ANNUAL`); the signup email is prefilled + locked. Fallback is the `UPGRADE_CONTACT` mailto until plan IDs are set.
- Activation is automatic: the `whop-webhook` Edge Function (Standard Webhooks signature check) matches the payment email to the user and flips `subscriptions` to active; `membership.deactivated` revokes. Manual activate/revoke lives in the owner console at `/admin` (client gate `VITE_ADMIN_EMAILS` + server enforcement via the `admin-api` function's `ADMIN_EMAILS` secret). No client-side write path to `subscriptions` exists on purpose.
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

## Apify Integration (src/lib/apify.ts → Edge Functions)
- **Actor**: `apify~instagram-search-scraper` (keyword); followers actor via `APIFY_FOLLOWERS_ACTOR_ID`
- **Input schema** (exact field names):
  - `search` — comma-separated search terms (string)
  - `searchType` — `"user" | "hashtag" | "place"`
  - `searchLimit` — 1–250 (actor hard cap; 250 is the maximum)
  - `enhanceUserSearchWithFacebookPage` — boolean (enriches top 10 user results)
- **Flow**: client calls `start-scrape` (returns `runId`) → polls `poll-scrape` every 5 s → gets dataset items on SUCCEEDED → maps to `Lead[]` client-side. Timeout 4 min (48 polls).
- **API key**: `APIFY_API_KEY` lives ONLY as a Supabase secret, used by `start-scrape`/`poll-scrape`. The browser never talks to api.apify.com.

## AI DM Generation (src/lib/api.ts → generate-dm Edge Function)
- `aiAPI.generateDM(provider, lead, systemPrompt)` calls the `generate-dm` Edge Function via `supabase.functions.invoke`. Provider keys (`CLAUDE_API_KEY`/`OPENAI_API_KEY`/`GEMINI_API_KEY`) are Supabase secrets; prompt building + injection-safe bio handling + output cleanup run server-side. Client sees no key.

## Environment Variables
**Frontend (`.env`, gitignored — PUBLIC, ships in the bundle; only non-secret values):**
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_<key>   # anon/publishable key — safe in browser (RLS protects data)
VITE_WHOP_PLAN_ID_MONTHLY / _ANNUAL          # public Whop plan IDs for /activate ($197/mo · $1,970/yr)
VITE_ADMIN_EMAILS                            # owner emails — cosmetic /admin gate (admin-api enforces server-side)
```
**Backend (Supabase Edge Function secrets — SECRET, never sent to the browser):**
```
CLAUDE_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY   # generate-dm / generate-reply
MONTHLY_DM_LIMIT                                   # generate-dm quota (default 500)
APIFY_API_KEY / APIFY_FOLLOWERS_ACTOR_ID           # start-scrape / poll-scrape
WHOP_WEBHOOK_SECRET / WHOP_PLAN_ID_MONTHLY|ANNUAL  # whop-webhook
ADMIN_EMAILS                                       # admin-api
RESEND_API_KEY / EMAIL_FROM / APP_URL              # all transactional emails
SEND_EMAIL_HOOK_SECRET                             # auth-email-hook
SOP_DOC_URL / ONBOARDING_CALL_URL                  # onboarding email links (optional; SOP defaults to bundled PDF, call URL defaults to cal.com/magnetengine/30min)
```
Set via `supabase secrets set KEY=value`. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.
Template: `.env.example` (committed, no real values). Edge Functions: `supabase/functions/{generate-dm,start-scrape,poll-scrape,whop-webhook,admin-api,auth-email-hook}`.

## Transactional Emails (Resend — docs/EMAIL_SETUP.md)
Four lifecycle emails, all sent server-side via the Resend API (`RESEND_API_KEY` is a Supabase secret; the browser never sends email):
1. **Welcome + confirm** (signup) and 2. **Password reset** — `auth-email-hook`, a Supabase Auth Send-Email hook (Standard Webhooks signature via `SEND_EMAIL_HOOK_SECRET`) that replaces Supabase's default auth emails.
3. **Payment confirmed** — sent by `whop-webhook` on first activation.
4. **Onboarding / setup guide** (onboarding-call booking link + DM Psychology Playbook PDF, bundled at `public/downloads/MagnetEngine-DM-Playbook.pdf`; source content in `docs/sops/`) — scheduled +15 min after payment by `whop-webhook`, or sent immediately by `admin-api` on manual activation.
Templates + Resend client live in `supabase/functions/_shared/emails.ts`. Emails 3–4 fire only on pending/cancelled → active transitions (renewal webhooks don't re-send) and use Resend idempotency keys.

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

-- Inbox (AI SDR): conversations + messages synced from the extension's IG
-- inbox poller. Users read/write only their own rows.
create table if not exists conversations (
  id                text primary key,           -- IG thread_id
  user_id           uuid not null references auth.users(id) on delete cascade,
  handle            text not null,
  name              text,
  avatar_url        text,
  account           text,
  last_message_at   timestamptz,
  last_message_text text,
  unread            boolean not null default false,
  status            text not null default 'open',
  intent            text,
  labels            text[],
  needs_reply       boolean not null default false,
  updated_at        timestamptz default now()
);
alter table conversations enable row level security;
create policy "own conversations" on conversations for all using (auth.uid() = user_id);

create table if not exists messages (
  id              text primary key,             -- IG item_id (uuid for local drafts)
  conversation_id text not null references conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  direction       text not null,                -- 'in' | 'out'
  text            text not null,
  ai_draft        boolean not null default false,
  created_at      timestamptz not null
);
alter table messages enable row level security;
create policy "own messages" on messages for all using (auth.uid() = user_id);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);
```

Usage accounting (`dm_usage`, `usage_counters`, and their increment functions)
lives in `supabase/migrations/0001_usage.sql` — run that file too. The DM quota
is metered by the `generate-dm` function against `dm_usage` using the service
role; users can read their own count but never write it.

## AI SDR Inbox (extension inbox poller → generate-reply Edge Function)
- The extension content script (on instagram.com) polls IG's private web JSON API (`/api/v1/direct_v2/inbox`) SAME-ORIGIN (so the session cookie attaches), normalizes threads, and pushes them to `background.js` (`INBOX_SYNC`). Background stores a snapshot and `broadcastToApp`s `MAGNET_ENGINE_INBOX` to any open dashboard tab.
- `DashboardShell` ingests snapshots via `src/lib/inbox.ts:ingestThreads` (dedupe by IG item_id; preserves AI-set intent/status/labels) into `conversations`/`messages` (Supabase, localStorage fallback), rendered by `src/components/inbox/InboxView.tsx` (`/inbox`).
- AI replies: `generate-reply` Edge Function (JWT-gated like `generate-dm`, `verify_jwt=true` in `config.toml`) returns `{ reply, intent }`. Approved replies reuse the existing `MAGNET_ENGINE_CAMPAIGN` send path (DMing the handle appends to the thread).
- Autopilot (`AppConfig.autopilot`): auto-drafts + auto-sends replies to new inbound while a dashboard tab is open; paced/capped by the extension. Human-approval is the default.
- **Inbox → funnel:** every changed Conversation is read as an `Outcome` (`src/lib/outcome.ts`) and the batch handed to `outreach.recordOutcomes`, which stamps the Leads behind the handles. An inbound Message sets `replied` + `replyDate`; booking — the Operator's "Booked" click or the AI's `booked` intent — sets `booked`/`positiveReply`/`replied`/`status: 'won'`. The AI's `interested` intent deliberately does **not** move the funnel: it colours the Inbox only, so a misread never inflates metrics or fires a webhook the Operator can't unsend. Reply rate, the conversion chart, AI Analyst, Health Score and the `replied`/`positive_reply`/`booked` webhooks all depend on this path.
- **Known gap:** an Outcome never infers `dmSent` — CONTEXT.md reserves Sent for extension confirmation. So a Lead that replies without a confirmed send (DM'd outside the app, or a lost confirmation) counts in `replied` but not `dmsSent`, and `filters.ts`'s `replyRate` (`replied/dmsSent`) can read above 100%. Closing it means either relaxing the Sent rule or only counting a reply on threads with a recorded outbound Message — an open decision, not an oversight.
- **Limitation:** polling + autopilot only run while an `instagram.com` tab is open (the background worker can't send IG's SameSite cookie). During active campaigns the extension keeps a pinned inbox tab alive.

## Security Constraints — MUST NEVER CHANGE
> "I will personally add the Apify API keys on the backend, so clients should NOT see or manage API keys anywhere in the app."
> "API keys should only exist on the backend/admin side because I will manage and pay for them myself."
> "Clients should never see: Apify keys, OpenAI keys, Automation keys, Any internal integrations."

**Enforcement:**
- Settings page has zero API key management UI
- `APIKeys` type has no `apify` field
- Apify key only lives as a Supabase secret, used by `start-scrape` / `poll-scrape`
- AI provider keys (OpenAI/Claude/Gemini) are Supabase secrets read by `_shared/ai.ts`;
  the browser has no key storage at all (`storage.getAPIKeys` was deleted)

## Filter Architecture
`useOutreach` derives `filteredLeads` with `useMemo` (never state — storing it made every
Lead mutation commit twice).  
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
