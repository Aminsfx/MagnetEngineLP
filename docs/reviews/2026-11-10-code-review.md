# Code review, 2026-11-10

A whole-codebase pass, read as an engineer and as the person who pays the bills. Scope: the React app (`src/`), the extension (`extension/`), the Edge Functions and database (`supabase/`), the build, and the live project's data and advisors.

The headline: the code is careful and well tested, and the failures customers actually hit this month all share one shape. Something in the core loop (find, write, send, count) failed **silently**, and nothing in the product noticed. Four of them were found in this review or the days before it:

| What failed | For how long | Why nobody saw it |
|---|---|---|
| Sending, when Instagram is not in English | Until 2026-11-07 | Reported as "no Message button" per lead, one at a time |
| DMs holding the model's own reasoning | Until 2026-11-10 | Stored as an ordinary DM |
| The monthly DM count (always 0, limit never enforced) | Since the usage table was created | The function ignored the database error |
| Leads past the thousandth not loading | Since any workspace passed 1,000 | The API truncates without an error |

## Fixed in this pass

1. **Leads past 1,000 were not loaded.** `db.getLeads` made one request, and the API returns at most 1,000 rows a request. Two workspaces are past that (1,919 and 1,500 Leads). Their older Leads were missing from the queue and the stats, and from the handles a new search skips as already known, which is how a person gets a second first DM. `readAll` in `src/lib/db.ts` now reads every page for Leads, Conversations and Messages. Tests cover a ceiling above and below the page size.
2. **Errors shown to clients named the AI provider.** `servePost` returned whatever a handler threw, so an Operator could read "Claude API error 529: {...}" in a toast. It now returns one plain sentence and logs the cause. The "no provider key" message no longer lists secret names either. This is the Security Constraint in CLAUDE.md being enforced where it was not.
3. **The count failure is no longer silent.** generate-dm logs when `increment_dm_usage` fails (it failed on every DM, see "Needs you" below).
4. **A vulnerable router version.** `react-router` 7.14 had two high and one critical advisory. Updated to 7.18.5 with `npm audit fix`; nothing else changed.
5. **The first page load was 548 kB of script.** Analytics was a third of it, bundled into the entry file. It is now its own file (fetched in parallel, cached across deploys); the entry is 217 kB.
6. **Nothing ran the tests on push.** `.github/workflows/ci.yml` runs types, lint, the 660 unit tests and the build on every push and pull request.
7. **The Sender had never been run in a real browser by a test.** `npm run test:e2e` (Playwright) loads the real extension in Chromium against a stand-in Instagram and checks four things: a send, a send on a French page, skipping a deleted profile, and the pause after three profiles with no Message button. See "Playwright" below.

## Needs you (blocked on a permission or a login)

1. **Run two database migrations.** Both are in `supabase/migrations/` and safe to run twice.
   - `0005_dm_usage_counts.sql`: the usage table is missing the `updated_at` column the counting function writes, so every count has failed. This adds it, removes an old copy of the function that **anyone, signed in or not, could call for any user**, and fills in this month's count from the DMs that exist. Until it runs, "written this month" stays at 0 and the 1,500 limit is not enforced.
   - `0006_leads_by_owner.sql`: an index for the one query every dashboard load makes.
2. **Turn on leaked-password protection** in Supabase Auth settings (one switch): https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
3. **Upload the extension** (1.9.1) to the Chrome Web Store if that has not happened yet. The language fix reaches nobody until it does.

## Recommended next, in order of what it protects

1. **Two tabs or two devices overwrite each other.** A Lead is saved as one whole JSON document, so the last tab to save wins and silently undoes what the other did (an approval, a skip, a restored draft). It is why a database fix needs "reload the dashboard first". Save changes as patches (`data = data || patch`) or check a version on write. Medium effort; it removes a class of "my change disappeared" reports.
2. **Loading everything, every time.** The dashboard downloads every Lead in full on each load (about 2 MB for the largest workspace today) and filters in the browser. Fine at 2,000 Leads, slow at 20,000. Move the hot fields out of the JSON into columns and page the queue. Larger effort; not urgent this quarter.
3. **Lead and campaign quotas are enforced only in the browser.** Documented as advisory, and scraping itself is metered on the server, so the exposure is small. Worth closing if a plan's limits ever become a selling point.
4. **The extension accepts campaigns from any page on `localhost`.** The store build keeps `http://localhost:*/*` so local development works. Any local page could queue DMs from the Operator's Instagram. Stripping it from the packed zip closes that, at the cost of needing the unpacked extension for local development. Your call.
5. **`alert()` popups from the extension** on handoff ("Campaign queued! ..."). The dashboard already shows its own toast; the browser alert is a leftover. Remove with the next extension release.
6. **Analytics still loads before the page is usable.** Now a separate file, but still fetched at startup. Loading it after first paint would take about 108 kB (compressed) off the landing page's critical path.
7. **Big files.** `ApprovalQueue.tsx` (1,019 lines), `CampaignBuilder.tsx` (903), `SettingsPanel.tsx` (887), `content.js` (738). They are readable and tested; split them when you next change them, not before.
8. **Dead weight.** `src/pages/LandingPage.tsx` (639 lines, no route renders it) and two unused columns on `subscriptions` (`dm_generations_used`, `dm_generations_reset_at`).

## Playwright and the extension

Playwright cannot be put inside the extension: it is a program that drives a browser from outside, and an extension runs inside one. Three ways it could relate to sending were considered:

- **Test the Sender in a real browser (done).** This is what makes sending more reliable: every change to the extension can now be proven to send before it ships, including on a non-English page.
- **Send from a server with Playwright instead of from the Operator's browser (rejected).** It would need the Operator's Instagram session on a server, which breaks the product's promise ("no password, no stored login, sends from your own browser") and is the pattern Instagram bans fastest.
- **Drive the Operator's real, logged-in Instagram with Playwright to watch for page changes (not done).** Automation flags on a real account are a ban risk, and it needs their login.

One limit to be clear about: the tests run against a stand-in page, so they prove the extension works, not that Instagram has not changed. When Instagram changes, the three-misses pause and the "what the page showed" reason are what catch it.

On this machine Playwright's own Chromium will not start (Windows reports a side-by-side configuration error). `E2E_CHANNEL=msedge npm run test:e2e` runs the same tests in installed Edge, and that is how they were run.

## What the numbers say (founder view)

From the live project on 2026-11-10: 20 sign-ups, 8 ever paid, 4 active, 4 cancelled.

- **12 of 20 never got past the payment page.** That is the largest leak in the funnel, ahead of anything in the product.
- **Half of the accounts that paid have cancelled.** The four silent failures above all land in a new customer's first week. Reliability of the core loop is the retention work.
- **No account has a trial end date recorded.** Either nobody has started a trial since the allowance shipped on 2026-10-20, or the payment webhook is not stamping it. Worth one look in Whop.
- **Lead quality decides DM quality.** On the 2026-11-09 batch, 93 of 216 Leads had nothing to write from and only 32 were business accounts. The new writer skips those, but the cheaper fix is upstream: the scrape sources and the filter rules decide who gets into the queue.

## What is solid

660 unit tests and now four real-browser tests. Row-level security on every table. Secrets only on the server. Webhooks verify signatures. The seams in CLAUDE.md (one persistence adapter, one wire protocol, one output cleaner) are real and respected. Lint is clean. The decisions are written down next to the code that carries them out, which is why this review could be done in a day.
