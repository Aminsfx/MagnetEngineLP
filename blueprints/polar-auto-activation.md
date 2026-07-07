BLUEPRINT 1: Polar payments + automatic subscription activation

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Backend webhook code with signature verification and SQL — needs Sonnet-level care.)

GOAL

When a customer pays through a Polar.sh checkout link, their MagnetEngine subscription row in Supabase is created/updated to `active` automatically within seconds — no more manual SQL by the owner. When their Polar subscription is cancelled or revoked, their access is revoked automatically. Matching is by email: the buyer's Polar checkout email must equal their MagnetEngine sign-up email.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/lib/plans.ts` — PAYMENT_LINKS read `VITE_PAYMENT_LINK_STARTER|PRO|AGENCY` from .env; tiers are 'starter'|'pro'|'agency'; statuses 'pending'|'active'|'cancelled'
  - `src/pages/PendingActivationPage.tsx` — the /activate page; `paymentHref(tier)` at line ~84 builds the checkout link
  - `src/lib/db.ts` — `getSubscription()` shows the `subscriptions` table shape and access model
  - `README.md` — "How payment gating works" section (the manual flow this replaces)
- Real inputs, in full:
  - The `subscriptions` table already exists: `user_id uuid PK, plan text ('starter'|'pro'|'agency'), status text ('pending'|'active'|'cancelled'), updated_at timestamptz`. RLS: users can only SELECT their own row. There is deliberately NO client-side write path — the webhook writes with the service role, which bypasses RLS. Do not add any insert/update RLS policy.
  - PRICING (single plan, two billing cycles — see blueprints/single-plan-pricing.md, which should be built BEFORE this one): "MagnetEngine Membership — Monthly" at $97/month and "MagnetEngine Membership — Annual" at $970/year. Zero setup fee. Both products activate the same full-access membership; the webhook stores `plan='pro'` (an existing allowed DB value) for every activation.
  - The owner has a Polar account but has NOT yet created products or checkout links. The blueprint therefore also produces `docs/POLAR_SETUP.md` with the owner's exact click-path.
  - Polar webhooks follow the Standard Webhooks spec (svix-style): headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; HMAC-SHA256; secret starts with `whsec_` or is raw base64. Use the `standardwebhooks` npm package to verify.
  - Relevant Polar event types: `order.paid` (one-time purchase completed), `subscription.active` (recurring sub became active), `subscription.canceled`, `subscription.revoked`. Event JSON shape: `{ "type": "...", "data": { ... } }` where `data` contains `customer` (with `email`) and `product_id` (subscription events) or `product_id`/`items` (order events). Read email as `data.customer?.email ?? data.user?.email` and product as `data.product_id ?? data.product?.id ?? data.items?.[0]?.product_id` — Polar payload versions vary slightly, cover all three.
- Data shapes / examples:
  - Sample `subscription.active` payload core: `{"type":"subscription.active","data":{"id":"sub_x","product_id":"prod_monthly_id","customer":{"email":"customer@example.com"},"status":"active"}}` → expected effect: upsert `subscriptions` row for the auth user with that email: `plan='pro', status='active'`.
  - Sample `subscription.revoked` → same row set to `status='cancelled'` (plan unchanged).
- Gotchas:
  - Supabase Edge Functions run Deno, not Node. Use `npm:` import specifiers (e.g. `import { Webhook } from "npm:standardwebhooks@1.0.0"`). Files live in `supabase/functions/<name>/index.ts` — this folder does not exist yet in the repo; create it.
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected env vars inside deployed Edge Functions. `POLAR_WEBHOOK_SECRET` and the two product-ID vars must be set by the owner via `supabase secrets set`.
  - The Supabase JS admin API has no direct "get user by email"; use a `security definer` SQL function (step 1) called via RPC instead of paging through `auth.admin.listUsers()`.
  - The webhook must return 202 quickly and must return 403 on bad signature. Polar retries on non-2xx.
  - `PlanContext` fails closed (no row = pending) — a webhook failure never grants free access, so keep error handling simple: log and return 500, Polar retries.
  - Do NOT touch the client-side subscription read path; the frontend already polls via the "Check activation status" button.

CONSTRAINTS (the limits)

