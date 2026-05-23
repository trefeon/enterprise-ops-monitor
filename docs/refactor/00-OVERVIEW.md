# UI Component Refactoring — Historical Agent Handoff Guide

> Historical note: this guide is not the current repo map. Check
> `docs/agent-code-map.md` first, then use this file only for background on
> the shared component consolidation effort.

> **Goal**: Consolidate dual-layer JSX/TSX UI components into a single set of typed, customizable, responsive shared TSX components. Every component exposes `className` + `cn()` for override.

## Document Index

| File                                                     | Purpose                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [00-OVERVIEW.md](./00-OVERVIEW.md)                       | This file — project context and goals                                                 |
| [01-COMPONENT-INVENTORY.md](./01-COMPONENT-INVENTORY.md) | Complete inventory of all current components with source code, props, and usage       |
| [02-COMPONENT-SPECS.md](./02-COMPONENT-SPECS.md)         | Exact TypeScript interfaces and implementation specs for each target shared component |
| [03-MIGRATION-GUIDE.md](./03-MIGRATION-GUIDE.md)         | File-by-file import migration instructions for every consumer                         |
| [04-RESPONSIVE-PATTERNS.md](./04-RESPONSIVE-PATTERNS.md) | Responsive design patterns and breakpoint conventions                                 |
| [05-VERIFICATION.md](./05-VERIFICATION.md)               | Testing, verification checklist, and commands                                         |

## Architecture Context

```
apps/web/src/components/
├── ui/             ← shadcn primitives (KEEP) + global toast components (KEEP)
│   ├── button.tsx  ← shadcn primitive — DO NOT TOUCH
│   ├── card.tsx    ← shadcn primitive — DO NOT TOUCH
│   ├── table.tsx   ← shadcn primitive — DO NOT TOUCH
│   ├── dialog.tsx  ← shadcn primitive — DO NOT TOUCH
│   ├── ...         ← other shadcn primitives
│   ├── Toast.jsx        ← KEEP — global context provider
│   └── ToastContext.jsx ← KEEP — global context provider
│
├── shared/         ← Consolidated: ALL reusable components live here as TSX
│   ├── DataTable.tsx     ← CONSOLIDATED & ENHANCED
│   ├── StatCard.tsx      ← CONSOLIDATED & ENHANCED
│   ├── StatusBadge.tsx   ← CONSOLIDATED & ENHANCED
│   ├── EmptyState.tsx    ← CONSOLIDATED & ENHANCED
│   ├── PageHeader.tsx    ← CONSOLIDATED & ENHANCED
│   ├── SearchBar.tsx     ← CONSOLIDATED & ENHANCED
│   ├── DatePicker.tsx    ← CONSOLIDATED & ENHANCED
│   ├── PageShell.tsx     ← CONSOLIDATED & ENHANCED
│   ├── SectionCard.tsx   ← CONSOLIDATED & ENHANCED
│   ├── Modal.tsx         ← CONSOLIDATED & ENHANCED
│   ├── ConfirmDialog.tsx ← CONSOLIDATED & ENHANCED
│   ├── Toolbar.tsx       ← CONSOLIDATED & ENHANCED
│   ├── IconButton.tsx    ← CONSOLIDATED & ENHANCED
│   └── ProgressBar.tsx   ← CONSOLIDATED & ENHANCED
```

## Key Constraints

- **DO NOT** modify shadcn primitives in `components/ui/` (button.tsx, card.tsx, table.tsx, dialog.tsx, input.tsx, select.tsx, badge.tsx, progress.tsx, separator.tsx, sheet.tsx, skeleton.tsx, sonner.tsx)
- **DO NOT** touch `Toast.jsx` or `ToastContext.jsx` — they are global context providers
- **DO NOT** change the API response envelope or any backend code
- **Always** use `pnpm` — never `npm` or `yarn`
- **Always** use `cn()` from `@/lib/utils` for class merging
- **Always** provide both named export AND default export for components that had default exports (PageShell, Modal, Toolbar, IconButton, ProgressBar) — this prevents breaking legacy imports during migration
- **Always** run `pnpm check:all` before considering work complete

## Execution Status

All phases of the refactoring plan have been successfully executed and verified:

1. Created/enhanced all shared TSX components (Phases 1 & 2)
2. Updated all consumer page imports to reference `@/components/shared/*` (Phase 3)
3. Replaced inline table structures with `<DataTable>` across `EODMonitor`, `Backups`, `SystemHealth`, and `StoreSync` (Phase 5)
4. Deleted all 14 legacy JSX files from `components/ui/` (Phase 4)
5. Optimized build outputs via `vite.config.js` code splitting to resolve large bundle warnings (Phase 6)
6. Verified with zero errors on typechecking, linting, and production builds.

## Design System Reference

CSS variables and Tailwind tokens are defined in `apps/web/src/index.css`:

| Token               | Value                       |
| ------------------- | --------------------------- |
| `--bg-base`         | `rgb(11 12 14)`             |
| `--bg-surface`      | `rgb(17 19 22)`             |
| `--accent-solid`    | `rgb(74 222 128)`           |
| `--color-success`   | `rgb(74 222 128)`           |
| `--color-warning`   | `rgb(251 191 36)`           |
| `--color-danger`    | `rgb(248 113 113)`          |
| `--color-info`      | `rgb(96 165 250)`           |
| `--radius`          | `var(--radius-lg)` = `10px` |
| `--section-gap`     | `24px`                      |
| `--card-p`          | `20px`                      |
| `--transition-fast` | `150ms ease`                |

Utility CSS classes (in `@layer components`):

- `page-container` — max-width + padding for page shells
- `page-header` — flex row for header layout
- `page-title` — h1 typography
- `page-subtitle` — description text
- `section-title` — section heading
- `surface-card` — card surface styling
