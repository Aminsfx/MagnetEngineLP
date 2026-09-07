import colors from 'tailwindcss/colors';

/**
 * Colour tokens. The ramps below are Tailwind's own values re-exported under
 * role names, so introducing them cannot shift a single rendered pixel — a
 * `bg-brand-500` is byte-identical to the `bg-emerald-500` it replaces. That
 * matters because the vocabulary lands ahead of the components that adopt it.
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
        // arbitrary `bg-[#hex]` utilities and their one-off strays.
        surface: {
          DEFAULT: '#030604', // app background
          raised: '#050a08',  // cards on the app background
          sunken: '#030a06',  // dashboard cards
          overlay: '#0a1510', // menus, popovers, dropdowns
        },

        // The one canonical spelling of the emerald the product is built on.
        brand: { ...colors.emerald, DEFAULT: colors.emerald[500] },

        // Semantic roles. Aliases, so `text-positive-400` and `text-emerald-400`
        // emit the same rule while the name says why the colour is there.
        positive: colors.emerald,
        info: colors.cyan,
        // Decorative cyan. Same ramp as `info`, different promise: `info` means
        // the AI produced this, `accent` means a gradient or flourish needed a
        // second colour. Two workers independently hit this gap — one spelled a
        // decorative avatar gradient `info`, which made the role map a lie; the
        // other dropped the cyan entirely, which changed pixels. This is the
        // third option: the pixels stay, and `info` keeps meaning one thing.
        accent: colors.cyan,
        caution: colors.amber,
        danger: colors.red,
        neutral: colors.zinc,
      },
    },
  },
  plugins: [],
};
