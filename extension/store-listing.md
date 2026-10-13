# Chrome Web Store Listing — MagnetEngine

Everything to paste into the Chrome Web Store Developer Dashboard. Every claim
here must stay true of the code: the store rejects listings whose description
or data disclosures don't match what the extension does.

## Title (≤75 chars — this is `name` in manifest.json; keep them identical)
MagnetEngine – AI Appointment Setter & Instagram DM Automation

## Summary (≤132 chars — this is `description` in manifest.json; keep them identical)
AI appointment setter for Instagram: sends the AI-written DMs and follow-ups you approve, then syncs the replies so you book calls.

## Description

Search ranks the title, summary and this text — not screenshots. Keep each
keyword phrase to once or twice: the store suspends listings for keyword spam.

MagnetEngine is an AI appointment setter for Instagram, for people who book their sales calls through DMs. Find leads and get a personal, AI-written DM for each one in your MagnetEngine dashboard (magnetengine.xyz), approve the ones you like, and this extension sends them from your own logged-in session, in your own browser. When people reply, the AI drafts the answer that moves them toward a booked call. It never asks for, sees or stores your Instagram password.

To use it, sign in to your MagnetEngine account — the popup's Sign in and Create an account buttons take you there. Until you do, the extension does nothing. Then connect your Instagram from the dashboard's Inbox.

What it does:
• Sends the messages you approved in the dashboard's Approval Queue, one at a time, with random delays between sends and a daily limit you set.
• Sends the follow-ups you scheduled, so a lead who goes quiet gets a second and third touch without you tracking it.
• Syncs your DM inbox to your MagnetEngine inbox while an Instagram tab is open, so every reply shows up next to the lead it belongs to.
• Lets you pause, resume or clear the send queue at any time from the popup.

AI replies wait for your approval in the dashboard Inbox. If you switch on Autopilot in Settings, the dashboard answers new inbound messages on its own, at the same pacing and under the same daily limit; it is off by default.

It never posts, never follows or likes anything, and never messages anyone who isn't in a campaign you created.

MagnetEngine is not affiliated with, endorsed or sponsored by Instagram or Meta.

## Category
Workflow & Planning

## Language
English

## Single-purpose statement
This extension's single purpose is to carry out the Instagram direct-message outreach the user sets up in their MagnetEngine dashboard: delivering the messages they approved and syncing the replies back to that dashboard.

## Permission justifications
- **storage** — keeps the user's send queue, pacing settings, today's send count and which MagnetEngine account is signed in, in chrome.storage.local.
- **alarms** — schedules each send after a randomized delay and keeps the inbox sync running during an active campaign.
- **Host: `https://*.instagram.com/*`** — opens the recipient's Instagram profile to deliver an approved message, and reads the user's own DM inbox (same-origin, with their existing session) to sync replies.
- **Host: `https://magnetengine.xyz/*`, `https://*.magnetengine.xyz/*`** — receives approved campaigns from the user's own dashboard tab and hands synced replies back to it.
- **Remote code** — No. All logic ships in the package; the extension fetches no scripts.

## Privacy practices tab (data usage)
Declare these — the extension handles them, so "collects no data" would be false.
Leave every other box unticked (health, financial, authentication information,
location, web history, user activity, website content): it handles none of them.
- **Personal communications** — the text of Instagram DMs in the user's inbox, synced to their MagnetEngine account so they can read and answer them there.
- **Personally identifiable information** — the Instagram handle, display name and profile-picture URL of each conversation partner; the user's own Instagram username and id (to match their inbox to their account); and the email of the signed-in MagnetEngine account, kept only in chrome.storage.local.

Certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

The Limited Use statement this certification requires is public in section 6a of https://magnetengine.xyz/privacy.

## Privacy policy URL
https://magnetengine.xyz/privacy

## Submission steps (owner)
1. Register a Chrome Web Store developer account ($5 one-time): https://chrome.google.com/webstore/devconsole
2. Run `npm run ext:zip` — it checks the manifest against the store's limits, drops the dev-only `localhost` match, and writes `magnetengine-extension.zip` with `manifest.json` at its root. Upload that file, never a hand-made zip.
3. Paste the sections above into the Store listing, Privacy and Permissions tabs.
4. Add 3–5 screenshots (1280×800): the popup mid-campaign, the dashboard approval queue, the synced inbox.
5. Submit. Expect a longer review: the extension automates a third-party site and reads messages.

Every later upload needs a higher `version` in `manifest.json` than the published one.