- Must stay inside: `supabase/functions/polar-webhook/index.ts` (new), `docs/POLAR_SETUP.md` (new), `src/pages/PendingActivationPage.tsx` (one function edited), `.env.example` (comment update only).
- Must not change: `src/lib/plans.ts` tier/status types, the `subscriptions` table columns, RLS policies (except adding the RPC function in the setup doc's SQL), `src/lib/db.ts`, `PlanContext.tsx`, any UI copy outside the single paymentHref change.
- Stack / tools to respect: Deno + `npm:` imports for the Edge Function; `@supabase/supabase-js` v2; `standardwebhooks` for signature checks. No new frontend dependencies.
- Non-negotiables: service-role key never appears in any `VITE_` var or frontend file. No client-side write path to `subscriptions` may be introduced. Signature verification is mandatory — never process an unverified body.

STEP-BY-STEP PLAN (in build order)

1. Create `docs/POLAR_SETUP.md` containing, in order: (a) SQL block for the owner to run once in the Supabase SQL editor:
   ```sql
   create or replace function public.get_user_id_by_email(p_email text)
   returns uuid language sql security definer set search_path = public as $$
     select id from auth.users where lower(email) = lower(p_email) limit 1;
   $$;
   revoke execute on function public.get_user_id_by_email(text) from anon, authenticated;
   ```
   (b) Polar dashboard click-path: create two subscription products — "MagnetEngine Membership — Monthly" $97/month and "MagnetEngine Membership — Annual" $970/year — copy each product ID and each checkout link; (c) set the two checkout links in `.env` as `VITE_PAYMENT_LINK_MONTHLY` and `VITE_PAYMENT_LINK_ANNUAL` and redeploy the frontend; (d) `supabase functions deploy polar-webhook --no-verify-jwt`; (e) in Polar → Settings → Webhooks, add endpoint `https://<project-ref>.supabase.co/functions/v1/polar-webhook` with events `order.paid`, `subscription.active`, `subscription.canceled`, `subscription.revoked`, copy the signing secret; (f) `supabase secrets set POLAR_WEBHOOK_SECRET=<secret> POLAR_PRODUCT_ID_MONTHLY=<id> POLAR_PRODUCT_ID_ANNUAL=<id>`; (g) the curl smoke test from step 4.
2. Create `supabase/functions/polar-webhook/index.ts`:
   - Imports: `createClient` from `npm:@supabase/supabase-js@2`, `Webhook` from `npm:standardwebhooks@1.0.0`.
   - `Deno.serve(async (req) => { ... })`. Reject non-POST with 405.
   - Read raw body text. Verify with `new Webhook(base64Secret).verify(body, headers)` where headers are `webhook-id`, `webhook-timestamp`, `webhook-signature` from the request; the secret env var may arrive with a `whsec_` prefix — strip the prefix before use. On verification throw → return 403.
   - Parse event. Build `KNOWN_PRODUCTS: string[]` from the two `POLAR_PRODUCT_ID_*` env vars (monthly + annual). Every activation stores `plan = 'pro'` regardless of which of the two products was bought (single-plan model; 'pro' is an existing allowed DB value).
   - Extract email (lowercased) and productId using the fallback chains from CONTEXT. If event type is not one of the four handled types → return 202 with `{"skipped":true}`. If email missing → 202 skipped (log it).
   - Look up user: `supabase.rpc('get_user_id_by_email', { p_email: email })` using a service-role client (`createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)`). If no user → return 202 `{"skipped":"no matching user"}` and `console.warn` — the owner activates manually as before.
   - For `order.paid` and `subscription.active`: if productId is not in `KNOWN_PRODUCTS`, `console.warn` but proceed anyway (a paid event for this org is an activation). Upsert `subscriptions` `{ user_id, plan: 'pro', status:'active', updated_at: new Date().toISOString() }` with `onConflict:'user_id'`.
   - For `subscription.canceled` and `subscription.revoked`: update `subscriptions` set `status='cancelled', updated_at=now` where `user_id` matches; if no row exists, do nothing.
   - Return 202 `{"ok":true}` on success; 500 with the error message on DB failure.
3. Edit `src/pages/PendingActivationPage.tsx` — blueprint 10 (single-plan-pricing) rebuilds this page with `BILLING_LINKS` and already appends `customer_email` to the checkout href. Verify that's present; if this blueprint is somehow built first, apply the same prefill to whatever payment-href function exists:
   ```typescript
   const sep = base.includes('?') ? '&' : '?';
   return `${base}${sep}customer_email=${encodeURIComponent(user.email)}`;
   ```
   In the "Already paid?" card, change the sentence `Already paid? Once we confirm your payment your account unlocks automatically.` to `Already paid? Your account unlocks automatically within a minute of payment — click below to refresh.` (exact copy).
4. Append to `docs/POLAR_SETUP.md` a smoke-test section: a curl command POSTing a sample `subscription.active` JSON to the deployed function WITHOUT valid signature headers, with the expected response `403` — proving signature enforcement — plus instructions to use Polar's "Send test event" button for the positive path, then verify with `select * from subscriptions;`.
5. Update `.env.example`: ensure the payment-link vars are `VITE_PAYMENT_LINK_MONTHLY=` and `VITE_PAYMENT_LINK_ANNUAL=` under the comment `# Polar.sh checkout links (see docs/POLAR_SETUP.md)` (blueprint 10 may have done this already — make it match exactly).

EXACT INPUTS TO USE

- Files to open or create, by name: `supabase/functions/polar-webhook/index.ts` (create), `docs/POLAR_SETUP.md` (create), `src/pages/PendingActivationPage.tsx` (edit), `.env.example` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/polar-auto-activation.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the SQL function in step 1, the prefill snippet and the replacement sentence in step 3, env var names `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_ID_MONTHLY`, `POLAR_PRODUCT_ID_ANNUAL`.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `supabase/functions/polar-webhook/index.ts` exists, verifies signatures before parsing, handles exactly the four event types, and writes to `subscriptions` only via the service-role client.
[ ] `npx tsc --noEmit` passes and `npm run build` is green (the Edge Function is outside the Vite build; if `deno check supabase/functions/polar-webhook/index.ts` is available, it passes too).
[ ] Edge case handled: unknown event type, missing email, and unmatched email all return 202 without writing; unknown product ID warns but still activates as 'pro'.
[ ] The /activate pay button appends `customer_email` only when a payment link is configured and a user email exists.
[ ] `docs/POLAR_SETUP.md` contains the SQL, the owner steps, all three env secret names, and the curl 403 smoke test — no placeholder text like TBD remains.
[ ] Nothing in CONSTRAINTS was violated (no service key in frontend, no RLS write policy added, no other files touched).

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
