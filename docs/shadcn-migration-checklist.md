# shadcn Migration Checklist

## Before Editing

- Read local `AGENTS.md`.
- Inspect current component usage with `rg`.
- Check whether a base component already exists.
- Run shadcn CLI with `--dry-run` before adding primitives.

## Component Sync

- Add missing primitives with `pnpm exec shadcn add`.
- Preserve local customizations in existing `components/ui/*`.
- Keep registry primitives low-level.
- Export reusable app APIs from `components/base/index.ts`.

## Theme Tokens

- Use `apps/web/src/index.css` as the source of shadcn/tweakcn-compatible variables.
- Keep Tailwind v3 HSL variable syntax.
- Use sidebar/card/table tokens instead of hard-coded colors.
- Keep dark-only behavior.
- Do not add uncontrolled gradients or one-off palette classes.

## Page Migration

- Replace raw tables with `BaseDataTable`.
- Replace raw toolbars with `BaseToolbar`.
- Replace repeated cards with `BaseCard`.
- Replace date inputs with `BaseDatePicker`.
- Replace dialogs/sheets with `BaseDialog` and `BaseSheet`.
- Replace page-level file inputs with `BaseFileUploadControl`.
- Preserve API envelope handling and auth/RBAC checks.

## Responsive Checklist

- 1440px: dense layout, visible table actions, no clipped toolbar controls.
- 1024px: sidebar and tables still usable.
- 768px: toolbar wraps and table scroll/card mode is usable.
- 375px: no horizontal page overflow, no overlapping text, mobile sidebar works.

## Accessibility Checklist

- Keyboard focus ring visible.
- Buttons have labels or `aria-label`.
- Dialogs/sheets have titles.
- Sidebar child menus are keyboard reachable.
- Table selection checkboxes have labels.
- Motion respects reduced motion.

## Final Validation

Run from repo root:

```bash
pnpm check:all
pnpm --filter web build
pnpm --filter web dev
```

Document exact failures if a command cannot pass.
