# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is anyone selling a service through cold Instagram DMs:
marketing and growth agency owners, online coaches and course creators, B2B
service providers (SMMA, SEO, paid ads, web design), and freelancers scaling
toward an agency. Revenue stage spans roughly $0–50k/month.

The qualifier is the situation, not the job title: a high-value offer (typically
a $1,000+/month retainer or a $2,000+ project), a clear ideal customer, an
Instagram audience full of those customers, and no scalable way to reach them
with messages that get replies. Technical comfort is low-to-moderate — at home
in a spreadsheet and a dashboard, not in an API console.

The product's own word for this person is the **Operator**: the paying customer
working the dashboard, as opposed to the **Lead** receiving the outreach. One
other role exists and is not a customer — the **Owner**, who runs MagnetEngine,
pays for its API keys, and reaches the admin console.

`HORMOZI-BRIEF.md` carries a narrower hypothesis (SMMA owners at $10k–50k/month)
as a possible acquisition beachhead. That is a targeting bet, explicitly
unvalidated, and not the product's definition of its user.

## Product Purpose

MagnetEngine runs cold Instagram outreach end to end. It finds prospects by
keyword, filters them to the Operator's rules, has an AI read each individual
profile and write that person a first DM, holds every draft for human approval,
sends the approved ones from the Operator's own browser at human pace, mirrors
the replies back into an inbox with an AI-drafted response already waiting, and
stamps the lead record as replies, bookings and deal values arrive.

It exists because of a paradox its users live inside: personalisation at scale is
impossible by hand, and automation without personalisation does not work. Manual
prospecting costs 4–5 minutes per lead; generic bots get ~1% replies and put the
account at risk.

Success for the Operator is a booked discovery call, reached from roughly ten to
fifteen minutes of daily review rather than a day of prospecting. Success for the
product is that the Operator's pipeline stops depending on whether they had the
energy to prospect that week.

## Positioning

The mechanism a neighbouring product could not truthfully copy: **every DM is
written from that prospect's own profile, and a human approves it before it
sends.** The $47–97 Instagram bot category sends one template to everybody, which
is why its reply rate is ~1%. Fully automated tools trade quality for volume; a
VA or manual work trades scale for quality. MagnetEngine automates the research,
the writing and the delivery, and reserves for the human the single moment where
judgement changes the outcome — reading the draft and approving it.

Two supporting positions, both factual rather than promotional:

- **One channel, built for it.** Instagram DMs specifically, where coaches,
  consultants and service businesses actually close. The scraper, the profile
  mapping (bio, business category, verified, city) and the browser-extension
  sending are all built for this one channel. Most AI outreach tools target
  LinkedIn or email.
- **The Operator never touches an API key.** HikerAPI and the AI providers are
  billed to the Owner and live only as server-side secrets. This is a standing
  constraint, not a feature that can be traded away.

## Operating Context

The loop, as the Operator actually works it: a one-time prompt wizard in Settings
(~5 minutes) and a set of lead-quality rules → a scrape in the Campaign Builder
from one of nine sources — keyword, hashtag, followers, following, post likers,
post commenters, location, similar accounts, or a handle list (up to 250
profiles per query, progress shown live, stoppable) → **Generate AI DMs** → the Approval Queue, where each draft is read,
edited, approved or rejected → the Chrome extension sends the approved ones →
replies arrive in the Inbox with an AI draft attached → the dashboard funnel and
follow-up ladders update themselves.

Environmental facts that shape every design decision:

- **Sending happens in the Operator's own logged-in Chrome**, through the
  extension, at randomised human pace under a daily cap.
- **Nothing sends or polls unless a logged-in instagram.com tab is open.** The
  background worker cannot attach Instagram's session cookie on its own; during
  active campaigns the extension keeps a pinned inbox tab alive. This is a real
  onboarding and churn risk and belongs in the sales conversation, not in week
  two.
- **The dashboard and the installed extension update on different days.** They
  agree over a Handshake, and work the installed build cannot perform is refused
  with a reason the Operator can read rather than posted into silence.
- **Automated DMs breach Instagram's Terms of Service.** The Terms of Service
  page states this. The landing page does not discuss account risk at all —
  owner decision, 2026-09-24: marketing talks about what the product does, not
  the downsides of outreach automation. The other half of that decision is
  binding too: no page may claim the account is safe, because that is a claim
  nobody can stand behind.
- **Access is payment-gated.** Sign-up → `/activate` (Whop embedded checkout) →
  dashboard. There is no client-side write path to a subscription.

## Capabilities and Constraints

Confirmed capabilities: keyword / hashtag / place lead scraping; lead-quality
filtering rules; an AI prompt wizard; per-profile DM generation; a human approval
queue; extension sending with randomised pacing and a daily cap; follow-up
ladders (the cold ladder and the Rescue ladder for Leads who replied but never
booked); a unified inbox with AI-drafted replies and optional autopilot; and a
self-updating funnel CRM with a dashboard, chart and rule-based analyst.

Hard constraints, read out of the code rather than estimated:

- **Send pacing: 3–8 minutes between messages**, randomised
  (`extension/background.js`), averaging ~5.5 min. 200 DMs/day is ~18 hours of
  sending and only reachable at the bottom of the delay range.
- **Daily cap: 40 by default, 200 maximum configurable.**
- **Plan quotas** (`PLAN_LIMITS`): 500 leads/month, 3 campaigns/month.
- **Sent is the extension's word**, by two routes — the receipt it returns and an
  outbound message it later reads back out of Instagram's own inbox. Never
  inferred from anything else.
- **An AI judgement never moves the funnel.** The one exception is Opted Out,
  which is suppression only: it moves no metric and fires no webhook.

