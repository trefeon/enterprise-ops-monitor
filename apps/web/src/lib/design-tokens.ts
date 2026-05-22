/**
 * Design Tokens — Enterprise Ops Monitor
 *
 * Semantic tokens for consistent spacing, typography, color, and animation.
 * Import these constants instead of hardcoding values in components.
 */

// ─── Spacing ───────────────────────────────────────────
export const SPACING = {
  pageX: '24px',
  pageY: '24px',
  sectionGap: '24px',
  cardPadding: '20px',
  tableCellX: '16px',
  tableCellY: '12px',
  rowHeight: '48px',
} as const;

// ─── Typography ────────────────────────────────────────
export const TYPOGRAPHY = {
  fontDisplay: "'DM Sans', 'Geist', system-ui, sans-serif",
  fontBody: "'Geist', 'DM Sans', system-ui, sans-serif",
  fontMono: "'Geist Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",

  sizeXs: '0.65rem',
  sizeSm: '0.7rem',
  sizeBase: '0.8rem',
  sizeMd: '0.875rem',
  sizeLg: '1rem',
  sizeXl: '1.25rem',
  size2xl: '1.5rem',
  size3xl: '1.75rem',
  size4xl: '2rem',
} as const;

// ─── Border Radius ──────────────────────────────────────
export const RADIUS = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// ─── Shadows ────────────────────────────────────────────
export const SHADOW = {
  card: '0 0 0 1px rgb(255 255 255 / 0.06)',
  elevated: '0 4px 12px rgb(0 0 0 / 0.3)',
  modal: '0 24px 80px rgb(0 0 0 / 0.6)',
  glow: '0 0 16px rgb(74 222 128 / 0.2)',
} as const;

// ─── Animation ──────────────────────────────────────────
export const ANIMATION = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease-out',
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Breakpoints (reference only — use Tailwind classes) ─
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ─── Status Colors ──────────────────────────────────────
export const STATUS = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
  info: 'text-status-info',
  neutral: 'text-status-neutral',
} as const;

// ─── Semantic Color Classes ─────────────────────────────
export const BG_STATUS = {
  success: 'bg-status-success/10 border-status-success/15',
  warning: 'bg-status-warning/10 border-status-warning/15',
  error: 'bg-status-error/10 border-status-error/15',
  info: 'bg-status-info/10 border-status-info/15',
} as const;
