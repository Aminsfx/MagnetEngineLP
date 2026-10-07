# Pricing: MagnetEngine

Inputs: `panel/answers` (100 simulated buyers, four price answers each), `pricing-curve.md`, `competitors.md`, and `numbers.json` run through the CFO tool. Unit = one paying client-month. "Break-even per day" in the tool reads as **paying subscribers per month**, because `days_per_month` is 1.

## 1. The price: keep $147 a month ($1,470 a year). Do not cut it.

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

## 2. The ladder: make the $497 anchor real, or delete it

Today the $497 "anchor" is a price nobody pays, and the board flagged it as a fake anchor. Two honest options:

| rung | price | what it is | the reason to step up |
| --- | ---: | --- | --- |
| **Operator** (the core) | $147/mo · $1,470/yr | Today's product: 1,500 DMs, 1,500 leads, 6 campaigns a month | — |
| **Operator + Setup** (optional, one-off) | $297 once | A 45-minute setup call: the owner writes the prompt with them, loads the first campaign and checks the extension and the open-tab habit | Kills the "first five minutes are hard work" problem the Product lens named. People pay for done-with-you, and it is the step most likely to get a first reply inside the trial |
| **Done-with-you** | $497/mo | Operator plus a weekly 30-minute review of their queue and replies, plus prompt tuning | For growing SMMA owners whose time is worth more than $350/month. The SMMA panel's "too expensive" median is $350, so $497 has to carry real service |

If the owner will not deliver the service in rung 3, **drop the $497 anchor from the page.** A price nobody pays is not an anchor.

## 3. The opening offer: the founding cohort (dated, real)

- **Founding-member price locked for life at $147** for the first 25 paying customers, ending **2026-12-31**, or earlier when the 25th seat is taken. The seat count must come from the real `subscriptions` table, not a hand-edited number.
- Founders get the $297 setup call **free**.
- After the cohort closes, list price for new customers moves to $197. The SMMA and coach segments tolerate it (median "getting expensive" is $197 and $150). Do this only once the cohort has produced published results.
- No "was $X" price that was never charged.

## 4. What to test with real buyers

Two prices inside the beachhead's range, on traffic aimed at SMMA owners and coaches only:

- **A: $147/mo** vs **B: $197/mo**, both with the same risk reversal from `/founder-offer` (the panel says that matters more than price).
- How: the landing A/B system already exists (`src/lib/landingVariant.ts`). Add a price variant, or run two Whop plans and route by variant. Measure checkout starts, trial-to-paid, and first-month churn. A higher price that halves trial-to-paid is not a win.
- Success line: at least 20 trial starts per arm before reading anything.

## 5. The panel's top price objections, verbatim, for marketing to answer

1. "$147 a month is a big chunk of money when I make about $21k a year and my pipeline dries up every other month, and other Instagram DM tools cost a third of that." (P010)
2. "I make about $1,500 a month and $147 is a big bite out of that, three or four times what other DM tools cost." (P002)
3. "$147 is nothing against what I make, but a card-required trial with zero published results and only 3 days to judge replies isn't enough for me to bet my own Instagram account on it." (P016)

Number 3 is the one that matters for the beachhead: the price is fine, the terms are not.

## Rules kept

Simulated price answers chose what to test; they are not proof. No price is below variable cost. No fake anchors (hence section 2).
