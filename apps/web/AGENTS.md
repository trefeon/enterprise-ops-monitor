# Web Agent Rules

- Keep route paths and lazy imports in `src/router/index.tsx` stable unless a task explicitly changes navigation.
- Prefer TSX for new or migrated components. Keep `allowJs: true` until `src/components/UserAccessModal.jsx` is migrated.
- Use shared components from `src/components/shared` before adding page-local UI helpers.
- Keep shadcn primitives in `src/components/ui` source-compatible with the registry; compose wrappers outside that folder.
- Keep demo/production split behind `VITE_APP_MODE`; do not create a second web app.
- Use workbook export helpers for `.xlsx` downloads; do not add browser-generated CSV exports.
- For page UI, follow `../../DESIGN.md` and `src/docs/design.md`: dark-only, Lucide icons, tokenized colors, one feature banner per routed private page.
- Do not import Axios in pages; use `src/lib/api/client.js`.
