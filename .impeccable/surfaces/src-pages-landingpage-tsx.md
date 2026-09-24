---
version: 1
slug: "src-pages-landingpage-tsx"
primary_target: "src/pages/LandingPage.tsx"
related_targets: ["src/pages/DashboardShell.tsx"]
---

Scope: the public landing page (`/`, `src/pages/LandingPage.tsx`) and the dashboard
shell it hands off to. Visitor mode: **Persuade** for the landing; the dashboard
inherits this world in its **Operate** register.

Audience: a service seller running cold Instagram DMs — agency owner, coach,
consultant, freelancer, $0–50k/month, with a $1,000+/month offer. Job: decide
whether this replaces the prospecting they currently do by hand or not at all.
Action: start the 3-day trial. Proof available: the mechanism itself and
code-enforced numbers only — there are no customers, testimonials, logos or
results to cite, and none may be invented.

Constraints that bind the page: $147/month behind a 3-day trial, charge date
stated; 3–8 minutes between sends; 40 DMs/day default, 200 max; automated DMs
breach Instagram's terms and the page says so; the extension sends from the
operator's own browser while an Instagram tab is open; the operator never
handles an API key. Seat count (7 of 100) is owner-maintained and real.

Memorable moment: the approval queue rendered as live DOM in the first
viewport — the prospect's real bio on one side, the message written from it on
the other, and the Approve control that gates the send.

Unresolved: the monthly DM allowance reads 1,500 on the page and 500 in
`MONTHLY_DM_LIMIT` / `PLAN_LIMITS.maxDMGenerations`. The page states 1,500 per
the owner's decision; the two code values must be raised to match.

## Direction contract

THESIS: The category standard, executed better than the category executes it.
The arrangement every AI-outreach tool ships — near-black ground, one accent, a
centred claim, the product shown working, feature grid, pricing, FAQ — chosen
deliberately over two own-world directions. What it refuses is what actually
makes those pages cheap: invented proof, unfalsifiable claims, and a hero
screenshot that shows nothing. Every number on this page is one the code
enforces.

OWN-WORLD: Near-black ground (#08080A) with one elevated surface (#101014) and
hairline borders at rgba(255,255,255,.07). A single warm accent, the brand
orange token `brand-500` (#F97316, Tailwind orange-500 — the token is the
source of truth, never a typed hex). It owns the primary action, and it is
also the page's one decorative voice: the restrained hero wash, CTA glow,
accent-panel borders, highlight marks on the observed profile, step icons,
the MagnetEngine column and its checkmarks. No second decorative hue ever
joins it. (Owner decision, 2026-09-23: keep the orange as shipped rather
than restrict it to the primary action.) Emerald #2FBF71 and red #E5484D
keep their meanings (confirmed, destructive).
Type: Schibsted Grotesk for display and body, Sometype Mono for data and
measurement. Radius 10–14px, no glass, no gradient text, no hard offset
shadows. Recognizable with all content removed by: hairline rules, tabular
figures, one accent, and generous vertical rhythm.

STORY: The visitor understands that MagnetEngine reads each prospect's actual
profile and writes them an individual message, then holds it for approval.
They believe it because the page shows that happening in live DOM rather than
asserting it, and because the page volunteers its own limits. They act by
starting the 3-day trial with the charge date in front of them.

FIRST VIEWPORT (revised 2026-09-23 at the owner's request — the centred
version read as generic): from 1280px the headline and the product sit side
by side, headline left-aligned at ~4.25rem max, the approval card on the right
resting on a visible stack of queued drafts; below 1280px they stack. Was:
fixed hairline nav, wordmark left, four links and a sign-in
right. Centred headline at ~4.4rem max, one line of subhead beneath at 46ch,
then two controls — solid orange "Start the 3-day trial" and a ghost
secondary — with the charge date printed under them. Below the fold line, the
product itself: a two-pane approval-queue card, the prospect's observed
profile left, the generated message right, an Approve control bottom right.
Primary action sits above the product, at centre.

FORM: The canon — the category standard, played straight. Taken as the standing
exit against grounded candidate 6 (The Field Survey, the roll's assignment) and
the model's pick (The Thread). Quality bar: Linear and Framer. Seed key
920cd4ef.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
