# Shared Component Guide

Use shared components before adding page-local UI. shadcn primitives stay in `apps/web/src/components/ui`; app-specific compositions stay in `apps/web/src/components/shared`.

## Cards

- Use `shared/StatCard.tsx` for metric cards and `ui/card.tsx` for new custom cards.
- Square cards must set `aspect-square` and keep content in a `min-w-0` column.
- Rectangular cards need explicit responsive constraints such as `sm:aspect-[4/3]`, `lg:aspect-auto`, or fixed grid tracks.
- Long labels use `truncate` for single-line values or `break-words` for descriptions.

## Modals And Forms

- Use `EntityFormDialog` for create/edit flows.
- Use `EntityFormGrid` for responsive two-column fields and `EntityField` for labels, required markers, and hints.
- Use shadcn `Dialog`, `Input`, `Select`, `Textarea`, `Switch`, `Button`, `Skeleton`, `Badge`, and `sonner`.
- Keep submit handlers on the page so API calls, demo-user write blocking, and permission checks remain visible.

## Tables

- Use `shared/DataTable.tsx` for page tables unless a TanStack feature from `components/ui/data-table` is required.
- Cells that can grow need `min-w-0`, `truncate`, or `break-words`.
- Keep action controls in `EntityActionMenu` so table columns stay narrow on mobile and desktop.

## Exports

- Use `ExportButton` for UI and `downloadWorkbookExport()` for downloads.
- Export endpoints must return `.xlsx` payloads with `fileName`, `contentType`, and `contentBase64`.
- Do not add browser-generated CSV exports.

## Motion

- Use existing `framer-motion` only on composed shared components or page-level sections.
- Respect `prefers-reduced-motion` with `useReducedMotion()`.
- Keep hover and press effects subtle: cards and rows can use transform/opacity, not layout-changing size shifts.
