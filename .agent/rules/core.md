---
type: always_on
description: Project-wide rules inherited from AGENTS.md
---
# Project Constitution

This project is the Enterprise Operations Monitor — a real-time dashboard for retail EOD processes, store sync health, backups, agents, and RBAC across 8 branch hubs.

## Stack
- API: Express 5 + Sequelize 6 + PostgreSQL 15 (CommonJS)
- Web: React 19 + Vite 7 + TailwindCSS 3 + shadcn/ui (ES Modules)
- Monorepo: pnpm workspaces (`apps/*`)

## Key Rules
- Use `pnpm` only — never `npm` or `yarn`
- API response format: `{ ok, data, meta, error }`
- Timestamps in WIB (Asia/Jakarta, UTC+7)
- Run `pnpm check:all` before completing work (lint → typecheck → format → test)
- All permissions must be added to both `apps/api/lib/permissions.js` AND `apps/web/src/lib/auth/permissions.js`

## Source of Truth
Read `AGENTS.md` (root) for full details. Read `docs/*.md` for deep dives.
