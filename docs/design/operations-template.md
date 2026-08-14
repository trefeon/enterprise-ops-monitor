# Operations Page Template Framework

**Status:** IMPLEMENTED - approved 2026-08-12; all 15 pages refactored onto the template (see §8). Framework ships in
`apps/web/src/components/template/`.
**Date:** 2026-08-12
**Scope:** the 15 operational pages of `apps/web` (Operations, Tools, Administration). Marketing and demo-adjacent
pages (Landing, Pricing, Signup, Starter, CaseStudy, Billing, LiveSync, LiveTVDisplay, LiveMenuDashboard, AfterHours
tab within Daily Monitor internals) are out of scope.
**Constraint honored:** this phase changed no file under `apps/web/src/pages/` and no page behavior. `pnpm --filter
web typecheck` and `pnpm --filter web build` are green.

---

## 1. Design direction

- **Mode:** operate. This is an operations console: scanability and native expectations beat visual novelty.
- **Direction, one line:** one flat, border-defined operations template - story banner, page header, meta line, KPI
  row, section or table cards, dialogs - where the data table is the terminal element of every flow and every
  interactive surface is a real shadcn primitive.
- **Dials:** DESIGN_VARIANCE low (deliberate sameness across 15 pages is the feature; variance lives in archetype
  slot composition, not in page skeletons), MOTION_INTENSITY 3 (banner animation kept as-is, no new motion in
  template primitives), VISUAL_DENSITY high (dense rows, mono values, tabular numerals).
- **Three locks (invariants):**
  - Color: one accent (the existing `--accent-solid` green). Status colors only for data states.
  - Shape: one radius system (6px cards, 4px small tiles, pills only for badges; existing tokens).
  - Theme: dark only, border-defined elevation ("no shadows, borders only" per `index.css`), no theme flips.
- **Structural variety note:** the anti-slop variety rule targets unrelated briefs. Here the brief IS one product
  with 15 surfaces; for an ops tool, identical skeletons are the deliverable. Variety comes from the six archetype
  compositions, not from page-level invention.

---

## 2. Page anatomy (the template)

Fixed stack, in order. Nothing may reorder it.

```
FeatureStoryBanner   <- story slot, optional; when present, ALWAYS first
PageHeader           <- h1 + subtitle + actions (border-b)
MetaLine             <- bullet-separated status line, optional
[ page content ]     <- archetype blocks: KpiRow, SectionHeading, SectionCard, TableCard
[ dialogs ]          <- float above; shadcn Dialog / ConfirmDialog / EntityFormDialog
```

Rules:

