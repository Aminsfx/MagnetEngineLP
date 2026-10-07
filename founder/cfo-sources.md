# CFO sources

Every number in `numbers.json`, and where it came from. "Estimate" means no quote or invoice yet; replace it with the real figure.

| input | value | source |
| --- | --- | --- |
| Price | $147 / client-month | `src/lib/plans.ts` (`PRICES.monthly`) |
| DMs per month | 1,500 | `src/lib/plans.ts` (`maxDMGenerations`); also the `MONTHLY_DM_LIMIT` secret per PRODUCT.md |
| DM model and output cap | claude-sonnet-4-6, 140 max tokens | `supabase/functions/_shared/ai.ts`, `supabase/functions/generate-dm/index.ts` |
| Sonnet 4.6 token price | $3 / M input, $15 / M output (cache reads $0.30 / M) | third-party tables citing Anthropic, e.g. [pricepertoken.com](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-4.6); confirm at platform.claude.com/docs/en/about-claude/pricing |
| ~3,000 input tokens per DM | estimate | `buildSystemPrompt` in `src/lib/prompt.ts` (~180 lines) plus the profile; measure with real usage logs |
| Reply drafts 200 / month, 400 max tokens | estimate (200); cap from code | `supabase/functions/generate-reply/index.ts` (`maxTokens: 400`) |
| HikerAPI per request | $0.0006–$0.02 depending on plan | [Capterra](https://capterra.com/p/10039767/HikerAPI/), [xpoz.ai guide](https://www.xpoz.ai/blog/guides/instagram-api-pricing-2026/); confirm with the HikerAPI dashboard |
| ~300 requests per 1,500 leads | estimate | `ENRICH_BATCH = 10` in `supabase/functions/_shared/hiker.ts`; real counts are in `scrape_usage` |
| Whop fees | 2.7% + $0.30, plus 3% platform (disputed) | [Dodo Payments](https://dodopayments.com/blogs/whop-fees-explained), [SchoolMaker](https://schoolmaker.com/blog/whop-pricing); confirm at docs.whop.com/fees |
| Supabase / Vercel / Resend / misc | $25 / $20 / $20 / $10 a month | estimates from list prices remembered, not fetched (this environment's network blocked vendor pages); confirm against invoices |
| Acquisition placeholder | $500 a month | assumption; the owner has not set a budget |
| Guarantee claim rates (20% of first months; 3% of months) | estimates | none yet; measure on the Founding 25 |
| Ramp 2 → 34 subscribers | assumption | sanity-checked against `panel/readout.md` and `panel-v2/results.md`: see the CFO note |
| Startup items | $5 Chrome Web Store fee; $750 legal review, $326 pilot cost and $1,000 launch spend are estimates | Chrome Web Store developer fee is a one-time $5 (Google's published fee) |
