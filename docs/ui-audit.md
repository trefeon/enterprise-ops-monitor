# UI Audit — Enterprise Ops Monitor

**Date:** 2026-08-11
**Scope:** `apps/web/src` — Tailwind utility vocabulary and arbitrary-value hygiene across TSX/TS source (pages, components, base, layout, ui). **Excludes** the About page (deleted as dead code — it is absent from `apps/web/src/pages/`), test files (`*.test.*`, `*.spec.*`), and the `mock-api`. Audit-only: findings are reported, nothing was changed.

**Supersedes:** `docs/archive/ui-audit-2026-07-08.md` (Geist `--ds-*` token era, verified dead — see note at the end). This report is the current UI token audit for the Supabase dark token system.

---

## 1. Token source of truth

The design vocabulary has exactly two definition files. A utility class backed by a token from either file is **COMPLIANT**, not a violation.

### 1a. `apps/web/src/index.css` — the `--*:` custom-property vocabulary

Verified count: **118 custom properties** declared in `:root` (lines 18–168), reproducible with:

```
Select-String -Path apps/web/src/index.css -Pattern '^\s*--[a-z][a-z0-9-]*\s*:'   → 118
```

Of these, 14 are `--supabase-*` compatibility aliases (`--supabase-surface-*` ×5, `--supabase-primary/success/warning/danger/info` ×5, `--supabase-chart-1..4` ×4). Excluding the alias group: **104 core tokens**, which reconciles with the roadmap figure of "104 custom properties". Groups:

- Typography/fonts: `--font-display`, `--font-body`, `--font-mono`
- Background hierarchy: `--bg-canvas/base/bone/surface/card/dark/deep/elevated/input/hover` (10)
- Borders: `--border-hairline/subtle/default/hover/strong/accent` (6)
- Text (5-level contrast): `--text-ink/body/charcoal/muted/ash/stone` + aliases `--text-primary/secondary/disabled/inverse` (10)
- Accent: `--accent-solid/dim/muted/glow`, `--focus-ring` (5)
- Status: `--color-success/warning/danger/info/neutral`, `--bg-success/warning/danger/info` (9)
- Elevation (border-defined, no shadows): `--elevation-level0..4` (5)
- Charts: `--chart-1..5` + `--supabase-chart-1..4` (9)
- shadcn HSL block: `--background … --sidebar-ring` incl. `--muted-foreground: 0 0% 71%` (31)
- Radius/spacing/motion: `--rounded-*`, `--radius-*`, `--page-px/py`, `--section-gap`, `--card-p`, `--table-cell-px/py`, `--row-h`, `--transition-*` (20)

Component classes in the same file (`@layer components`: `.form-label`, `.table-head-row`, `.live-text-2xs`, `.live-text-3xs`, `.live-truncate-name`, …) may declare literal sizes (e.g. `font-size: 11px` in `.form-label`); those live **inside** the source-of-truth file, so they are the vocabulary, not violations. Note: neither the `--*` vocabulary nor the config below defines an 11px, 2rem, 120px, 220px, 320px, 14rem, or 24rem size class.

### 1b. `apps/web/tailwind.config.js` — `theme.extend` (Tailwind `3.4.17`)

| Key                       | Entries                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`                  | `border`, `input`, `ring`, `background`, `bg-base/surface/elevated/input/hover`, `foreground`, `text.{primary,secondary,muted,disabled,inverse}`, `primary.{DEFAULT,foreground}`, `secondary`, `destructive`, `muted.{DEFAULT,foreground}`, `accent`, `popover`, `card`, `sidebar.*` (9), `brand`, `status.{success,warning,error,info,neutral}`, `status-bg.{success,warning,error,info}` |
| `borderRadius`            | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`                                                                                                                                                                                                                                                                                                                                                        |
| `fontSize`                | `3xs: 10px`, `4xs: 9px`, `5xs: 8px` (lineHeights 1.4 / 1.2 / 1)                                                                                                                                                                                                                                                                                                                            |
| `letterSpacing`           | `widest-lg: 0.2em`, `widest-xl: 0.25em`, `widest-2xl: 0.3em`, `widest: 0.12em`                                                                                                                                                                                                                                                                                                             |
| `maxWidth`                | `cell-sm: 180px`, `cell-md: 200px` (**no `minWidth` extend exists**)                                                                                                                                                                                                                                                                                                                       |
| `lineHeight`              | `tightest: 1.05`                                                                                                                                                                                                                                                                                                                                                                           |
| `scale`                   | `98: 0.98`                                                                                                                                                                                                                                                                                                                                                                                 |
| `spacing`                 | `page-x`, `page-y`, `section`, `card`, `cell-x`, `cell-y`                                                                                                                                                                                                                                                                                                                                  |
| `height`                  | `row`                                                                                                                                                                                                                                                                                                                                                                                      |
| `fontFamily`              | `sans`, `body`, `display`, `heading`, `mono`                                                                                                                                                                                                                                                                                                                                               |
| `animation` / `keyframes` | `fade-in`, `fade-up`, `scale-in`, `slide-down`, `slide-up`, `slide-in-right`, `pulse-slow`, `pulse-fast`, `pulse-alert`, `shimmer`, `dot-pulse`, `spin-slow`, `status-online`, `stream-tick` (14)                                                                                                                                                                                          |

