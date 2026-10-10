# Analytics Tracking — Mixpanel

Mixpanel is this project's product analytics: events, user identity, funnels.
Google Analytics (`index.html`, `src/lib/landingVariant.ts`) and Vercel Web
Analytics (`index.tsx`) also run, for the landing A/B test and traffic only.
Add product events to Mixpanel; do not add another analytics SDK.

## Before you add or change tracking

- **No consent prompt.** Mixpanel tracks every visitor from the first page
  load (owner decision, 2026-10-09, knowing there are EU, UK and California
  users). Never call `mixpanel-browser` directly — go through `track()`.
- **No CDP.** Events go straight to Mixpanel: from the browser SDK, and —
  for billing only — from the `whop-webhook` Edge Function over the HTTP API
  (`supabase/functions/_shared/mixpanel.ts`).
- Read the tracking plan below; reuse an event before inventing one.

## Tech stack

| Detail | Value |
|---|---|
| Platform | React 19 + TypeScript SPA (Vite 6, React Router v7) |
| SDK | `mixpanel-browser` (^2.84) |
| Tracking method | client-side, plus server-side billing events from `whop-webhook` |
| CDP | none |
| Consent required | no prompt (owner decision) |
| Token | `VITE_MIXPANEL_TOKEN` in `.env` locally and in Vercel env vars (public; unset = Mixpanel off); the same value as the `MIXPANEL_TOKEN` Supabase secret for server events (unset = server events off) |
| Data residency | EU — browser and server both send to `api-eu.mixpanel.com` |

## Initialization

`src/lib/analytics.ts` is the only file that imports `mixpanel-browser`.
`initAnalytics()` runs once in `index.tsx`. Feature code imports `track` (and
nothing else) from `src/lib/analytics`.

Super properties on every event: `platform: 'web'` and `landing_variant`
(`a`/`b`/`c`, the first A/B landing page this browser saw).

## Identity

| Action | When | Where |
|---|---|---|
| `identifyUser({ id, email })` | sign-in, sign-up, every reload while signed in | `src/contexts/AuthContext.tsx` |
| `resetUser()` | sign-out | `AuthContext.handleSignOut` |
| `distinct_id` on server events | every billing event | `whop-webhook` (matched from the payment email) |

The id is the Supabase user id, never the email.

## Tracking plan

Names: `snake_case`, object + past-tense verb; properties `snake_case`;
booleans `is_`-prefixed; omit a property rather than send `null`/`""`; never
build an event name at runtime. Track after the action succeeds.

| Event | Trigger | Properties | File |
|---|---|---|---|
| `sign_up_completed` | A new Supabase account is created (not a repeat sign-up for an existing email) | `sign_up_method` | `src/contexts/AuthContext.tsx` |
| `sign_in_completed` | A password sign-in succeeds | `sign_in_method` | `src/contexts/AuthContext.tsx` |
| `checkout_viewed` | The Whop checkout on `/activate` is ready, once per billing cycle per visit | `billing_cycle`, `price` | `src/pages/PendingActivationPage.tsx` |
| `payment_failed` | Whop refuses a submitted payment (card was entered and submitted) | `billing_cycle`, `error_code`, `error_message` | `src/pages/PendingActivationPage.tsx` |
| `checkout_completed` | Whop reports the checkout complete | `billing_cycle`, `price` | `src/pages/PendingActivationPage.tsx` |
| `subscription_started` | **Server.** First activation (pending/cancelled → active) on a recognised plan — the revenue event | `billing_cycle`, `price` | `supabase/functions/whop-webhook/index.ts` |
| `subscription_renewed` | **Server.** `membership.activated` for an account already active | `billing_cycle`, `price` | `supabase/functions/whop-webhook/index.ts` |
| `subscription_cancelled` | **Server.** `membership.deactivated` for an active account | — | `supabase/functions/whop-webhook/index.ts` |
| `renewal_payment_failed` | **Server.** Whop `payment.failed` for an active account (a first-checkout failure is the browser's `payment_failed`) | `error_code`, `error_message` | `supabase/functions/whop-webhook/index.ts` |
| `leads_scraped` | A scrape run returns (also when nothing was found) | `source`, `query_count`, `lead_count`, `is_finished_early`, `is_halted` | `src/components/campaign/CampaignBuilder.tsx` |
| `campaign_sent` | **Value moment.** DMs handed to the extension and accepted (`handoff.delivered`) | `message_type` (`first_dm`/`follow_up`), `dm_count` | `ApprovalQueue.tsx` (first DMs), `src/lib/useOutreach.ts` (follow-ups) |

Plus automatic page views (`$mp_web_page_view`) on every route change.

Typing a card into Whop's checkout is not observable — it lives in Whop's
iframe — and card details (brand, last 4, expiry) never go to analytics. The
payment funnel is `checkout_viewed` → `payment_failed` / `checkout_completed`
→ `subscription_started`; the last step is Whop's own confirmation, so it is
the one revenue reports sum (`price`).

Server events carry `platform: 'server'` and an `$insert_id` hashed from the
webhook id, so a retried delivery counts once. The webhook also sets profile
fields: `plan`, `subscription_status`, `billing_cycle`, `subscribed_at`.

## Adding an event

1. Check the table above; extend an existing event with a property if it fits.
2. Call `track('event_name', { ... })` from `src/lib/analytics` where the action succeeds.
3. Add a row to this table.
4. Confirm it in Mixpanel → Live View.
