# Whop Setup — embedded checkout + automatic activation

One plan, two billing cycles: **$197/month** or **$1,970/year** (2 months free).
Customers pay through the **embedded Whop checkout on /activate** (their signup
email is prefilled and locked), the `whop-webhook` Edge Function activates their
account automatically, and the owner can activate/revoke anyone manually from
**/admin**. Follow these steps once.

## 1. Create the two plans in Whop

Whop dashboard → your product → **Manage Pricing** (or Checkout links):

1. **MagnetEngine Membership — Monthly** — subscription, **$197/month**
2. **MagnetEngine Membership — Annual** — subscription, **$1,970/year**

For each plan, copy its **Plan ID** (starts with `plan_`):
Dashboard → **Checkout links** → click the **three dots (⋮)** on the pricing
option → hover **Details** → click the ID to copy it.

> No need to attach any benefits/apps to the plans — access is granted by this
> app's own webhook, not by Whop.

## 2. Put the plan IDs in the frontend env

In `.env` (and Vercel → Project → Settings → Environment Variables):

```
VITE_WHOP_PLAN_ID_MONTHLY=plan_XXXXXXXXX
VITE_WHOP_PLAN_ID_ANNUAL=plan_YYYYYYYYY
VITE_ADMIN_EMAILS=mohamedaminesbaiby@gmail.com
```

`VITE_ADMIN_EMAILS` (comma-separated) controls who sees the /admin console and
the Admin sidebar item. Redeploy the frontend after setting these.

## 3. Deploy the Edge Functions

```bash
supabase functions deploy whop-webhook --no-verify-jwt   # public webhook, verifies Whop's signature itself
supabase functions deploy admin-api                      # keeps the gateway JWT check ON
```

## 4. Create the webhook in Whop

Whop dashboard → **Developer tab** (whop.com/dashboard/developer) →
**Create Webhook** (top right):

- **URL**: `https://tttktkfrclaivxjhzbxn.supabase.co/functions/v1/whop-webhook`
- **Events**: `membership.activated`, `membership.deactivated`, `payment.succeeded`
- **API version**: `v1`
- Copy the **webhook secret** shown after creation.

## 5. Set the function secrets

```bash
supabase secrets set \
  WHOP_WEBHOOK_SECRET=<secret from step 4> \
  WHOP_PLAN_ID_MONTHLY=plan_XXXXXXXXX \
  WHOP_PLAN_ID_ANNUAL=plan_YYYYYYYYY \
  ADMIN_EMAILS=mohamedaminesbaiby@gmail.com
```

- `WHOP_WEBHOOK_SECRET` — required; the webhook rejects unsigned requests without it.
- `WHOP_PLAN_ID_*` — optional sanity check (unknown plan IDs log a warning but still activate).
- `ADMIN_EMAILS` — the server-side allowlist for /admin (this is the real
  enforcement; `VITE_ADMIN_EMAILS` only controls UI visibility).

## How it works

| Event | Effect |
|---|---|
| `membership.activated` / `payment.succeeded` | Upsert `subscriptions` row → `status='active'` (dashboard unlocks) |
| `membership.deactivated` | `status='cancelled'` (access revoked) |
| No user with that email | 202 skipped, logged — activate manually from /admin |
| Bad signature | 403, nothing processed |

The buyer pays with the **same email they signed up with** — the embedded
checkout on /activate prefills and locks it, so this is automatic. If someone
pays outside that flow with a different email, activate the email they signed
up with from **/admin → Activate a customer**.

## Smoke test

Signature enforcement (expect **403**):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://tttktkfrclaivxjhzbxn.supabase.co/functions/v1/whop-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"membership.activated","data":{"user":{"email":"test@example.com"},"plan":{"id":"plan_x"}}}'
```

Positive path: make a $0/test purchase or use Whop's webhook test delivery,
then verify in Supabase:

```sql
select * from subscriptions;
```

## Manual activation fallback (SQL)

The /admin page does this for you, but the raw SQL still works from the
Supabase SQL editor:

```sql
insert into subscriptions (user_id, plan, status)
select id, 'pro', 'active' from auth.users where email = 'customer@example.com'
on conflict (user_id) do update
  set plan = excluded.plan, status = excluded.status, updated_at = now();
```

To revoke: `update subscriptions set status = 'cancelled' where user_id = ...;`
