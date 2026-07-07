# Component Consolidation Plan

## Target Structure

```
src/components/
├── layout/
│   ├── AppShell.tsx          ← stays, just imports
│   ├── Header.tsx            ← stays
│   ├── Sidebar.tsx           ← stays
│   └── ContentSection.tsx    ← stays
├── ui/
│   ├── data-table/
│   │   ├── DataTable.tsx     ← MERGED from ui/data-table/DataTable.tsx (keep this one, delete shared/DataTable.tsx + base-data-table.tsx)
│   │   ├── DataTableColumnHeader.tsx
│   │   ├── DataTablePagination.tsx
│   │   ├── DataTableToolbar.tsx
│   │   └── index.ts
│   ├── cards/
│   │   ├── StatCard.tsx      ← from shared/StatCard (keep, delete base-card)
│   │   ├── SectionCard.tsx   ← from shared/SectionCard
│   │   ├── DetailCard.tsx    ← from ui/cards/DetailCard (keep)
│   │   ├── ListCard.tsx      ← from ui/cards/ListCard
│   │   ├── ActionCard.tsx    ← from ui/cards/ActionCard
│   │   └── index.ts
│   ├── forms/
│   │   ├── FormField.tsx     ← MERGED from base-form-field + ui/forms/FormField
│   │   ├── SearchInput.tsx   ← from ui/forms/SearchInput
│   │   ├── FilterBar.tsx     ← from ui/forms/FilterBar
│   │   └── index.ts
│   ├── feedback/
│   │   ├── LoadingSpinner.tsx ← from ui/feedback/LoadingSpinner
│   │   ├── ErrorBoundary.tsx  ← from ui/feedback/ErrorBoundary + common/ErrorBoundary
│   │   └── index.ts
│   ├── button.tsx            ← shadcn (keep)
│   ├── badge.tsx             ← shadcn (keep)
│   ├── card.tsx              ← shadcn (keep)
│   ├── dialog.tsx            ← shadcn (keep)
│   ├── alert-dialog.tsx      ← shadcn (keep)
│   ├── dropdown-menu.tsx     ← shadcn (keep)
│   ├── select.tsx            ← shadcn (keep)
│   ├── checkbox.tsx          ← shadcn (keep)
│   ├── switch.tsx            ← shadcn (keep)
│   ├── tabs.tsx              ← shadcn (keep)
│   ├── popover.tsx           ← shadcn (keep)
│   ├── tooltip.tsx           ← shadcn (keep)
│   ├── sheet.tsx             ← shadcn (keep)
│   ├── breadcrumb.tsx        ← shadcn (keep)
│   ├── skeleton.tsx          ← shadcn (keep)
│   ├── pagination.tsx        ← shadcn (keep)
│   ├── input.tsx             ← shadcn (keep)
│   ├── label.tsx             ← shadcn (keep)
│   ├── separator.tsx         ← shadcn (keep)
│   ├── collapsible.tsx       ← shadcn (keep)
│   ├── toast.tsx             ← keep
│   ├── spinner.tsx           ← keep
│   ├── empty.tsx             ← keep
│   ├── sonner.tsx            ← keep
│   ├── calendar.tsx          ← keep
│   ├── chart.tsx             ← keep
│   ├── command.tsx           ← keep
│   ├── combobox.tsx          ← keep
│   ├── avatar.tsx            ← keep
│   ├── progress.tsx          ← keep
│   └── ...                    ← all other shadcn primitives
├── shared/                   ← DELETE (move to ui/ or delete if replaced)
├── base/
│   ├── index.ts              ← UPDATE to re-export from ui/
│   └── ...                   ← DELETE individual files
├── common/                   ← DELETE (ErrorBoundary + PageLoader + PageTransition → move PageLoader and PageTransition to layout/)
├── auth/
│   └── Guard.tsx             ← keep
├── data/
│   └── columns/              ← keep (column definitions)
├── PrivateRoute.tsx          ← keep
├── FeatureStoryBanner.tsx    ← keep
└── UserAccessModal.jsx       ← keep (convert to TSX later)
```

## Merge Mapping (base/ → ui/)

| base/ File | Action | Target |
|---|---|---|
| base-action-menu.tsx | DELETE | replaced by shared/EntityActionMenu.tsx → ui/ |
| base-animation.tsx | DELETE | framer-motion handles this |
| base-app-frame.tsx | KEEP (used by AppShell) | stays |
| base-app-header.tsx | MERGE | into layout/Header.tsx |
| base-breadcrumbs.tsx | DELETE | use ui/breadcrumb.tsx |
| base-card.tsx | MERGE | into ui/cards/ card variants |
| base-data-table.tsx | DELETE | use ui/data-table/DataTable.tsx |
| base-data-table-column-header.tsx | DELETE | use ui/data-table/DataTableColumnHeader.tsx |
| base-data-table-pagination.tsx | DELETE | use ui/data-table/DataTablePagination.tsx |
| base-data-table-toolbar.tsx | DELETE | use ui/data-table/DataTableToolbar.tsx |
| base-data-table-view-options.tsx | DELETE | use ui/data-table column toggle |
| base-date-picker.tsx | DELETE | use ui/calendar + popover |
| base-dialog.tsx | DELETE | use ui/dialog.tsx |
| base-empty-state.tsx | DELETE | use ui/empty.tsx |
| base-error-state.tsx | DELETE | use ui/feedback/ |
| base-file-upload-control.tsx | KEEP | AgentUpdater specific |
| base-form-field.tsx | DELETE | use ui/forms/FormField |
| base-loading-state.tsx | DELETE | use ui/skeleton + ui/spinner |
| base-login-form.tsx | KEEP | Login page specific |
| base-page-shell.tsx | KEEP | wraps all content pages |
| base-section.tsx | KEEP | section container |
| base-sheet.tsx | DELETE | use ui/sheet.tsx |
| base-sidebar.tsx | KEEP | sidebar component |
| base-sidebar-nav.tsx | KEEP | sidebar navigation |
| base-tabs.tsx | DELETE | use ui/tabs.tsx |
| base-toolbar.tsx | DELETE | use ui/data-table/DataTableToolbar |
| index.ts | UPDATE | re-export from ui/ |

## Files to create
- ui/data-table/index.ts (barrel)
- ui/cards/index.ts (barrel)
- ui/forms/index.ts (barrel)
- ui/feedback/index.ts (barrel)

## Verification
After consolidation:
- `pnpm build` must still succeed
- `pnpm typecheck` must pass
- Test each page in browser (no crash)
