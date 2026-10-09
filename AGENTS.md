# Analytics Tracking — Mixpanel

Mixpanel is this project's product analytics: events, user identity, funnels.
Google Analytics (`index.html`, `src/lib/landingVariant.ts`) and Vercel Web
Analytics (`index.tsx`) also run, for the landing A/B test and traffic only.
Add product events to Mixpanel; do not add another analytics SDK.

## Before you add or change tracking

- **Consent is required.** MagnetEngine has EU, UK and California users.
  Mixpanel starts opted out and sends nothing until the visitor clicks Accept
  on `ConsentBanner`. Never call `mixpanel-browser` directly and never bypass
  the gate; `track()` already drops events without consent.
- **No CDP.** Events go straight to Mixpanel from the browser SDK.
- Read the tracking plan below; reuse an event before inventing one.

## Tech stack

| Detail | Value |
|---|---|
| Platform | React 19 + TypeScript SPA (Vite 6, React Router v7) |
| SDK | `mixpanel-browser` (^2.84) |
| Tracking method | client-side |
| CDP | none |
| Consent required | yes, opt-in banner (`src/components/common/ConsentBanner.tsx`) |
| Token | `VITE_MIXPANEL_TOKEN` in `.env` locally and in Vercel env vars (public; unset = Mixpanel off, no banner) |

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

The id is the Supabase user id, never the email. If consent arrives after
sign-in, `setConsent('granted')` identifies the signed-in user then.

## Tracking plan

Names: `snake_case`, object + past-tense verb; properties `snake_case`;
booleans `is_`-prefixed; omit a property rather than send `null`/`""`; never
build an event name at runtime. Track after the action succeeds.

| Event | Trigger | Properties | File |
|---|---|---|---|
| `sign_up_completed` | A new Supabase account is created (not a repeat sign-up for an existing email) | `sign_up_method` | `src/contexts/AuthContext.tsx` |
| `checkout_viewed` | The Whop checkout on `/activate` is ready, once per billing cycle per visit | `billing_cycle`, `price` | `src/pages/PendingActivationPage.tsx` |
| `payment_failed` | Whop refuses a submitted payment (card was entered and submitted) | `billing_cycle`, `error_code`, `error_message` | `src/pages/PendingActivationPage.tsx` |
| `checkout_completed` | Whop reports the checkout complete | `billing_cycle`, `price` | `src/pages/PendingActivationPage.tsx` |
| `leads_scraped` | A scrape run returns (also when nothing was found) | `source`, `query_count`, `lead_count`, `is_finished_early`, `is_halted` | `src/components/campaign/CampaignBuilder.tsx` |
| `campaign_sent` | **Value moment.** DMs handed to the extension and accepted (`handoff.delivered`) | `message_type` (`first_dm`/`follow_up`), `dm_count` | `ApprovalQueue.tsx` (first DMs), `src/lib/useOutreach.ts` (follow-ups) |

Plus automatic page views (`$mp_web_page_view`) on every route change.

Typing a card into Whop's checkout is not observable — it lives in Whop's
iframe. The payment funnel is `checkout_viewed` → `payment_failed` /
`checkout_completed`.

## Adding an event

1. Check the table above; extend an existing event with a property if it fits.
2. Call `track('event_name', { ... })` from `src/lib/analytics` where the action succeeds.
3. Add a row to this table.
4. Confirm it in Mixpanel → Live View (accept the consent banner first).
