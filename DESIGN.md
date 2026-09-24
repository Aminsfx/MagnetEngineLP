---
name: MagnetEngine
description: Instagram outreach that writes one DM per person and waits for your approval, dressed in the dashboard's black and white.
colors:
  surface: "#08080a"
  surface-raised: "#101014"
  surface-sunken: "#0c0c0f"
  surface-overlay: "#16161b"
  action-white: "#ffffff"
  neutral-100: "#f5f5f5"
  neutral-200: "#e5e5e5"
  neutral-300: "#d4d4d4"
  neutral-400: "#a3a3a3"
  neutral-500: "#737373"
  hairline: "rgba(255,255,255,0.08)"
  hairline-strong: "rgba(255,255,255,0.12)"
  hairline-hover: "rgba(255,255,255,0.30)"
  wash: "rgba(255,255,255,0.04)"
  positive-300: "#6ee7b7"
  positive-400: "#34d399"
  positive-500: "#10b981"
  positive-wash: "rgba(16,185,129,0.12)"
  positive-line: "rgba(16,185,129,0.25)"
  danger-300: "#fca5a5"
  danger-400: "#f87171"
  danger-500: "#ef4444"
typography:
  display:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 6rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.4rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  accent:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontWeight: 400
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.002em"
  body-sm:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.003em"
  meta:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.005em"
  label:
    fontFamily: "Schibsted Grotesk, Schibsted Grotesk Fallback, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.12em"
  data:
    fontFamily: "Sometype Mono, Sometype Mono Fallback, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
rounded:
  hairline: "1px"
  control: "0.5rem"
  field: "0.75rem"
  bubble: "1.1rem"
  panel: "1.25rem"
  dashboard-card: "1.5rem"
  pill: "9999px"
spacing:
  gutter: "24px"
  section: "96px"
  section-md: "128px"
  hero-top: "144px"
  hero-top-md: "176px"
  panel: "28px"
  panel-md: "36px"
  stack: "12px"
components:
  button-primary:
    backgroundColor: "{colors.action-white}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 56px 0 24px"
  button-primary-hover:
    backgroundColor: "{colors.neutral-100}"
    padding: "0 24px 0 56px"
  button-primary-md:
    backgroundColor: "{colors.action-white}"
    textColor: "{colors.surface}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 48px 0 16px"
  button-ghost:
    textColor: "{colors.neutral-200}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-ghost-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.action-white}"
  button-submit:
    backgroundColor: "{colors.action-white}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    height: "48px"
    width: "100%"
  nav-link:
    textColor: "{colors.neutral-400}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  nav-link-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.action-white}"
  panel:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  dashboard-card:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.dashboard-card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.action-white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  chip-positive:
    backgroundColor: "{colors.positive-wash}"
    textColor: "{colors.positive-300}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-neutral:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.action-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-niche:
    textColor: "{colors.neutral-300}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: MagnetEngine

## Overview

**Creative North Star: "The Operator's Desk, After Dark"**

MagnetEngine looks like the dashboard it sells. The public pages (`/`, `/lp/b`, `/lp/c`), sign-in, activation, not-found and the extension popup all wear the client dashboard's palette: untinted near-black grounds, white for the one thing to do, grays for everything that is chrome, and green only where something went well. The owner chose the category standard (Linear's hairline precision and dark density, Framer's motion-led first viewport) and asked for it at full fidelity, so the system has no quirks. What makes it this product is what it refuses to fake: no logo strip, avatar stack, star rating or testimonial. Where the reference layout had those, the build shows true material instead: a seat count drawn as the hundred seats it counts, a marquee of niches the product can search, and the approval card itself as live DOM.

Density follows reading, not decoration. A landing section is one heading with one serif-italic phrase, a measured column (`max-w-2xl` to `max-w-3xl` for argument, `max-w-6xl` for the pipeline and header), and hairline-ruled rows instead of card grids. Motion has one job per surface: the hero field dramatises the variant's angle behind the headline, and the approval card plays the product's own mechanism once. Everything else only responds to input.

**Key Characteristics:**
- Near-black grounds with no hue; depth comes from four surface steps and 1px white hairlines, not shadows.
- White is the action colour. Emerald (`positive`) and red (`danger`) are the only hues, and each always means something.
- One typeface (Schibsted Grotesk) for everything, one Instrument Serif italic phrase per heading, Sometype Mono only for numbers and handles.
- Every control is a pill; panels are 1.25rem bezelled rectangles; dashboard cards are 1.5rem.
- A continuous hero field behind a legibility scrim, a CSS blur-rise entrance, and a resting state that is always the finished frame.
- The proof shown is only proof that exists.

