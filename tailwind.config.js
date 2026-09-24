import colors from 'tailwindcss/colors';

/**
 * Colour tokens. Tailwind's own ramps re-exported under role names, so a
 * palette change happens here and in `src/lib/theme.ts` and nowhere else.
 *
 * The palette is black and white everywhere, with `positive` (emerald) and
 * `danger` (red) as the only hues in use: the surfaces are untinted blacks,
 * white is the action, and `neutral` is a true gray. `brand` (orange) is
 * retired — only the unrouted old landing page still uses it. Nothing in the
 * app should name a hue directly — that is what made the previous emerald swap
 * a 28-file sweep instead of a two-file edit.
 *
 * Roles, not hues: see docs/DESIGN-TOKENS.md for which role means what and how
 * to pick one. `violet` is deliberately absent — it had 60 uses and no meaning.
 * `blue` likewise.
 * Raw hex/rgba for Recharts props and inline styles lives in src/lib/theme.ts.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    './index.html',
    './index.tsx',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Schibsted Grotesk carries the display voice; Sometype Mono is for
        // data and measurement only, never as a costume for "technical".
        // Both are self-hosted (index.css); each "Fallback" is a local face
        // re-metricked to match, so the swap at load does not reflow text.
        sans: ['"Schibsted Grotesk"', '"Schibsted Grotesk Fallback"', 'system-ui', 'sans-serif'],
        mono: ['"Sometype Mono"', '"Sometype Mono Fallback"', 'ui-monospace', 'monospace'],
        // The public pages' one italic accent phrase per heading. Italic 400
        // only, self-hosted through @fontsource and imported by the pages that
        // set it, so nothing else downloads it.
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      // The app's type roles, named for their job. The landing page had
      // drifted to fourteen hand-typed sizes between 10px and 17px and the
      // dashboard to eight between 8px and 13.5px — too close to read as
      // different roles, too many to be one system. Five steps; nothing in the
      // product is smaller than `label`. Headings stay fluid clamp()s at their
      // call sites.
      fontSize: {
        label: ['0.6875rem', { lineHeight: '1.35' }], // 11px — captions, badges, dense pane chrome
        meta: ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.005em' }], // 13px — fine print, stats, nav
        'body-sm': ['0.9375rem', { lineHeight: '1.7', letterSpacing: '0.003em' }], // 15px — dense body, answers
        body: ['1rem', { lineHeight: '1.7', letterSpacing: '0.002em' }], // 16px — reading body
        lead: ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.005em' }], // 18px — intro under a heading
      },
      // Tailwind v3's opacity scale jumps 5 -> 10 -> 15 -> 20, so `border-white/8`
      // and its neighbours matched nothing and emitted NO CSS — 128 uses across
      // the app, including the 86 `/8` hairlines that are this UI's card edge.
      // The borders were written, reviewed and never rendered. Adding the steps
      // the design actually uses is what makes them appear.
      opacity: {
        3: '0.03',
        4: '0.04',
        6: '0.06',
        7: '0.07',
        8: '0.08',
        12: '0.12',
      },

      colors: {
        // The four dark grounds every panel sits on, absorbing the ~115
        // arbitrary `bg-[#hex]` utilities and their one-off strays. Pure
        // neutral blacks: the grounds carry no hue of their own — the old
        // ones were emerald-tinted (#030604 et al) and read faintly green next
        // to any accent, which is a second colour nobody declared.
        surface: {
          DEFAULT: '#08080a', // app background
          raised: '#101014',  // cards on the app background
          sunken: '#0c0c0f',  // dashboard cards
          overlay: '#16161b', // menus, popovers, dropdowns
        },

        // Retired (2026-09-24): the orange the public pages used to carry. Kept
        // defined only for the unrouted old landing page; add no new uses.
        brand: { ...colors.orange, DEFAULT: colors.orange[500] },

        // A good outcome in data, and the confirming half of a pair of
        // actions. Emerald rather than an alias of `brand`: the dashboard is
        // otherwise black and white, so green and red are the only two colours
        // in it and they have to mean something. Every surface, public pages
        // included, uses this role for a good outcome and nothing else.
        positive: colors.emerald,
        // AI affordances. Defined, and rendered as white or neutral in the
        // product today — see docs/DESIGN-TOKENS.md.
        info: colors.amber,
        // Decorative warm second tone. Same ramp as `info`, different promise:
        // `info` means the AI produced this, `accent` means a gradient or
        // flourish needed a second colour. Two workers independently hit this
        // gap — one spelled a decorative avatar gradient `info`, which made the
        // role map a lie; the other dropped the colour entirely, which changed
        // pixels. This is the third option: the pixels stay, and `info` keeps
        // meaning one thing.
        accent: colors.amber,
        // Yellow, not amber: `info` took amber, and a caution state has to be
        // distinguishable from an AI affordance at a glance.
        caution: colors.yellow,
        danger: colors.red,
        // True grays. `zinc` is blue-tinted, which reads as a third hue beside
        // orange; `neutral` is the white-to-black axis this palette wants.
        neutral: colors.neutral,
      },
    },
  },
  plugins: [],
};
