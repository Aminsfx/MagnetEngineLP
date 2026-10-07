# Operations: MagnetEngine

A solo-run SaaS. "Day one" is the first day the Founding 25 can pay (Mon 2026-11-09). Inputs: `idea.md`, `offer.md`, `numbers.json`, the repo (`CLAUDE.md`, `BACKLOG.md`, `blueprints/`). The owner's country of registration is not stated, so the licence section names what to check, not where.

## 1. The daily cycle (✱ = the customer sees it)

1. **Morning check (15 min):** Supabase function logs for `generate-dm`, `generate-reply`, `scrape` errors; any `empty_completion` or `scrape_quota` spikes; Whop for new trials, cancellations, disputes.
2. ✱ **Preview requests:** the 10-DM Preview runs on its own. Glance at today's previews for drafts that read badly; they are the conversion hinge (`offer.md`).
3. ✱ **Founding setup calls** (45 min each; ~25 in the first 7 weeks): prompt written with the buyer, first campaign loaded, extension installed, the open-tab habit explained.
4. ✱ **Support inbox** (amine@magnetengine.xyz): answer within one business day; restriction reports the same day (SOP 3).
5. **Dogfood outreach (30 min):** approve today's MagnetEngine DMs to SMMA owners (`marketing.md` channel #1). The owner sees every rough edge first.
6. ✱ **Content:** the day's post from the `marketing.md` calendar.
7. **Evening:** log the three weekly numbers as they move; queue guarantee claims for the weekly review.

Weekly: cost review (AI and HikerAPI usage against `numbers.json`), guarantee claims, extension release (if any), the three numbers, one cancellation interview.

## 2. Suppliers