## Colors

A black-and-white system with two hues that carry meaning: green confirms or reports a good outcome, red destroys or fails.

### Primary
- **Action White** (`action-white`): the fill of the primary action and nothing else that asks to be clicked: the trial pill, the auth submit, the founding-seat squares that are claimed, the "You" station in the pipeline. The same white is also the headline colour, which is why a white fill means "act" only on a pill.

### Secondary
- **Approval Emerald** (`positive-300` / `positive-400` / `positive-500`, with `positive-wash` and `positive-line`): approved, replied, found, captured, and the trial you pay nothing for. It shows up as the Approve control in the queue card, the "3-day free trial" chip, the checks in variant B's "what MagnetEngine wrote" column, the approved and answered bubbles in B's DM wall, and the 14% of A's magnet-field points (and their capture rings) that stand for replies. Whop's embedded checkout takes `positive-500` as its accent, because paying is the confirming action on `/activate`.

### Tertiary
- **Stop Red** (`danger-300` / `danger-400` / `danger-500`): destructive actions, over-limit states and form errors (`FormError`: `danger-500` at 8% wash, 25% line, `danger-300` text). It never appears on a marketing surface.

### Neutral
- **Ground** (`surface`): every page's background, and the colour the hero canvases wash with each frame to fade their trails.
- **Raised** (`surface-raised`): panels on the public pages, the auth aside, inputs on the auth pages, and the approval card.
- **Sunken** (`surface-sunken`): dashboard cards.
- **Overlay** (`surface-overlay`): menus, popovers and dropdowns in the app.
- **Gray text ladder** (`neutral-100` to `neutral-500`): `neutral-100`/`200` for emphasised body and FAQ questions, `neutral-300` for subheads and the body of lit rows, `neutral-400` for secondary text that carries information (terms, captions, nav at rest), and `neutral-500` as the floor, used only for redundant captions, placeholders, footer copyright and data keys.
- **Hairline** (`hairline`, 8% white): the system's card edge, row rule, divider and marquee-chip border. `hairline-strong` (12%) marks controls and the rule that closes a panel's argument. `hairline-hover` (30%) is where a ghost control's border goes on hover.
- **Wash** (`wash`, 4% white): the ghost pill's hover fill, the recessed nav track, and the highlighted column in B's comparison table.

### Named Rules
**The Two Hues Rule.** Green and red are the only colours in the product, and each must mean something. Green is a good outcome or the confirming half of a pair of actions. Red is destruction or failure. Decoration never earns either. `brand` (orange) is retired from every routed surface. `info`, `accent` and `caution` stay defined, but nothing public or in the dashboard renders them.

**The Untinted Black Rule.** The four grounds carry no hue. A black that is not black is a second accent nobody declared.

**The White Means Act Rule.** A solid white fill on a control marks the primary action: start the trial or submit the form. The second action is always the hairline ghost pill, never another white pill.

## Typography

**Display Font:** Schibsted Grotesk (self-hosted variable, 400–900, with a re-metricked Arial "Fallback" face so the swap moves nothing)
**Body Font:** Schibsted Grotesk
**Accent Font:** Instrument Serif, italic 400 only (via @fontsource, imported only by the pages that set it)
**Label/Mono Font:** Sometype Mono (self-hosted variable, with a re-metricked Courier New fallback)

**Character:** A tight, engineered grotesk carries every word, including the display headlines, which are set at weight 600 with negative tracking. A single serif-italic phrase per heading adds the human voice, which suits a product whose pitch is that a person approves every message.

