# MagnetEngine · Business plan

**Verdict: Not yet**

- ✓ Each client-month earns $104.31 before fixed costs (71% contribution).
- ✓ Year 1 operating profit: $15,109.
- ✗ 0 of 100 simulated buyers buy (0%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $147.00 a client-month |
| Profit margin at plan | 61% per client-month |
| Break-even | 6 client-months a day |
| Year 1 operating profit | $15,109 |
| Startup spend | $2,081 |
| Cash needed before it pays for itself | $2,605 |
| Startup money earned back | month 7 |
| Buyer panel | 0 buy · 100 pass |

## The idea

- What it is: SaaS that runs cold Instagram DM outreach end to end. It finds prospects (nine scrape sources: keyword, hashtag, followers, following, post likers, post commenters, location, similar accounts, handle list), has an AI read each profile and write that one person a first DM, holds every draft for human approval, then sends approved DMs from the Operator's own logged-in Chrome through an extension at human pace (3–8 min between sends, 40/day default cap, 200 max). Replies come back into an inbox with an AI-drafted response, and follow-up "ladders" plus a funnel dashboard update themselves.
- Who it is for: people who sell a service through cold Instagram DMs and have a high-value offer ($1,000+/mo retainer or $2,000+ project): marketing/SMMA agency owners, online coaches and course creators, B2B service freelancers (SEO, paid ads, web design) scaling to an agency. Revenue roughly $0–50k/month. Low-to-moderate technical comfort. Narrower, unvalidated beachhead hypothesis: SMMA owners at $10k–50k/month.
- What it sells, at what price: one plan, $147/month or $1,470/year (src/lib/plans.ts), behind a 3-day free trial (card required, auto-bills on day 4, one trial per customer, payments final after). $497/month shown as a price anchor. Includes 1,500 AI DMs/month, 1,500 leads/month, 6 campaigns/month (src/lib/plans.ts on this branch; PRODUCT.md still says 500 leads / 3 campaigns and is stale). The Operator never manages an API key; the Owner pays for scraping (HikerAPI) and AI providers. "Founding member" seats framed as scarcity: an owner-maintained count, currently 7 of 100.
- Where and how: online, worldwide (English). Landing page with three A/B variants; payment via embedded Whop checkout; Supabase backend; Chrome extension (not yet in the Chrome Web Store, per the backlog). Sending only happens while a logged-in instagram.com tab is open.
- Budget and constraints: solo owner/operator (amine@magnetengine.xyz). Marketing budget and runway: NOT GIVEN (open question). Per-customer variable API cost has never been measured, so gross margin is unknown. No customer proof exists (no testimonials, case studies or results) and none may be invented. Automated DMs breach Instagram's Terms of Service; no page may promise the account is safe. Scarcity may only be real.

## Summary

**Verdict: Not yet.** What has to change first: **the offer has to earn trust before it asks for a card.** At today's terms, 0 of 100 simulated buyers bought. With the redesigned offer, 4 of 20 did (20%), still under the 25% bar. What changes it: build the 10-DM Preview and switch to the 7-day trial plus the Booked-Call Guarantee (`/founder-offer`). Then get **real** proof from the Founding 25 (`/founder-launch`). Nothing else in this plan matters until real buyers confirm or overturn the panel.

**What it is.** MagnetEngine finds prospects on Instagram, writes each one their own first DM from their profile, and sends only what the Operator approved, from their own browser. It is for agency owners and coaches selling $1,000+/month services through cold Instagram DMs; the first audience is **growing SMMA owners ($10–50k/month) who still type DMs by hand.**

**The three numbers** (`cfo.md`; most inputs are estimates):
- **Margin:** each client-month leaves **$104.31 (71%)** after its own costs, including the guarantee reserves. Profit margin at 40 subscribers: **61%**.
- **Break-even:** **6 paying subscribers** a month.
- **Year 1:** **$15,109** operating profit on an *assumed* ramp of 2 → 34 subscribers. At half that ramp it is $4,105. At a quarter it is a $1,398 loss. The owner is unpaid in these numbers.

**Where the board and the panel agreed.** The missing proof is the problem: no results, no reviews, a final-payment trial (the board's top risk; the reason for 79 of 100 passes). Price is *not* the problem for the target segment: 29 of 30 SMMA owners accept $147. The Instagram account risk sits on the buyer's side.
**Where they disagreed.** The Monopoly lens passed on durability: every key part is rented, and a copycat could rebuild it in months. The panel never raised that, because buyers don't think about moats. The Product lens wanted fewer features; the panel's buyers asked for more (preview, second account), not fewer.

**The biggest risk** is an Instagram restriction landing on a customer's main account. It is the fear in 25 flip answers, and a refund does not undo it (v2 panel). What will be done: second-account guidance, a restriction refund, a restriction register and SOP 3 (`ops.md`). No safety promise, ever.

**What the founder needs to start.** About **$2,600 in cash** on the base ramp (`cfo.md`; $3,200–$4,300 if the ramp is half or a quarter). That pays for a lawyer's review of the guarantee, the Web Store fee, the pilot costs and small launch tests. The product is already built. Plus **~35 hours a week** for the first two months.

**The one thing to do this week:** pull one month of real `dm_usage`, `scrape_usage` and the Anthropic and HikerAPI invoices, and replace the cost estimates in `numbers.json`. Then start building the 10-DM Preview, the step every v2 buyer made their purchase depend on.

_The panel is simulated buyers and the numbers are projections. Real customers and real quotes confirm them. Not financial, legal or tax advice._

## What the board said

**Vote: 2 FUND IF, 1 PASS. Average score 4.0 / 10** (Offers 4, Monopoly 3, Product 5).
Memos: `board/offers.md`, `board/monopoly.md`, `board/product.md`.

### Risks raised by more than one member (most dangerous first)

1. **The Instagram account the buyer sells through is at risk** (all three). Automated DMs breach Instagram's Terms of Service. Restriction lands on the buyer's main sales asset, at the moment the product should pay off. Nothing in the offer lowers, shares or designs for that risk.
2. **There is no proof, and every term pushes risk onto the buyer** (Offers, Product). No testimonials, results or measured reply rate. The 7-day refund is gone. The trial is 3 days, card required, auto-bills, and payments are final. Perceived likelihood is near zero.
3. **The offer's numbers do not agree** (Offers, Product). 1,500 DMs a month against 500 leads a month, and a 40/day default that gives about 1,200 sends in 30 days. The price has moved between $97, $197 and $147. The $497 anchor is a price nobody pays.
4. **Onboarding is a chain of handoffs** (Offers, Product). A sideloaded extension, a tab that has to stay open for about 3.7 hours a day, and a dashboard and extension that update on different days.
5. **Unknown unit cost and no distribution** (Offers, Monopoly). Per-customer API cost has never been measured. There is no channel, CAC, budget or count of paying customers.

### Where the board disagreed

- **Monopoly passed; Offers and Product said fund if.** The Monopoly lens sees no durable advantage. Every key part is rented (the models, HikerAPI, Instagram), and a competent copycat could rebuild it in months. The other two think the product is good enough to earn proof first and look for a moat later.
- **Scope.** The Product lens wants nine sources and the autopilot cut back, and calls autopilot a contradiction of "a human approves it". The Offers lens wants *more* in the box (done-with-you onboarding, a guarantee) to justify the price.

### Conditions: a checklist for the rest of the pack

- [ ] **Measure the per-customer variable cost** of scraping and AI, so gross margin is known. → `/founder-cfo`
- [ ] **One price, and quotas that describe one real month** (leads ≈ DMs ≈ daily cap × days). Make the $497 anchor a real tier or drop it. → `/founder-pricing`, `/founder-offer`
- [ ] **A guarantee tied to the buyer's own effort**, priced only once cost is known (for example, send N approved DMs in 30 days with no booked call, then a refund or a free month). → `/founder-offer`, `/founder-cfo`
- [ ] **Build the stack around the sacrifice**: done-with-you onboarding, warm-up and pacing guidance, a designed "Instagram pushed back" moment. No safety promise. → `/founder-offer`, `/founder-ops`
- [ ] **Get real, publishable proof from a small beachhead cohort** (SMMA owners at $10k–50k/month) before scaling spend. → `/founder-launch`
- [ ] **Measure the funnel**: time to first approved send (target: inside the trial), trial → paid, approval-without-edit rate, reply rate on real accounts. → `/founder-launch`, `/founder-ops`
- [ ] **Chrome Web Store install.** → `/founder-ops`, `/founder-launch`
- [ ] **A named, repeatable acquisition channel with a measured CAC** well below lifetime value. → `/founder-marketing`
- [ ] **Keep scarcity real**: the seat count comes from actual signups. → `/founder-offer`
- [ ] **A written plan for losing access** to Instagram's sending pattern or to the scraping source. → `/founder-ops`
- [ ] **Name the five closest alternatives** and where MagnetEngine wins and loses against each. → `/founder-competitors`
- [ ] (Monopoly, to move from PASS) **Start an advantage that grows with use**, for example pooled results data on which DMs win in each niche.

### Open questions only the owner can answer

How many of the 7 founding seats are paying? Why was the guarantee retired? What has an active customer cost to serve? How many trial users have sent a DM? How many Operator accounts have been restricted?

### The strongest version the board can see

A narrower business than the one pitched: **a done-with-you Instagram outbound system for SMMA and coaching operators**, sold on the approval queue ("every DM is written from that prospect's profile, and you approve it"). It has one or two lead sources, a Web Store extension and a guarantee tied to sending effort. It earns its first ten published case studies before spending on acquisition, and it treats the risk to the account as a designed part of the product rather than something left to the Terms of Service. The proprietary asset worth building is the results data: which openers get replies in which niche. That is the only thing on the table a copycat could not rebuild in a quarter. This is not quite what was pitched. It trades breadth (nine sources, autopilot) for proof and a lower-risk first month.

## The competition

Research date: 2026-10-07. **Source caveat:** this environment's network policy blocked direct fetches of the vendor sites (inro.social, dmchamp.com, trustmrr.com). Every fact below comes from web search results quoting the linked page. Treat prices as starting points and confirm each one on the vendor's own pricing page before quoting it anywhere. No competitor, price or review is invented. Where a fact was not found, the cell says so.

### The table (most direct first)

| name | type | price for the nearest comparable plan | what it sells | source |
| --- | --- | --- | --- | --- |
| AutoLead | direct | $27 / $57 / $95 a month, 7-day trial | "automates highly personalized outreach messages on Instagram" | [TrustMRR](https://trustmrr.com/startup/autolead) (Feb 2026); self-reported MRR $107k (Jun 2026) |
| WaveDM | direct | $39 (1 account), $59 (2), $119 (5), $199 (10), up to $699 (50) a month | Desktop app: cold DM automation, follow-ups, templates, an "account safety system" | [Capterra](https://www.capterra.com/p/10046173/WaveDM/) |
| DM Champ | direct | $27 Starter; Instagram from **$97** Growth; $297 Pro; $497 Agency; AI metered by credits | "AI sales agent" for DMs | [vendor roundup](https://dmchamp.com/best/best-instagram-dm-automation-tools-2026/) (its own page, which ranks itself #1) |
| IGdm Pro | direct | $8.99 / $19.99 / $29.99 a month; AI personalisation only on the top tier | Bulk DMs, up to 3 accounts | [Capterra](https://www.capterra.com/p/10045605/IGdm-Pro/) |
| FollowToDM | direct (narrow) | $49–$499 a month | Chrome extension on a logged-in session; DMs new followers | [AlternativeTo](https://alternativeto.net/software/www-followtodm-com/about/) |
| Inrō | indirect | Free (100 contacts); Pro €19.90 a month; €1,249 a year | Comment-to-DM, story and inbound automation, campaigns to contacts | [inro.social/pricing](https://inro.social/pricing) (via search) |
| ManyChat | indirect | Free to 1,000 contacts; Pro about $15–$29 a month, scaling with contacts | Official-API inbound flows (comment-to-DM, keywords) | [eesel.ai](https://www.eesel.ai/blog/manychat-pricing) (Sep 2026) |
| PhantomBuster | indirect | $69 / $159 / $439 a month | Cloud scrapers plus outreach, billed by execution time and credits | [vendor blog](https://phantombuster.com/blog/ai-automation/phantombuster-pricing-explained) (Jul 2026) |
| IGLeads | indirect | $49 a month (2,500 credits), $99 (7,500); $0.01–$0.02 a lead pay-as-you-go | Instagram lead and email lists | [GetApp](https://www.getapp.com/all-software/a/igleads/) |
| Part-time DM setter | substitute | $2,000–$4,000 a month; or $20–$50 per booked call; or 3–5% commission | A person who prospects and works the inbox | [CreatorFlow](https://creatorflow.so/blog/instagram-dm-setter-vs-ai-setter/) (a vendor of AI setters) |
| Offshore setter | substitute | $250 a month base plus $75 per closed deal | Remote Instagram setter | [OnlineJobs.ph posting](https://www.onlinejobs.ph/jobseekers/job/1657097) |
| By hand | substitute | 4–5 minutes per lead of the founder's time | — | PRODUCT.md |

Not mapped, and worth a follow-up: cold-email and LinkedIn outbound tools (Instantly, Expandi, etc.), which are the substitute *channel*. Their prices were not looked up here.

### Price range, comparable item ("software that sends cold Instagram DMs for one account")

- Lowest: **$8.99 a month** (IGdm Pro Standard, no AI)
- Median of the direct tools' entry plans with AI or personalisation ($27, $29.99, $39, $49, $97): **$39 a month**
- Highest software entry point that includes Instagram: **$97 a month** (DM Champ Growth); multi-account tiers reach $499–$699
- Human substitute: **$250 a month plus commission** offshore, up to **$2,000–$4,000 a month** for a retained setter

**MagnetEngine at $147 is the most expensive single-account software in the category, by about 1.5× over the next highest ($97) and 3.8× over the median.** It sits about 14–27× below a retained human setter. The price only holds if the buyer files it under "a setter replacement", not "a DM tool".

### Positioning map (two axes this buyer cares about)

```
                      MESSAGE QUALITY (written per person, human-checked)
                                       ▲
             Human setter ($2–4k) ●    │    ● MagnetEngine ($147) — claimed, unproven
                                       │
         Offshore setter ($250+) ●     │
                                       │      ● DM Champ ($97, AI agent)
  LOW  ────────────────────────────────┼──────────────────────────────►  HIGH
  EFFORT SAVED                         │        ● AutoLead ($27–95, "personalized")
                                       │  ● WaveDM ($39+)   ● IGdm Pro ($9–30)
            By hand (free, slow) ●     │        ● FollowToDM ($49+)
                                       │  ● PhantomBuster/IGLeads (lists only)
                                       ▼
                      TEMPLATE / VOLUME
```

ManyChat and Inrō are off this map. They automate conversations with people who *already engaged*, which is the official-API, lower-risk lane, and not cold outreach.

### What customers complain about (category-wide)

Independent reviews for the direct tools are almost non-existent: Capterra shows **0 reviews** for WaveDM and IGdm Pro, and no Reddit threads surfaced. Every theme below is **thin** (fewer than three independent reviews), so read it as a hypothesis.

1. **Account restrictions after automation** (thin, but the loudest theme). One Trustpilot review of Instantflow: after about two months at 35 messages a day, "Instagram kept blocking my activity. Eventually, Instagram detected the use of automation and suspended my account" ([Trustpilot](https://uk.trustpilot.com/review/instantflow.ai)). A ManyChat forum user says that after "many comments in one day and using dm and comment automation, our account got banned from commenting" ([ManyChat community](https://community.manychat.com/general-q-a-43/our-instagram-account-just-got-a-ban-on-commenting-for-using-comment-dm-automations-3411)).
2. **Platform-policy doubt.** Several sources (most of them sellers of official-API tools) say cold DMs to people who never engaged cannot run on Meta's official API, so they need a logged-in bot, which they label high-risk ([ReplyAtlas](https://replyatlas.com/blog/is-instagram-dm-automation-allowed), [Metricool](https://metricool.com/is-instagram-dm-automation-safe-rules-limits-and-best-practices/)).
3. **Hidden and metered costs.** Credit-metered AI (DM Champ, PhantomBuster), contact-scaled pricing (ManyChat), and AI personalisation locked to the top tier (IGdm Pro) ([eesel.ai](https://www.eesel.ai/blog/manychat-pricing), [Capterra](https://www.capterra.com/p/10045605/IGdm-Pro/)).
4. **No trustworthy proof anywhere in the category.** Reply-rate claims are marketing ("5x", "avoiding detection") with no evidence ([AlternativeTo DMpro](https://alternativeto.net/software/dmpro/about)). This is a category-wide gap, and MagnetEngine shares it.

### The gap

**Nobody in the cold-Instagram lane combines (a) a message written from that one profile, (b) a human approving every send, and (c) no API keys, credits or meters for the buyer to manage, with the risk stated honestly rather than "avoiding detection".** The cheap tools sell volume and evasion. The official tools refuse cold outreach. The humans cost $2–4k.

The evidence that this gap is *valuable* (that buyers will pay $147 for it, not $39) does not exist yet. The gap is real on paper and unproven in money. The second gap is proof: in a category with zero reviews and unsupported claims, **the first tool with ten real, published operator results owns trust.**

### The threat

- **Fastest copy: DM Champ or AutoLead.** Both already sell "AI" and "personalized" for Instagram, at $27–$97. Adding an approval queue is a feature, not a rebuild. AutoLead also reports far more revenue than MagnetEngine (self-reported $107k MRR), which pays for a fast follow.
- **Platform threat: Meta.** Any tightening of web-session DM detection hits every tool in the direct lane at once, MagnetEngine included.
- **Category threat: official-API tools** (ManyChat, Inrō) that teach the buyer to get inbound conversations instead of cold ones.

## The buyer panel

**0 buy · 100 pass** (0% buy) out of 100 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Early-stage agency owner or freelancer (under $5k/month revenue) | 35 | 0% |
| Appointment setter or SDR who runs outreach for a client | 10 | 0% |
| Online coach or course creator selling a high-ticket program | 25 | 0% |
| Growing SMMA or agency owner ($10k-$50k/month revenue) | 30 | 0% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Burned by a DM bot before | 16 | 0% |
| Sends DMs by hand every day | 22 | 0% |
| Tool tinkerer | 14 | 0% |
| Follows a guru's outreach playbook | 10 | 0% |
| Protective of their Instagram account | 14 | 0% |
| Content-first, mostly inbound | 12 | 0% |
| Already pays a setter or VA | 12 | 0% |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $48,000 to $147,000 | 33 | 0% |
| under $48,000 | 33 | 0% |
| $147,000 and up | 34 | 0% |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 79 | "I already paid for a DM tool that got me almost no replies and an action block, so anything that automates Instagram DMs makes me flinch. There are no customer results at all, and a card-required trial that turns into final payments at $147 is a lot of risk when I make under $5k a month." (P001) · "$147 is a big bite out of what I make, and there's not one review or case study showing it actually books calls. I might poke at the trial, but I'd cancel before day 4 and I wouldn't be paying." (P003) |
| price | 9 | "I make about $1,500 a month and $147 is a big bite out of that, three or four times what other DM tools cost. Typing openers by hand is exhausting, but I can't put that much on a card for software with zero published results." (P002) · "$147 a month is a big chunk of money when I make about $21k a year and my pipeline dries up every other month, and other Instagram DM tools cost a third of that. Card up front, payments final after day 3, and my main account is my storefront, so I'm not putting it on the line for a tool with zero published results." (P010) |
| need | 8 | "My leads come from posting and comment-to-DM, and cold DMs are only a side thing when the pipeline's thin. If I'm stuck it's my offer or my content, not that I can't send enough DMs, so $147 a month for more outreach doesn't fix my actual problem." (P012) · "I already pay a setter who works my inbox, and if my calls are slow I figure it's my offer or my content, not the DMs. Nothing here shows me it beats the person I already have." (P014) |
| timing | 3 | "I cannot justify another $147 a month until I land my next client, and my guru's playbook already tells me which DM tool to use and this isn't it. A card-required trial with payments final after day 4 is a lot to risk when my pipeline is dry." (P006) · "I'm already doing DMs by hand and it kind of works, and I can't justify another $147 a month until I land my next client. A card-required trial that turns into final payments on day 4 is a lot to risk when I'm busy with client work." (P050) |
| quality | 1 | "I already hate typing openers by hand, so the pain is real, but every AI DM I've seen sounds robotic and my prospects can smell it. $147 is nothing against what I make, but a card-required trial with zero published results and only 3 days to judge replies isn't enough for me to bet my own Instagram account on it." (P016) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |

### What would flip a no

- Real results from a few agency owners like me (replies and booked calls, with names I can check), plus a trial with no card required or a refund guarantee past day 3.
- A price around $49 or less, or real results from people like me (booked calls from an account my size) plus a refund window longer than three days.
- A few real customers showing booked calls from it, or a price under about $50 a month with no card needed for the trial.
- Real reply and booked-call numbers from a few customers in my niche, plus seeing sample DMs written for my own prospects during the trial that I'd actually send.
- Real, named results from people selling a high-ticket program like mine, plus a few actual sample DMs from real profiles that don't sound like AI. My guru recommending it would also do it.
- Real results from people who sell like me, such as booked calls from the DMs, or a guru I already follow recommending it and showing it work.
- Published results from real customers like me, plus a clear way to run it on a separate throwaway account so my main one is never at risk.
- Real results from a named SDR or agency that has run it for 30+ days with no action blocks, ideally with a screenshot of their reply rate. A lower price or a month-to-month refund window would help too.
- Real results from a few coaches or agency owners like me (replies and booked calls, not just DMs sent), or a longer trial or a money-back window instead of 'payments are final'.
- A price around $50 to $60 a month, plus real customer results from people at my size and a clear answer on what happens to my account if Instagram flags it.
- A few real users in my situation showing their accounts are fine after months of use, plus actual booked-call numbers, and a price closer to $50-60 a month.
- Real case studies from agencies my size showing booked calls from this, plus a longer trial or a refund window, or a much lower price like $49 a month.

100 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Inputs: `panel/answers` (100 simulated buyers, four price answers each), `pricing-curve.md`, `competitors.md`, and `numbers.json` run through the CFO tool. Unit = one paying client-month. "Break-even per day" in the tool reads as **paying subscribers per month**, because `days_per_month` is 1.

### 1. The price: keep $147 a month ($1,470 a year). Do not cut it.

**What buyers said.** The whole panel's acceptable range is **$30 to $150** (PMC to PME), and $147 is inside it, at the top edge. The whole panel is the wrong lens, though, because the segments split hard:

| segment | a bargain | getting expensive | too expensive | $147 acceptable to |
| --- | ---: | ---: | ---: | ---: |
| Growing SMMA owner ($10–50k/mo) | $79 | $197 | $350 | 29 of 30 |
| High-ticket coach | $59 | $150 | $250 | 23 of 25 |
| SDR / setter | $49 | $94 | $139 | 4 of 10 |
| Early-stage owner (<$5k/mo) | $39 | $80 | $130 | 11 of 35 |

For the beachhead the board named (growing SMMA owners plus coaches), $147 sits *below* "getting expensive". Nobody in that group passed on price. They passed on trust (`panel/readout.md`).

**Against competitors.** $147 is the most expensive single-account tool in the category. The next highest is DM Champ Growth at $97; the median entry plan is $39 (`competitors.md`). That is a problem only if MagnetEngine is filed as "a DM tool". Filed as "a setter replacement", it is roughly 14–27× cheaper than a $2,000–$4,000/month human setter. The pricing page has to do that filing. Cutting to $39–97 would put MagnetEngine in the commodity fight the board warned against, and it would not answer one objection the target segment raised.

**Margin (from the CFO tool, estimates marked in `numbers.json`).**

| price | contribution per client-month | break-even (paying subscribers) | margin at 40 subscribers | year 1 profit (ramp) |
| ---: | ---: | ---: | ---: | ---: |
| $97 | $64.40 (66%) | 9 | 52% | $6,688 |
| **$147** | **$114.40 (78%)** | **6** | **68%** | **$17,238** |
| $197 | $164.40 (83%) | 4 | 76% | $27,788 |

(The `--price` runs hold the Whop fee at its $147 value, so the $97 row is slightly flattering and the $197 row slightly harsh. Each is off by under $3 a client-month.)

### 2. The ladder: make the $497 anchor real, or delete it

Today the $497 "anchor" is a price nobody pays, and the board flagged it as a fake anchor. Two honest options:

| rung | price | what it is | the reason to step up |
| --- | ---: | --- | --- |
| **Operator** (the core) | $147/mo · $1,470/yr | Today's product: 1,500 DMs, 1,500 leads, 6 campaigns a month | — |
| **Operator + Setup** (optional, one-off) | $297 once | A 45-minute setup call: the owner writes the prompt with them, loads the first campaign and checks the extension and the open-tab habit | Kills the "first five minutes are hard work" problem the Product lens named. People pay for done-with-you, and it is the step most likely to get a first reply inside the trial |
| **Done-with-you** | $497/mo | Operator plus a weekly 30-minute review of their queue and replies, plus prompt tuning | For growing SMMA owners whose time is worth more than $350/month. The SMMA panel's "too expensive" median is $350, so $497 has to carry real service |

If the owner will not deliver the service in rung 3, **drop the $497 anchor from the page.** A price nobody pays is not an anchor.

### 3. The opening offer: the founding cohort (dated, real)

- **Founding-member price locked for life at $147** for the first 25 paying customers, ending **2026-12-31**, or earlier when the 25th seat is taken. The seat count must come from the real `subscriptions` table, not a hand-edited number.
- Founders get the $297 setup call **free**.
- After the cohort closes, list price for new customers moves to $197. The SMMA and coach segments tolerate it (median "getting expensive" is $197 and $150). Do this only once the cohort has produced published results.
- No "was $X" price that was never charged.

### 4. What to test with real buyers

Two prices inside the beachhead's range, on traffic aimed at SMMA owners and coaches only:

- **A: $147/mo** vs **B: $197/mo**, both with the same risk reversal from `/founder-offer` (the panel says that matters more than price).
- How: the landing A/B system already exists (`src/lib/landingVariant.ts`). Add a price variant, or run two Whop plans and route by variant. Measure checkout starts, trial-to-paid, and first-month churn. A higher price that halves trial-to-paid is not a win.
- Success line: at least 20 trial starts per arm before reading anything.

### 5. The panel's top price objections, verbatim, for marketing to answer

1. "$147 a month is a big chunk of money when I make about $21k a year and my pipeline dries up every other month, and other Instagram DM tools cost a third of that." (P010)
2. "I make about $1,500 a month and $147 is a big bite out of that, three or four times what other DM tools cost." (P002)
3. "$147 is nothing against what I make, but a card-required trial with zero published results and only 3 days to judge replies isn't enough for me to bet my own Instagram account on it." (P016)

Number 3 is the one that matters for the beachhead: the price is fine, the terms are not.

### Rules kept

Simulated price answers chose what to test; they are not proof. No price is below variable cost. No fake anchors (hence section 2).

## The offer

Method: the Offers lens (`.claude/skills/founder-board/lenses.md`), a summary in our own words of the framework in *$100M Offers*. It is not the author's words, and the author has not endorsed anything here.
Raw material: `panel/readout.md` (100 buyers, 0 bought), `competitors.md`, `board.md` conditions, `numbers.json`.

### 1. The problem list (in the buyer's words, from the panel and the competitor complaints)

**Before buying**
1. "There are no reviews or case studies, so how do I know it books calls?" (every buyer)
2. "A card-required trial that turns into final payments… feels like a trap." (P018, P031, P042)
3. "Three days is too short to see whether cold DMs turn into booked calls." (P004, P009, P053)
4. "Will this get my Instagram account restricted or banned?" (P007, P021, P059)
5. "AI-written DMs always sound robotic; prospects can tell." (P016, P026, P080)
6. "$147 is three or four times what other DM tools charge." (P002, P010)
7. "My guru's playbook names a different tool." (P006, P092)
8. "Only 7 seats sold; I'd be the guinea pig." (P046, P058)
9. "Is it better than the setter I already pay?" (P014, P039)

**During**
10. "I'd have to keep an Instagram tab open for hours." (P007, P029, P040)
11. Setting it up: the extension, the prompt, the first campaign (Product lens)
12. "I'd still review every DM myself, and that's my setter's job today." (v2 P015)
13. "What is the default send pace, in writing?" (v2 P018)

**After**
14. "A refund doesn't bring back a restricted account." (v2 P001, P007, P014)
15. "My offer is the real problem, not my DMs." (P012, P017, P081)
16. "Does it keep working after month one?"

### 2. Solutions, scored (value to buyer 1–5, cost to deliver 1–5; keep high value, low cost)

| # | solution | answers | value | cost | keep |
| --- | --- | --- | ---: | ---: | --- |
| A | **10-DM preview before any card**: type a niche, see 10 drafts for real prospects | 1, 5, 9 | 5 | 1 (≈$0.15 of AI + lookups) | **yes** (needs building) |
| B | **7-day trial** instead of 3 | 2, 3 | 4 | 1 | **yes** |
| C | **Booked-Call Guarantee**: send ≥300 approved DMs in 30 days and get zero booked calls → month refunded | 1, 2, 3 | 5 | 2 ($4.90 a client-month, estimate) | **yes** |
| D | **Restriction refund**: restricted while sending at the default pace → that month refunded | 4, 14 | 3 | 2 ($4.41, estimate) | **yes**, labelled as a refund, never as a promise of safety |
| E | **"Works from a second account"**: say so plainly | 4, 14 | 4 | 0 (already true) | **yes** |
| F | **Free setup call** for founding members (45 min) | 11, 15 | 4 | 3 (owner time, ~19 h for 25 founders) | **yes**, founders only |
| G | **State the default pace in writing**: 40 a day, 3–8 minutes apart, in onboarding and the guarantee terms only. Owner decision 2026-10-06: no landing page quotes a daily send figure | 13, 4 | 3 | 0 | **yes**, off the landing page |
| H | Founding cohort that *publishes* its results with permission | 1, 8 | 5 | 1 | **yes** (it is the proof engine) |
| I | Lower price ($49–79) | 6 | 3, early-stage only | high: cuts contribution by $68–98 | **no** (`pricing.md`) |
| J | Cloud sending with no open tab | 10 | 4 | 5, and it would need credentials (rejected in BACKLOG) | **no** |
| K | Guru / affiliate partners | 7 | 3 | 2 | later (`/founder-marketing`) |
| L | Offer-review checklist in onboarding ("is your offer the problem?") | 15 | 3 | 1 | yes, as a bonus |

### 3. The stack

- **The core: "Booked calls from Instagram in ten minutes a day."** Every DM is written from that prospect's own profile, and you approve every one before it sends from your account.
- **Bonus 1: the 10-DM preview.** Kills "it'll sound robotic" and "how do I know it works" before a card is asked for.
- **Bonus 2: the founding setup call.** Kills "the first five minutes are hard work". The owner writes the prompt with the buyer and loads the first campaign.
- **Bonus 3: the offer check.** A one-page checklist in onboarding for the buyer whose offer, not their DMs, is the problem. It is honest about the case where more DMs will not help.
- **The guarantee: the Booked-Call Guarantee (C) plus the restriction refund (D).** Conditions are tied to the buyer's effort (300 approved sends in 30 days, at the default pace). Expected cost **$9.31 a client-month** at the estimated claim rates; with the preview and trial costs (+$0.78), the whole stack adds **$10.09**. With the stack, the CFO tool gives a **$104.31 contribution per client-month (71%)** and break-even at **6 paying subscribers**.
- **Urgency, real:** the founding cohort is **25 seats, until 2026-12-31**, counted from the `subscriptions` table. After it closes, new customers pay $197 (`pricing.md`).
- **Name of the offer: "The Founding 25"**, the Booked-Call Guarantee edition.

### 4. The value equation (1–10, before → after)

| element | v1 | v2 | what moved it |
| --- | ---: | ---: | --- |
| Dream outcome (a booked call) | 7 | 8 | Core reworded as the outcome, not the mechanism |
| Perceived likelihood | 2 | 5 | Preview (A), guarantee (C), founders publishing results (H). It stays capped at 5 until real results exist |
| Time to the result | 4 | 6 | 7-day trial, setup call, a 30-day guarantee window |
| Effort and sacrifice | 3 | 5 | Second-account wording (E), restriction refund (D), pace in writing (G). The open tab is still there |

### 5. The re-test (same customer, same seed 7, 20 buyers, `panel-v2/`)

| | v1 pitch (`pitch-v1.md`) | v2 pitch (`pitch.md`) |
| --- | ---: | ---: |
| Buy rate | **0 of 100 (0%)** | **4 of 20 (20%)** |
| Growing SMMA owners | 0 of 30 | **4 of 6** |
| Coaches | 0 of 25 | 0 of 5 |
| Early-stage (<$5k/mo) | 0 of 35 | 0 of 7 |
| SDRs | 0 of 10 | 0 of 2 |

**What dropped:** the trial objections ("trap", "3 days is too short") almost vanished. **What stayed:** no published results is still the first reason for every pass. And a refund "doesn't bring back a restricted account": the restriction refund calms the money fear, not the account fear. Every v2 buyer conditions the purchase on the 10 preview DMs reading as human. **The preview is the hinge, so it has to be built and it has to be good.**

**What it means:** the offer fixed the terms. It cannot manufacture the missing proof. That only arrives from the Founding 25. The 20 buyers are a different deal from the first 20 of the 100 (n changes the cards) and every cell is thin, so read the jump as direction, not a forecast.

### Rules kept

Every promise is deliverable. The preview has to be built before it is advertised. The guarantees were costed with the CFO's tool. No fake reviews, scarcity or discounts. Refund terms and the "restriction refund" wording must be checked against consumer-protection rules in the main markets (US FTC, UK CMA, EU) and against Whop's refund mechanics before going live. This is not legal advice.

## The numbers

**How to read the table below.** The tool counts per day; this file sets `days_per_month: 1`, so wherever it says "a day", read **paying subscribers that month**. One unit is one paying client-month at $147. Nearly every input is an estimate (marked in `numbers.json`, sourced in `cfo-sources.md`). **Per-customer API cost has never been measured, and that is the first job:** read one month of real `dm_usage` and `scrape_usage` and the provider invoices, then replace the estimates.

- **The margin.** Each client-month leaves **$104.31 after its own costs (71%)**. That includes the new guarantees. At 40 subscribers the profit margin is **61%**. Variable cost is $42.69: AI drafting ~$22 at full use, Whop fees ~$8.68, guarantee reserves ~$9.31, lookups ~$2. Software margins are not the problem.
- **Break-even: 6 paying subscribers**, against $575 a month of fixed costs, $500 of which is an acquisition placeholder the owner has not set.
- **The line to watch: the subscriber ramp, and what it costs to buy it.** The ramp (2 → 34 subscribers over 12 months) is an assumption, not a forecast. The panel's sanity check is grim: 0% at today's offer, 20% (an upper bound) at the v2 offer, and only among growing SMMA owners. The what-ifs prove it:
  - Half the subscribers (`--volume 0.5`): year 1 profit falls from $15,109 to **$4,105**; payback moves to month 11.
  - A quarter (`--volume 0.25`): **year 1 loses $1,398** and the startup money is not earned back.
  - Acquisition at $2,000 a month instead of $500, with the same ramp: break-even rises to **20 subscribers**, **year 1 loses $2,891**, and **$9,200** of cash is needed.
- **Cash.** **$2,605** before it pays for itself on the base ramp; about $3,200 at half the ramp, about $4,300 at a quarter. The product is already built; its cost is sunk and not counted.
- **The owner is not paid in these numbers.** No salary is included. "$15,109 year 1 profit" means about $1,260 a month for a full-time founder. This is a business only once it is well past 40 subscribers.
- **Three ways to improve the margin (each from a what-if, not a guess):**
  1. **List price $197 for new customers after the Founding 25** (`--price 197`): year 1 rises from $15,109 to **$25,659**, margin at plan from 61% to **71%**. The panel's SMMA segment tolerates it (median "getting expensive" is $197).
  2. **Retention over acquisition.** Each subscriber kept one month longer is worth $104.31. The ramp's assumed churn is the biggest unknown; measure it from Whop from month 1.
  3. **Measure and cut the AI cost per DM.** Prompt caching of the fixed system prompt (cache reads are listed at a tenth of the input price) could remove most of the ~$18 a client-month DM cost. Re-run with `unit costs` once it is measured: the tool's +15% case moves year 1 by only $1,351, so this matters less than price or retention.
- **The board's money conditions** (`board.md`): "measure per-customer variable cost": **not met**, estimated only. "A guarantee priced only once cost is known": **priced on estimates**; confirm claim rates after the first 25. "A measured CAC well below LTV": **not met**. At a ~6-month life, LTV is about $626 of contribution, so acquisition must stay well under ~$200 a customer. The base ramp implies about $175.

Revenue is before tax; US states, the UK and the EU may add sales tax or VAT on SaaS. Whop's tax add-on or a Merchant of Record setting decides who remits it. Not financial, tax or legal advice: have an accountant check the structure and tax before money moves.

---

## Unit economics: MagnetEngine

Every number below comes from the input file. Nothing is looked up or guessed.

### One client-month

| line | per client-month |
| --- | ---: |
| Price | $147.00 |
| AI DM drafts: 1,500/mo x ~3,000 in + 140 out tokens on Sonnet 4.6, +10% retries (ESTIMATE) | -$18.32 |
| AI reply drafts: ~200/mo x ~4,000 in + 400 out tokens (ESTIMATE) | -$3.60 |
| HikerAPI lookups: ~300 requests for 1,500 leads, $0.001-$0.02 each (ESTIMATE) | -$2.00 |
| Whop fees: 2.7% + $0.30 processing + 3% platform (ESTIMATE, check docs.whop.com/fees) | -$8.68 |
| Booked-Call Guarantee refunds: 20% of first months claimed, ~6-month average life (ESTIMATE) | -$4.90 |
| Restriction refund: 3% of client-months claimed (ESTIMATE) | -$4.41 |
| Free 10-DM previews + non-converting 7-day trials, per paying customer (ESTIMATE) | -$0.78 |
| **Contribution** (what each client-month leaves to pay the fixed costs) | **$104.31** (71%) |

### The margin that matters

Fixed costs: $575 a month (Supabase Pro (ESTIMATE) $25, Vercel Pro (ESTIMATE) $20, Resend (ESTIMATE) $20, Domain, email, misc tools (ESTIMATE) $10, Acquisition spend placeholder: content tools, small paid tests (ASSUMPTION, owner to set) $500).

- **Break-even: 6 client-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (40 a day): **61%** of every sale, after every cost.

### Year 1, month by month

| month | client-months a day | revenue | profit | cumulative (after $2,081 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 2 | $294 | -$366 | -$2,447 |
| 2 | 4 | $588 | -$158 | -$2,605 |
| 3 | 7 | $1,029 | $155 | -$2,450 |
| 4 | 10 | $1,470 | $468 | -$1,982 |
| 5 | 13 | $1,911 | $781 | -$1,201 |
| 6 | 16 | $2,352 | $1,094 | -$107 |
| 7 | 19 | $2,793 | $1,407 | $1,300 |
| 8 | 22 | $3,234 | $1,720 | $3,020 |
| 9 | 25 | $3,675 | $2,033 | $5,053 |
| 10 | 28 | $4,116 | $2,346 | $7,398 |
| 11 | 31 | $4,557 | $2,659 | $10,057 |
| 12 | 34 | $4,998 | $2,972 | $13,028 |

- **Year 1 operating profit: $15,109** on $31,017 of revenue.
- After the $2,081 startup spend: $13,028.
- Startup money earned back: month 7.
- Cash you need before it pays for itself: **$2,605**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 61% | 6 | $15,109 |
| Price -10% | 57% | 7 | $12,008 |
| Volume -20% | 59% | 6 | $10,708 |
| Unit costs +15% | 57% | 6 | $13,758 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

Evidence used: `panel/readout.md`, `panel-v2/results.md`, `competitors.md`, `offer.md`, `pricing.md`, `numbers.json`. Public launch: **Monday 2026-11-09** (see `launch.md`). Cohort closes **2026-12-31**.

### 1. The first audience

**Growing SMMA and marketing-agency owners ($10–50k a month) who still send cold Instagram DMs by hand.** The evidence: they are the only segment that bought in the re-test (4 of 6); $147 is under their own "getting expensive" line (29 of 30); and three of the four v2 buyers DM by hand every day.
**Not first:** early-stage owners (0 of 42 across both panels; a price problem), coaches (0 of 30; they want a guru's endorsement and proof from their own niche), SDRs. Coaches come second, once there are SMMA results to show.

### 2. Positioning

```
A. For agency owners who still type cold DMs by hand, MagnetEngine is the Instagram outreach
   tool that writes each prospect their own first message and waits for your approval,
   unlike DM bots that send one template to everyone.
B. For agency owners whose pipeline dies every time client work gets busy, MagnetEngine is the
   setter that never stops prospecting, at a fraction of a setter's cost, and you approve every word.
C. For agency owners burned by DM bots, MagnetEngine is the outreach tool that refunds you
   if 300 approved DMs don't book a single call.
```

**Recommended: A.** It names the behaviour of the segment that bought ("send DMs by hand every day": 3 of 4 v2 buyers) and the gap in `competitors.md` (per-profile writing plus human approval, which nobody combines). It is also the only version the 10-DM preview proves in under a minute. B is the pricing-page frame (setter, not tool; `pricing.md`). C is the guarantee hook for retargeting, not the headline: "burned by a bot" buyers bought 0 of 3 even with v2.

### 3. Channels

| channel | why it fits this buyer | rough cost | how you know it worked | start? |
| --- | --- | --- | --- | --- |
| **Dogfooding: MagnetEngine DMs SMMA owners on Instagram** | They live in IG DMs. Each DM *is* the demo ("this message was drafted by the tool you're reading about, from your profile") | ~$0: the owner's own allowance | replies → previews → trials, tracked in the product's own funnel | **yes, #1** |
| **SMMA communities** (Skool groups, Discord servers, r/SMMA where self-promo rules allow) | Where hand-DMing agency owners trade outreach tactics | owner time; some paid Skool groups | preview signups with a `?src=` tag | **yes, #2** |
| **Founder-led build-in-public content** (IG + X): the Founding 25's real numbers, week by week, with permission | Fills the proof gap in public; the category has zero trustworthy reviews (`competitors.md`) | owner time | follows → preview signups | **yes, #3** |
| SMMA YouTube creators / coaches (sponsor or affiliate, disclosed) | 10 panel buyers named "my guru recommends it" | $300–$2,000 a placement (estimate) | tracked links | **later**, once there are 5 published results |
| Paid Meta / IG ads | — | high, unknown CAC | — | **no**: no proof to put in an ad, CAC unmeasured |
| LinkedIn, cold email, SEO | — | — | — | **no**: wrong channel for this buyer; SEO is slow |

### 4. The 30-day calendar (launch −14 to launch +16)

| date | channel | what goes out |
| --- | --- | --- |
| Mon 10-26 | IG + X | "I'm opening 25 founding seats on Nov 9. Here's why I won't promise you results I don't have yet." (The honest-proof story.) |
| Tue 10-27 | Dogfood DMs | First 20 MagnetEngine-drafted DMs to SMMA owners, owner-approved. Ask: "want to see 10 DMs it writes for *your* niche?" |
| Wed 10-28 | IG Reel | Hook 1 (screen recording: profile → draft → approve) |
| Thu 10-29 | Communities | Value post: "the 5 openers I'd never send" (from the DM Psychology Playbook, `docs/sops/`) |
| Fri 10-30 | Dogfood DMs | 20 more; log every reply in the product |
| Mon 11-02 | IG + X | Hook 2: the bot-vs-per-profile comparison, no competitor named |
| Tue 11-03 | Dogfood DMs | 20; invite repliers to a "first look" preview before launch |
| Wed 11-04 | IG Reel | Behind the scenes: the approval queue in 60 seconds |
| Thu 11-05 | Email (signups so far) | "Monday: 25 seats, $147 for life, the Booked-Call Guarantee. Here are the exact terms." |
| Fri 11-06 | Communities | Hook 3 as a discussion question: "how many hours a week do you spend typing openers?" |
| Sat 11-07 – Sun 11-08 | — | Soft open: the pre-launch preview users get checkout first |
| **Mon 11-09 LAUNCH** | All | Launch post; email; DMs to every preview user: "seats open, guarantee terms, ends Dec 31" |
| Tue 11-10 | IG Reel | Hook 4: the guarantee, explained in 20 seconds, with its conditions |
| Wed 11-11 | Dogfood DMs | 30; preview link |
| Thu 11-12 | X thread | "Day 3: X previews, Y trials, Z seats. Real numbers, no screenshots of other people's results." |
| Fri 11-13 | Communities | Hook 5 |
| Mon 11-16 | IG + X | Seat count (from `subscriptions`, real); first founder quote *only if* written consent |
| Tue 11-17 | Dogfood DMs | 30 |
| Wed 11-18 | IG Reel | Hook 6: the 10-DM preview on a live niche |
| Thu 11-19 | Email (trials) | Trial day-5 nudge: "approve your first 20 drafts before day 7" |
| Fri 11-20 | Communities | Value post: reply handling (the Rescue ladder idea) |
| Mon 11-23 | IG + X | Week 2 numbers, published honestly even when weak |
| Tue 11-24 | Dogfood DMs | 30 |
| Wed 11-25 | IG Reel | Hook 7; reminder that the cohort closes Dec 31 (real date, no countdown timer) |

**When there is nothing new to say:** show the making (a real draft the owner rejected and why), the reply inbox, a Founding member's setup call (with consent), the prompt wizard in 60 seconds.

### 5. Ten hooks (each answers a panel objection)

1. *(Reel, 3-sec opener)* "This DM was written from her bio. I just pressed approve." → robotic DMs
2. *(Ad headline)* "Bots send one message to 1,000 people. This writes 1,000 different ones, and you read each." → robotic / bot-burned
3. *(Community question)* "You spent 2 hours typing openers today. What if it was 10 minutes of reading?" → the hand-DMer's pain (v2 buyers' reason)
4. *(Reel)* "300 approved DMs. Zero booked calls? We refund the month." → no proof / risk
5. *(Post)* "We have no case studies yet. So here's what we're doing instead." → no results (honest-proof story)
6. *(Reel)* "Type your niche. See 10 DMs it writes, before you give us a card." → card-up-front trap
7. *(Headline)* "A setter costs $2,000–$4,000 a month. This costs $147, and you approve every word." → price vs. "other tools are $39"
8. *(Post)* "We never ask for your Instagram password. It sends from your browser, from your account, or a second one." → account risk. Never claim the account is safe.
9. *(Reel)* "Your pipeline doesn't die when client work gets busy." → inconsistent outreach
10. *(Post)* "If your offer's the problem, more DMs won't fix it. Here's the 5-question check we give every new member." → "my offer is the problem"

### 6. Budget and numbers

**Budget, first 60 days (owner to confirm; nothing was given):** $500 a month in `numbers.json`. 60% on community memberships and small creator tests *after* 5 published results; 40% kept for tools and the soft-open incentives. Dogfood DMs cost nothing but time.

**The most you can pay to win a customer:** contribution $104.31 a client-month × an assumed 6-month life = **~$626 of lifetime contribution**. Keep acquisition at or under a third of that: **≤ $200 per paying customer**. The base plan implies about $175 (`cfo.md`). The panel's "purchases in the first month" is 1 for every buyer (a subscription), so it adds nothing here; real churn decides LTV.

**The three numbers to watch weekly:**

| number | why | change something if |
| --- | --- | --- |
| Preview → trial start | Every v2 buyer said "only if the 10 DMs read like a person" | under 20% for two weeks: fix the drafts, not the ads |
| Trial → paid (7-day) | The whole offer redesign is aimed here | under 25%: interview every canceller |
| Booked calls per founding member in 30 days | The proof the whole business is waiting for, and the guarantee's cost | median zero at day 30: stop acquisition and fix the product |

### Rules kept

No fake reviews, follower counts, testimonials or "as seen on". Panel quotes are never customer quotes. Paid creator posts are disclosed. No safety or result promise (PRODUCT.md, owner decision 2026-10-06). No daily send figure on landing pages. Scarcity only where real: 25 seats counted from `subscriptions`, a real end date.

## Brand

Read: `idea.md`, `marketing.md` (positioning A, first audience: growing SMMA owners who DM by hand), `competitors.md`, `panel/readout.md`. **Binding owner decisions this skill does not reopen:** the name *MagnetEngine* (PRODUCT.md, Brand Commitments) and the visual system (`docs/DESIGN-TOKENS.md`, `DESIGN.md`; Linear/Framer craft level, black and white with `positive` emerald and `danger` red). So Step 2 below *checks* the existing name rather than replacing it, and names the things that are still unnamed.

### 1. The name: keep it, and finish the checks

**MagnetEngine.** It says "pull" (magnet: prospects come to you) and "system" (engine: it runs without you). Out loud it is clear and four syllables, spelt the way it sounds. On an app icon an "M" or a magnet glyph works at 32px. **The risk:** "Magnet" is a crowded word in marketing software ("lead magnet" is a generic term), which weakens trademark distinctiveness for the word alone. The compound is what to protect.

Checks the owner must finish (public searches only; a trademark lawyer confirms; nothing is protected until it is registered):

- **Trademark:** search "MAGNETENGINE" and "MAGNET ENGINE" in **Class 9** (downloadable software, the extension) and **Class 42** (SaaS), plus **Class 35** (marketing and lead-generation services, which matters if the $497 done-with-you tier ships):
  - US: USPTO trademark search, tmsearch.uspto.gov
  - Canada: CIPO, ised-isde.canada.ca/cipo/trademark-search
  - EU: EUIPO eSearch plus, euipo.europa.eu/eSearch
  - UK: UKIPO, trademarks.ipo.gov.uk
- **Domain:** the product runs on **magnetengine.xyz** (in use). Whether **magnetengine.com** is free could not be checked from this environment (network-restricted): check a registrar's WHOIS. A `.xyz` reads as less established to a $10–50k/month agency owner, so if the .com is available at a sane price it is worth owning, at minimum as a redirect.
- **Handles:** check @magnetengine on Instagram (the channel the product sells in; owning it is part of the proof), TikTok, X and YouTube.
- **Confusion:** none of the names in `competitors.md` (AutoLead, WaveDM, DM Champ, IGdm Pro, FollowToDM, Inrō, ManyChat, PhantomBuster, IGLeads) is close.

**Names still needed** (the offer and tiers, from `offer.md` and `pricing.md`):

| thing | candidates | recommended |
| --- | --- | --- |
| The founding offer | The Founding 25 · First 25 · Founders' Cohort | **The Founding 25**: specific, and its scarcity is countable |
| The guarantee | Booked-Call Guarantee · First-Call Guarantee · 300-DM Guarantee | **Booked-Call Guarantee**: names the outcome, not the mechanism |
| The pre-card preview | 10-DM Preview · Draft Preview · "See your 10" | **10-DM Preview**: says exactly what you get |
| $147 tier | Operator · Solo · Core | **Operator**: the product's own word for the customer (CONTEXT.md) |
| $497 tier (if built) | Operator + Review · Done-With-You · Partner | **Done-With-You**: plain, and the market already uses it |

### 2. Voice and promise

**The promise (what a customer can count on, every time):** *Every message is written for one person, and nothing sends until you've read it.*

**Taglines (three options):**
1. **"Written for them. Approved by you."** (recommended: it is positioning A in five words)
2. "Cold DMs that read like you wrote them."
3. "Ten minutes of reading instead of a day of prospecting."

**Voice: three adjectives** (refining PRODUCT.md's "confident, direct, results-obsessed" for a business with no published results yet):

| adjective | do | don't |
| --- | --- | --- |
| **Direct** | Lead with what it does and what it costs | Warm up with "In today's competitive landscape…" |
| **Honest about what's unproven** | "We have no case studies yet. Here's the guarantee instead." | Imply results ("agencies are booking 10 calls a week…") |
| **Craft-proud** | Show a real draft and why it works | "Revolutionary", "game-changing", "blast" |

**Before / after (one line of `pitch-v1.md`):**
- Before: "MagnetEngine: software that finds your ideal clients on Instagram, has AI read each one's profile and write that person their own first DM, and holds every draft for you to approve before anything sends."
- After: "Find the agency's next clients on Instagram. MagnetEngine writes each one their own first DM, from their profile, and waits for you to approve it."

### 3. The look, as a brief (inside the existing contract)

**Colour:** no new colours. The tokens are the contract (never type a hex). The jobs:

| token | job | contrast as text on `surface` / `surface-raised` / `surface-overlay` (WCAG AA = 4.5:1) |
| --- | --- | --- |
| white | primary action, headings | 20.0 / 19.0 / 18.0 ✓ |
| `neutral-400` | secondary body text | 7.9 / 7.5 / 7.2 ✓ |
| `neutral-500` | captions, labels | **4.2 / 4.0 / 3.8 ✗**: fails AA for body-size text; use it only at ≥18px or for non-text decoration, or move small labels to `neutral-400` |
| `positive-500` | good outcome, confirm | 7.9 / 7.5 / 7.1 ✓ |
| `danger-500` | destructive | 5.3 / 5.0 / 4.8 ✓ |

(Computed from the hex values in `docs/DESIGN-TOKENS.md` and Tailwind's neutral, emerald and red scales.) **The `neutral-500` failure is a real accessibility fix to make in the app**, not just the brand brief.

**Type:** already chosen and licensed for use: **Schibsted Grotesk** (display and text; SIL Open Font License), **Sometype Mono** (data only; OFL), **Instrument Serif** italic for one accent phrase per heading (OFL). All self-hosted. Nothing to buy.

**Logo brief:** must say "pull, not push" and work as a 32px Chrome toolbar icon (the extension is the touchpoint used most), as a 1:1 Instagram avatar, and in white on `surface`. Avoid magnet clip-art horseshoes (generic and juvenile next to Linear and Framer), lightning bolts and robot faces (they say "bot", the category it is defined against). If an image tool is used, label the output as concepts, not a finished logo.

**The first five touchpoints:**
1. **Landing page:** headline = tagline 1. Above the fold: the 10-DM Preview input ("type your niche"). That *is* the proof the site doesn't have yet.
2. **The Chrome Web Store listing** (the packaging): screenshot 1 is a real draft beside the profile it came from. The description states no daily send figure and makes no safety claim.
3. **The confirmation / receipt:** the trial's end date and the guarantee's conditions in plain words (PRODUCT.md: "the charge date is printed on the trial button").
4. **The first social post:** the honest-proof story (hook 5 in `marketing.md`).
5. **The reply to the first complaint, or the first restriction:** within 24 hours, it names the refund, does not argue, and asks what happened so the product can learn. Template it now; the restriction moment is the one the Product lens said to design.

### Rules kept

No competitor name, logo, colours or tagline copied. Only licensed fonts. No trademark advice. These are the searches to run, not their result.

## Operations

A solo-run SaaS. "Day one" is the first day the Founding 25 can pay (Mon 2026-11-09). Inputs: `idea.md`, `offer.md`, `numbers.json`, the repo (`CLAUDE.md`, `BACKLOG.md`, `blueprints/`). The owner's country of registration is not stated, so the licence section names what to check, not where.

### 1. The daily cycle (✱ = the customer sees it)

1. **Morning check (15 min):** Supabase function logs for `generate-dm`, `generate-reply`, `scrape` errors; any `empty_completion` or `scrape_quota` spikes; Whop for new trials, cancellations, disputes.
2. ✱ **Preview requests:** the 10-DM Preview runs on its own. Glance at today's previews for drafts that read badly; they are the conversion hinge (`offer.md`).
3. ✱ **Founding setup calls** (45 min each; ~25 in the first 7 weeks): prompt written with the buyer, first campaign loaded, extension installed, the open-tab habit explained.
4. ✱ **Support inbox** (amine@magnetengine.xyz): answer within one business day; restriction reports the same day (SOP 3).
5. **Dogfood outreach (30 min):** approve today's MagnetEngine DMs to SMMA owners (`marketing.md` channel #1). The owner sees every rough edge first.
6. ✱ **Content:** the day's post from the `marketing.md` calendar.
7. **Evening:** log the three weekly numbers as they move; queue guarantee claims for the weekly review.

Weekly: cost review (AI and HikerAPI usage against `numbers.json`), guarantee claims, extension release (if any), the three numbers, one cancellation interview.

### 2. Suppliers

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

### 3. People

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

### 4. Routines (SOPs)

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

### 5. Tools: the smallest stack that runs it

Already in place: Supabase (data, auth, functions), Vercel (hosting), Whop (payments), Resend (email), GA4 (analytics), Telegram/email owner alerts (`_shared/notify.ts`). **Add only:** a scheduling link for setup calls (cal.com, already used as the `ONBOARDING_CALL_URL` default), and a shared sheet for claims, restrictions and the three weekly numbers. A bookkeeping tool (Wave, QuickBooks or local equivalent) once money moves. Prices: confirm on each vendor's page (not reachable from here).

### 6. Licences, permits, policies and insurance (check each, by the owner's country)

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

### 7. Risk register

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

## Launch plan

Today: Wed 2026-10-07. **Public launch: Mon 2026-11-09.** That is the earliest date that fits the lead times in `ops.md`: building the 10-DM Preview, Chrome Web Store review, legal review of the guarantee wording, and the Whop trial change. Cohort closes Thu 2026-12-31.

### 1. Test before you spend: the soft open (Mon 10-26 → Sun 11-08)

A subscription business tests with **paid founding members**, not a waitlist. The test runs before any acquisition money moves. Until it reads, the `$500/mo` acquisition line in `numbers.json` stays at $0.

- **The test:** dogfood DMs (MagnetEngine messaging SMMA owners, approved by the owner) plus community posts drive people to the 10-DM Preview. Preview users get checkout at the founding terms from Sat 11-07, two days before the public launch.
- **Success line, written now:** by Sun 11-08, **≥ 60 previews, ≥ 12 trial starts, ≥ 4 paid founders**. By day 30 of those founders, **≥ 2 of 4 have a booked call** they attribute to MagnetEngine.
- **Compare with the panel:** the v2 panel said 20% buy, an upper bound, and only among growing SMMA owners. If real preview → paid is **under 5%**, trust the real buyers over the panel: go back to `/founder-offer` (is the preview good enough?) and `/founder-pricing`, and do not scale.
- A miss on booked calls is a product problem, not a marketing one. Stop acquisition, fix the drafts (`marketing.md`, number 3).

### 2. The countdown (owner = **O** unless named)

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

### 3. Launch day: Mon 2026-11-09 (owner's local time)

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

### 4. The first 30 days

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

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
