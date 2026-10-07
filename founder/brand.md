# Brand: MagnetEngine

Read: `idea.md`, `marketing.md` (positioning A, first audience: growing SMMA owners who DM by hand), `competitors.md`, `panel/readout.md`. **Binding owner decisions this skill does not reopen:** the name *MagnetEngine* (PRODUCT.md, Brand Commitments) and the visual system (`docs/DESIGN-TOKENS.md`, `DESIGN.md`; Linear/Framer craft level, black and white with `positive` emerald and `danger` red). So Step 2 below *checks* the existing name rather than replacing it, and names the things that are still unnamed.

## 1. The name: keep it, and finish the checks

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

## 2. Voice and promise

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

## 3. The look, as a brief (inside the existing contract)

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

## Rules kept

No competitor name, logo, colours or tagline copied. Only licensed fonts. No trademark advice. These are the searches to run, not their result.
