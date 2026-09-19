import colors from 'tailwindcss/colors';

/**
 * Colour tokens. Tailwind's own ramps re-exported under role names, so a
 * palette change happens here and in `src/lib/theme.ts` and nowhere else.
 *
 * The palette is orange / black / white: `brand` is orange, the surfaces are
 * untinted blacks, and `neutral` is a true gray. Nothing in the app should
 * name a hue directly — that is what made the previous emerald swap a
 * 28-file sweep instead of a two-file edit.
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
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
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
        // neutral blacks: the palette is orange / black / white, so the
        // grounds carry no hue of their own — the old ones were emerald-tinted
        // (#030604 et al) and turned every "black" surface faintly green next
        // to an orange accent.
        surface: {
          DEFAULT: '#050505', // app background
          raised: '#0e0e0e',  // cards on the app background
          sunken: '#0a0a0a',  // dashboard cards
          overlay: '#171717', // menus, popovers, dropdowns
        },

        // The one canonical spelling of the orange the product is built on.
        brand: { ...colors.orange, DEFAULT: colors.orange[500] },

        // A good outcome in data, and the confirming half of a pair of
        // actions. Emerald rather than an alias of `brand`: the dashboard is
        // otherwise black and white, so green and red are the only two colours
        // in it and they have to mean something. The public pages never use
        // this role — they spell the same idea `brand`.
        positive: colors.emerald,
        // AI affordances. Amber rather than a second orange so "the AI made
        // this" is still legible against a brand-orange CTA sitting beside it.
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
