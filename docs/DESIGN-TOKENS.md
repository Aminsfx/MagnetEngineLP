# Design tokens

The dashboard is one product, so it should read as one palette. It did not: the
same accent was spelled six Tailwind ways plus a spread of raw hexes in mixed
case, four dark grounds were written as ~115 arbitrary `bg-[#hex]` utilities
with six one-off strays, and `violet` appeared 60 times without ever meaning
anything. The payoff arrived when the palette moved from emerald to orange:
the hues below changed in two files, and the components did not change at all.

This file is the contract. Tokens live in exactly two places — `tailwind.config.js`
(class names) and `src/lib/theme.ts` (raw values, for the two places a class
cannot reach). Pick a token by **what it means**, never by what it looks like.

Deliberately *not* a third place: the stylesheets. `index.css` and the landing
kit's `landing.css` reach colours only through Tailwind's `theme()` (the
approval card's trace marks, the scrollbar, the hero scrim), never a new value.
Tailwind resolves these tokens at build time from plain hex, so no CSS custom
properties are needed and none were added — a `:root { --brand: … }` block
would only be a second definition of the same values to drift from. The one
exception is `extension/popup.html`, which cannot use this build and restates
the values it needs, each commented with its token.

## Roles

The palette is **black and white, everywhere** — the dashboard, the sign-in
and activation pages, the legal pages, the extension popup, and the landing
pages (`/`, `/lp/b`, `/lp/c`). The two exceptions are `positive` and
`danger`, the only hues in the product that a user has to be able to read at a
glance: green confirms, red destroys. Everything else is white, gray or black.

The owner moved the public side onto the dashboard's palette on 2026-09-24.
Nothing routed uses orange (`brand`) any more; its last user is the retired
`src/pages/LandingPage.tsx`, which no route renders.

It is expressed entirely in roles, so changing any of this means editing
`tailwind.config.js` and `src/lib/theme.ts` and nothing else.

| Role | Hue | Means |
|---|---|---|
| `brand` | orange | Retired with the old landing page. Do not add new uses — the primary action is white. |
| `positive` | emerald | A good outcome in data, and the confirming half of a pair of actions. The dashboard's one colour. |
| `info` | amber | AI and generation affordances **only**. Nothing else earns it. |
| `accent` | amber | Decoration that needs a second colour — gradients, avatar placeholders, a progress bar. Carries no meaning. |
| `caution` | yellow | Approaching a limit; a warning that is not yet a failure. |
| `danger` | red | Destructive action, over limit, error. |
| `neutral` | true gray | Text, borders, chrome. The default for anything not above. |

`caution` is yellow rather than amber because `info` took amber: a warning and
an AI affordance have to be tellable apart at a glance, and on an orange ground
they are already close.

`brand` and `positive` were the same hue for most of this file's life, separated
so a future palette change could move the accent without recolouring every
success state. That change happened: `brand` went orange and `positive` went
green, and because the split already existed it cost one line. Keep them
separate for the same reason.

Where each one is allowed:

- `brand` (orange) — nowhere new. Only the unrouted old landing page still uses it.
- `positive` (emerald) and `danger` (red) — every surface. A confirming action, a
  good outcome, a destructive action, a failure. Nothing decorative earns either.
  The one reach outside a class: Whop's checkout takes `POSITIVE[500]` as its
  accent, because paying is the confirming action on /activate.
- The extension popup cannot use this build, so `extension/popup.html` restates
  the values it needs as CSS custom properties, each commented with its token.
- `info`, `accent`, `caution` — defined, and deliberately unused in the dashboard,
  which renders them as white or neutral. They still say what a thing *means*,
  which is what decides where a colour would go if one came back.

### `accent` vs `info` — same amber, different promise

`info` is a claim: *the AI produced this.* `accent` is an admission: *a gradient
needed a second colour.* They compile to identical pixels, so the distinction
buys nothing at runtime — it buys the ability to trust `info` when you grep for
what the AI touches.

The gap was found the hard way. Three workers hit the same decorative
two-hue avatar gradient in three files and resolved it three ways: one kept the
second hue and called it `info` (which made this table a lie), two dropped it
for a brand ramp (which changed pixels nobody asked to change). `accent` is the
third answer, and all four decorative gradients now use it.

If you are reaching for `accent`, check first that the thing really is
decoration. A status, a state, a limit and an AI output all have roles already.

### `violet` is retired

Do not add `violet-*` anywhere. Its 60 uses today (campaign chips, one metric
glow, a testimonial accent) share no meaning — it was a third accent picked to
look different, which is exactly what made the dashboard read as unbranded.
When you touch a violet site, fold it into:

- `info` if it marks something the AI produced,
- `neutral` otherwise.

`blue` is retired for the same reason (33 uses). The unreferenced `.shimmer`
rule in `index.html` was the last non-component blue and is now `brand`.
`index.html`'s `<body>` still carries `selection:bg-blue-500/30
selection:text-blue-200` — fold those into `brand` when a wave-two worker owns
that line.

## Opacity steps

Tailwind v3's opacity scale runs 0, 5, 10, 15, 20, 25, 30, 40… — it has **no 3,
4, 6, 7, 8 or 12**. An off-scale modifier does not warn and does not fall back:
it silently emits no rule at all.

This repo had written 128 of them, including 86 `border-white/8` — the hairline
that is this UI's card edge. Those borders had been authored, reviewed and
shipped, and had never once rendered. `tailwind.config.js` now defines the steps
the design actually uses, so they do.

Before adding a new fractional step, add it to `theme.extend.opacity` too, or
check the built CSS. `grep -o 'border-white[^{,: ]*' dist/assets/*.css | sort -u`
lists what really exists.


## Surfaces

Four dark grounds, by depth. Everything that used an arbitrary hex maps to one
of them:

| Token | Hex | Was | Use for |
|---|---|---|---|
| `surface` | `#08080a` | `bg-[#030604]` ×60, `#0a1a14`, `#030303` ×2, `#0a0a0a`, `#020403`, `#05070A` | The app background |
| `surface-raised` | `#101014` | `bg-[#050A08]` ×26 | Cards sitting on the app background |
| `surface-sunken` | `#0c0c0f` | `bg-[#030A06]` ×19 | Dashboard cards |
| `surface-overlay` | `#16161b` | `bg-[#0A1510]`, `bg-[#0D1F14]` ×5 | Menus, popovers, dropdowns, inputs |

The grounds carry **no hue**. They used to be emerald-tinted (`#030604` and
friends), which read as faintly green the moment a warm accent sat on top —
a black that is not black is a second accent nobody declared.

Strays and where they go:

| Stray | Where | Maps to | Why |
|---|---|---|---|
| `#0a1a14` | `Hero.tsx` gradient stop | `surface` | The two stops after it are already `#030604`; the lift belongs in the gradient's opacity, not a fourth green |
| `#030303` | `Problem.tsx` section + chip | `surface` | Pure neutral near-black, which is what `surface` now is |
| `#0a0a0a` | `Problem.tsx` card | `surface` | Two shades of "almost black" that no one can tell apart on a screen |
| `#020403` | `LiveWorkflowDemo.tsx` window chrome | `surface` | One point darker than `surface` — below the threshold of visible difference |
| `#05070A` | `SocialProof.tsx` section | `surface` | Tinted *blue*, which is the retired hue |
| `#0A0605` | `CampaignBuilder.tsx` error state | `surface` | The red tint belongs on the border and text, not the ground |
| `#0D1F14` | `FollowUpSequencer.tsx` inputs ×5 | `surface-overlay` | Lighter-than-card input wells are what `overlay` is for |
| `#e6fcf1` / `#047857` | `Pricing.tsx` light badge | `brand-50` / `brand-700` | The app's only dark-on-light inversion, so it takes the two ends of the brand ramp |

Every stray above has since been folded into a token — the landing page
included. The only arbitrary hex left in `src/` is LinkedIn's `#0A66C2` inside
a third-party logo glyph, which is not ours to recolour.

The two tables above and the one below are the **migration record** of the
emerald→orange sweep: they say what a given old literal became, not what the
palette is. Current values live in `tailwind.config.js` and `src/lib/theme.ts`.

## Brand ramp

`brand-50 … brand-950` is Tailwind's orange, re-exported. Canonical spellings:

| Was | Now |
|---|---|
| `emerald-500`, `#10B981`, `#10b981`, `rgba(16,185,129,…)` | `brand-500` / `BRAND[500]` / `CHANNEL.brand` (`#f97316`) |
| `emerald-400`, `#34d399`, `rgba(52,211,153,…)` | `brand-400` (`#fb923c`) |
| `emerald-300`, `#6ee7b7` | `brand-300` (`#fdba74`) |
| `emerald-600`, `#059669` | `brand-600` (`#ea580c`) |
| `#047857` | `brand-700` (`#c2410c`) |
| `#065f46` | `brand-800` (`#9a3412`) |
| `emerald-900` | `brand-900` (`#7c2d12`) |
| `emerald-950`, `#022c22` | `brand-950` (`#431407`) |
| `cyan-*`, `#06b6d4`, `#22d3ee`, `rgba(34,211,238,…)` | `info-*` / `accent-*` (amber) |
| `zinc-*` | `neutral-*` (true gray) |
| `blue-*` (legal pages), `violet-*`, `purple-*`, `pink-*`, `rose-*`, `teal-*` | `brand-*` / `accent-*` / `neutral-*` by meaning |

Hex is **lowercase**. Alpha washes go through `alpha(CHANNEL.brand, 0.2)`
rather than a hand-typed `rgba()` — the repo held ~24 distinct alpha values on
that one channel.

## JS-side values — `src/lib/theme.ts`

Two things in this app take a colour as a value, not a class name, and neither
can reach a Tailwind utility. That is the whole reason the file exists; do not
duplicate it.

- **Recharts props** — `CHART.sent`, `.replies`, `.axisTick`, `.legendText`,
  `.grid`, `.cursor`, `.dotStroke`. `ConversionChart` passed eight literals.
- **The card bezel** — `CARD_BEZEL` (plus `CARD_BEZEL_STRONG`,
  `CARD_BEZEL_DANGER`; the public pages' 1.25rem `BrandPanel` in
  `ApprovalPreview.tsx` uses the same halves). A 1px gradient edge around a card with a hairline inner
  highlight; not expressible as a utility, so it was inline-styled and
  copy-pasted verbatim at 16 sites across 8 files. Apply `.outer` to the
  `rounded-[1.5rem] p-[1px]` wrapper, `.inner` to the card inside it:

  ```tsx
  <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
    <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
  ```

- **Metric glows** — retired with `MetricsGrid`. The home page's numbers
  (`TodayPanel`, `Funnel`) carry no glow; a number is emphasised by size.

## How to pick

1. **Is it chrome?** Text, a border, a divider, a disabled state → `neutral`.
2. **Is it the one thing to click?** → white (`bg-white text-surface`). One per
   view. If two things on screen are solid white buttons, one of them is wrong.
3. **Is it a state the data is in?** → `positive` / `caution` / `danger` by
   severity. Reach for `caution` before `danger`: red means something failed or
   will be destroyed, not that a number is high.
4. **Did the AI make it?** → `info`. This is the only thing amber is for. A
   generated draft, a "generating…" state, an AI badge. Not a second accent.
5. **None of the above?** → `neutral`. Adding a sixth hue is how the sprawl
   started; if you genuinely need one, add it here first with a stated meaning.

For a ground, pick by depth (`surface` → `raised` → `sunken` → `overlay`), never
by eyedropper. If a new arbitrary `bg-[#hex]` feels necessary, one of the four
is almost certainly close enough — nudge the design, not the palette.

## Type

Two self-hosted variable faces (`src/assets/fonts`, `@font-face` in `index.css`,
Latin cut preloaded from `index.html`): **Schibsted Grotesk** for everything,
**Sometype Mono** for data and measurement only. A third, **Instrument Serif
italic** (`font-serif`, via `@fontsource`, imported only by the landing kit),
sets one accent phrase per public heading and nothing else. Each has a local "Fallback"
face re-metricked to match, so the swap at load does not move text. Do not
re-add the Google Fonts `<link>`: it was render-blocking and third-party.

The whole app uses five named size roles from `tailwind.config.js`, not
hand-typed pixel sizes (the dashboard had 137 of them across eight values,
down to 8px): `text-label` (11px, captions and badges), `text-meta`
(13px, fine print and nav), `text-body-sm` (15px, dense body), `text-body`
(16px, reading body), `text-lead` (18px, intro under a heading). Headings are
fluid `clamp()`s at their call sites; the display tracking floor is `-0.04em`.
Secondary text on the near-black grounds is `neutral-400` or lighter where it
carries information (the trial's charge date is information); `neutral-500` is
the floor, for redundant captions and placeholders only. `neutral-600` and
`neutral-700` are not text colours — 2.5:1 and 1.9:1 on `surface-sunken`. They
remain fine for borders, dividers and disabled chrome.

Inside the dashboard, text selection is white (`selection:` on the shell root),
because the public pages' orange selection is brand and the dashboard carries
none.
