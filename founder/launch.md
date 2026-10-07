# Launch plan: MagnetEngine, the Founding 25

Today: Wed 2026-10-07. **Public launch: Mon 2026-11-09.** That is the earliest date that fits the lead times in `ops.md`: building the 10-DM Preview, Chrome Web Store review, legal review of the guarantee wording, and the Whop trial change. Cohort closes Thu 2026-12-31.

## 1. Test before you spend: the soft open (Mon 10-26 → Sun 11-08)

A subscription business tests with **paid founding members**, not a waitlist. The test runs before any acquisition money moves. Until it reads, the `$500/mo` acquisition line in `numbers.json` stays at $0.

- **The test:** dogfood DMs (MagnetEngine messaging SMMA owners, approved by the owner) plus community posts drive people to the 10-DM Preview. Preview users get checkout at the founding terms from Sat 11-07, two days before the public launch.
- **Success line, written now:** by Sun 11-08, **≥ 60 previews, ≥ 12 trial starts, ≥ 4 paid founders**. By day 30 of those founders, **≥ 2 of 4 have a booked call** they attribute to MagnetEngine.
- **Compare with the panel:** the v2 panel said 20% buy, an upper bound, and only among growing SMMA owners. If real preview → paid is **under 5%**, trust the real buyers over the panel: go back to `/founder-offer` (is the preview good enough?) and `/founder-pricing`, and do not scale.
- A miss on booked calls is a product problem, not a marketing one. Stop acquisition, fix the drafts (`marketing.md`, number 3).

## 2. The countdown (owner = **O** unless named)

| week | task | owner | deadline | critical path? |
| --- | --- | --- | --- | :---: |
| **10-07 → 10-11** | Read real `dm_usage`, `scrape_usage` and provider invoices; replace the estimates in `numbers.json`; re-run `/founder-cfo` | O | Fri 10-09 | |
| | Confirm budget and runway; decide whether the $497 Done-With-You tier ships (`pricing.md`) | O | Fri 10-09 | |
| | Spec the 10-DM Preview (niche in → 10 drafts on real profiles, no card, rate-limited per IP/email) | O | Sun 10-11 | ✱ |
| **10-12 → 10-18** | Build the 10-DM Preview (public route, reuses `scrape` + `generate-dm` behind a capped anonymous quota) | O | Fri 10-16 | ✱ |
| | Send Terms + guarantee + restriction-refund wording to a lawyer | O → lawyer | Mon 10-12 | ✱ |
| | Fix `neutral-500` small-text contrast (`brand.md`) | O | Sun 10-18 | |
| **10-19 → 10-25** | Web Store build per `blueprints/chrome-web-store-publish.md`; **submit** | O | **Fri 10-23** | ✱ |
| | Whop: 7-day trial, refund handling, founding plan at $147 with a 25-seat limit counted from `subscriptions` | O | Fri 10-23 | ✱ |
| | Landing: tagline, Preview above the fold, guarantee terms; remove or make real the $497 anchor | O | Sun 10-25 | |
| | Templates: restriction reply, guarantee claim, day-5 trial reminder email (`ops.md` SOPs) | O | Sun 10-25 | |
| **10-26 → 11-01** | Soft open begins: dogfood DMs daily, community posts (`marketing.md` calendar) | O | daily | |
| | Lawyer's changes merged into Terms / Privacy (incl. Lead data, `ops.md` §6) | O | Fri 10-30 | ✱ |
| **11-02 → 11-08** | Web Store approved, or keep sideload as the fallback | Google / O | Fri 11-06 | ✱ |
| | Accountant: sales tax / VAT setting in Whop | accountant | Fri 11-06 | |
| | **Friends-and-preview day:** preview users get checkout early | O | Sat 11-07 | |
| **Mon 11-09** | **Public launch** | O | — | |

**Critical path (moves the launch date if it slips):** Preview build → legal sign-off on the guarantee → Whop trial + seat limit → Web Store approval. Of these, Web Store approval is the only one the owner does not control. If it is not approved by 11-06, launch on the sideloaded extension and keep the date.

## 3. Launch day: Mon 2026-11-09 (owner's local time)

| time | what | channel |
| --- | --- | --- |
| 07:30 | Health check: functions, HikerAPI balance, Anthropic credits, Whop checkout test with a real card (then refund) | — |
| 08:00 | Seats open. Landing switches to "The Founding 25: seats open" | site |
| 08:15 | Email to every preview user and signup: terms, guarantee, end date | Resend |
| 08:30 | Launch post (hook 5: the honest-proof story) | IG + X |
| 09:00–12:00 | DMs to every preview user who hasn't bought: "seats are open; want me to set it up with you?" | Instagram (dogfood) |
| 10:00, 14:00, 17:00 | Setup calls (max 3 today) | cal.com |
| 12:30 | Community posts (where rules allow) | Skool / Discord |
| 15:00 | Reel (hook 1) | IG |
| 18:00 | Seat count update, **from `subscriptions`** | IG story / X |
| 20:00 | Log the day: previews, trials, paid; any errors | sheet |

**If something breaks** (from `ops.md` risks): checkout fails → switch the button to the `UPGRADE_CONTACT` mailto fallback and post an honest note. Scrape quota or HikerAPI down → the Preview shows "back in an hour", not an error. A restriction report → SOP 3 the same day. Drafts look bad on a live niche → pause the Preview, fix the prompt, bump `PROMPT_VERSION`.

## 4. The first 30 days

**Weekly numbers** (from `cfo.md` and `marketing.md`):

| number | watch against | change something if |
| --- | --- | --- |
| Paying subscribers | break-even at **6** (`cfo.md`) | under 6 by day 30 |
| Preview → trial | — | under 20% for two weeks |
| Trial → paid | — | under 25% |
| Booked calls per founder (30 days) | the guarantee and the proof | median 0 at day 30 |
| Restrictions reported | — | 2 or more in a week |
| Cost per active subscriber | $42.69 (`numbers.json`) | 15% over |

**Reviews:**
- **Day 7 (Mon 11-16):** Is the Preview converting? Which hook and channel brought the trials? Any restriction or claim? Is any setup call step confusing?
- **Day 14 (Mon 11-23):** Trial → paid on the first full trial cohort. Cancellation interviews: why? Is the open-tab requirement the churn reason? Are the real API costs on budget?
- **Day 30 (Wed 12-09):** The proof question: how many founders booked a call, and will they let it be published? Guarantee claim rate against the 20% estimate. Decision: scale acquisition (only if ≥ 2 published results and CAC ≤ $200), hold, or go back to `/founder-offer`.
