# Agent Continuation Plan: Stores 500, Backups UI, API Cache

## User request

Fix these production issues:

1. `GET /api/sync/stores?page=1&pageSize=50&sort=ageDesc&excludeBazar=1&status=problem` returns `500 Internal Server Error`.
2. Backups Management table headers (`File Name`, `Size`, `Date Created`, `Actions`) are misaligned with their cell contents.
3. Backups Management is missing the `Backup Schedule` card showing:
   - Active
   - Schedule: Daily 00:05 WIB
   - TZ: Asia/Jakarta
   - Latest Backup timestamp + filename
   - Scheduler ready
   - Total snapshots count
4. Add safe API caching / page-load optimization if possible.

## Project constraints

- Use `pnpm`, not npm/yarn.
- API is CommonJS, Express 5, Sequelize 6.
- Web is React 19 + Vite + Tailwind/shadcn.
- API response envelope must stay `{ ok, data, meta, error }`.
- Time display must use `apps/web/src/lib/date.js` helpers, WIB timezone.
- Run checks before claiming completion. Preferred final check is `pnpm check:all`, but targeted checks are acceptable if time/usage is limited.

## Investigation notes

### Stores 500

Relevant files:

- `apps/api/routes/syncRoutes.js`
- `apps/api/controllers/syncController.js`
- `apps/api/services/syncSnapshotService.js`
- `apps/api/tests/unit/sync_query_optimization.test.js`
- `apps/api/tests/sync.smoke.test.js`

Current flow:

- `/api/sync/stores` calls `getSyncStores`.
- In non-test baseline mode it calls `getSyncStoresOptimized`.
- Optimized path queries `store_sync_snapshot` directly.
- If the optimized table exists but query fails, current code forwards error to Express, producing 500.

Likely production root causes to verify:

- `store_sync_snapshot` table or column missing in prod after deploy/migration drift.
- Optimized SQL filters `nama_toko NOT ILIKE ...` can exclude rows with NULL names because `NULL NOT ILIKE` is NULL, not true.
- Optimized path has no fallback if DB query throws. Legacy path can build from cached snapshot and should be used as safe fallback.

Fix direction:

- Add a guarded optimized query fallback: on known DB relation/column errors (`42P01`, `42703`, missing relation/column text), log warning and call `getSyncStoresLegacy` instead of returning 500.
- Consider making `excludeBazar` NULL-safe: `(nama_toko IS NULL OR (nama_toko NOT ILIKE ...))`.
- Add/update unit test simulating optimized metadata query failure and asserting legacy path is used / no thrown error.

### Backups UI

Relevant files:

- `apps/web/src/pages/Backups/index.jsx`
- `apps/web/src/components/shared/DataTable.tsx`

Findings:

- Backups page currently renders only one card in the summary grid: `Storage Usage`.
- API summary already returns `schedule: { enabled, cron, tz }`, `latestBackupAt`, `latestFileName`, `count`.
- `DataTable` puts header text inside `<div className="flex items-center font-semibold">`, so column `text-right` / `text-center` classes on `<TableHead>` do not affect inner flex alignment.

Fix direction:

- Add an alignment helper in `DataTable.tsx` that maps column className:
  - contains `text-right` -> `justify-end text-right`
  - contains `text-center` -> `justify-center text-center`
  - default -> `justify-start text-left`
- Re-add a `Backup Schedule` card beside `Storage Usage` using existing `Clock`, `CheckCircle2`, `PauseCircle`, `HelpCircle` imports.
- Display schedule from `summary.schedule`; default cron text should be readable as `Daily 00:05 WIB` for `05 00 * * *`.
- Display latest backup date and filename using `formatDateTime(summary?.latestBackupAt)` and `summary?.latestFileName`.
- Display `Scheduler ready` when schedule enabled, otherwise `Scheduler paused/unavailable`.
- Display `Total snapshots {summary?.count ?? files.length}`.

### API caching / page load optimization

Safe low-risk options:

- Add short client-side TTL dedupe to `apps/web/src/lib/api/client.js` only for GET requests if no auth mutation is involved.
- Or add server `Cache-Control: private, max-age=15, stale-while-revalidate=30` for read-only summary/list endpoints.
- Prefer server-side targeted cache headers for low-risk endpoints: `/backups/summary`, `/backups/files`, `/sync/summary`, `/sync/status`, `/sync/stores`.
- Do not cache mutation endpoints or user-specific sensitive responses publicly.

Potential implementation:

- Create `apps/api/middleware/cacheHeaders.js` with `setPrivateCache(seconds, staleSeconds)` middleware.
- Apply to read-only routes after auth/permission and before controller.
- Use `private` not `public` because responses are auth-scoped.

## Verification checklist

Run after edits:

```bash
pnpm --filter api test -- tests/unit/sync_query_optimization.test.js
pnpm --filter api test -- tests/sync.smoke.test.js
pnpm --filter web typecheck
pnpm --filter web build
pnpm check:all
```

If full check is too slow, report exactly which targeted commands passed/failed and why full check was not run.

## Completion status

This plan was created before code changes so another agent can continue if context/usage runs out.
