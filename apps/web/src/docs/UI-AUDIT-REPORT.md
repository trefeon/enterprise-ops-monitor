# EOM Web App — Visual Consistency Audit

**Date:** 2026-07-08
**Scope:** `/apps/web/src/` — 155+ TSX files, 2 CSS files (26 pages, ~100 components)
**Design System:** Geist tokens (`--ds-gray-*`, `--ds-blue-*`, `--ds-radius-sm=6px`, `--ds-focus-ring`)
**Design rules:** `rounded-sm` (6px) for interactives, `rounded-lg` (12px) for containers, `rounded-full` for pills; Lucide/feather SVG only; token colors only; body text min `text-sm`/13/14

---

## 1. 🔴 Inconsistent Border Radius (`rounded-xl`, `rounded-2xl`)

These radii don't exist in the Geist token system and should be `rounded-lg` (containers) or `rounded-sm` (interactive elements).

### `rounded-xl` (11 files, ~21 instances)
| File | Lines | Notes |
|---|---|---|
| `pages/Landing/index.tsx` | 148, 307, 358, 383, 435 | Feature cards, tech stack boxes, FAQ items |
| `pages/LiveSync/index.tsx` | 156 | KPI card icon container |
| `pages/CaseStudy/index.tsx` | 169, 208, 240 | Architecture layers, feature cards, terminal box |
| `pages/About/index.tsx` | 121 | Info panel |
| `pages/AgentUpdater/index.tsx` | 730, 736 | Action buttons |
| `pages/Backups/index.tsx` | 182, 249, 267, 278 | Warning banner, config panels |
| `pages/Backups/columns.tsx` | 42 | Table cell icon container |

### `rounded-2xl` (2 files, 3 instances)
| File | Lines | Notes |
|---|---|---|
| `pages/LiveSync/index.tsx` | 149, 235 | KPI card containers, store cards |
| `pages/About/index.tsx` | 169 | Feature grid cards |

**Recommendation:** Replace with `rounded-lg` for card/container surfaces, `rounded-sm` for interactive elements.

---

## 2. 🟡 Hardcoded Custom Shadows (`shadow-[...]` — 5 files, 5 instances)

These use raw shadow values instead of token-based shadow utilities.

| File | Line | Shadow Value | Suggestion |
|---|---|---|---|
| `components/ui/dialog.tsx` | 53 | `shadow-[0_24px_80px_rgb(0_0_0_/_0.6)]` | `shadow-2xl` or token |
| `components/ui/select.tsx` | 83 | `shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]` | `shadow-lg` or token |
| `components/ui/sheet.tsx` | 54 | `shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]` | `shadow-2xl` or token |
| `components/ui/sidebar.tsx` | 222 | `shadow-[0_0_8px_var(--sidebar-primary)]` | Token glow variable |
| `pages/Pricing/index.tsx` | 104 | `shadow-[0_0_30px_rgba(34,211,238,0.06)]` | Token-based glow |

Also `shadow-lg` appears in `LiveSync` (with `rounded-xl`), `AgentUpdater` (action button), and dropdown/menubar components — acceptable if intentional but should verify against design spec.

---

## 3. 🟡 Inline Tailwind Arbitrary Values (`text-[...]`, `h-[...]`, `w-[...]`, etc.)

**~94 instances across 30+ files.** Major categories:

### Font sizes that should use tokens:
- `text-[10px]` — **23+ instances** across Landing, Dashboard, Pricing, StatCard (2 copies), FeatureStoryBanner, PageHeader, sidebar, base-app-header, CaseStudy, LiveMenuDashboard, PageHeader, base-sidebar
- `text-[11px]` — badge.tsx, table.tsx, sidebar.tsx
- `text-[9px]` — FeatureStoryBanner line 151, base-sidebar-nav line 96
- `text-[13.5px]` — table.tsx line 79, sidebar.tsx line 221, base-sidebar-nav.tsx line 227
- `text-[0.8rem]` — button.tsx, toggle.tsx, calendar.tsx, form.tsx
- `text-[0.65rem]`, `text-[0.7rem]` — StatusBadge.tsx
- `text-[1.75rem]` — StatCard.tsx (2 copies)

### Sizing arbitrary values:
- `min-w-[200px]`, `min-w-[320px]`, `min-w-[220px]` — table column widths in data-table components
- `max-w-[24rem]`, `max-w-[14rem]` — StoreManagement, IdentityCheck
- `max-w-[calc(100%-2rem)]` — dialog.tsx
- `h-[18.4px]`, `w-[100px]`, `w-[32px]`, `w-[24px]` — switch.tsx, drawer.tsx

### Spacing arbitrary values:
- `p-[3px]` — menubar.tsx, tabs.tsx
- `px-2 py-0.5 text-[10px]` — widely used badge/label pattern

### Other:
- `tracking-[0.2em]`, `tracking-[0.12em]` — FeatureStoryBanner, base-app-header, Dashboard
- `gap-[--spacing(var(--gap))]` — toggle-group.tsx (functional CSS variable usage)

