# Frontend UI Refactor

## Architecture

The web app now has a base UI layer in `apps/web/src/components/base`. Keep `apps/web/src/components/ui` limited to shadcn/Base UI primitives and low-level registry components. Product pages, shared components, and feature modules should import from `@/components/base` first, then use `@/components/ui/*` only when building a new base component or a genuinely one-off primitive inside that layer.

## Current Foundation

- Page shell: `BasePageShell`, `BaseSection`, `BaseBreadcrumbs`
- Cards: `BaseCard`
- Toolbars: `BaseToolbar`
- Sidebar: `BaseSidebar`, `BaseSidebarNav`, `BaseNavItem`
- Tables: `BaseDataTable<TData, TValue>` and related helpers
- Forms: `BaseFormField`, `BaseDatePicker`, `BaseLoginForm`
- Overlays: `BaseDialog`, `BaseSheet`, `BaseActionMenu`, `BaseTabs`
- States: `BaseEmptyState`, `BaseLoadingState`, `BaseErrorState`
- Motion: `BaseMotionProvider`, `BaseFadeIn`, `BaseScaleIn`, `BaseSlideIn`, `BaseAnimatedPanel`

## Migration Rules

1. Preserve routes, API calls, auth behavior, permissions, and data models.
2. Replace raw page markup with base components before changing visuals.
3. Keep repeated layout, table, card, toolbar, form, and overlay patterns in `components/base`.
4. Use `cn()` for class merging and shadcn CSS variables for colors.
5. Use Lucide React icons only.
6. Keep the app dark-only; do not add a light-mode toggle.
7. Use WIB helpers from `apps/web/src/lib/date.js` for operational dates.

## Migration Order

1. Build or extend base component.
2. Add docs and example usage when the API is reusable.
3. Migrate shared wrappers to delegate to base components.
4. Migrate feature pages.
5. Remove duplicate or dead wrappers only after imports are moved.
6. Run `pnpm check:all`.

## Audit Notes

- Duplicate table implementations were consolidated behind `BaseDataTable`.
- Shared `DataTable` and `components/ui/data-table/*` now delegate to the base table path for compatibility.
- Login, sidebar, page shell, toolbar, date picker, and file upload now have reusable base entry points.
- Raw app-level buttons, inputs, textareas, and tables were replaced; expected primitives remain inside shadcn/base internals.

## Risk Areas

- Auth/login must keep `useAuth().login` behavior and demo credential typing.
- Sidebar nav must keep permission filtering and route paths.
- Monitor tables may depend on server-side pagination and stable row IDs.
- File upload inputs must stay encapsulated in `BaseFileUploadControl`.
- Long operational pages should be migrated incrementally to avoid changing state flow.
