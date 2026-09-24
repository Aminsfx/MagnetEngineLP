---
version: 1
slug: "src-pages-landing-varianta-tsx"
primary_target: "src/pages/landing/VariantA.tsx"
related_targets: ["src/pages/landing/VariantB.tsx","src/pages/landing/VariantC.tsx"]
---

Scope: the landing pages. **A is live at `/`** (owner's choice, 2026-09-24); B (`/lp/b`) and C (`/lp/c`) stay up for the owner's A/B tests, tracked by `src/lib/landingVariant.ts`. Visitor mode: **Persuade**. The dashboard is out of scope and must not change.

Audience, job, action, proof and constraints: as the `src/pages/LandingPage.tsx` brief. No invented proof — the reference's avatar stack, star rating, "Trusted by 1000+" line and client-logo marquee are replaced by true material (seat count, trial terms, searchable niches, labelled example openers, pipeline stages).

Memorable moment: a motion graphic behind the hero text that dramatises the variant's angle, then the approval queue card as live DOM directly beneath the hero.

Owner edits since choosing A: the magnet field must keep running (fixed: capture used a floored distance and never fired; the loop no longer gates on document.hidden); no mention of reading the bio in the steps; FAQ short and silent on account risk and on the downsides of outreach automation.

Unresolved: the finish review and DESIGN.md have not run on A.

## Direction contract

THESIS: Owner-pinned reference (shadcnspace hero-01) played straight: centred display headline with one serif-italic phrase, pill CTA whose arrow disc slides across on hover, a trust row beside it, a divider-labelled marquee, and a nav that condenses into a floating pill on scroll. Refuses the reference's fabricated proof.

OWN-WORLD: The client dashboard's palette, owner-pinned: untinted near-black grounds (`surface` tokens), white as the primary action, neutral grays for chrome, `white/8` hairlines, and emerald (`positive`) as the only hue — reserved for approved, replied, found. No orange. Schibsted Grotesk for everything; Instrument Serif italic for the one accent phrase per heading; Sometype Mono for data. Pills (rounded-full) for every control; 1.25rem bezelled panels.

STORY: The visitor reads one angle (A outcome, B personalisation, C time and cost), sees the queue card prove it, and starts the 3-day trial with the charge terms in view.

FIRST VIEWPORT: floating header; headline centred at up to 6rem across two lines over a full-bleed motion field; 18px subhead at ~48ch; white pill CTA with the founding-seat count beside it; terms line; the top of the approval card rising into the bottom of the viewport.

FORM: owner-pinned reference; no concept roll (a brief-pinned direction beats the roll). Seed key: none — pinned. Motion: A magnetic field (canvas), B rising DM wall (CSS), C radar sweep over a dot grid (canvas); each pauses offscreen and has a reduced-motion still.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
