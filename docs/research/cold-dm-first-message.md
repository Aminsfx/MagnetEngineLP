# What gets a cold first DM answered

Research behind prompt v8 and the DM gate (`supabase/functions/_shared/dm.ts`), gathered 2026-11-10. Read this before changing a rule in `buildSystemPrompt` or in `checkDm`.

## How strong the evidence is

Nobody has published a controlled study of cold Instagram first messages. What exists:

| Source | What it is | Size | Weight |
|---|---|---|---|
| [Gong Labs, call to action study](https://www.gong.io/blog/this-surprising-cold-email-cta-will-help-you-book-a-lot-more-meetings) | Cold and in-deal email, success = meeting booked within 10 days | 304,174 emails | Strong, but email |
| [Hunter, word count study](https://hunter.io/blog/cold-email-word-count) | Email reply rate by length | 34M emails | Strong, but email, and mixed warm and cold |
| [Fuzzy, LinkedIn outreach](https://getfuzzy.ai/blog/10000-linkedin-outreach-messages-analyzed) | LinkedIn DMs with and without prior context | 10,000 messages | Medium: observational, vendor |
| [One sender's 3,000-DM log](https://reddit.sentinel-team.org/posts/1r244et/snapshots/2026-02-11T17%3A52%3A01.226657Z) | Reddit and LinkedIn DMs to SaaS founders and agency owners, four weeks | 3,000 DMs | Weak alone: self-reported, several things changed per week. The only source that breaks replies down by length and question type |
| [1,100 cold Instagram DMs](https://www.skool.com/the-messy-middle-3939/results-after-sending-1100-cold-instagram-dms-to-business-owners) | One sender, business owners | 1,100 DMs | Weak: a baseline only (about 5% positive replies, 6 calls) |
| [Inrō, hidden requests](https://www.inro.social/blog/blog-instagram-dm-deliverability-hidden-requests) | Why DMs are filtered | none | Vendor opinion, consistent with [Instagram's own help page](https://help.instagram.com/iphone-app/194599462478093) |
| [SetSmart](https://setsmart.io/blog/instagram-dm-scripts), [DM Champ](https://dmchamp.com/resources/cold-dm-reply-rate-audit/), [InstantDM](https://instantdm.com/blog/how-to-get-clients-using-dms-9-mistakes-that-kill-your-outreach) | Setter playbooks | none stated | Practice, not data. Used only where they agree with the rest |

The rules below are the ones where these agree. Where only one weak source speaks, the rule says so.

## The rules, and what each rests on

**1. No phrase about what you do.**
In the 3,000-DM log, "We help companies like yours generate more leads through outbound" got 4%. Taking every pitch phrase out was the largest single change the sender made: 23% to 31%. Every playbook read says the same ("never pitch first", "the opener has one job, which is to earn a reply").
In the product: `## NEVER IN THE FIRST DM`, the gate's pitch rule, and the removal of the RESULT opening. RESULT ("if X happened without Y, would that be worth a look?") is the offer posed as a hypothetical; 34 of the 119 well-formed DMs in the 2026-11-09 batch were that one sentence.

**2. 25 words or fewer.**
Hunter: emails of 20 to 39 words reply best. The 3,000-DM log: under 30 words 26%, 30 to 50 19%, 50 to 100 11%, over 100 5%. A DM is read on a phone, in a requests list, next to an unknown name, so the product sits at the short end: `DM_MAX_WORDS = 25` (owner, 2026-11-10).

**3. One detail that is theirs.**
The 3,000-DM log: 24% when the message referenced the prospect's own post, 8% generic. Fuzzy: 13.1% with prior context, 3.1% cold; "I saw you work at Acme" reads as a template, a reference to something they said does not.
In the product: `## WHAT TO USE ABOUT THEM`, one detail, named as the thing itself and never as "your bio".

**4. Ask about their situation, never for their time.**
Gong: for cold email the interest question beats both a specific-time ask and an open "do you have time" ask. Their reading: time is finite and a stranger asking for it triggers loss aversion; interest costs nothing to give.
In the product: no call ask in a first DM (prompt and gate), and the question is about how something is going for them.

**5. How, what, which, or either-or. Not yes or no.**
One weak source: the 3,000-DM log has open questions at 23%, assumptive at 21%, closed yes/no at 12%. It agrees with the reasoning in rule 4 (a "no" is an easy exit), so the prompt prefers them and keeps yes/no for GIVE, where yes is the answer wanted.

**6. Do not write to someone with nothing to reference.**
Fuzzy: "If you have nothing contextual to reference, that is a signal the sequence was not warm enough to begin with." Our own data: on 2026-11-09 the model wrote "this one is better skipped" in the DM for Leads whose bio was a flag emoji, because it had no other way to say it.
In the product: the `fit` field, `nothingToRead`, and the Skipped list.

**7. Vary the opening, and no link.**
Inrō names four reasons a cold DM lands in hidden requests: no prior interaction, sending fast, an identical opener sent to everyone ("swapping a first name does not disguise it"), and leading with a link or a pitch. Instagram's help page confirms requests that "may be offensive, unwanted, contain spam" are filed there with no notification.
In the product: five openings rotated by handle, a first attempt at temperature 0.95, the gate's link rule, and the extension's pacing.

## Considered and left out

- **An "easy out" line** ("no worries if not"). DM Champ claims an 18 to 30% lift, unmeasured. It is also exactly what `## WRITE LIKE A PERSON` bans: denying a pressure nobody mentioned.
- **Send time and weekday.** The 3,000-DM log has 7 to 9 AM and Tuesday to Thursday ahead, with no per-bucket sample sizes. That is the extension's concern, not the writer's.
- **Emoji to match the prospect** (SetSmart). No data, and it conflicts with the voice rules.
- **Follow-ups.** The same log attributes 40% of replies to the first two follow-ups. The product already has ladders (`buildFollowUpLadder`); nothing here changes them.

## What the 2026-11-09 batch showed

216 DMs, prompt v7, one workspace. Run through the gate as it shipped:

| | Count |
|---|---|
| Refused for shape (over the limit, more than one paragraph, not exactly one question at the end) | 97 |
| Refused as the offer with a question mark | 34 |
| Refused for saying where a detail was read ("your bio says") | 16 |
| Refused for talking about the task or the Lead | 9 |
| Refused for not being in English | 8 |
| Refused for announcing the question | 7 |
| Passed | 46 |

(A DM can be refused for more than one reason, so the rows overlap.) None of the 33 DMs that held the model's own reasoning passed.
