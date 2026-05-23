---
type: always_on
description: Project-specific operational rules mirrored from AGENTS.md
---

# Project Core Rules

- Use `pnpm` only; do not use `npm` or `yarn`.
- Preserve the API response envelope: `{ ok, data, meta, error }`.
- Run `pnpm check:all` before completion, or report the exact blocker.
- Keep `mock-api/` demo-only; do not put production logic there.
- Keep one web codebase; split demo/production with `VITE_APP_MODE=demo|production`.
- User-facing exports must be `.xlsx` workbooks, not browser-generated CSV files.
- Add permissions in both `apps/api/lib/permissions.js` and `apps/web/src/lib/auth/permissions.js`.
- Do not remove or rename protected system roles: `viewer`, `ops`, `admin`, `super_admin`, `demo`, `it`, `hc`.
- Use migration files in `apps/api/migrations/` for persistent schema changes.
- Use WIB date helpers from `apps/web/src/lib/date.js`; do not use raw `toLocaleString()` in app UI.
- For frontend work, follow `DESIGN.md` and `apps/web/docs/design.md`: dark-only, tokenized styling, Lucide icons only, one page banner per routed private page.
