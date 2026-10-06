# Owner Alerts + Emailing All Users

Two things, both server-side (Edge Functions), both free at our scale:

1. **Owner alerts.** You get a ping on **Telegram** and/or **email** when someone
   signs up, pays, cancels, or pays but doesn't match an account.
2. **Email every user.** Users are kept in **Resend segments**, and you write and
   send **Broadcasts** to them from the Resend dashboard. The free plan covers
   1,000 marketing contacts with unlimited broadcast sends, and Resend adds the
   unsubscribe link and handles opt-outs itself.

| Event | Alert | Resend segment |
|---|---|---|
| Signup (`auth-email-hook`) | 🆕 New signup | added to **all users** |
| First payment (`whop-webhook`) | 💰 New payment | added to **all users** + **customers** |
| Payment, no matching account | ⚠️ Payment with no matching account | — |
| Payment on unknown plan | ⚠️ Payment on an unrecognized plan | — |
| Cancellation (`whop-webhook`) | ❌ Membership cancelled | — |
| Manual activation (`/admin`) | — | added to **all users** + **customers** |

Code: `supabase/functions/_shared/notify.ts` (alerts) and
`supabase/functions/_shared/contacts.ts` (Resend sync). Every secret below is
optional: if a secret isn't set, that feature turns itself off and nothing breaks.

---

## 1. Telegram alerts (recommended: instant, free, no quota)

1. In Telegram, open **@BotFather** → `/newbot` → pick a name → copy the
   **bot token** (`123456789:AA...`).
2. Open your new bot and press **Start**, then send it any message.
3. Open in a browser:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`. Find
   `"chat":{"id":123456789,...}`. That number is your **chat id**.
   (To alert a group, add the bot to the group and send a message there. Group
   ids start with `-`.)
4. Store both:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:AA... TELEGRAM_CHAT_ID=123456789
```

## 2. Email alerts (optional)

```bash
supabase secrets set OWNER_NOTIFY_EMAIL=amine@magnetengine.xyz
```

These go out through Resend, so they count toward the free transactional quota
(100/day, 3,000/month), which you share with the welcome, payment and onboarding
emails. Telegram doesn't count toward it, so prefer Telegram once volume grows.

## 3. Email all users (Resend Broadcasts)

1. Resend → **Audience → Segments** → create **All users** and (optional)
   **Customers**. Copy each segment's id.
2. Store them:

```bash
supabase secrets set RESEND_SEGMENT_ALL=<all-users-segment-id> RESEND_SEGMENT_CUSTOMERS=<customers-segment-id>
```

3. Deploy (step 4), then open **/admin** → **Sync to Resend** once. This
   backfills every *confirmed* existing user. Never-confirmed addresses are
   skipped because they're often typos. From then on, signups and payments
   sync automatically, and it's safe to press the button again any time.
4. To send: Resend → **Broadcasts** → **Create** → From
   `MagnetEngine <amine@magnetengine.xyz>` → pick the segment → write → **Send**
   (or schedule it).

Sync never sends `unsubscribed`, so a user who unsubscribed from a broadcast
stays unsubscribed.

## 4. Deploy

```bash
supabase functions deploy auth-email-hook
supabase functions deploy whop-webhook
supabase functions deploy admin-api
```

Then redeploy the frontend (Vercel) so `/admin` gets the **Sync to Resend** button.

## 5. Smoke test

- Sign up a throwaway account → 🆕 alert arrives and the contact shows up in
  Resend → Audience.
- Whop webhook test delivery (see `docs/WHOP_SETUP.md`) → 💰 alert.
- No alert? Check Supabase → Edge Functions → Logs for `[notify]` or
  `[contacts]` lines.
