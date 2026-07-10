# Polar.sh Setup — automatic subscription activation

One plan, two billing cycles: **$97/month** or **$970/year**. When a customer pays
through a Polar checkout link, the `polar-webhook` Edge Function activates their
MagnetEngine account automatically (matched by email). Cancellations revoke access
automatically. Follow these steps once.

## 1. Run this SQL once (Supabase → SQL editor)

```sql
create or replace function public.get_user_id_by_email(p_email text)
returns uuid language sql security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.get_user_id_by_email(text) from anon, authenticated;
```

## 2. Create the two products in Polar

Polar dashboard → **Products → New Product**:

1. **MagnetEngine Membership — Monthly** — subscription, $97/month
2. **MagnetEngine Membership — Annual** — subscription, $970/year

For each product, copy:
- the **Product ID**
- the **Checkout Link** (Products → ⋯ → Share checkout link)

## 3. Put the checkout links in the frontend

In `.env` (and your hosting provider's env settings):

```
VITE_PAYMENT_LINK_MONTHLY=<monthly checkout link>
VITE_PAYMENT_LINK_ANNUAL=<annual checkout link>
```

Redeploy the frontend. The /activate page appends `customer_email=<signup email>`
to the link automatically so the payment matches the account.

## 4. Deploy the webhook function

```bash
supabase functions deploy polar-webhook --no-verify-jwt
```

## 5. Register the webhook in Polar

Polar dashboard → **Settings → Webhooks → Add endpoint**:

- URL: `https://<project-ref>.supabase.co/functions/v1/polar-webhook`
- Events: `order.paid`, `subscription.active`, `subscription.canceled`, `subscription.revoked`
- Copy the **signing secret**.

## 6. Set the function secrets

```bash
supabase secrets set \
  POLAR_WEBHOOK_SECRET=<signing secret> \
  POLAR_PRODUCT_ID_MONTHLY=<monthly product id> \
  POLAR_PRODUCT_ID_ANNUAL=<annual product id>
```

## 7. Smoke test

Signature enforcement (expect **403**):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://<project-ref>.supabase.co/functions/v1/polar-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"subscription.active","data":{"product_id":"x","customer":{"email":"test@example.com"}}}'
```

Positive path: use Polar's **"Send test event"** button on the webhook endpoint,
then verify in Supabase:

```sql
select * from subscriptions;
```

## Behavior reference

| Event | Effect |
|---|---|
| `order.paid` / `subscription.active` | Upsert `subscriptions` row → `status='active'` |
| `subscription.canceled` / `subscription.revoked` | `status='cancelled'` (access revoked) |
| No user with that email | 202 skipped, logged — activate manually as before |
| Bad signature | 403, nothing processed |

The buyer must check out with the **same email they signed up with** — the
/activate page prefills it. If they use a different email, activate manually:

```sql
insert into subscriptions (user_id, plan, status)
select id, 'pro', 'active' from auth.users where email = 'customer@example.com'
on conflict (user_id) do update
  set plan = excluded.plan, status = excluded.status, updated_at = now();
```
