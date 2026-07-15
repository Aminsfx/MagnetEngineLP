# Email Campaign Setup — Resend + Supabase

MagnetEngine sends four lifecycle emails, all through **Resend**, all from the
server (Edge Functions). The browser never sends email and never sees the
Resend key.

| # | Email | Trigger | Sent by |
|---|---|---|---|
| 1 | **Welcome + confirm email** | User signs up | `auth-email-hook` (Supabase Send-Email hook) |
| 2 | **Password reset** | User clicks "Forgot password" | `auth-email-hook` |
| 3 | **Payment confirmed** | Whop `membership.activated` webhook | `whop-webhook` |
| 4 | **Onboarding / setup guide** (SOPs + Loom video) | 15 min after payment confirmation — or instantly on manual activation from /admin | `whop-webhook` / `admin-api` |

Templates live in `supabase/functions/_shared/emails.ts` (dark emerald
branding matching the app). Emails 3–4 are only sent on the **first**
activation — renewals and repeat webhook deliveries don't re-send them
(status check + Resend idempotency keys).

## 1. Verify your domain in Resend

**Already done** — `magnetengine.xyz` is verified in this Resend account
(sending enabled, us-east-1), so `EMAIL_FROM` can be e.g.
`MagnetEngine <hello@magnetengine.xyz>`.

For a different domain: [resend.com](https://resend.com) → **Domains** →
**Add Domain**, add the SPF + DKIM records it shows at your DNS provider, and
wait for **Verified**. Then grab an API key: **API Keys** → **Create API Key**
(Sending access is enough).

> Sending from an unverified domain fails — customers won't get anything.

## 2. Set the email secrets

```bash
supabase secrets set \
  RESEND_API_KEY=re_XXXXXXXX \
  EMAIL_FROM="MagnetEngine <hello@magnetengine.xyz>" \
  APP_URL=https://your-app-domain.com \
  SOP_DOC_URL="https://docs.google.com/document/d/..." \
  LOOM_VIDEO_URL="https://www.loom.com/share/..."
```

- `EMAIL_FROM` — must use the domain you verified in step 1.
- `APP_URL` — your deployed frontend origin; used for the "Open my dashboard"
  buttons in emails.
- `SOP_DOC_URL` / `LOOM_VIDEO_URL` — the Google Doc SOPs and the Loom setup
  walkthrough linked from the onboarding email. **Optional**: if unset, that
  section is simply omitted (set them whenever they're ready — no redeploy
  needed, secrets are read at send time).

Make sure the Google Doc is shared as **"Anyone with the link → Viewer"** and
the Loom is set to link-shareable, or customers will hit permission walls.

## 3. Deploy the functions

```bash
supabase functions deploy auth-email-hook --no-verify-jwt  # Supabase calls it with a signed payload, not a user JWT
supabase functions deploy whop-webhook --no-verify-jwt     # redeploy — now sends emails 3+4
supabase functions deploy admin-api                        # redeploy — manual activation sends email 4
```

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

## What each email says

1. **Welcome/confirm** — greeting (uses the signup first name), confirm-email
   button, and a "what happens next" rundown (confirm → checkout → setup guide).
2. **Password reset** — reset button + safe-to-ignore note.
3. **Payment confirmed** — plan bought (Monthly $197 / Annual $1,970),
   dashboard button, heads-up that the setup guide is coming; points at Whop
   for invoices.
4. **Setup guide** — numbered steps: watch the Loom, read the SOPs, configure
   the AI Prompt Wizard, launch the first campaign; dashboard CTA; reply-for-help
   footer.

Copy lives in `supabase/functions/_shared/emails.ts` — edit and redeploy the
three functions to change wording.
