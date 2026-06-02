/**
 * Поясни Design System — TypeScript tokens
 * Source: Claude Design handoff · Poyasni Redesign.html
 */

// ── Colors ───────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg:        '#060817',
  bgDeep:    '#04050F',
  surface:   '#101426',
  surfaceHi: '#171B31',
  surfaceLo: '#0B0E1F',

  // Borders
  border:   'rgba(255, 255, 255, 0.08)',
  borderHi: 'rgba(255, 255, 255, 0.14)',

  // Text
  text:     '#F7F7FB',
  textSec:  '#A6AAC3',
  textMute: '#6E738C',

  // Accent — violet
  accent:     '#7C3AED',
  accentSoft: 'rgba(124, 58, 237, 0.18)',

  // Blue team
  blue:     '#38BDF8',
  blueDeep: '#0EA5E9',
  blueSoft: 'rgba(56, 189, 248, 0.14)',

  // Orange team
  orange:     '#FB923C',
  orangeDeep: '#F97316',
  orangeSoft: 'rgba(251, 146, 60, 0.14)',

  // Semantic
  success:      '#22C55E',
  successDeep:  '#16A34A',
  danger:       '#EF4444',
  warn:         '#FACC15',
} as const;

export type ColorToken = keyof typeof colors;

// ── Typography ───────────────────────────────────────────────────

export const fontFamily = {
  sans: 'Inter, "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, "Cascadia Code", monospace',
} as const;

/** Font size scale in px */
export const fontSize = {
  xs:   10,  // tiny badges
  '2xs': 11, // overlines, captions
  sm:   12,  // secondary labels
  base: 13,  // small body
  md:   14,  // body-small
  lg:   15,  // body
  xl:   16,  // body-large
  '2xl': 17, // button / title-sm
  '3xl': 18, // modal headers
  '4xl': 22, // display-sm
  '5xl': 28, // display-md
  '6xl': 32, // display-lg
  '7xl': 40, // hero / score
  '8xl': 56, // victory numbers
} as const;

export const fontWeight = {
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
  black:     900,
} as const;

export const lineHeight = {
  tight:   1.1,
  snug:    1.25,
  normal:  1.4,
  relaxed: 1.5,
} as const;

/** Letter spacing in px */
export const letterSpacing = {
  tight:   -0.5,
  normal:   0,
  wide:     0.4,
  wider:    1.0,
  widest:   1.6,
} as const;

// ── Spacing ──────────────────────────────────────────────────────

/** Spacing scale in px */
export const spacing = {
  1:  2,
  2:  4,
  3:  6,
  4:  8,
  5:  10,
  6:  12,
  7:  14,
  8:  16,
  9:  20,
  10: 24,
  11: 28,
  12: 32,
  14: 40,
  16: 48,
  20: 60,
  24: 80,
} as const;

// ── Border Radius ─────────────────────────────────────────────────

/** Border radius in px */
export const radius = {
  xs:   6,
  sm:   10,
  md:   14,   // rSm
  lg:   20,   // rMd
  xl:   28,   // rLg
  card: 20,
  pill: 999,  // rPill
} as const;

// ── Shadows ───────────────────────────────────────────────────────

export const shadow = {
  // Elevation
  sm:  '0 4px 12px rgba(0, 0, 0, 0.3)',
  md:  '0 8px 24px rgba(0, 0, 0, 0.4)',
  lg:  '0 24px 60px rgba(0, 0, 0, 0.5)',
  xl:  '0 30px 80px rgba(0, 0, 0, 0.5), 0 0 0 1.5px rgba(255, 255, 255, 0.06), inset 0 0 0 6px #0a0a14',

  bottomSheet: '0 -20px 60px rgba(0, 0, 0, 0.5)',

  // Button variants
  btnPrimary: '0 8px 24px rgba(124, 58, 237, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
  btnSuccess: '0 8px 24px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  btnBlue:    '0 8px 24px rgba(14, 165, 233, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  btnOrange:  '0 8px 24px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  btnDanger:  '0 8px 24px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',

  // Focus ring
  focusAccent: '0 0 0 4px rgba(124, 58, 237, 0.18)',

  // Glow dots for online indicators
  glowBlue:   '0 0 10px #38BDF8',
  glowOrange: '0 0 10px #FB923C',
  glowGreen:  '0 0 10px #22C55E',
} as const;

// ── Breakpoints ───────────────────────────────────────────────────

/** Breakpoints in px — use as min-width thresholds */
export const breakpoints = {
  mobile:  390,   // design base (iPhone 14 Pro)
  tablet:  768,
  desktop: 1024,
  wide:    1440,  // desktop artboards
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ── Z-index ───────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  content: 10,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

// ── Motion ────────────────────────────────────────────────────────

export const duration = {
  fast:   120,  // ms
  base:   200,
  slow:   350,
  slower: 600,
} as const;

export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out:     'cubic-bezier(0, 0, 0.2, 1)',
  in:      'cubic-bezier(0.4, 0, 1, 1)',
} as const;

// ── Convenience re-export (matches original tokens.js shape) ─────

export const PT = {
  ...colors,
  font:  fontFamily.sans,
  rLg:   radius.xl,
  rMd:   radius.lg,
  rSm:   radius.md,
  rPill: radius.pill,
} as const;

export default {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  spacing,
  radius,
  shadow,
  breakpoints,
  zIndex,
  duration,
  easing,
};