### Hierarchy
- **Display** (600, `clamp(2.75rem, 7vw, 6rem)`, 1.02, -0.04em, balanced): the hero `h1` only, centred, up to `max-w-5xl`, across about two lines.
- **Headline** (600, `clamp(2rem, 4.2vw, 3.4rem)`, 1.06, -0.035em, balanced): every section `h2` through the kit's `Heading`. The auth pages use a fixed 2rem / 1.05 / -0.03em for their `h1`.
- **Accent** (Instrument Serif italic 400, -0.01em, white): the `Em` phrase inside a display or headline. It inherits the heading's size.
- **Title** (600, 1.15rem, snug, -0.02em): pipeline station titles.
- **Lead** (18px / 1.6): the intro under a heading. The hero subhead is capped at about 50ch and closing copy at 48ch.
- **Body** (16px / 1.7) and **Body-sm** (15px / 1.7): reading copy, FAQ answers (68ch max), feature lists and card body.
- **Meta** (13px / 1.5): terms, captions, nav links, marquee chips, row labels, and the secondary pill's label at md size.
- **Label** (11px / 1.35, 600, 0.12em, uppercase): data keys inside a product surface only, such as "Followers" and "Account" in the approval card, its window title, and the pipeline's actor tag ("You" or "MagnetEngine"). It is the smallest size in the product.
- **Data** (Sometype Mono, at meta or label size, tabular numerals): counts, prices in comparisons, handles, pacing stats and "1 of 38 waiting".

### Named Rules
**The One Italic Phrase Rule.** A heading may carry one Instrument Serif italic phrase, set through `Em`, and no more. The serif never appears in body copy, UI or data.

**The Mono Is Measurement Rule.** Sometype Mono is for numbers, handles and counts, where tabular alignment helps a reader. It is never a way to look technical.

**The Five Roles Rule.** Running text uses the five named sizes (`label`, `meta`, `body-sm`, `body`, `lead`). Headings are fluid `clamp()`s set at the call site. Nothing is smaller than `label`.

## Layout

Single-column flow with centred containers and a 24px (`gutter`) side margin. Sections pad 96px vertically, 128px from `md` up, and offset their scroll anchor by 6rem so the fixed header never covers a heading. Container width follows content type: `max-w-2xl` for panels that make one argument (the math, pricing), `max-w-3xl` for ruled prose (the problem, FAQ, close), `max-w-4xl` for the hero's approval card and the comparison tables, and `max-w-6xl` for the header, pipeline, marquee band and footer.

The hero is the one full-bleed element. A motion field fills the section behind a radial scrim (an ellipse 48% by 34% at 50% 30%, going from `surface` at 80% to 45% to clear). The field is masked to fade out between 52% and 86% of the section's height, so the approval card, stacked on two ghost drafts, rises out of the dark into the bottom of the first viewport. The hero text starts 144px from the top (176px on `md`) to clear the 80px header.

Headings are centred in the hero and on single-panel sections (math, pricing, close), and left-aligned where a list or rule set follows (problem, how it works, FAQ). Lists are hairline-ruled rows, such as a two-column `dt`/`dd` grid at `md` (13rem label column), rather than grids of cards. The pipeline is four columns from `md`, with a gradient connector rule between stations, and a single stacked column below.

Breakpoints are Tailwind's defaults. At `lg` (1024px) the section nav collapses into the right sheet. At `sm` the auth "Sign in" link hides, and the approval card's two halves stack.

## Elevation & Depth

The system is flat and tonal. Depth comes from the four surface steps and from 1px light edges, not from cast shadows. A panel is a 1px gradient bezel (`linear-gradient(135deg, white 6% → white 2%)`) around a raised card that carries a hairline inner highlight. The accent panel, which marks the one card to act in (pricing, the approval card), brightens its edge to white 28% at 160°. The stacked drafts behind the approval card are the same panel, translated 14px and 28px down, scaled by 4% and 8%, and faded to 70% and 40%.

### Shadow Vocabulary
- **Bezel highlight** (`box-shadow: inset 0 1px 1px rgba(255,255,255,0.04)`): the top edge of every panel and dashboard card. It always travels with the bezel.
- **Action glow** (`box-shadow: 0 10px 30px -12px rgba(255,255,255,0.35)`): under the white primary pill and the auth submit. It is the only outward shadow a control carries.
- **Floating header** (`box-shadow: 0 18px 40px -18px rgba(0,0,0,0.9)` with `backdrop-filter: blur(16px)` over `surface` at 70%): the header only, once it has condensed.
- **Active nav inset** (`box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1)`): the section link currently in view, lifted out of its recessed track.
- **Approve ready ring** (`0 0 0 5px` of `positive-400` at 22%, opening to 10px and 0%): a single pulse when the approval card finishes its trace.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px white lines at 8% (12% for emphasis), never with drop shadows on cards.

**The Bezel Travels Together Rule.** The gradient edge and the inner highlight are one device. Apply them from `CARD_BEZEL`, `CARD_BEZEL_STRONG` or `CARD_BEZEL_DANGER` in `src/lib/theme.ts`, never re-typed inline.

