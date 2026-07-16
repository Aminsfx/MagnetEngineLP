# Email Campaign Setup — Resend + Supabase

MagnetEngine sends four lifecycle emails, all through **Resend**, all from the
server (Edge Functions). The browser never sends email and never sees the
Resend key.

| # | Email | Trigger | Sent by |
|---|---|---|---|
| 1 | **Welcome + confirm email** | User signs up | `auth-email-hook` (Supabase Send-Email hook) |
| 2 | **Password reset** | User clicks "Forgot password" | `auth-email-hook` |
| 3 | **Payment confirmed** | Whop `membership.activated` webhook | `whop-webhook` |
| 4 | **Onboarding / setup guide** (onboarding call + DM Playbook PDF) | 15 min after payment confirmation — or instantly on manual activation from /admin | `whop-webhook` / `admin-api` |

Templates live in `supabase/functions/_shared/emails.ts` (plain, professional
text style — no colors). Emails 3–4 are only sent on the **first**
activation — renewals and repeat webhook deliveries don't re-send them
(status check + Resend idempotency keys).

## 1. Verify your domain in Resend

**Already done** — `magnetengine.xyz` is verified in this Resend account
(sending enabled, us-east-1). Use `MagnetEngine <amine@magnetengine.xyz>` as
`EMAIL_FROM` — it's the mailbox that actually exists, so customer replies
land somewhere (the onboarding email invites replies). Any other
`@magnetengine.xyz` address would *send* fine but replies to it would bounce.

For a different domain: [resend.com](https://resend.com) → **Domains** →
**Add Domain**, add the SPF + DKIM records it shows at your DNS provider, and
wait for **Verified**. Then grab an API key: **API Keys** → **Create API Key**
(Sending access is enough).

> Sending from an unverified domain fails — customers won't get anything.

## 2. Set the email secrets

```bash
supabase secrets set \
  RESEND_API_KEY=re_XXXXXXXX \
  EMAIL_FROM="MagnetEngine <amine@magnetengine.xyz>" \
  APP_URL=https://your-app-domain.com
```

- `EMAIL_FROM` — must use the domain you verified in step 1.
- `APP_URL` — your deployed frontend origin; used for the "Open my dashboard"
  buttons in emails, **and** to build the DM Playbook PDF link
  (`<APP_URL>/downloads/MagnetEngine-DM-Playbook.pdf` — the PDF ships with the
  frontend at `public/downloads/`, no secret or Google Doc needed). Override
  with `SOP_DOC_URL` if you'd rather link somewhere else.
- `ONBOARDING_CALL_URL` — the booking link in the onboarding email; defaults
  to `https://cal.com/magnetengine/30min`, so only set it if that changes.

## 3. Deploy the functions

```bash
supabase functions deploy auth-email-hook
supabase functions deploy whop-webhook
supabase functions deploy admin-api
```

`supabase/config.toml` pins the right JWT mode per function (`verify_jwt =
false` for `auth-email-hook` and `whop-webhook` — they're called by Supabase
Auth / Whop with a signature, not a user JWT), so no `--no-verify-jwt` flag
is needed. Deploy from the repo root so the CLI picks the config up.

## 4. Enable the Send-Email hook (emails 1 + 2)

This replaces Supabase's default auth emails (signup confirmation, password
reset, magic link…) with the branded Resend versions:

1. Supabase dashboard → **Authentication → Hooks** → **Send Email** hook.
2. Choose **HTTPS**, URL:
   `https://<project-ref>.supabase.co/functions/v1/auth-email-hook`
3. Save, then copy the generated **webhook secret** (`v1,whsec_...`) and store it:

```bash
supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_XXXXXXXX"
```

> ⚠️ Order matters: set `RESEND_API_KEY`, `EMAIL_FROM` and the hook secret
> **before** enabling the hook. Once the hook is on, ALL auth emails go
> through it — if it can't send, signups and password resets will error.
> To roll back instantly, just disable the hook in the dashboard (Supabase's
> default emails take over again).

Emails 3–4 need no hook — they ride the existing Whop webhook (see
`docs/WHOP_SETUP.md`).

## 5. Smoke test

1. **Signup (email 1)**: create a throwaway account → branded
   "Welcome to MagnetEngine — confirm your email" arrives; the confirm button
   logs you in.
2. **Reset (email 2)**: Login page → "Forgot password" → branded reset email;
   the link lands on `/reset-password`.
3. **Payment (emails 3+4)**: run a test Whop purchase (or webhook test
   delivery with a real signup email + configured plan ID) → "Payment
   confirmed" arrives immediately, the setup-guide email is scheduled +15 min
   (visible under Resend → Emails as *scheduled*).
4. **Manual activation (email 4)**: /admin → Activate a customer → setup-guide
   email arrives immediately.

Delivery logs: [resend.com/emails](https://resend.com/emails). Function logs:
Supabase dashboard → Edge Functions → Logs.

## Troubleshooting: "Failed to reach hook after maximum retries"

Signup/reset errors with this message when Supabase Auth can't get a 2xx from
`auth-email-hook`. Check in this order:

1. **Gateway JWT rejection (most common).** The function was deployed with
   JWT verification on, so Supabase's hook call is rejected before your code
   runs. Fix: redeploy from the repo root (`supabase functions deploy
   auth-email-hook`) — `supabase/config.toml` sets `verify_jwt = false` for
   it. Verify in dashboard → Edge Functions → auth-email-hook → Details:
   "Verify JWT" must be **off**.
2. **Function not deployed.** Dashboard → Edge Functions — `auth-email-hook`
   must be listed. If not: deploy it (step 3 above).
3. **Hook secret mismatch.** The `SEND_EMAIL_HOOK_SECRET` secret must be the
   exact `v1,whsec_...` value shown on the hook config page. Regenerating the
   hook secret in the dashboard requires re-running `supabase secrets set`.
4. **Missing email secrets.** If `RESEND_API_KEY` or `EMAIL_FROM` is unset,
   the function deliberately returns 500 (so failures aren't silent).
   `supabase secrets list` should show both.

Function logs (dashboard → Edge Functions → auth-email-hook → Logs) show
which case you're in: no log entries at all → case 1 or 2 (the request never
reached the function); "invalid signature" → case 3; "email skipped" → case 4.

While broken, you can disable the hook (Authentication → Hooks → toggle off)
to instantly restore Supabase's default emails so signups keep working.

## What each email says

1. **Welcome/confirm** — greeting (uses the signup first name), confirm-email
   button, and a "what happens next" rundown (confirm → checkout → setup guide).
2. **Password reset** — reset button + safe-to-ignore note.
3. **Payment confirmed** — plan bought (Monthly $197 / Annual $1,970),
   dashboard button, heads-up that the setup guide is coming; points at Whop
   for invoices.
4. **Setup guide** — numbered steps: book the onboarding call
   (cal.com/magnetengine/30min), read the DM Psychology Playbook (bundled PDF),
   configure the AI Prompt Wizard, launch the first campaign;
   dashboard CTA; reply-for-help footer.

Copy lives in `supabase/functions/_shared/emails.ts` — edit and redeploy the
three functions to change wording.
