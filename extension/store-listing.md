# Chrome Web Store Listing — MagnetEngine

Everything to paste into the Chrome Web Store Developer Dashboard.

## Title
MagnetEngine — DM Campaign Sender

## Summary (≤132 chars)
Sends the Instagram DMs you approved in MagnetEngine — human-like pacing, daily cap, full control.

## Description

MagnetEngine's extension executes the DM campaigns you build and approve in your MagnetEngine dashboard. You review every single message before it goes out — the extension only delivers what you explicitly approved, from your own logged-in Instagram session.

It's built to keep your account safe: messages go out one at a time with randomized 15–45 minute delays in production mode, there's a hard cap of 25 DMs per day, and you can pause or clear the queue at any moment from the popup.

It never collects your data, never posts, never follows anyone, and never messages a person you didn't approve. All campaign data stays locally in your browser.

## Category
Workflow & Planning

## Language
English

## Single-purpose statement
This extension's single purpose is to deliver Instagram direct messages that the user individually reviewed and approved in their MagnetEngine dashboard.

## Permission justifications
- **storage** — persists the user's own campaign queue and progress locally.
- **alarms** — spaces out sends with randomized delays.
- **tabs** — opens the prospect's Instagram profile to deliver the approved message and closes it after.
- **host: instagram.com** — where messages are delivered.
- **host: magnetengine.io** — receives the approved campaign from the user's own dashboard.

## Data usage disclosures
- Collects no user data.
- All campaign data stays in chrome.storage.local.
- No remote code.
- No analytics.

## Privacy policy URL
https://magnetengine.io/privacy

## Submission steps (owner)
1. Register a Chrome Web Store developer account ($5 one-time): https://chrome.google.com/webstore/devconsole
2. Run `npm run ext:icons && npm run ext:zip` — this produces `magnetengine-extension.zip`.
3. Upload the zip, paste the sections above into the listing, Privacy, and Permissions tabs.
4. Add 3–5 screenshots (1280×800): the popup mid-campaign, the dashboard approval queue, the follow-up sequencer.
5. Submit. Expect extra review time because the extension automates a third-party site — if rejected with data-usage questions, re-check the Data Usage tab answers above.

**Note:** if the production dashboard is NOT served from magnetengine.io, edit the two domain entries in `manifest.json` (`host_permissions` and `content_scripts.matches`) before zipping.