---

## 4. 🟡 Font Size < 12px for Body/Label Text

Design spec says `text-sm`/13/14 minimum for body. These are used for labels/timestamps/metadata:

| Tag | Count | Files |
|---|---|---|
| `text-[10px]` | 23+ | Landing, Dashboard, Pricing, StatCard, FeatureStoryBanner, PageHeader, sidebar, base-sidebar, base-app-header, CaseStudy, LiveMenuDashboard |
| `text-[11px]` | 3 | badge.tsx, table.tsx (table header), sidebar.tsx (section header) |
| `text-[9px]` | 2 | FeatureStoryBanner, base-sidebar-nav |
| `text-3xs` (custom) | 28+ | LiveSync, AgentUpdater, Backups, SystemHealth, MonitorTab, EODSummaryCard, About |

Note: `text-3xs` and `text-[9px]` on `FeatureStoryBanner` (metrics labels) and `base-sidebar-nav` (badge count) are particularly small and may fail accessibility checks.

---

## 5. ✅ Debug Labels — All Pages Covered

Every `PageShell` / `BasePageShell` instance in page components has `debugLabel` set properly. Pages using manual `data-debug-component-root` (Landing, Pricing, CaseStudy, Starter, Login, Signup, LiveTVDisplay, LiveSync) also have it.

**Only exception:** `components/common/PageLoader.tsx` uses `<PageShell>` without a `debugLabel` — acceptable as it's a loading placeholder, not a route page.

---

## 6. ✅ No Emoji as Structural Icons

Zero structural emoji found across the codebase. All icon usage is via `lucide-react` SVG components. Clean.

---

## 7. 🔴 Text Contrast Concerns (gray on gray)

The `text-muted-foreground` (#888888) + `bg-muted` (#222222) combination appears in ~19 locations:

| File | Context | Ratio (~4.0:1) |
|---|---|---|
| `table.tsx:66` | Table header cells | AA-large only |
| `avatar.tsx:47,92` | Avatar fallback | Acceptable for decorative |
| `StatCard.tsx:97` | Flat trend indicator | AA-large only |
| `cards/StatCard.tsx:97` | Same pattern | AA-large only |
| `cards/ListCard.tsx:83` | Icon container | Decorative |
| `cards/EmptyCard.tsx:33` | Empty state icon | Decorative |
| `cards/ActionCard.tsx:59` | Icon container | Decorative |
| `MonitorTab.tsx:175,407,570` | Inline hints | **Borderline for body text** |
| `EODMonitor.tsx:51` | Badge chips | Acceptable (small text) |
| `NotificationTargetEditor.tsx:58,100` | Label chips | Acceptable |
| `LiveSync.tsx:216` | State indicator | Acceptable |
| `SystemHealth.tsx:635` | Hover button | Transient state |
| `StoreSync/index.tsx:217` | Dropdown trigger | Acceptable |

**Risk area:** `bg-muted/50` + `text-muted-foreground` in hint text (MonitorTab lines 407, 570) drops contrast further — review these.

---

## 8. 🟢 Hex Colors in TSX

Only 5 non-token hex values found, all acceptable:
- `Signup/index.tsx`: 4 Google brand colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) in SVG paths
- `chart.tsx:68`: Recharts stroke references (`#ccc`, `#fff`) — chart library config, not UI

---

## Summary Statistics

| Metric | Value |
|---|---|
| **TSX files scanned** | 155+ |
| **CSS files scanned** | 2 |
| **Page components** | 26 |
| **Component files** | ~100+ |
| **Issues Found** | ~105+ |
| — `rounded-xl` / `rounded-2xl` | 24 instances (13 files) |
| — Hardcoded custom shadows | 5 instances (5 files) |
| — Inline arbitrary values | ~94 instances (30+ files) |
| — Font size < 12px | ~56 instances (15+ files) |
| — Text contrast (gray-on-gray) | ~19 instances |
| — Missing debug-label pages | 0 (1 loading component exempt) |
| — Emoji as icons | 0 ✅ |
| — Raw hex colors in UI | 0 ✅ |

## Priority Actions

1. **HIGH** — Replace `rounded-xl`/`rounded-2xl` with `rounded-lg` (containers) or `rounded-sm` (interactives) across 13 files
2. **HIGH** — Replace hardcoded `shadow-[...]` values in 4 ui components with token shadows
3. **MEDIUM** — Audit and resize `text-[9px]` and `text-[10px]` labels in FeatureStoryBanner, sidebar, and base-sidebar-nav (lowest contrast risk)
4. **MEDIUM** — Review `text-muted` + `bg-muted` combos in MonitorTab hint text for contrast
5. **LOW** — Consolidate `text-[10px]` → proper token (`text-xs` may already map)
6. **LOW** — Replace `min-w-[xxx]`, `max-w-[xxx]` arbitrary values with token-based width classes where possible