## Shapes

The corner language has two families. Anything you press is a full pill: primary and ghost buttons, nav links and their track, chips, the menu and close buttons, FAQ toggles, the logo disc and the pipeline stations. Anything that holds content is a softly squared rectangle: public panels at 1.25rem (inner radius `calc(1.25rem - 1px)` so the bezel reads as an even 1px), dashboard cards at 1.5rem, auth inputs and form errors at 0.75rem. Message bubbles in B's wall are 1.1rem, with the corner nearest the speaker tightened to 0.35rem. The dashboard's own buttons, as depicted inside the approval card (Approve, Reject), are 0.5rem. That is a faithful picture of the app, not a public control. Seat squares are 3px with 1px corners.

Edges fade rather than cut. The marquee dissolves over its outer 12% on each side, the hero field fades under the card, and label rules are gradients running to transparent.

## Components

### Buttons
Confident and tactile: a white pill that moves when you point at it.
- **Shape:** full pill (`rounded.pill`).
- **Primary (`PillButton`):** white fill, `surface` text, weight 600, 48px tall (40px at `md` size in the header). The label is padded to leave room for a 40px (32px) `surface` disc holding an up-right arrow, inset 4px from the right edge.
- **Hover / Focus:** the disc slides from the right edge to the left over 500ms with `cubic-bezier(0.16, 1, 0.3, 1)` and rotates 45° to point where it is going. The padding swaps sides so the label stays centred, and the fill steps to `neutral-100`. Keyboard focus runs the same motion. The disc's travel is `right: calc(100% - disc - inset)`, so it works at any label length and at block width. Pressing scales the button to 0.98.
- **Ghost (`GhostPill`):** transparent with a `hairline-strong` border and `neutral-200` text, weight 500. On hover the text goes white, the border goes to `hairline-hover` and a 4% white wash fills it (300ms). It is used for the second action, such as "Book a 15-minute list check".
- **Submit (auth):** the same white pill at full width with a trailing arrow that nudges 2px on hover. It shows a spinner while loading and drops to 70% opacity when disabled.

### Chips
- **Status chip:** a pill with 4px by 12px padding in `label` weight 600. **Positive** uses `positive-wash` fill, `positive-line` border and `positive-300` text ("3-day free trial", "Approved"). **Neutral** uses a 6% white fill, `hairline-strong` border and white text ("Founding member").
- **Niche chip (marquee):** a hairline pill, 8px by 16px, `meta` in `neutral-300`, with a 13px search glyph in `neutral-500`. Each chip is a search term the Campaign Builder accepts as-is.

### Cards / Containers
- **Corner Style:** 1.25rem on public pages, 1.5rem in the dashboard.
- **Background:** `surface-raised` on public pages, `surface-sunken` in the dashboard.
- **Shadow Strategy:** bezel plus inner highlight only (see Elevation & Depth).
- **Border:** the 1px gradient bezel. The `accent` variant brightens it for the card you act in.
- **Internal Padding:** 28px, or 36px from `md` up. Sections inside a panel are divided by `hairline` rules with 28px above and below.

### Inputs / Fields
- **Style:** `surface-raised` fill, 1px white border at 10%, 0.75rem radius, 12px by 16px padding, `body-sm` white text, `neutral-500` placeholder. The label sits above the field in `meta` 500 `neutral-300` and stays visible.
- **Focus:** the border goes to white 50% with a 2px white ring at 10%. Hover lifts the border to 20%.
- **Error:** an inline `FormError` block below (`danger` wash, line and text) with `role="alert"`.

### Navigation
- **Header:** fixed, 80px tall, centred, `max-w-6xl`. It is transparent over the hero. At `scrollY ≥ 50` it condenses into a floating pill (`surface` at 70%, `backdrop-blur-lg`, hairline border, floating-header shadow, 10px padding) over 500ms. It enters once with an 800ms drop from 24px above.
- **Section nav:** a recessed pill track (4% white fill, 6% border, 4px padding) holding `meta` 500 links in `neutral-400`. The link for the section currently in view is scroll-spied through a thin band 40% down the viewport and lifted out of the track onto a `surface` pill with the active inset and white text. Above the first section, no link is active.
- **Mobile:** below `lg`, a 40px hairline menu disc opens a right-hand sheet (full width, `sm:w-96`, `surface`, hairline left edge) that slides in over 500ms above a 70% `surface` scrim. The sheet is portalled to `<body>` so the header's backdrop filter cannot trap it. Inside, the links are set at 1.75rem 600 with a 16px white rule that grows in on hover or marks the current section. The sheet traps focus, closes on Escape or a click on the scrim, and locks page scroll.
- **Footer:** a hairline top border, the logo, and `meta` `neutral-400` links for Privacy, Terms and Contact (`mailto:` the support address).