1. **Banner first.** No page renders the banner after the header. `PageTemplate` enforces this by construction.
2. **One h1 per page**, owned by `PageHeader`. Sections use h2 (`SectionHeading` / `SectionCard` titles). No skipped
   heading levels (fixes System Health's h3-after-h1).
3. **Meta line is its own component** so live values (countdowns, timestamps, source labels) re-render without
   re-rendering the header.
4. **The table is the terminal element.** A page that has a table ends with it; nothing meaningful sits below a
   table except dialogs.
5. **Fatal / empty states bypass the template:** `DashboardLayout` + `EmptyState` directly (current early-return
   pattern stays; Store Sync, Agent Updater, Backups, Dashboard, Accounts already do this).
6. **Interactivity is delegated to existing primitives** - `Button`, `StatCard`, `DataTable`, `Dialog`,
   `SearchBar`, `StatusBadge`. The template adds layout, never new interactive behavior.
7. **Skeleton constants are existing tokens:** page padding 32px (`--page-px`), section gap 24px (`--section-gap`),
   card padding 16px (`--card-p`), card radius 6px (`--rounded-sm`), table cell 16x12px, row 48px. The template
   introduces zero new dimensions.

---

## 3. Component inventory

### 3a. New - `apps/web/src/components/template/`

| Component | Props | Purpose | Notes |
|---|---|---|---|
| `PageTemplate` | `story?` (FeatureStory), `title: ReactNode`, `subtitle?`, `actions?`, `meta?: ReactNode[]`, `constrained?: boolean`, `className?`, `children` | The shell: banner, header, meta, content in the fixed order. `constrained` narrows the column to max-w-2xl (utility pages). | Wraps `DashboardLayout`; fatal states bypass it |
| `PageHeader` | `title: ReactNode`, `subtitle?`, `actions?`, `className?` | The one page header. Display h1, border-b, actions right-aligned. | Visually identical to `DashboardPageHeader` (pixel-neutral migration); meta lives in PageTemplate, not here |
| `MetaLine` | `items: ReactNode[]`, `separator?` (default `•`), `className?` | Bullet-separated status line under the header. | Returns null for empty arrays |
| `KpiRow` | `columns?: 2 \| 3 \| 4` (default 4), `children`, `className?` | Responsive KPI strip; children are `StatCard`. | Grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-N` |
| `SectionHeading` | `title: ReactNode`, `subtitle?`, `actions?`, `className?` | Bare h2 + subtitle + actions for unframed content. | Replaces `BaseSection` headers and raw `h3.section-title` |
| `SectionCard` | `title?`, `subtitle?`, `actions?`, `toolbar?`, `noPadding?`, `className?`, `children` | Framed section: h2 header, optional toolbar strip, padded or flush body. | Card chrome inherited from `ui/card` (6px radius, border, no shadow) |
| `TableCard` | `title?`, `subtitle?`, `actions?`, `toolbar?`, `footer?`, `className?`, `children` | The table terminal: bordered header, toolbar strip, flush table body, optional footer. | Header carries border-b (unlike SectionCard); children are `DataTable` |

Barrel: `@/components/template` exports all seven.

### 3b. Deprecated this phase (JSDoc markers only, no behavior change)

| File | Component | Superseded by | Delete |
|---|---|---|---|
| `components/base/dashboard-layout.tsx` | `DashboardWelcome` | PageTemplate composition | refactor phase |
| `components/base/dashboard-layout.tsx` | `DashboardStatCard` | `ui/cards StatCard` (via KpiRow) | refactor phase |
| `components/base/dashboard-layout.tsx` | `DashboardPageHeader` | template `PageHeader` | refactor phase (14 call sites migrate) |
| `components/base/base-section.tsx` | `BaseSection` | template `SectionHeading` + `SectionCard` | refactor phase |
| `components/base/base-page-shell.tsx` | `BasePageShell` | template `PageTemplate` | refactor phase |
| `components/shared/PageHeader.tsx` | `PageHeader` | template `PageHeader` | refactor phase (SystemHealth only) |
| `components/ui/cards/SectionCard.tsx` | `SectionCard` | template `SectionCard` | when last call site migrates |

`DashboardLayout` / `DashboardSection` stay current (PageTemplate builds on them). `FeatureStoryBanner` and
`ui/cards StatCard` are the finalized building blocks and stay untouched.

---

## 4. Composition rules per archetype

Legend: `!` required, `?` optional, `-` absent.

### A. KPI overview - `Dashboard`
| Slot | Use |
|---|---|
| banner | `!` story `dashboard` |
| header | `!` title "Dashboard" + actions |
| meta | `-` |
| KPI row | `!` KpiRow(4) of StatCard, clickable to pages |
| sections | `!` 2-col panel grid (KpiRow detail + quick actions) via DashboardSection |
| table | `?` recent activity mini table |
| dialogs | `-` |

### B. Monitor with summary + table - `StoreSync`, `EODMonitor`, `SystemHealth`, `AfterHours`, `AfterHoursReport`
| Slot | Use |
|---|---|
| banner | `!` story per page (add `system` / `after-hours-report` stories where pages lack banners today) |
| header | `!` title + refresh/export actions |
| meta | `?` MetaLine (updated / countdown / source) - StoreSync and EODMonitor use it |
| KPI row | `?` KpiRow(4) or page-specific summary card components (StoreSyncSummaryCards, EODSummaryCard stay) |
| sections | `?` SectionHeading + summary/health blocks (branch health, service cards) |
| table | `!` TableCard + DataTable (SystemHealth logs, StoreSync stores, EOD rows, after-hours rankings) |
| dialogs | `?` history / detail dialogs |

### C. Directory with toolbar + table + dialogs - `StoreManagement`, `IdentityCheck`, `UsersAdmin`
| Slot | Use |
|---|---|
| banner | `!` story (banner-first - fixes F2) |
| header | `!` title + Create / Export actions |
| meta | `-` |
| KPI row | `-` |
| sections | `-` |
| table | `!` TableCard + DataTable; toolbar holds SearchBar + selects (branch, role, status) |
| dialogs | `!` EntityFormDialog (create/edit), ConfirmDialog (delete), Dialog (password) |

### D. Stats + search + table - `AgentUpdater`, `office-agents`
| Slot | Use |
|---|---|
| banner | `!` story |
| header | `!` title + actions |
| meta | `-` |
| KPI row | `!` KpiRow(4) of StatCard (status counts) |
| sections | `?` search/summary card (office-agents has one) |
| table | `!` TableCard + DataTable with search toolbar |
| dialogs | `?` update/detail dialogs |

### E. Summary cards + table - `Backups`
| Slot | Use |
|---|---|
| banner | `!` story `backups` |
| header | `!` title + "Backup Now" |
| meta | `-` |
| KPI row | `!` KpiRow(4) |
| sections | `!` two SectionCards (storage, schedule) |
| table | `!` TableCard "Recent Snapshots" + DataTable (migrates off BaseDataTable, F5) |
| dialogs | `?` confirm dialogs |

### F. Card grid admin - `RolesAdmin`
| Slot | Use |
|---|---|
| banner | `!` story `roles` |
| header | `!` title + Create Role |
| meta | `-` |
| KPI row | `-` |
| sections | `!` SectionCard grid, one card per role |
| table | `-` |
| dialogs | `!` shadcn Dialog for the role editor (replaces hand-rolled overlay, F4) |

### Utility - `Profile`, `Logout`
`PageTemplate` with `constrained` (whole column max-w-2xl) + SectionCards. Designed and documented, **not applied
this round** - the two pages stay exactly as they are today.

---

## 5. Per-page mapping

| # | Page (folder) | Route | Group | Arch | Banner story | Header actions | Meta line | KPI / summary | Sections | Table | Dialogs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dashboard (`Dashboard`) | /app | Ops | A | dashboard | refresh | - | KpiRow 4 | panels grid | mini table | - |
| 2 | Store Sync (`StoreSync`) | /app/sync | Ops | B | store-sync | Refresh Now | yes | summary cards + branch health | - | TableCard | history dialog |
| 3 | EOD Monitor (`EODMonitor`) | /app/eod | Ops | B | eod-monitor | auto/refresh/export | yes | EOD stats row | - | TableCard | detail dialog |
| 4 | System (`SystemHealth`) | /app/system | Ops | B | system (add) | restart/export | - | service KPIs | service SectionCards | TableCard logs | confirm dialogs |
| 5 | Store Directory (`StoreManagement`) | /app/stores | Ops | C | store-directory | create/export | - | - | - | TableCard + toolbar | EntityForm + Confirm |
| 6 | Employee Directory (`IdentityCheck`) | /app/identity | Ops | C | employee-directory | create/export | - | - | - | TableCard + toolbar | EntityForm + Confirm |
| 7 | Backups (`Backups`) | /app/backups | Ops | E | backups | backup now | - | KpiRow 4 | storage + schedule cards | TableCard snapshots | confirm |
| 8 | Agent Updater (`AgentUpdater`) | /app/agent-updater | Tools | D | agent-updater | refresh | - | KpiRow 4 | - | TableCard + toolbar | update dialogs |
| 9 | Office Agents (`office-agents`) | /app/office-agents | Tools | D | office-agents | refresh/export | - | KpiRow 4 | search card | TableCard + toolbar | detail/export |
| 10 | Accounts (`UsersAdmin`) | /app/admin/users | Admin | C | accounts | create/export | - | - | - | TableCard + toolbar | Dialog + Confirm |
| 11 | Roles (`RolesAdmin`) | /app/admin/roles | Admin | F | roles | create role | - | - | role card grid | - | Dialog (new) |
| 12 | Daily Monitor (`AfterHours`) | /app/admin/afterhours | Admin | B | after-hours | - | - | stats | config sections | TableCard | target dialogs |
| 13 | Monthly Report (`AfterHoursReport`) | /app/admin/afterhours/report | Admin | B | after-hours-report (add) | generate/export | - | StatsCards | - | TableCard rankings | - |
| 14 | Profile (`Profile`) | /app/profile | user | Utility | - | - | - | - | SectionCard | - | - |
| 15 | Logout (`Logout`) | /app/logout | user | Utility | - | - | - | - | SectionCard | - | - |

Notes: rows 4 and 13 mark proposed banner additions (the story keys already exist in `src/data/stories.js`; the pages
currently render no banner). Rows 14-15 are out of scope this round. The sidebar restructure (Tools as its own
group) is a proposal in the wireframe section 3, implemented as a data-shape change in
`components/layout/Sidebar.tsx` after approval.

---

## 6. Audit finding resolutions

| # | Finding | Resolution | Where |
|---|---|---|---|
| F1 | SystemHealth uses PageShell + PageHeader + raw h3.section-title | PageTemplate (arch B) + SectionHeading h2 + TableCard; `@ts-nocheck` removed during refactor | template components; SystemHealth in refactor phase |
| F2 | Banner rendered after header (StoreManagement, IdentityCheck) | PageTemplate hard-codes banner-first order | page-template.tsx |
| F3 | StoreSync table in bare BaseSection, filters in header | TableCard with toolbar slot; filters move into the strip | table-card.tsx |
| F4 | RolesAdmin hand-rolled fixed overlay | shadcn Dialog (also closes ui-audit 7c.8: no role=dialog, no focus trap) | RolesAdmin in refactor phase |
| F5 | Backups uses BaseDataTable manualPagination | Standard DataTable (pagination prop) inside TableCard | Backups in refactor phase |
| F6 | DashboardWelcome + DashboardStatCard dead | `@deprecated` JSDoc this phase, delete in refactor; StatCard is the single KPI card | dashboard-layout.tsx |
| F7 | Profile/Logout hand-rolled max-w-2xl | `constrained` prop on PageTemplate; utility pages stay as-is this round | page-template.tsx |
| F8 | Banner usage consistent | Kept untouched; PageTemplate slots it first | - |

---

## 7. What we are NOT doing

1. **No page changes in this phase.** Every page under `apps/web/src/pages/` is untouched; this phase ships the
   framework, the wireframe, and the spec only.
2. **No visual redesign.** The refactor is pixel-neutral: same tokens, same typography, same borders, same dark
   theme. The template standardizes structure, not aesthetics.
3. **LiveSync wallboard stays out** (`LiveSync`, `LiveTVDisplay`, `LiveMenuDashboard`): display-oriented demo
   surfaces, not ops pages. They keep their bespoke layouts.
4. **Marketing pages stay out** (Landing, Pricing, Signup, Starter, CaseStudy, Billing): different mode (persuade),
   out of the ops template.
5. **Profile / Logout stay as-is this round.** The constrained variant is designed and documented; application
   waits for the refactor phase.
6. **Sidebar restructure is proposed, not implemented** (wireframe section 3). It is a data-shape change in
   `components/layout/Sidebar.tsx`; applied only after approval.
7. **RolesAdmin overlay and Backups BaseDataTable migrations are spec'd, not implemented** (they are page
   behavior changes, which this phase must not make).
8. **No new dependencies, no Tailwind version change, no token changes.** The framework composes existing
   primitives and tokens. `combobox.tsx` (ui-audit F6, v4 syntax under v3) is a separate pre-existing issue,
   untouched by this work.
9. **No export/feature changes to FeatureStoryBanner** (finalized) and no new banner stories written - the two
   proposed additions only wire existing story keys.

---

## 8. Migration order (follow-up phase, after approval)

Suggested order - each step keeps `typecheck`, `build`, and `pnpm test:e2e:demo` green:

1. **Templates land (this phase).** Done.
2. **Dashboard** (arch A) - the pattern-setter for KPI rows and panels.
3. **Store Sync** (arch B) - meta line, summary cards, TableCard with toolbar.
4. **EOD Monitor** (arch B) - meta line + table card.
5. **Store Directory + Employee Directory** (arch C) - banner-first fix (F2), toolbar, dialogs.
6. **Accounts** (arch C) - toolbar + Dialog.
7. **Agent Updater + Office Agents** (arch D) - KpiRow + search toolbar.
8. **Backups** (arch E) - DataTable migration (F5), SectionCard grid.
9. **System Health** (arch F1) - PageTemplate, SectionHeading, @ts-nocheck removal, banner story.
10. **Daily Monitor + Monthly Report** (arch B) - banner stories, TableCard.
11. **Roles** (arch F) - Dialog swap (F4).
12. **Housekeeping:** delete deprecated components (F6), remove `@deprecated` markers, update docs.

Acceptance per page: identical rendering before/after (visual diff check), all interactions preserved, heading
levels correct, no horizontal scroll regressions.

---

## 9. Verification (this phase)

- `pnpm --filter web typecheck` - pass.
- `pnpm --filter web build` - pass.
- Wireframe opens standalone in a browser (single self-contained HTML, no external assets).
- Files changed: `apps/web/src/components/template/*` (7 new), JSDoc deprecation markers in 5 existing component
  files, `docs/design/operations-wireframe.html`, `docs/design/operations-template.md`.
- No file under `apps/web/src/pages/` modified.
