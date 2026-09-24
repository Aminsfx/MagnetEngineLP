import type { CSSProperties } from 'react';

/**
 * The same colour tokens as `tailwind.config.js`, in the form JavaScript needs.
 *
 * Two places in this app take a colour as a value rather than a class name, and
 * neither can reach a Tailwind utility: Recharts wants `stroke`/`fill` as props
 * (`ConversionChart`), and the card bezel is an inline `style` because a 1px
 * gradient border is not expressible as a utility (`TodayPanel`, `Funnel`,
 * `AIAnalyst`, `FollowUpSequencer`, `AdminPage`, `ProfilePage`, …). Those
 * needs are why the literals were copy-pasted — the bezel pair alone appeared
 * verbatim at 16 sites — so they live here once instead of being re-derived.
 *
 * Values mirror Tailwind's ramps exactly, so a token is always interchangeable
 * with the ramp it names. Hex is lowercase throughout; the repo previously
 * spelled the same accent six ways.
 *
 * See docs/DESIGN-TOKENS.md for what each role means.
 */

/** The four dark grounds. Mirrors `theme.extend.colors.surface`. */
export const SURFACE = {
  /** App background. */
  base: '#08080a',
  /** Cards on the app background. */
  raised: '#101014',
  /** Dashboard cards. */
  sunken: '#0c0c0f',
  /** Menus, popovers, dropdowns. */
  overlay: '#16161b',
} as const;

/** The brand orange ramp, one canonical spelling. Mirrors Tailwind's orange. */
export const BRAND = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
} as const;

/**
 * The `positive` (emerald) ramp as values, for props that take a colour rather
 * than a class — Whop's embedded checkout, whose pay button is the confirming
 * action on /activate.
 */
export const POSITIVE = {
  400: '#34d399',
  500: '#10b981',
} as const;

/**
 * Role hues as `r,g,b` channel triples, for the alpha washes Tailwind's
 * `/opacity` syntax cannot express in an inline style. Roughly 24 distinct
 * hand-typed `rgba(…)` values existed across the repo; `alpha()` replaces the
 * guessing with a token plus a number.
 */
export const CHANNEL = {
  brand: '249,115,22',    // orange-500
  positive: '16,185,129', // emerald-500
  positiveLight: '52,211,153', // emerald-400
  info: '245,158,11',     // amber-500
  caution: '234,179,8',   // yellow-500
  danger: '239,68,68',    // red-500
  neutral: '163,163,163', // neutral-400
  white: '255,255,255',
} as const;

/** A `CHANNEL` value. Narrow, so a hand-typed triple won't type-check. */
export type Channel = (typeof CHANNEL)[keyof typeof CHANNEL];

/** `alpha(CHANNEL.brand, 0.2)` → `'rgba(249,115,22,0.2)'`. */
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

/**
 * A bezel brighter than its neighbours — a card the Operator is meant to act
 * in (AdminPage). It was tinted brand; the dashboard carries no brand colour
 * now, so the emphasis is a stronger white edge instead.
 */
export const CARD_BEZEL_STRONG: { outer: CSSProperties; inner: CSSProperties } = {
  outer: { background: `linear-gradient(135deg, ${alpha(CHANNEL.white, 0.16)} 0%, ${alpha(CHANNEL.white, 0.03)} 100%)` },
  inner: CARD_BEZEL.inner,
};

/** The bezel tinted danger — a destructive zone (ProfilePage). */
export const CARD_BEZEL_DANGER: { outer: CSSProperties; inner: CSSProperties } = {
  outer: { background: `linear-gradient(135deg, ${alpha(CHANNEL.danger, 0.1)} 0%, ${alpha(CHANNEL.white, 0.02)} 100%)` },
  inner: CARD_BEZEL.inner,
};

/**
 * Recharts props: the chart's series, chrome and grid.
 *
 * The chart only renders inside the dashboard, which is black and white apart
 * from `positive` and `danger`. Sends are an action, so they are white;
 * replies are the good outcome the chart exists to show, so they take the
 * green. The two series stay tellable apart by hue and by lightness.
 */
export const CHART = {
  /** DMs sent — the primary series. */
  sent: '#ffffff',
  /** Replies — the outcome, so it reads as `positive`. */
  replies: '#10b981', // emerald-500
  /** Axis tick labels. */
  axisTick: '#a3a3a3', // neutral-400 — neutral-600 was 2.5:1 on the card
  /** Legend text. */
  legendText: '#a3a3a3', // neutral-400
  /** Cartesian grid lines. */
  grid: alpha(CHANNEL.white, 0.04),
  /** Hover cursor wash behind a column. */
  cursor: alpha(CHANNEL.white, 0.02),
  /** Halo around an active dot — matches the card it sits on. */
  dotStroke: SURFACE.sunken,
} as const;
