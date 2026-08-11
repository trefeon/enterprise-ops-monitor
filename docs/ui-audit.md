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

---

## 7. Accessibility spot-check (R2.4, 2026-08-11)

**Scope:** bounded keyboard/focus/aria/table/contrast spot-check on 5 surfaces — Login, Dashboard, EOD Monitor, RolesAdmin, After Hours (`apps/web/src/pages/{Login,Dashboard,EODMonitor,RolesAdmin,AfterHours}/`). **Not** a full WCAG audit. Read-only + this report; **zero source files changed** (all genuine findings landed in shared components outside the 5 surface folders, where this pass is not allowed to touch — see Known limitations).

**Verification method:** static analysis of every TSX file in the 5 surface folders + the shared components they render, plus a live keyboard tour: booted `mock-api` (:4000) + Vite dev (:5182, `VITE_API_URL=http://localhost:4000`), drove a real Chromium via the repo's `@playwright/test`, pressed **Tab through Login (8 stops) and Dashboard (24 stops)** after login (demo/demo123), and read computed styles for every focused element **after transitions settled** (280 ms settle per stop). Also verified Enter-activation of a dashboard KPI card (`role="button"` → navigated to `/app/system`).

### 7a. Per-surface results (C1 keyboard reachability · C2 visible focus ring · C3 icon-only aria-label · C4 table headers · C5 body-text contrast)

| Surface                                                | C1 Keyboard | C2 Focus ring | C3 aria-label | C4 Table headers       | C5 Contrast | Detail                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------- | ------------- | ------------- | ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login (`Login/index.tsx` + `base/base-login-form.tsx`) | **PASS**    | **PASS**      | **PASS**      | N/A (no table)         | **PASS**    | All primary actions are real `<Button>`s in a real `<form>`; 8/8 Tab stops show a settled focus indicator (inputs: 2px `ring-ring/20` shadow + `border-ring`; buttons: 1px `border-ring`). Password toggle has `aria-label`; submit/demo-quick-login/Live TV/System Support all carry text.                                                                                         |
| Dashboard (`Dashboard/index.tsx`)                      | **PASS**    | **PASS**      | **PASS**      | N/A (no table)         | **PASS**    | `ActionButton` is a native `<button>`; KPI `StatCard`s expose `role="button"` + `tabIndex=0` + Enter/Space handlers (activation verified in browser) and show the UA outline colored by the global `outline-ring/50` rule. All buttons have text labels.                                                                                                                            |
| EOD Monitor (`EODMonitor/**`)                          | **PASS**    | **PASS**      | **PASS**      | **PASS** (see limit 4) | **PASS**    | Auto/Refresh/Sync All/Export/Reset/Retry are text-labeled `<Button>`s; `EODSummaryCard` is `role="button"` + key handling + explicit `focus-visible:ring-2`; filters carry `aria-label` (SearchBar, both Selects, DatePicker). Tables render via shadcn `TableHead` (`<th>`). Only the F8 badge pairing uses `bg-muted/30` + `text-muted-foreground` — pre-documented, passes ~8:1. |
| RolesAdmin (`RolesAdmin/index.tsx`)                    | **PASS**    | **PASS**      | **PASS**      | N/A (no table)         | **PASS**    | Create/Cancel/Save/permission-toggle buttons are text-labeled; icon-only Edit/Delete row buttons already carry `aria-label="Edit role"` / `"Delete role"`; zero `bg-muted` hits (matches §4).                                                                                                                                                                                       |
| After Hours (`AfterHours/**`)                          | **PASS**    | **PASS**      | **PASS**      | **PASS** (see limit 4) | **PASS**    | Run Check Now + all config buttons are text-labeled; the notify toggle is a real `<Button role="switch" aria-checked aria-label="Toggle setting">` with `focus-visible:ring-2` replacement (its `focus-visible:outline-none` is paired); textareas keep `focus-visible:ring-2` replacements. F7/F9 pairings re-confirmed at the documented lines, no new body-text pairings.        |

### 7b. Fixes applied

**None.** No issue in the 5 surface folders qualified as "broken AND cheap": every interactive element is keyboard-reachable with a settled visible focus indicator, no icon-only button in these folders lacks an accessible name, tables use shadcn `TableHead`, and no new contrast pairing appeared beyond F7–F11 (the one new _location_ of the F7-class pairing — the Login help-dialog chip, `Login/index.tsx:125–130` — passes the same ~8:1 math). The genuine defects found all live in shared components outside the allowed folders.

### 7c. Known limitations (logged, not fixed — with rationale)

1. ✅ **RESOLVED (2026-08-11)** — `focus-visible:ring-3` dead CSS: all `ring-3` occurrences replaced with `ring-2` across `button.tsx`, `checkbox.tsx`, `switch.tsx`, `input-group.tsx`, `navigation-menu.tsx`, `combobox.tsx`, `radio-group.tsx`, `textarea.tsx` (grep-verified zero remaining).
2. ✅ **RESOLVED (2026-08-11)** — `DataTablePagination.tsx` — `aria-label` added to all 4 icon-only page buttons ("First page", "Previous page", "Next page", "Last page").
3. **EOD store-detail rows are click-only** (`RawDataTable` `TableRow` `onClick` → `openDetail`) — no keyboard path opens the details modal (WCAG 2.1.1). Structural: the shared `DataTable` would need row-level focus/Enter handling; logged only.
4. ✅ **RESOLVED (2026-08-11)** — `ui/table.tsx` `TableHead` now emits `scope="col"`.
5. **`StatCard` interactive variant** relies on the UA default outline (visible, colored by the global `* { outline-ring/50 }` rule — verified) rather than an explicit `focus-visible:ring-2` like its sibling `EODSummaryCard`. Consistency gap in a shared component; the indicator exists, so it is not a failure.
6. **`--focus-ring` token is vestigial** — only referenced by `ui/input.tsx:12` as `focus-visible:ring-[var(--focus-ring)]`, a ring-_width_ arbitrary value holding a `2px solid rgba(...)` string that generates no CSS rule (verified: 0 matches in served CSS); inputs' actual indicator is `ring-2 ring-ring/20` + `border-ring`. The token is dead weight, not a defect.
7. **Login help-dialog chip** (`Login/index.tsx:125–130`, `bg-muted` + `text-xs text-muted-foreground`) is a new _location_ of the F7-class pairing — passes AA (~8:1), token-hygiene note only.
8. **RolesAdmin edit modal** is a bare `div` overlay (no `role="dialog"`, no focus trap/restore) — outside this pass's 5 checks; noted for a future keyboard/dialog pass.
9. **Unlabeled config inputs** — `NotificationTargetRow`/schedule-time inputs have visible text (`<p>`) but no `<label htmlFor>` association — outside this pass's checks (C3 covers icon-only buttons only); noted for a future forms pass.
10. **Browser tour was desktop-only** — single Chromium at 1440×900; no screen reader, no zoom/forced-colors, no mobile tab-order verification.