---

## 2. Findings

Every row is reproducible with the `rg` patterns in section 3. Generated shadcn/base-ui primitives in `apps/web/src/components/ui/` are **not** exempt by default — they are listed anyway, with their status marked.

| #   | File                                                                    | Line(s)     | Issue                                                                                                                                                                                                                                                                                                                                                             | Severity                                                                                | Suggested fix                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `apps/web/src/components/base/dashboard-layout.tsx`                     | 162         | `text-[11px]` — no 11px token exists (`3xs`=10px, `xs`=12px); used once, with `tracking-wider` on a stat-card label                                                                                                                                                                                                                                               | **LOW**                                                                                 | Swap to `text-3xs` or `text-xs`; or ship a `text-2xs` token if 11px is intentional                                                                                                                                                    |
| F2  | `apps/web/src/components/base/dashboard-layout.tsx`                     | 106, 170    | `text-[2rem]` — 2rem (32px) is not in the default scale nor `extend.fontSize` (falls between `3xl`=30px and `4xl`=36px); used twice, consistently, for stat values + page-title display                                                                                                                                                                           | **LOW**                                                                                 | Add a display token (e.g. `text-value: 2rem`) or use `text-4xl`; the repeated identical usage makes it a token candidate, not an ad-hoc value                                                                                         |
| F3  | `apps/web/src/pages/IdentityCheck/index.tsx`                            | 341, 357    | `min-w-[220px]` on Name and Store table columns                                                                                                                                                                                                                                                                                                                   | **MEDIUM** (repeated 3× across pages, no `minWidth` token infrastructure exists at all) | Add `extend.minWidth` entries (`min-w-cell-sm: 220px`) in `tailwind.config.js` and use them in both pages                                                                                                                             |
| F3  | `apps/web/src/pages/StoreManagement/index.tsx`                          | 338         | `min-w-[220px]` on Name column — same value as above                                                                                                                                                                                                                                                                                                              | **MEDIUM**                                                                              | Same as above — one token covers both pages                                                                                                                                                                                           |
| F4  | `apps/web/src/pages/UsersAdmin/index.tsx`                               | 183         | `min-w-[320px]` on Actions column — single use                                                                                                                                                                                                                                                                                                                    | **LOW**                                                                                 | Tokenize only if it repeats; otherwise accept (single occurrence, functional layout constraint)                                                                                                                                       |
| F5  | `apps/web/src/pages/IdentityCheck/index.tsx`                            | 343, 360    | `max-w-[24rem]` truncate constraint — rem-based arbitrary, not in `extend.maxWidth`                                                                                                                                                                                                                                                                               | **LOW**                                                                                 | Extend `maxWidth` (e.g. `cell-lg: 24rem`) if this is the intended table-cell truncation limit, then reuse across pages                                                                                                                |
| F5  | `apps/web/src/pages/StoreManagement/index.tsx`                          | 340, 362    | `max-w-[24rem]` + `max-w-[14rem]` truncate constraints                                                                                                                                                                                                                                                                                                            | **LOW**                                                                                 | Same — 24rem repeats across IdentityCheck/StoreManagement, 14rem is single-use                                                                                                                                                        |
| F6  | `apps/web/src/components/ui/combobox.tsx`                               | 111, 124    | **Generated primitive, but real risk:** uses Tailwind **v4-only syntax** (`max-h-(--available-height)`, `w-(--anchor-width)`, `max-w-(--available-width)`, `origin-(--transform-origin)`, `calc(--spacing(7))`, `--spacing(72)`) on Tailwind **3.4.17**. The v3 JIT does not recognize `(--var)`/`--spacing()` forms, so these utilities silently generate no CSS | **MEDIUM**                                                                              | Regenerate the combobox primitive for the installed Tailwind version (v3 arbitrary-value syntax: `max-h-[var(--available-height)]`), or upgrade the app to Tailwind v4. Verify dropdown open/positioning behavior after either change |
| F7  | `apps/web/src/pages/AfterHours/components/MonitorTab.tsx`               | 407, 570    | Real body-text pairing: `<p>` hint (`text-xs text-muted-foreground`) on `bg-muted/50` chip                                                                                                                                                                                                                                                                        | **LOW**                                                                                 | Hygiene note — contrast still passes (see §3 heading for the math); safe to keep, but consider `text-ash`/`text-charcoal` tokens if the muted-on-muted look is wanted                                                                 |
| F8  | `apps/web/src/pages/EODMonitor/index.tsx`                               | 50          | Auto-refresh badge: body text (`text-xs text-muted-foreground font-medium`) on `bg-muted/30` pill                                                                                                                                                                                                                                                                 | **LOW**                                                                                 | Same as F7 — passes contrast, token-hygiene note                                                                                                                                                                                      |
| F9  | `apps/web/src/pages/AfterHours/components/NotificationTargetEditor.tsx` | 58          | Badge: `text-xs … text-muted-foreground` on `bg-muted`                                                                                                                                                                                                                                                                                                            | **LOW**                                                                                 | Same as F7                                                                                                                                                                                                                            |
| F10 | `apps/web/src/pages/StoreSync/components/StoreSyncHistoryDialog.tsx`    | 118 (+ 138) | Row container `bg-muted/30` (status class) with `text-xs text-muted-foreground` secondary line (line 138)                                                                                                                                                                                                                                                         | **LOW**                                                                                 | Same as F7                                                                                                                                                                                                                            |
| F11 | `apps/web/src/pages/StoreSync/index.tsx`                                | 220         | `text-xs text-muted-foreground` chip that gains `hover:bg-muted/30` — pairing exists only on hover                                                                                                                                                                                                                                                                | **LOW**                                                                                 | Same as F7; hover-only so impact is minimal                                                                                                                                                                                           |

