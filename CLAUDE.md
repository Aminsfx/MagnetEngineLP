# MagnetEngine — AI Lead Automation SaaS

## Project Overview
MagnetEngine is a React SaaS app that helps users find Instagram leads, generate AI-crafted DMs, manage an approval queue, and (via a browser extension) auto-send approved messages. It is a **client-side-only** app — no backend server. State is persisted to `localStorage`.

## Tech Stack
- **React 19 + TypeScript** (strict mode)
- **Vite 6** — dev server on port 3000, env vars via `VITE_` prefix (`import.meta.env`)
- **Tailwind CSS** — dark theme, emerald/cyan/zinc palette, `#030A06` near-black background
- **React Router v7** — `/` (landing), `/login`, `/dashboard`, `/privacy`, `/terms`
- **Recharts** — conversion funnel chart
- **Lucide React** — icons
- **Apify** — `apify~instagram-search-scraper` actor for lead scraping

## Repository Layout
```
src/
  App.tsx                        # Root: state, routing, lead callbacks
  pages/
    LandingPage.tsx              # Marketing landing page
    LoginPage.tsx                # Auth entry (no real auth — demo)
    DashboardPage.tsx            # Main SaaS dashboard shell
  components/
    campaign/
      CampaignBuilder.tsx        # Apify search UI — scrape leads
      ApprovalQueue.tsx          # Review / edit / approve / reject DMs
    dashboard/
      MetricsGrid.tsx            # 8 funnel-stage metric cards
      AIAnalyst.tsx              # Rule-based insights from DashboardStats
      ConversionChart.tsx        # Recharts funnel chart
    crm/
      LeadManagementPanel.tsx    # CRM table with status management
      LeadTable.tsx              # Sortable/filterable lead table
      LeadsPreviewTable.tsx      # Read-only preview table
    settings/
      SettingsPanel.tsx          # AI Prompt Wizard + Lead Filtering Rules
    Sidebar.tsx                  # Left nav: Campaign / Dashboard / CRM / Settings
    Hero.tsx / Features.tsx / Pricing.tsx / FAQ.tsx / CTA.tsx / SocialProof.tsx
    LiveWorkflowDemo.tsx         # Animated demo on landing page
    Logo.tsx                     # Brand logo component
  lib/
    types.ts                     # All shared TypeScript interfaces
    apify.ts                     # Apify API client (scrape + poll)
    storage.ts                   # localStorage read/write with obfuscation
    api.ts                       # AI DM generation helpers
    filters.ts                   # filterLeads() + calculateStats()
```

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
```
Template: `.env.example` (committed, no real values).

## Supabase Integration
- **Package**: `@supabase/supabase-js` v2 (in dependencies)
- **Client**: `src/lib/supabase.ts` — reads from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- **Auth**: `src/lib/auth.ts` — email/password sign-in, sign-up, sign-out, session
- **Context**: `src/contexts/AuthContext.tsx` — `AuthProvider` wraps the whole app in `index.tsx`
- **DB**: `src/lib/db.ts` — cloud persistence layer (leads, configs, follow_up_sequences tables)
  - Falls back to localStorage automatically when env vars are not set
  - Batches upserts in groups of 200 to avoid Supabase request-size limits
- **Protected routes**: `ProtectedRoute` in `App.tsx` redirects to `/login` if not authenticated

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
`App.tsx` runs `filterUtils.filterLeads(leads, config)` on every state change → `filteredLeads`.  
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
1. **No real auth** — LoginPage is cosmetic; dashboard accessible directly
2. **localStorage for persistence** — all leads/config survive page refresh
3. **AI DM generation is template-based** in the wizard step; live AI calls use the selected provider key from localStorage
4. **CampaignBuilder fallback**: if user scrapes results but selects none, clicking "Add to Queue" adds all results (prevents silent no-op)
5. **250 lead cap**: Apify actor enforces this server-side; UI dropdown max is 250
