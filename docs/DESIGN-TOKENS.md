# Design tokens

The dashboard is one product, so it should read as one palette. It did not: the
same emerald was spelled six Tailwind ways plus a spread of raw hexes in mixed
case, four dark grounds were written as ~115 arbitrary `bg-[#hex]` utilities
with six one-off strays, and `violet` appeared 60 times without ever meaning
anything.

This file is the contract. Tokens live in exactly two places — `tailwind.config.js`
(class names) and `src/lib/theme.ts` (raw values, for the two places a class
cannot reach). Pick a token by **what it means**, never by what it looks like.

Deliberately *not* a third place: root `index.css`. It holds `@tailwind`
directives, keyframes and three animation helpers, and declares no colour at
all. Tailwind resolves these tokens at build time from plain hex, so no CSS
custom properties are needed and none were added — a `:root { --brand: … }`
block would only be a second definition of the same values to drift from.

## Roles

| Role | Hue | Means |
|---|---|---|
| `brand` | emerald | Primary action, success, "on". The product's one accent. |
| `positive` | emerald | A good outcome in data — replied, booked, under budget. |
| `info` | cyan | AI and generation affordances **only**. Nothing else earns cyan. |
| `caution` | amber | Approaching a limit; a warning that is not yet a failure. |
| `danger` | red | Destructive action, over limit, error. |
| `neutral` | zinc | Text, borders, chrome. The default for anything not above. |

`brand` and `positive` are the same emerald on purpose. They are separated so a
future palette change can move the accent without recolouring every success
state, and so a reader can tell "this is the CTA" from "this number is good".

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

## Surfaces

Four dark grounds, by depth. Everything that used an arbitrary hex maps to one
of them:

| Token | Hex | Was | Use for |
|---|---|---|---|
| `surface` | `#030604` | `bg-[#030604]` ×60, `#0a1a14`, `#030303` ×2, `#0a0a0a`, `#020403`, `#05070A` | The app background |
| `surface-raised` | `#050a08` | `bg-[#050A08]` ×26 | Cards sitting on the app background |
| `surface-sunken` | `#030a06` | `bg-[#030A06]` ×19 | Dashboard cards |
| `surface-overlay` | `#0a1510` | `bg-[#0A1510]`, `bg-[#0D1F14]` ×5 | Menus, popovers, dropdowns, inputs |

Strays and where they go:

| Stray | Where | Maps to | Why |
|---|---|---|---|
| `#0a1a14` | `Hero.tsx` gradient stop | `surface` | The two stops after it are already `#030604`; the lift belongs in the gradient's opacity, not a fourth green |
| `#030303` | `Problem.tsx` section + chip | `surface` | Pure neutral near-black; `surface` is the same darkness carrying the brand's green |
| `#0a0a0a` | `Problem.tsx` card | `surface` | Two shades of "almost black" that no one can tell apart on a screen |
| `#020403` | `LiveWorkflowDemo.tsx` window chrome | `surface` | One point darker than `surface` — below the threshold of visible difference |
| `#05070A` | `SocialProof.tsx` section | `surface` | Tinted *blue*, which is the retired hue |
| `#0A0605` | `CampaignBuilder.tsx` error state | `surface` | The red tint belongs on the border and text, not the ground |
| `#0D1F14` | `FollowUpSequencer.tsx` inputs ×5 | `surface-overlay` | Lighter-than-card input wells are what `overlay` is for |
| `#e6fcf1` / `#047857` | `Pricing.tsx` light badge | `brand-50` / `brand-700` | Landing page; the app's only dark-on-light inversion, and both hexes are already on the emerald ramp |

Most strays sit on the **public landing page**, which is out of scope for the
dashboard redesign — record the mapping, apply it when that page is touched.

## Brand ramp

`brand-50 … brand-950` is Tailwind's emerald, re-exported. Canonical spellings:

| Was | Now |
|---|---|
| `emerald-500` ×267, `#10B981`, `#10b981`, `rgba(16,185,129,…)` | `brand-500` / `BRAND[500]` / `CHANNEL.brand` |
| `emerald-400` ×137, `#34d399` | `brand-400` |
| `emerald-300` ×9, `#6ee7b7` | `brand-300` |
| `emerald-600` ×7, `#059669` | `brand-600` |
| `#047857` | `brand-700` |
| `#065f46` | `brand-800` |
| `emerald-900` ×16 | `brand-900` |
| `emerald-950` ×25, `#022c22` | `brand-950` |

Hex is **lowercase**. Alpha washes go through `alpha(CHANNEL.brand, 0.2)`
rather than a hand-typed `rgba()` — the repo held ~24 distinct alpha values on
that one channel.

## JS-side values — `src/lib/theme.ts`

Two things in this app take a colour as a value, not a class name, and neither
can reach a Tailwind utility. That is the whole reason the file exists; do not
duplicate it.

- **Recharts props** — `CHART.sent`, `.replies`, `.axisTick`, `.legendText`,
  `.grid`, `.cursor`, `.dotStroke`. `ConversionChart` passed eight literals.
- **The card bezel** — `CARD_BEZEL` (plus `CARD_BEZEL_BRAND`,
  `CARD_BEZEL_DANGER`). A 1px gradient edge around a card with a hairline inner
  highlight; not expressible as a utility, so it was inline-styled and
  copy-pasted verbatim at 16 sites across 8 files. Apply `.outer` to the
  `rounded-[1.5rem] p-[1px]` wrapper, `.inner` to the card inside it:

  ```tsx
  <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
    <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
  ```

- **Metric glows** — `MetricsGrid`'s `glowColor` prop. Use
  `alpha(CHANNEL.<role>, n)`; the role must match the tile's meaning, so the
  violet and blue glows become `info` or `neutral`.

## How to pick

1. **Is it chrome?** Text, a border, a divider, a disabled state → `neutral`.
2. **Is it the one thing to click?** → `brand`. One per view. If two things on
   screen are `brand-500`, one of them is wrong.
3. **Is it a state the data is in?** → `positive` / `caution` / `danger` by
   severity. Reach for `caution` before `danger`: red means something failed or
   will be destroyed, not that a number is high.
4. **Did the AI make it?** → `info`. This is the only thing cyan is for. A
   generated draft, a "generating…" state, an AI badge. Not a second accent.
5. **None of the above?** → `neutral`. Adding a sixth hue is how the sprawl
   started; if you genuinely need one, add it here first with a stated meaning.

For a ground, pick by depth (`surface` → `raised` → `sunken` → `overlay`), never
by eyedropper. If a new arbitrary `bg-[#hex]` feels necessary, one of the four
is almost certainly close enough — nudge the design, not the palette.
