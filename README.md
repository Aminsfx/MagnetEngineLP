# MagnetEngine — AI Lead Automation

MagnetEngine finds Instagram leads with Apify, writes personalized DMs with AI, queues them for approval, and auto-sends approved messages through a Chrome extension.

## Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS 3 (build-time) + Supabase (auth & data) + Recharts.

## Run locally

```bash
npm install
cp .env.example .env    # fill in the PUBLIC (VITE_) values only — see below
npm run dev             # http://localhost:3000
```

`npm run dev` runs the Vite frontend only. AI DM generation and Instagram
scraping call **Supabase Edge Functions** (which hold the secret keys), so for
those features to work locally you must have the functions deployed and their
secrets set (see "Backend (Edge Functions)" below) — the app calls the deployed
functions from both dev and production. Without Supabase env vars the app falls
back to localStorage (dev mode: no real auth, subscription treated as active;
AI/scraping unavailable).

```bash
npm run build           # production build → dist/
npm run preview         # serve the production build
npx tsc --noEmit        # type-check
```

## Supabase setup (once)

1. Create a project at supabase.com, copy the URL + anon key into `.env`.
2. In **Auth → URL Configuration**, set your Site URL and add these Redirect URLs:
   - `https://YOUR_DOMAIN/login` (email confirmation)
   - `https://YOUR_DOMAIN/reset-password` (password recovery)
   - the same two with `http://localhost:3000` for dev
3. Run this in the **SQL editor**:

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

-- Subscriptions (payment gating — see below)
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter','pro','agency')),
  status text not null default 'pending' check (status in ('pending','active','cancelled')),
  updated_at timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "Users read own subscription" on subscriptions
  for select using (auth.uid() = user_id);
-- Deliberately NO insert/update policy: only you (via the dashboard or
-- service role) can activate accounts.
```

## How payment gating works

1. A visitor signs up → account is created, but their subscription is **pending** (no row in `subscriptions` = pending).
2. They land on **/activate**, which shows the single $197/mo · $1,970/yr plan with an **embedded Whop checkout** (`VITE_WHOP_PLAN_ID_MONTHLY|ANNUAL` plan IDs from `.env`; falls back to your contact email until you add them). Their signup email is prefilled and locked, so the payment always matches their account.
3. They pay → Whop fires a webhook → the `whop-webhook` Edge Function verifies the signature, matches the email, and flips their subscription to **active** within seconds. The page detects it and drops them into the dashboard.
4. Cancellations revoke access automatically the same way (`membership.deactivated`).
5. Manual fallback: the owner console at **/admin** (gated by `VITE_ADMIN_EMAILS` + the `ADMIN_EMAILS` function secret) shows every member and can activate/revoke any email in one click — no SQL needed.

Full setup click-path: `docs/WHOP_SETUP.md`.

## Auth flows

- **Sign in / Sign up** — /login (Supabase email+password). New sign-ups go to /activate.
- **Forgot password** — "Forgot password?" on /login emails a recovery link to **/reset-password**, where the user sets a new password.
- **Change password** — Profile page inside the dashboard.

## Chrome extension

`extension/` is loaded unpacked via `chrome://extensions` → Developer mode → *Load unpacked*.

- The web app posts approved campaigns via `window.postMessage`; the content script relays them to the background worker, which opens Instagram profiles on a randomized drip (test mode: ~20 s; production mode: 15–45 min, 25 DMs/day cap).
- **Before launch:** add your production dashboard domain to `content_scripts.matches` in `extension/manifest.json` (it currently matches `localhost` and `instagram.com` only) — otherwise "Send to Extension" only works from localhost.

## Environment variables — frontend vs backend

**No secret key ever reaches the browser.** All external API calls (Claude/OpenAI/
Gemini, Apify) go through Supabase Edge Functions that hold the keys server-side.

**Frontend (`VITE_*` in `.env` / Vercel — PUBLIC, shipped in the JS bundle):**

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key — designed to be public (RLS protects data) |
| `VITE_WHOP_PLAN_ID_MONTHLY` / `_ANNUAL` | public Whop plan IDs for the checkout embed |
| `VITE_ADMIN_EMAILS` | owner emails — cosmetic /admin UI gate only |

Only put non-secret values here. Never add an API key as a `VITE_` var.

**Backend (Supabase Edge Function secrets — SECRET, never sent to the browser):**

| Secret | Used by |
|---|---|
| `CLAUDE_API_KEY` (and/or `OPENAI_API_KEY`, `GEMINI_API_KEY`) | `generate-dm` |
| `APIFY_API_KEY` (opt. `APIFY_FOLLOWERS_ACTOR_ID`) | `start-scrape`, `poll-scrape` |
| `WHOP_WEBHOOK_SECRET` (opt. `WHOP_PLAN_ID_MONTHLY`/`_ANNUAL`) | `whop-webhook` |
| `ADMIN_EMAILS` | `admin-api` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into functions.

## Backend (Edge Functions)

The `supabase/functions/` directory holds five Deno Edge Functions:
`generate-dm`, `start-scrape`, `poll-scrape` (secret-holding proxies for the app),
plus `whop-webhook` and `admin-api`. Deploy and configure once:

```bash
# 1. Set the server-side secrets (never committed, never VITE_-prefixed):
supabase secrets set \
  CLAUDE_API_KEY=sk-ant-... \
  APIFY_API_KEY=apify_api_...
# optional: OPENAI_API_KEY, GEMINI_API_KEY, APIFY_FOLLOWERS_ACTOR_ID

# 2. Deploy the app proxies (gateway JWT check ON — only signed-in users can call):
supabase functions deploy generate-dm
supabase functions deploy start-scrape
supabase functions deploy poll-scrape
# webhook is public (verifies its own signature); admin-api keeps JWT check on:
supabase functions deploy whop-webhook --no-verify-jwt
supabase functions deploy admin-api
```

The browser calls the app proxies via `supabase.functions.invoke`, which attaches
the signed-in user's JWT automatically — so anonymous callers can't spend your
AI/Apify credits.

## Deploying (Vercel + Supabase)

1. **Frontend (Vercel):** set only the `VITE_*` vars above in Project → Settings →
   Environment Variables. **Remove any old `VITE_APIFY_API_KEY` / `VITE_*_API_KEY`
   from Vercel** — they're no longer used and must not be shipped.
2. Build command `npm run build`, output `dist/`. `vercel.json` already adds the
   SPA rewrite (all routes → `/index.html`).
3. **Backend (Supabase):** set the secrets and deploy the functions as above.
4. Update Supabase Auth redirect URLs and the extension manifest with the final domain.
