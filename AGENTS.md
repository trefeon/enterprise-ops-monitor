# Enterprise Operations Monitor — AGENTS.md

> This file is the canonical project guide for AI coding agents.
> It is read natively by **Codex, Copilot, Cursor, Windsurf, Amp, Devin**, and others.
> **Claude Code** reads `CLAUDE.md` (a thin wrapper that references this file).
> **Gemini CLI** can be configured to read this file (see compatibility notes below).

Real-time dashboard for retail EOD processes, store sync health, backups, agents, and RBAC across 8 branch hubs.

## Agent Compatibility

| Tool | Setup Required | Native Support |
|------|---------------|:--------------:|
| OpenAI Codex | None | ✅ |
| GitHub Copilot | None | ✅ |
| Cursor | None | ✅ |
| Windsurf | None | ✅ |
| Amp (Sourcegraph) | None | ✅ |
| Devin | None | ✅ |
| Antigravity | Reads `AGENTS.md` (via `.agents/` sync) | ✅ |
| Gemini CLI | Set `fileName: "AGENTS.md"` in `.gemini/settings.json` | ⚙️ Config |
| Claude Code | Reads `CLAUDE.md` (add wrapper file if needed) | ⚠️ Wrapper |

## Quick Commands

| Action | Command (run from repo root) |
|--------|------------------------------|
| Install all | `pnpm install` |
| Dev (web) | `pnpm dev` |
| Dev (API) | `pnpm dev:api` |
| Build web | `pnpm build` |
| Lint all | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Test all | `pnpm test` |
| Full check | `pnpm check:all` |
| Docker up | `pnpm up` / `docker compose up -d` |
| Docker demo | `docker compose -f docker-compose.demo.yml up -d` |

## Monorepo Layout

```
apps/api/          Express 5 + Sequelize 6 REST API (port 3000)
apps/web/          React 19 + Vite 7 + TailwindCSS 3 SPA (port 5173)
mock-api/          Standalone Express mock server (port 4000, no DB)
docs/              All documentation
nginx/             Security headers config
agent_updates/     Agent version tracking
backups/           Runtime backup files
```

## Key Conventions

- **API**: CommonJS (`require`/`module.exports`), Express 5, Sequelize 6 ORMs
- **Web**: ES Modules (`import`/`export`), JSX, shadcn/ui + TailwindCSS
- **Monorepo**: pnpm workspaces (`apps/*`)
- **Auth**: JWT in `Authorization: Bearer <token>` header
- **API Response Envelope**: `{ ok: boolean, data: any, meta: object|null, error: object|null }`
- **Time**: All timestamps are WIB (Asia/Jakarta, UTC+7)
- **Env validation**: Zod schema in `apps/api/config/env.js`, fail-fast on boot
- **Linting**: ESLint + Prettier, run `pnpm format:write` before commits

## Architecture Pointers

- Read `docs/architecture.md` for full system design
- Read `docs/database.md` for all 16 Sequelize models
- Read `docs/api_contracts.md` for all 55+ endpoints
- Read `docs/rbac.md` for 30 permissions across 7 roles
- Read `docs/frontend.md` for component tree and routing
- Read `docs/synchronization.md` for external API data pipeline
- Read `docs/setup.md` for environment variables and deployment
- Read `docs/testing.md` for test patterns

## Important Constraints

- **Do NOT** use `npm` or `yarn` — use `pnpm` only
- **Do NOT** modify `mock-api/` for production logic — it is demo-only
- **Do NOT** remove system roles (`viewer`, `ops`, `admin`, `super_admin`, `demo`, `it`, `hc`) — they are protected
- **Do NOT** add new permissions without also adding them to `apps/api/lib/permissions.js` AND `apps/web/src/lib/auth/permissions.js`
- **Do NOT** change the API response envelope format — all endpoints must return `{ ok, data, meta, error }`
- **Do NOT** use `ALTER TABLE` directly — use migration files in `apps/api/migrations/`
- **Always** specify `language` on fenced code blocks
- **Always** run `pnpm check:all` before considering work complete