The offer as it ships: **$147/month or $1,470/year, behind a 3-day free trial** —
card required, cancel before day 4 and pay nothing, auto-bills on day 4, one
trial per customer, payments final after that. A $497/month anchor sits above it.
Seats are framed as founding-member scarcity with an owner-maintained count
(currently 7 of 100), never a resetting countdown. The former 7-day money-back
guarantee has been retired from every surface.

**The monthly DM allowance is 1,500.** Server side it is live (2026-09-24): the
`MONTHLY_DM_LIMIT` secret is 1500 and generate-dm version 12, the first deploy
since July that meters DMs server-side at all, enforces it. Client side,
`PLAN_LIMITS.maxDMGenerations` reads 1,500 on `chore/feedback-loop`; until that
merges and deploys, the live dashboard's own check still stops Operators at
500. Server-side counting began with that deploy, so the first metered month
started partway through September.

Explicitly undecided — record, do not invent:

- The relationship between the 200/day cap and the monthly allowance still needs
  reconciling into one honest customer-facing throughput number.
- The three-day hold and the $147 charge are Whop configuration; nothing in this
  codebase makes them true.
- Per-customer variable API cost (HikerAPI + AI providers) has never been measured,
  so gross margin is unknown.
- The SMMA beachhead has not been validated against a paying customer.

**Terminology is binding.** `CONTEXT.md` is the glossary — Lead, Handle,
Campaign, Intake, Offer Ledger, DM, Approval Queue, Approved, Sent, Send Cap,
Follow-up, Ladder, Rescue, Handshake, Conversation, Message, Ingestion,
Autopilot, Outcome, Opted Out, Operator, Subscription, Owner. Each entry lists
the synonyms to avoid. Use the product's words, in the interface and in copy.

## Brand Commitments

- **Name:** MagnetEngine. Contact: amine@magnetengine.xyz (the one address; `SUPPORT_EMAIL` in `src/lib/plans.ts`).
- **Voice:** confident, direct, results-obsessed. Lead with the outcome before
  the explanation. Ground claims in numbers a reader can check. Use the contrast
  between generic and personalised as the rhetorical engine, without naming
  competitors. Respect the reader's intelligence — these are people who run
  businesses and know the problem better than any explanation of it.
- **Never:** "revolutionary", "game-changing", corporate jargon, "blast
  messages", any framing that suggests the account is being taken over or put at
  risk, or a specific result number presented without qualification.
- **Honesty commitments that are product decisions, not copy preferences:** no
  invented logos or testimonials — four fabricated company logos and five
  fabricated testimonials were removed from the site and must never return; no
  page claims the Operator's account is safe; the charge date is printed on the
  trial button, because a trial that hides when it bills reads as a trap; and
  scarcity appears only where it is a real product decision.
- The same principle is enforced inside the product by the **Offer Ledger**: a
  number the Operator never entered does not reach a prospect, and an empty
  Ledger says so out loud rather than going unmentioned.
- **Existing visual contract:** `docs/DESIGN-TOKENS.md` holds the committed
  colour and surface tokens, and the codebase forbids typing a raw hex. Recorded
  here as a binding constraint; the visual system itself is documented elsewhere.
- **Standing design preference: the category standard, executed impeccably.**
  Offered the choice between two own-world directions and the convention, the
  owner chose the convention deliberately. MagnetEngine is to sit alongside
  **Linear** and **Framer**, and their craft level is the bar: Linear's
  engineered precision, hairline discipline and dark density; Framer's
  motion-led scroll choreography. Build the convention at full fidelity —
  no irony, no quirk smuggled in from a rejected direction. This is a durable
  preference, not a one-off brief.

## Evidence on Hand

**There is no customer proof today, and no future work may invent any.** No case
studies, no named testimonials, no result screenshots, no customer logos. The
site currently carries no social proof at all. That is the correct honest state
and also a known conversion problem, to be solved with real proof rather than
fabricated proof.

What genuinely exists and may be cited:

- A product that is built and works end to end.
- Numbers that come from the code and can be stated: send pacing, the 40/day
  default cap, the plan quotas, the price.
- Market-rate anchors used on the landing page — $2,400 for a human, $3,000 for
  an agency. These are claims about what the job costs elsewhere, checkable by
  the reader in an hour, not claims about MagnetEngine.
- The owner-maintained seat count (7 of 100).
- The DM Psychology Playbook PDF at
  `public/downloads/MagnetEngine-DM-Playbook.pdf`, with its source content in
  `docs/sops/`.

Two traps in the repo's own documents: the reply-rate figures quoted in
`MARKETING_BRIEF.md` ("15–19% reply rates", "+450% booked calls") carry no source
and are not evidence; and that document's Pro / Starter / Agency pricing is
stale, superseded by the single $147 plan above.

## Product Principles

1. **The human approves; the machine does everything else.** The approval step is
   the product's quality floor and its safety story, not an obstacle to remove.
2. **Never claim a fact the system did not observe.** Sent rests on the
   extension's confirmation. An Outcome only ever moves a Lead forward. A number
   reaches a prospect only through the Offer Ledger. The same rule governs the
   marketing surface: no proof we do not have.
3. **Say the uncomfortable thing first — where it is the buyer's to know.** The
   charge date sits on the trial button. The ToS position lives in the Terms of
   Service and the open-tab requirement in onboarding, not in the landing copy
   (owner decision, 2026-09-24).
4. **One channel, done properly.** Instagram DMs. Breadth across channels would
   cost the per-profile specificity that is the whole differentiator.
5. **The Operator never manages a key, a provider or a quota.** Every third-party
   cost and credential belongs to the Owner, server-side.