**Honesty note (deliberate deviation from the pre-verified brief):** the brief's pattern `text-\[\d+px\]` yields exactly 1 hit (F1), but a superset scan `text-\[[0-9.]+(px|rem|em)\]` (pattern 4 below) also catches the two `text-[2rem]` instances (F2). They are included so the audit states its real coverage rather than the narrower pre-verified one. Similarly, F6 was not in the pre-verified hit list but appears in the same arbitrary-min/max scan (`[a-z]+-\[[0-9.]+(px|rem|em)\]` → 12 hits).

---

## 3. Reproducibility — exact commands

All run from repo root on PowerShell 7. File paths normalized with `\` by the shell; `rg` output truncated to 2 lines per hit by default.

```
# 1. Arbitrary font sizes (px) — pre-verified pattern
rg -n "text-\[\d+px\]" apps/web/src -g "*.tsx" -g "*.ts" -g "!**/pages/About/**" -g "!**/*.test.*" -g "!**/*.spec.*"
→ F1: dashboard-layout.tsx:162  (1 hit)

# 2. Superset: arbitrary font sizes, rem/em too
rg -n "text-\[[0-9.]+(px|rem|em)\]" apps/web/src -g "*.tsx" -g "*.ts" -g "!**/*.test.*" -g "!**/*.spec.*"
→ F1 (162) + F2 (106, 170)  (3 hits)

# 3. Arbitrary shadows — clean
rg -n "shadow-\[" apps/web/src -g "*.tsx" -g "*.ts"
→ 0 hits

# 4. Arbitrary min/max widths — 12 hits → F3 (341/357, 338), F4 (183), F5 (343/360, 340/362)
rg -n "[a-z]+-\[[0-9.]+(px|rem|em)\]" apps/web/src/pages apps/web/src/components/base apps/web/src/components/layout -g "*.tsx" -g "*.ts"
→ dashboard-layout.tsx 106/162/170 · OrgSwitcher.tsx 15 · IdentityCheck 341/343/357/360 · StoreManagement 338/340/362 · UsersAdmin 183

# 5. Raw hex in source — all classified, zero violations (see §4)
rg -n -E "#[0-9a-fA-F]{3,8}" apps/web/src -g "*.tsx" -g "*.ts" -g "*.css"
→ 56 hits: index.css tokens (source of truth) · Signup brand SVG · dashboard-layout var fallbacks · chart.tsx recharts selectors

# 6. Bounded contrast spot-check: bg-muted × text-muted-foreground in the 5 sampled pages
rg -n "bg-muted" apps/web/src/pages/Dashboard apps/web/src/pages/EODMonitor apps/web/src/pages/RolesAdmin apps/web/src/pages/AfterHours apps/web/src/pages/StoreSync -g "*.tsx" -g "*.ts"
→ 15 hits; the 5 real body-text couplings are F7–F11; the rest are decorative (see §4)

