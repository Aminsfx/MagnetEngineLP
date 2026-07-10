BLUEPRINT 3: Chrome Web Store readiness (no more "downloadable file" trust problem)

BUILDER: Claude Sonnet, working alone, cold start, cannot ask questions. (Manifest/permission decisions and store-policy copy need judgment already baked in here; Sonnet executes it safely.)

GOAL

The `extension/` folder passes Chrome Web Store review requirements: correct manifest with icons, only the permissions it actually uses, a production-domain match, a packaged zip, and a complete store listing (copy + privacy answers) the owner can paste into the Developer Dashboard. Clients then install from the official store with one click — no sideloaded file, no developer mode.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `extension/manifest.json` — current MV3 manifest (v1.0.0, no icons field, permissions: storage, alarms, activeTab, scripting, tabs)
  - `extension/background.js` — uses chrome.storage, chrome.alarms, chrome.tabs.create/remove ONLY
  - `extension/content.js` — declared via manifest `content_scripts` (so the `scripting` permission is unused); relays `MAGNET_ENGINE_CAMPAIGN` postMessages from the web app and automates DMs on instagram.com
  - `extension/popup.html` / `extension/popup.js` — progress popup
  - `src/pages/PrivacyPolicy.tsx` — the app already serves a privacy policy at `/privacy`
- Real inputs, in full:
  - Product name: MagnetEngine. Brand colors: emerald `#10B981` on near-black `#030A06`. Support email: `support@magnetengine.xyz`.
  - Production web-app domain: `magnetengine.xyz` (derived from the support address in `src/lib/plans.ts`; if the deployed dashboard lives elsewhere the owner edits one manifest line — flag this in the output README).
  - What the extension actually does (single purpose, for the listing): it receives DM campaigns the user explicitly approved in their MagnetEngine dashboard and sends those DMs from the user's own logged-in Instagram session, one at a time with randomized human-like delays and a hard daily cap of 25.
- Data shapes / examples: n/a (no data model changes).
- Gotchas:
  - `activeTab` and `scripting` are declared but never used → REMOVE both (fewer permissions = easier review). Keep `storage`, `alarms`, `tabs` (tabs.create/remove is used and requires it).
  - `content_scripts.matches` includes `http://localhost:*/*` — Chrome Web Store allows it, but the store build must ALSO match the production dashboard or the "Send to Extension" button silently does nothing in production. Add `https://magnetengine.xyz/*` and `https://*.magnetengine.xyz/*` to matches AND `host_permissions`.
  - There is no `icons` field and no PNG icons — the store hard-requires a 128px icon; the toolbar needs 16/32/48. `extension/generate-icons.html` exists for manual generation but a reviewer/builder can't click it; generate PNGs programmatically instead (step 2).
  - The store requires a privacy policy URL: use `https://magnetengine.xyz/privacy` (already a live route).
  - Remote code: the extension loads no remote code — say so explicitly in the listing answers.

CONSTRAINTS (the limits)

- Must stay inside: `extension/` (manifest, new `icons/` folder, new `store-listing.md`), `package.json` (one script + one devDependency), `scripts/gen-ext-icons.mjs` (new).
- Must not change: `background.js`, `content.js`, `popup.js`, `popup.html` logic (zero behavior changes in this blueprint), the web app under `src/`.
- Stack / tools to respect: Manifest V3. For icon generation add devDependency `@resvg/resvg-js` (renders SVG→PNG in pure Node, no system deps).
- Non-negotiables: never request a permission the code doesn't use; the daily cap (25) and randomized delays stay untouched; listing copy must describe the product truthfully (it automates sending messages the user approved — do not hide this from reviewers, misrepresentation gets the developer account banned).

STEP-BY-STEP PLAN (in build order)

1. Edit `extension/manifest.json`:
   - `"name": "MagnetEngine — DM Campaign Sender"`, `"version": "1.1.0"`, `"description": "Sends the Instagram DMs you approved in your MagnetEngine dashboard — one at a time, with human-like pacing and a daily safety cap."`
   - `"permissions": ["storage", "alarms", "tabs"]` (activeTab and scripting removed).
   - `"host_permissions": ["https://*.instagram.com/*", "https://magnetengine.xyz/*", "https://*.magnetengine.xyz/*"]`
   - content_scripts matches: `["http://localhost:*/*", "https://magnetengine.xyz/*", "https://*.magnetengine.xyz/*", "https://*.instagram.com/*"]`
   - Add `"icons": {"16": "icons/icon16.png", "32": "icons/icon32.png", "48": "icons/icon48.png", "128": "icons/icon128.png"}` and the same object under `"action": {"default_icon": ...}` keeping `default_popup`.
