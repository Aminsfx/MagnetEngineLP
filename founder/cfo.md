# CFO's note: MagnetEngine

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

# Unit economics: MagnetEngine

Every number below comes from the input file. Nothing is looked up or guessed.

## One client-month

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

## The margin that matters

Fixed costs: $575 a month (Supabase Pro (ESTIMATE) $25, Vercel Pro (ESTIMATE) $20, Resend (ESTIMATE) $20, Domain, email, misc tools (ESTIMATE) $10, Acquisition spend placeholder: content tools, small paid tests (ASSUMPTION, owner to set) $500).

- **Break-even: 6 client-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (40 a day): **61%** of every sale, after every cost.

## Year 1, month by month

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

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 61% | 6 | $15,109 |
| Price -10% | 57% | 7 | $12,008 |
| Volume -20% | 59% | 6 | $10,708 |
| Unit costs +15% | 57% | 6 | $13,758 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