### Approval Card (signature)
The product as live DOM, shared by the landing hero and the sign-in aside in `tone="mono"`. It is an accent panel with a window bar ("Approval queue" as a label, with the waiting count in mono). The left half shows the observed profile: avatar monogram, handle, `label` data keys over mono values, and the bio. The right half shows the DM written from it, with Approve (emerald) and Reject (hairline) controls. Three bio phrases are highlighted in white at 12% and underlined in white at 55%. Once the card is 35% on screen it plays the pairing: each highlight sweeps in (520ms, `cubic-bezier(0.65, 0, 0.35, 1)`), then the matching line is underlined 900ms later per pair, and the Approve ring pulses at 3.15s. Hovering either half of a pair lights both. The resting state is the finished frame, so no script, no observer and reduced motion all show a complete card.

### Hero Field (signature)
One motion field per variant, set behind the headline. A: a canvas magnet field in which white points spiral into a drifting core, and the green ones (the few that become replies) open a capture ring when they land. B: a tilted CSS wall of skeleton DM bubbles rising in seven columns, some flashing approved. C: a canvas radar sweep over a dot grid. Canvas loops are always scheduled. They never gate on `document.hidden`, they skip drawing while the hero is out of view, they cap device pixel ratio at 2 and they clamp `dt`. Under reduced motion each field renders still frames: 90 steps for A, so the streaks have length.

### Seat Map
The founding-seat count drawn as the hundred seats it counts: a 20 by 5 grid of 3px squares, white for claimed and white at 12% for open, beside "7 of 100 founding seats" in `body-sm` 600 and a `meta` line with the price. It stands beside the hero CTA, where the reference layout had an avatar stack and stars.

### Pipeline
A row of four stations (a stacked column on mobile). Each is a 40px circle with a 16px icon: outlined with a hairline on `surface` when the machine does the step, solid white when you do. Under the circle sit the actor tag, a title, a `body-sm` description and a mono stat. The one filled station is the information.

## Do's and Don'ts

### Do:
- **Do** take every colour from a token: a Tailwind role class, `theme()` in CSS, or `SURFACE`/`CHANNEL`/`alpha()` from `src/lib/theme.ts` for canvas and inline styles.
- **Do** keep one white pill per action group and pair it with a hairline ghost pill for the second action.
- **Do** give every heading at most one `Em` phrase in Instrument Serif italic.
- **Do** set numbers, handles and prices in Sometype Mono with tabular numerals.
- **Do** rule lists with `hairline` rows instead of wrapping each item in a card.
- **Do** make every entrance CSS-only and visible by default: `landing-in` (1000ms, 28px rise out of an 8px blur, staggered 0, 100, 200 and 260ms), and a 400ms fade under reduced motion.
- **Do** keep hero canvas loops always scheduled, skip drawing while out of view, and render still frames under reduced motion.
- **Do** put a scrim behind any text that sits over a motion field, and fade the field before content rises over it.
- **Do** print the trial terms (card required, cancel before day 4, the monthly price) wherever the trial is offered.

### Don't:
- **Don't** use `brand` orange on any routed surface, and don't render `info`, `accent` or `caution` on public pages or in the dashboard.
- **Don't** use green or red decoratively. A green point, check, ring or chip must stand for approved, replied, found, captured or free.
- **Don't** show logos, avatar stacks, star ratings, testimonials or result numbers the product cannot stand behind. Show seats, terms, searchable niches and the product itself.
- **Don't** put an uppercase tracked label above a section heading. The 11px uppercase label is for data keys inside product surfaces.
- **Don't** use `neutral-600` or `neutral-700` for text; they are for borders, dividers and disabled chrome.
- **Don't** add drop shadows to cards or panels; depth is the bezel and the surface step.
- **Don't** gate a hero animation on `document.hidden` or `visibilitychange`.
- **Don't** set the serif outside a heading's accent phrase, or the mono outside data.
- **Don't** square off a public control; buttons, chips and nav are pills.
