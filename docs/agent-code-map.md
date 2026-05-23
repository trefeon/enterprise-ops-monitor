# Agent Code Map

Use this map before changing code. It records current repo shape so agents do not follow stale reconstruction notes.

## Current State

- Root workspace uses `pnpm` with `apps/*` and `packages/*`.
- API is already split into `apps/api/app.js` for Express configuration and `apps/api/index.js` for listen/startup work. `apps/api/server.js` is only a compatibility export.
- Web entry should use `apps/web/src/main.tsx`; page implementations live in `index.tsx`.
- React routes are defined in `apps/web/src/router/index.tsx` and must keep existing public paths.
- Web deploy mode is selected with `VITE_APP_MODE=demo|production`; demo uses `mock-api`, production uses the real API/Postgres.
- Shared web UI lives under `apps/web/src/components/shared`. shadcn primitives stay under `apps/web/src/components/ui`.
- API routes use Express/CommonJS, Zod validation middleware, RBAC middleware, controller handlers, and the `{ ok, data, meta, error }` envelope.

## Ownership

- Web page behavior: `apps/web/src/pages/*/index.tsx`.
- Web shell/navigation: `apps/web/src/components/layout`.
- Web auth gates: `apps/web/src/components/PrivateRoute.tsx` and `apps/web/src/components/auth/Guard.tsx`.
- Web API client: `apps/web/src/lib/api/client.js`; pages should not import Axios directly.
- API route contracts: `apps/api/routes`.
- API request handling: `apps/api/controllers`.
- API domain behavior: `apps/api/services`.
- API response helpers: `apps/api/utils/response.js`.

## Verification

- Web focused checks: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`.
- API focused checks: `pnpm --filter api lint`, `pnpm --filter api test`.
- Final gate: `pnpm check:all`.
- DB-backed API smoke tests skip when `DATABASE_URL` or `DB_NAME+DB_USER+DB_PASS` is absent.
