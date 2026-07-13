# MagnetEngine — AI Lead Automation

MagnetEngine finds Instagram leads with Apify, writes personalized DMs with AI, queues them for approval, and auto-sends approved messages through a Chrome extension.

## Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS 3 (build-time) + Supabase (auth & data) + Recharts.

## Run locally

```bash
npm install
cp .env.example .env    # fill in your keys
npm run dev             # http://localhost:3000
```

Without Supabase env vars the app falls back to localStorage (dev mode: no real auth, subscription treated as active).

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

## Security — read before onboarding paying users

**Every `VITE_*` variable is baked into the public JS bundle.** That includes the Apify key and the OpenAI/Claude/Gemini keys. A curious user can open DevTools and extract them, and you pay for whatever they do with them. Mitigations, in order of preference:

1. **Move scraping + AI calls behind a backend** (Supabase Edge Functions are the natural fit — the anon key + RLS already handle auth). The frontend calls your function; the function holds the secret keys server-side.
2. Until then: set hard **spending limits** on all provider keys, rotate them regularly, and keep the customer count small.

The Supabase anon key is designed to be public (RLS protects the data) — that one is fine.

## Deploying (Vercel or similar)

1. Set all env vars from `.env.example` in the project settings.
2. Build command `npm run build`, output `dist/`.
3. Add a SPA rewrite so deep links work: all routes → `/index.html`.
4. Update Supabase Auth redirect URLs and the extension manifest with the final domain.
