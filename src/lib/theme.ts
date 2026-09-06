import type { CSSProperties } from 'react';

/**
 * The same colour tokens as `tailwind.config.js`, in the form JavaScript needs.
 *
 * Two places in this app take a colour as a value rather than a class name, and
 * neither can reach a Tailwind utility: Recharts wants `stroke`/`fill` as props
 * (`ConversionChart`), and the card bezel is an inline `style` because a 1px
 * gradient border is not expressible as a utility (`MetricsGrid`, `AIAnalyst`,
 * `HealthScore`, `FollowUpSequencer`, `AdminPage`, `ProfilePage`, …). Those
 * needs are why the literals were copy-pasted — the bezel pair alone appeared
 * verbatim at 16 sites — so they live here once instead of being re-derived.
 *
 * Values mirror Tailwind's ramps exactly, so swapping a literal for a token is
 * a no-op on screen. Hex is lowercase throughout; the repo previously spelled
 * the same emerald six ways.
 *
 * See docs/DESIGN-TOKENS.md for what each role means.
 */

/** The four dark grounds. Mirrors `theme.extend.colors.surface`. */
export const SURFACE = {
  /** App background. */
  base: '#030604',
  /** Cards on the app background. */
  raised: '#050a08',
  /** Dashboard cards. */
  sunken: '#030a06',
  /** Menus, popovers, dropdowns. */
  overlay: '#0a1510',
} as const;

/** The brand emerald ramp, one canonical spelling. Mirrors Tailwind's emerald. */
export const BRAND = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
} as const;

/**
 * Role hues as `r,g,b` channel triples, for the alpha washes Tailwind's
 * `/opacity` syntax cannot express in an inline style. Roughly 24 distinct
 * `rgba(16,185,129,α)` values existed across the repo; `alpha()` replaces the
 * guessing with a token plus a number.
 */
export const CHANNEL = {
  brand: '16,185,129',    // emerald-500
  info: '6,182,212',      // cyan-500
  caution: '245,158,11',  // amber-500
  danger: '239,68,68',    // red-500
  neutral: '161,161,170', // zinc-400
  white: '255,255,255',
} as const;

/** A `CHANNEL` value. Narrow, so a hand-typed triple won't type-check. */
export type Channel = (typeof CHANNEL)[keyof typeof CHANNEL];

/** `alpha(CHANNEL.brand, 0.2)` → `'rgba(16,185,129,0.2)'`. */
export function alpha(channel: Channel, opacity: number): string {
  return `rgba(${channel},${opacity})`;
}

/**
 * The card bezel: a 1px gradient edge around a card that itself carries a
 * hairline highlight. Both halves travel together — apply `outer` to the
 * `rounded-[1.5rem] p-[1px]` wrapper and `inner` to the card inside it.
 *
 * `outer` rather than the obvious word for a 1px halo, because Tailwind's
 * content scanner globs this file and treats every bare word — comments
 * included — as a class candidate. The obvious word is a utility, and naming
 * the key after it emitted a dead rule into the bundle.
 */
export const CARD_BEZEL: { outer: CSSProperties; inner: CSSProperties } = {
  outer: { background: `linear-gradient(135deg, ${alpha(CHANNEL.white, 0.06)} 0%, ${alpha(CHANNEL.white, 0.02)} 100%)` },
  inner: { boxShadow: `inset 0 1px 1px ${alpha(CHANNEL.white, 0.04)}` },
};

/** The bezel tinted brand — a card the operator is meant to act in (AdminPage). */
export const CARD_BEZEL_BRAND: { outer: CSSProperties; inner: CSSProperties } = {
  outer: { background: `linear-gradient(135deg, ${alpha(CHANNEL.brand, 0.12)} 0%, ${alpha(CHANNEL.white, 0.02)} 100%)` },
  inner: CARD_BEZEL.inner,
};

/** The bezel tinted danger — a destructive zone (ProfilePage). */
export const CARD_BEZEL_DANGER: { outer: CSSProperties; inner: CSSProperties } = {
  outer: { background: `linear-gradient(135deg, ${alpha(CHANNEL.danger, 0.08)} 0%, ${alpha(CHANNEL.white, 0.02)} 100%)` },
  inner: CARD_BEZEL.inner,
};

/** Recharts props: the chart's series, chrome and grid. */
export const CHART = {
  /** DMs sent — the primary series. */
  sent: BRAND[500],
  /** Replies — an outcome, not an action, so it reads as `info`. */
  replies: '#06b6d4', // cyan-500
  /** Axis tick labels. */
  axisTick: '#52525b', // zinc-600
  /** Legend text. */
  legendText: '#71717a', // zinc-500
  /** Cartesian grid lines. */
  grid: alpha(CHANNEL.white, 0.04),
  /** Hover cursor wash behind a column. */
  cursor: alpha(CHANNEL.white, 0.02),
  /** Halo around an active dot — matches the card it sits on. */
  dotStroke: SURFACE.sunken,
} as const;