# 7. Token vocabulary counts
Select-String -Path apps/web/src/index.css -Pattern '^\s*--[a-z][a-z0-9-]*\s*:'   → 118 custom properties (104 core + 14 --supabase-* aliases)
rg -n "^\s*--[a-z][a-z0-9-]*\s*:(\s|$)" apps/web/src/index.css                        → same set, listed
```

**Contrast basis for F7–F11:** `--muted-foreground` = `hsl(0 0% 71%)` ≈ `#B5B5B5` (relative luminance ≈ 0.463) on `--muted` = `hsl(0 0% 13%)` ≈ `#212121` (L ≈ 0.014) yields **(0.463+0.05)/(0.014+0.05) ≈ 8.0:1**, WCAG AA (4.5:1) and AAA (7:1) compliant for normal text. The `bg-muted/30`–`/50` blends sit over card surface (#171717), lightening the background slightly (~8.2:1) — still passing. These findings are therefore token-hygiene/consistency notes, **not** accessibility failures. Decorative/icon contexts are out of scope, and a full WCAG pass is explicitly out of scope for a desktop ops demo.

---

## 4. Checked and clean

Zero-finding scans and exempt classifications:

- **`shadow-[...]` arbitrary utilities — 0 hits** (pattern 3). Elevation is border-defined by design (`--elevation-level0..4` are `0 0 0 1px` ring tokens; comment in `index.css` line 86: "Supabase — NO shadows, borders only"). `dashboard-layout.tsx:158` uses `var(--elevation-level1, 0 0 0 1px #2e2e2e)` in an inline style — a token with fallback, compliant.
- **Raw hex — all 56 hits classified, zero violations:**
  - (a) `index.css` lines 23–104 — the token definitions themselves, i.e. the source of truth. Clean by definition.
  - (b) `pages/Signup/index.tsx` 245–248 — `#4285F4/#34A853/#FBBC05/#EA4335` Google brand mark inside the OAuth button SVG. Brand marks are exempt.
  - (c) `components/base/dashboard-layout.tsx` 145–158 — **classification corrected vs. the pre-verified brief:** these are not chart-series colors; they are inline-style **CSS custom-property fallbacks** (`var(--supabase-success,#3ecf8e)`, `var(--supabase-danger,#e54d2e)`, `var(--text-secondary,#898989)`, `var(--elevation-level1, … #2e2e2e)`). The hex only applies if the token is undefined, and each mirrors the token's value in `index.css`. Accepted as token-with-fallback; the fallbacks could be dropped now that the tokens are stable, but there is no violation.
  - (d) `components/ui/chart.tsx` line 68 — `[stroke='#ccc']` / `[stroke='#fff']` selectors inside the generated shadcn chart primitive. Component-library code, accepted.
- **Generated primitives with arbitrary but v3-valid values — accepted:** `components/ui/dialog.tsx:53` (`max-w-[calc(100%-2rem)]`, a functional responsive calc, valid v3 syntax), `components/ui/switch.tsx:17` (`h-[18.4px] w-[32px]`, `h-[14px] w-[24px]` — thumb/track geometry tied to base-ui sizes). The one generated- primitive exception is F6 (`combobox.tsx`), which uses v4-only syntax that does nothing under v3 — flagged MEDIUM.
- **`bg-muted` in the sampled pages, not body-text:** `Dashboard/index.tsx:62` status-dot config (`dot: 'bg-muted-foreground'` — decorative), `EODMonitor/components/EODStatsRow.tsx:42,56` progress-track `bg-muted` (decorative), `AfterHours/components/MonitorTab.tsx:175` notification icon container (decorative icon, not text). **`RolesAdmin` has zero `bg-muted` hits** — fully clean.
- **Truncate-width pattern:** `min-w-0` + `max-w-[24rem]`/`max-w-[14rem]` + `truncate` is used consistently for table cells (F5) — structurally sound, only tokenization is missing.
- **About page:** absent from `apps/web/src/pages/`, confirming the deletion; the `!**/pages/About/**` glob exclusion in the scan produces no behavioral difference and is kept for parity with the pre-verified evidence.

---

## 5. Supersession note

`docs/archive/ui-audit-2026-07-08.md` is **archived and dead**. Its own header (verified 2026-08-11) states the `--ds-*` token system was replaced by the Supabase migration (commit `761357e`); the `--ds-*` tokens and the `rounded-xl`/`rounded-2xl` findings it reported no longer exist in code, and `text-3xs` — flagged there as a violation — is a defined token in `apps/web/tailwind.config.js`. This document (roadmap task R2.1) is the live UI token audit and supersedes it.

---

## 6. Net result

**1 MEDIUM-consequence item (F6** — generated combobox carries Tailwind v4 syntax that no-ops under v3; likely a latent dropdown-sizing behavior gap **), 2 MEDIUM tokenization gaps (F3** — `min-w-[220px]` ×3, no `minWidth` token exists **), 8 LOW hygiene items (F1, F2, F4, F5, F7–F11), zero HIGH.** No accessibility failures found in the bounded contrast spot-check; no shadow violations; no un-classified raw hex.
