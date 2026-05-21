# UI Component Refactoring — Agent Handoff Guide

> **Goal**: Consolidate dual-layer JSX/TSX UI components into a single set of typed, customizable, responsive shared TSX components. Every component exposes `className` + `cn()` for override.

## Document Index

| File | Purpose |
|------|---------|
| [00-OVERVIEW.md](./00-OVERVIEW.md) | This file — project context and goals |
| [01-COMPONENT-INVENTORY.md](./01-COMPONENT-INVENTORY.md) | Complete inventory of all current components with source code, props, and usage |
| [02-COMPONENT-SPECS.md](./02-COMPONENT-SPECS.md) | Exact TypeScript interfaces and implementation specs for each target shared component |
| [03-MIGRATION-GUIDE.md](./03-MIGRATION-GUIDE.md) | File-by-file import migration instructions for every consumer |
| [04-RESPONSIVE-PATTERNS.md](./04-RESPONSIVE-PATTERNS.md) | Responsive design patterns and breakpoint conventions |
| [05-VERIFICATION.md](./05-VERIFICATION.md) | Testing, verification checklist, and commands |

## Architecture Context

```
apps/web/src/components/
├── ui/             ← shadcn primitives (KEEP) + legacy wrappers (MIGRATE & DELETE)
│   ├── button.tsx  ← shadcn primitive — DO NOT TOUCH
│   ├── card.tsx    ← shadcn primitive — DO NOT TOUCH
│   ├── table.tsx   ← shadcn primitive — DO NOT TOUCH
│   ├── dialog.tsx  ← shadcn primitive — DO NOT TOUCH
│   ├── ...         ← other shadcn primitives
│   ├── PageShell.jsx    ← LEGACY — migrate to shared/
│   ├── PageHeader.jsx   ← LEGACY — delete (shared/ version exists)
│   ├── Modal.jsx        ← LEGACY — migrate to shared/
│   ├── ConfirmDialog.jsx ← LEGACY — migrate to shared/
│   ├── Toolbar.jsx      ← LEGACY — migrate to shared/
│   ├── IconButton.jsx   ← LEGACY — migrate to shared/
│   ├── ProgressBar.jsx  ← LEGACY — migrate to shared/
│   ├── SectionCard.jsx  ← LEGACY — migrate to shared/
│   ├── DataTable.jsx    ← LEGACY — delete (shared/ version exists)
│   ├── StatCard.jsx     ← LEGACY — delete (shared/ version exists)
│   ├── StatusBadge.jsx  ← LEGACY — delete (shared/ version exists)
│   ├── EmptyState.jsx   ← LEGACY — delete (shared/ version exists)
│   ├── IconLink.jsx     ← LEGACY — unused, DELETE
│   ├── Divider.jsx      ← LEGACY — unused, DELETE
│   ├── Toast.jsx        ← KEEP — global context provider
│   └── ToastContext.jsx ← KEEP — global context provider
│
├── shared/         ← Target: ALL reusable components live here as TSX
│   ├── DataTable.tsx     ← EXISTS — enhance
│   ├── StatCard.tsx      ← EXISTS — enhance
│   ├── StatusBadge.tsx   ← EXISTS — enhance
│   ├── EmptyState.tsx    ← EXISTS — enhance
│   ├── PageHeader.tsx    ← EXISTS — enhance
│   ├── SearchBar.tsx     ← EXISTS — minor enhance
│   ├── DatePicker.tsx    ← EXISTS — minor enhance
│   ├── PageShell.tsx     ← CREATED — ready (see note below)
│   ├── SectionCard.tsx   ← NEEDS CREATION
│   ├── Modal.tsx         ← NEEDS CREATION
│   ├── ConfirmDialog.tsx ← NEEDS CREATION
│   ├── Toolbar.tsx       ← NEEDS CREATION
│   ├── IconButton.tsx    ← NEEDS CREATION
│   └── ProgressBar.tsx   ← NEEDS CREATION
```

> **Note**: `shared/PageShell.tsx` was already created during a prior session with content: named export `PageShell` + default export, typed `{ children, className }`, uses `cn()` with `page-container` CSS class. **Verify it exists before recreating.**

## Key Constraints

- **DO NOT** modify shadcn primitives in `components/ui/` (button.tsx, card.tsx, table.tsx, dialog.tsx, input.tsx, select.tsx, badge.tsx, progress.tsx, separator.tsx, sheet.tsx, skeleton.tsx, sonner.tsx)
- **DO NOT** touch `Toast.jsx` or `ToastContext.jsx` — they are global context providers
- **DO NOT** change the API response envelope or any backend code
- **Always** use `pnpm` — never `npm` or `yarn`
- **Always** use `cn()` from `@/lib/utils` for class merging
- **Always** provide both named export AND default export for components that had default exports (PageShell, Modal, Toolbar, IconButton, ProgressBar) — this prevents breaking legacy imports during migration
- **Always** run `pnpm check:all` before considering work complete

## Execution Order

1. Create/enhance shared TSX components (Phase 1-2 in 02-COMPONENT-SPECS.md)
2. Update page imports file by file (Phase 3 in 03-MIGRATION-GUIDE.md)
3. Delete legacy files (Phase 4 in 03-MIGRATION-GUIDE.md)
4. Run verification (05-VERIFICATION.md)

## Design System Reference

CSS variables and Tailwind tokens are defined in `apps/web/src/index.css`:

| Token | Value |
|-------|-------|
| `--bg-base` | `rgb(11 12 14)` |
| `--bg-surface` | `rgb(17 19 22)` |
| `--accent-solid` | `rgb(74 222 128)` |
| `--color-success` | `rgb(74 222 128)` |
| `--color-warning` | `rgb(251 191 36)` |
| `--color-danger` | `rgb(248 113 113)` |
| `--color-info` | `rgb(96 165 250)` |
| `--radius` | `var(--radius-lg)` = `10px` |
| `--section-gap` | `24px` |
| `--card-p` | `20px` |
| `--transition-fast` | `150ms ease` |

Utility CSS classes (in `@layer components`):
- `page-container` — max-width + padding for page shells
- `page-header` — flex row for header layout
- `page-title` — h1 typography
- `page-subtitle` — description text
- `section-title` — section heading
- `surface-card` — card surface styling