| input (from `numbers.json`) | current supplier | alternatives | price / how to get it | minimums, lead time, terms |
| --- | --- | --- | --- | --- |
| AI drafting | Anthropic, claude-sonnet-4-6 (`_shared/ai.ts`) | OpenAI gpt-4o-mini, Google gemini-flash (already wired in `_shared/ai.ts`) | $3 / $15 per M tokens, published ([pricepertoken.com](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-4.6); confirm on Anthropic's page) | prepaid credits; rate limits scale with spend tier; switching costs a deploy |
| Instagram lookups | HikerAPI (`_shared/hiker.ts`) | Apify Instagram actors (the repo's earlier provider), RapidAPI scrapers | $0.0006–$0.02 per request by plan ([Capterra](https://capterra.com/p/10039767/HikerAPI/)) | prepaid; **single point of failure**: see risk 2 |
| Payments | Whop (embedded checkout, `whop-webhook`) | Polar (blueprint `polar-auto-activation.md`), Stripe, Lemon Squeezy | 2.7% + $0.30, plus 3% platform (disputed; [Dodo](https://dodopayments.com/blogs/whop-fees-explained)) | the 7-day trial and refund handling are Whop config: **change before launch** |
| Database / auth / functions | Supabase | — | Pro ~$25/mo (estimate) | monthly |
| Hosting | Vercel (`vercel.json`) | Netlify, Cloudflare Pages | ~$20/mo (estimate) | monthly |
| Email | Resend | Postmark | ~$20/mo (estimate) | monthly |
| Extension distribution | currently a downloaded file | **Chrome Web Store** | $5 once | review takes days, sometimes weeks (estimate). **Submit by 2026-10-23** |

No real price differed from `numbers.json`, because none could be fetched from here. The first job in week 1 is to replace the estimates with the real numbers from invoices and from `dm_usage` / `scrape_usage`, then re-run `/founder-cfo`.

## 3. People

One person: the owner. The rota at plan (40 subscribers) and in the first slow month:

| block | first month (≤10 subscribers + setup calls) | at 40 subscribers |
| --- | ---: | ---: |
| Setup calls | 6–8 h/week | 0 (cohort closed; self-serve onboarding) |
| Support | 2 h/week | 5 h/week |
| Ops + cost review | 2 h/week | 2 h/week |
| Content + dogfood outreach | 8 h/week | 6 h/week |
| Product (preview, fixes, extension) | 15+ h/week | 10 h/week |
| **Total** | **~35 h/week** | **~23 h/week** |

**Wage assumption: $0.** The owner is unpaid in `numbers.json`, which is why year 1's $15,109 "profit" is really the owner's pay (`cfo.md`). First hire, when needed: a part-time support/onboarding VA at roughly the offshore-setter rates in `competitors.md` ($250+/mo base). Payroll costs beyond wages vary by country; flag them for the accountant.

## 4. Routines (SOPs)

**SOP 1: Founding setup call (45 min)**
1. Before the call: read their Instagram, their offer, their 10-DM Preview.
2. Prompt wizard together: niche, audience, value proposition, the Offer Ledger (only numbers they can stand behind).
3. Install the extension from the Web Store; sign in to the Instagram account they will send from (main or second account, their choice).
4. One small campaign: scrape 50, generate, approve 10 together. Say out loud: sending runs only while an instagram.com tab is open.
5. Agree the guarantee terms in writing: 300 approved sends in 30 days at the default pace. Note the start date.
6. Ask for consent to publish their numbers at day 30, with or without their name.

**SOP 2: Guarantee claim (Booked-Call Guarantee)**
1. Check from data, not argument: approved sends ≥ 300 in their first 30 days (`dmSent` count); booked = 0 (`booked`).
2. If both hold, refund the month in Whop within 2 business days. No questions beyond "what would have made it work?"
3. Log it in a claims sheet: claim rate is a CFO input.

**SOP 3: An Instagram restriction is reported**
1. Reply the same day. Tell them to stop sending, and how to pause the extension.
2. Ask: which account, when, what Instagram showed, the Send Cap setting.
3. If they sent at the default pace, refund that month under the restriction refund. Never argue about cause.
4. Log it in a restriction register (the number the whole category hides).
5. If two or more restrictions land in a week, pause the acquisition push and review pacing in `extension/background.js`.

**SOP 4: Extension release**
1. Bump `MAGNET_PROTOCOL.VERSION` if a message name changed (CLAUDE.md seam).
2. `npm run typecheck` and the test suite; the protocol agreement test must pass.
3. Submit to the Web Store; until approved, the dashboard must handle the old version over the Handshake (refused handoffs show a reason).
4. Note the release in the changelog customers see.

**SOP 5: Weekly cost review (the "reorder")**
1. Pull last week's `dm_usage`, `scrape_usage`, Anthropic and HikerAPI spend.
2. Cost per active subscriber against `numbers.json` ($42.69). If it is 15% over, investigate before the next week's acquisition.
3. Top up prepaid credits before they run out: an empty HikerAPI balance stops every customer's scrape.

## 5. Tools: the smallest stack that runs it

Already in place: Supabase (data, auth, functions), Vercel (hosting), Whop (payments), Resend (email), GA4 (analytics), Telegram/email owner alerts (`_shared/notify.ts`). **Add only:** a scheduling link for setup calls (cal.com, already used as the `ONBOARDING_CALL_URL` default), and a shared sheet for claims, restrictions and the three weekly numbers. A bookkeeping tool (Wave, QuickBooks or local equivalent) once money moves. Prices: confirm on each vendor's page (not reachable from here).

## 6. Licences, permits, policies and insurance (check each, by the owner's country)

| item | why | where to confirm |
| --- | --- | --- |
| Business registration | taking subscription payments | the owner's company registry |
| Sales tax / VAT on SaaS | US states, the UK and the EU tax digital services, often from the first sale | Whop's tax settings (or a Merchant of Record), plus an accountant |
| **Privacy law (GDPR / UK GDPR / CCPA)** | The product stores *Leads'* personal data (handles, bios, cities) that the Operator scraped, plus Conversations. A lawful basis, a retention limit and a data-processing agreement with Operators are needed | the EU/UK regulator guidance (ICO, EDPB) and a privacy lawyer. Check `src/pages/PrivacyPolicy.tsx` covers Lead data, not just Operator data |
| **Instagram / Meta Terms** | Automated DMs breach them (already stated in `TermsOfService.tsx`) | Meta's Terms of Use. The risk is borne by the Operator's account, and the restriction refund now shares it |
| **Chrome Web Store program policies** | Spam and abuse rules and the "single purpose" rule. A listing that automates actions on another site must say so truthfully. Approval-before-send is the strongest argument for compliance | Chrome Web Store Program Policies, plus `blueprints/chrome-web-store-publish.md` |
| Consumer protection for trials and refunds | auto-renewing trials need clear disclosure (US FTC "click-to-cancel" rules, UK and EU rules) | FTC, CMA, the EU consumer rules, plus a lawyer: the `$750` legal line in `numbers.json` |
| Insurance | professional and cyber liability for a SaaS holding third-party data | a local broker |

Rules differ by place and change. Confirm each with the authority or a professional. This is not legal advice.

## 7. Risk register

| # | risk | likelihood | impact | the plan |
| --- | --- | --- | --- | --- |
| 1 | Instagram tightens detection; restrictions spike | medium | severe | SOP 3; the restriction register; slower default pacing; second-account guidance |
| 2 | HikerAPI is down, changes price or is cut off | medium | high (no new leads) | Apify adapter as a fallback (the repo used Apify before); CSV import (`blueprints/csv-lead-import.md`) |
| 3 | Chrome Web Store rejects or delays the listing | medium | high (blocks the trust fix) | submit by 10-23; keep the sideload path; answer policy questions with the approval-before-send design |
| 4 | Preview drafts read as generic (the conversion hinge) | medium | high | dogfood daily; reject-and-tune; `PROMPT_VERSION` bumps |
| 5 | Guarantee claim rate far above 20% | medium | medium ($104 → lower contribution) | the 300-send condition; weekly claims review; adjust terms for cohort 2, never retroactively |
| 6 | AI cost per DM above the estimate | low–medium | low–medium | measure in week 1; prompt caching; provider switch is wired |
| 7 | Owner is sick or overloaded (single person) | medium | high | setup-call cap per week; a written SOP set (this file); auto-email holding replies |
| 8 | The open-tab requirement drives early churn | high | medium | say it in the setup call (not week 2, per PRODUCT.md); pinned inbox tab already exists |
| 9 | Payment disputes or chargebacks on auto-billed trials | medium | medium | charge date on the button; day-5 trial reminder email; Whop dispute handling |
| 10 | A privacy complaint from a Lead whose data was scraped | low | high | Opted Out suppression already exists; a deletion route on request; privacy-policy update |

Outputs feeding back to the CFO: no cost in `numbers.json` was changed, because none could be quoted live. Week 1's first task is SOP 5 with real invoices.
