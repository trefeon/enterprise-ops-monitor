# Enterprise Operations Monitor Agent Rules

This file keeps repo-specific landmines only. For discoverable project context, use
`README.md`, `DESIGN.md`, `apps/web/docs/design.md`, and `docs/*.md`.

## Required Workflow

- Use `pnpm` only. Do not use `npm` or `yarn` for installs, scripts, or lockfile work.
- Run commands from the repo root unless a package-local doc or script requires otherwise.
- Check module-local `AGENTS.md` files before changing `apps/web` or `apps/api`.
- Run `pnpm check:all` before considering work complete. If it cannot run or fails, report the exact command and blocker.

## API And Data

- Preserve the API response envelope: `{ ok, data, meta, error }`.
- Use `apiGet()`, `apiPost()`, `apiPatch()`, `apiPut()`, and `apiDelete()` from `apps/web/src/lib/api/client.js`; do not import Axios directly in pages.
- Do not modify `mock-api/` for production logic. It is demo-only and must stay separate from real API behavior.
- Keep one web codebase; split demo/production with `VITE_APP_MODE=demo|production`, not duplicate apps.
- User-facing exports must be `.xlsx` workbooks, not browser-generated CSV files.
- Use migration files in `apps/api/migrations/` for persistent schema changes. Do not add ad hoc schema edits or expand boot-time compatibility SQL unless the task explicitly targets boot compatibility.

## Auth, RBAC, And Demo Safety

- Do not remove or rename protected system roles: `viewer`, `ops`, `admin`, `super_admin`, `demo`, `it`, `hc`.
- Add new permissions in both `apps/api/lib/permissions.js` and `apps/web/src/lib/auth/permissions.js`.
- Use `hasPermission(user, Permissions.X)`, `<PrivateRoute requiredPerm={...}>`, and `<Guard permission={...}>`; do not gate access by comparing `user.role` directly.
- Demo users may see guarded actions, but write handlers must block mutation with the existing demo-user pattern. Backend write protection still applies.

## Frontend Landmines

- Follow `DESIGN.md` for visual tokens and `apps/web/docs/design.md` for React/page patterns.
- Keep dark-only behavior. Do not add a light-mode toggle.
- Use Lucide React icons only. `stories.js` keeps the historical `materialIcon` key, but rendered UI must not add Material Symbols imports, icon font spans, or new string-icon APIs.
- Routed private pages use `<PageShell>`, one top-level `<FeatureStoryBanner>`, then `<PageHeader>`. Nested tabs or subviews must not add another shell or banner.
- Use WIB helpers from `apps/web/src/lib/date.js` for user-facing operational dates and times. Do not use raw `toLocaleString()` in app UI.
