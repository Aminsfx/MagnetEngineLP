import colors from 'tailwindcss/colors';

/**
 * Colour tokens. The ramps below are Tailwind's own values re-exported under
 * role names, so introducing them cannot shift a single rendered pixel — a
 * `bg-brand-500` is byte-identical to the `bg-emerald-500` it replaces. That
 * matters because the vocabulary lands ahead of the components that adopt it.
 *
 * Roles, not hues: see docs/DESIGN-TOKENS.md for which role means what and how
 * to pick one. `violet` is deliberately absent — it had 60 uses and no meaning.
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
        caution: colors.amber,
        danger: colors.red,
        neutral: colors.zinc,
      },
    },
  },
  plugins: [],
};