2. Create `scripts/gen-ext-icons.mjs`: renders this inline SVG at 16/32/48/128 into `extension/icons/icon<N>.png` using `@resvg/resvg-js`:
   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#030A06"/><path d="M32 96V48a16 16 0 0 1 32 0v20a8 8 0 0 0 16 0V48a16 16 0 0 1 16-16" stroke="#10B981" stroke-width="14" stroke-linecap="round" fill="none"/><rect x="25" y="88" width="28" height="14" rx="4" fill="#34D399"/><rect x="75" y="24" width="28" height="14" rx="4" fill="#34D399"/></svg>`
   (a stylized magnet "M" in emerald). Add devDependency `@resvg/resvg-js` and package.json script `"ext:icons": "node scripts/gen-ext-icons.mjs"`. Run it; commit the four PNGs.
3. Add package.json script `"ext:zip": "cd extension && zip -r ../magnetengine-extension.zip . -x 'generate-icons.html'"` (the zip is the store upload artifact; exclude the dev-only icon page). Add `magnetengine-extension.zip` to `.gitignore`.
4. Create `extension/store-listing.md` with these exact sections, fully written (no placeholders):
   - **Title**: MagnetEngine — DM Campaign Sender
   - **Summary** (≤132 chars): `Sends the Instagram DMs you approved in MagnetEngine — human-like pacing, daily cap, full control.`
   - **Description**: 3 short paragraphs — what it does (executes user-approved DM campaigns from the MagnetEngine dashboard), how it stays safe (one DM at a time, 15–45 min randomized delays in production mode, hard 25/day cap, pause anytime from the popup), what it never does (no data collection, no posting, no following, never messages anyone the user didn't approve).
   - **Category**: Workflow & Planning. **Language**: English.
   - **Single-purpose statement**: "This extension's single purpose is to deliver Instagram direct messages that the user individually reviewed and approved in their MagnetEngine dashboard."
   - **Permission justifications**, one line each: storage (persists the user's own campaign queue and progress locally), alarms (spaces out sends with randomized delays), tabs (opens the prospect's Instagram profile to deliver the approved message and closes it after), host instagram.com (where messages are delivered), host magnetengine.xyz (receives the approved campaign from the user's own dashboard).
   - **Data usage disclosures**: collects no user data; all campaign data stays in chrome.storage.local; no remote code; no analytics.
   - **Privacy policy URL**: https://magnetengine.xyz/privacy
   - **Submission steps for the owner**: register Chrome Web Store developer account ($5 one-time), run `npm run ext:icons && npm run ext:zip`, upload zip, paste the sections above, add 3–5 screenshots (1280×800) of the popup + dashboard queue, submit; expect extra review time because the extension automates a third-party site — if rejected for "user data" questions, re-check the Data Usage tab answers above.
   - **Note to owner**: if the production dashboard is NOT served from magnetengine.xyz, edit the two domain entries in manifest.json before zipping.
5. Run `npm run ext:icons`, verify the four PNGs exist and are non-empty, then `npm run ext:zip` once to confirm the zip builds (then delete the zip or leave it untracked).

EXACT INPUTS TO USE

- Files to open or create, by name: `extension/manifest.json` (edit), `scripts/gen-ext-icons.mjs` (create), `extension/icons/icon{16,32,48,128}.png` (generate), `extension/store-listing.md` (create), `package.json` (edit), `.gitignore` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/chrome-web-store-publish.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the manifest values, SVG markup, summary line, single-purpose statement, and permission justifications above.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] Manifest is valid JSON, version 1.1.0, permissions exactly `storage, alarms, tabs`, icons field present, production domain in both matches and host_permissions.
[ ] `npm run ext:icons` produces 4 non-empty PNGs at the exact paths in the manifest; `npm run ext:zip` produces a zip containing manifest, JS, HTML, and icons but not generate-icons.html.
[ ] Loading `extension/` unpacked in Chrome shows the icon and no manifest warnings; existing send flow untouched (no diff in background.js/content.js/popup.js).
[ ] `extension/store-listing.md` has every section from step 4 filled with final copy — zero TBD/placeholder text; summary ≤132 characters.
[ ] `npm run build` still green (web app untouched).
[ ] Nothing in CONSTRAINTS was violated.

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
