# Enterprise Operations Monitor — AGENTS.md

> This file is the canonical project guide for AI coding agents.
> It is read natively by **Codex, Copilot, Cursor, Windsurf, Amp, Devin**, and others.
> **Claude Code** reads `CLAUDE.md` (a thin wrapper that references this file).
> **Gemini CLI** can be configured to read this file (see compatibility notes below).

Real-time dashboard for retail EOD processes, store sync health, backups, agents, office machine monitoring, and RBAC across 8 branch hubs.

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
apps/web/          React 19 + Vite 7 + TailwindCSS 3 + shadcn/ui SPA (port 5173)
mock-api/          Standalone Express mock server (port 4000, no DB)
docs/              All documentation
nginx/             Security headers config
agent_updates/     Agent version tracking
backups/           Runtime backup files
```

## Key Conventions

- **API**: CommonJS (`require`/`module.exports`), Express 5, Sequelize 6 ORMs
- **Web**: ES Modules (`import`/`export`), hybrid TSX/JSX — new shared components in `.tsx`, legacy UI in `.jsx`
- **Monorepo**: pnpm workspaces (`apps/*`)
- **Auth**: JWT in `Authorization: Bearer <token>` header
- **API Response Envelope**: `{ ok: boolean, data: any, meta: object|null, error: object|null }` — already unwrapped by Axios interceptor
- **Time**: All timestamps are WIB (Asia/Jakarta, UTC+7) — use `lib/date.js` helpers, never raw `toLocaleString()`
- **Env validation**: Zod schema in `apps/api/config/env.js`, fail-fast on boot
- **Linting**: ESLint + Prettier, run `pnpm format:write` before commits
- **Dark mode**: Forced (root `<div>` has `dark` class), no light toggle

## Architecture Pointers

- Read `docs/architecture.md` for full system design
- Read `docs/database.md` for all 16 Sequelize models
- Read `docs/api_contracts.md` for all 55+ endpoints
- Read `docs/rbac.md` for 30 permissions across 7 roles
- Read `apps/web/docs/design.md` for frontend architecture, component tree, and patterns
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

## Frontend Conventions

### Component Architecture
- **Hybrid TSX/JSX**: New shared components → `components/shared/*.tsx`. Legacy UI → `components/ui/*.jsx`. shadcn primitives → `components/ui/*.tsx`.
- **Page template**: Every page wraps content in `<PageShell>` and starts with `<FeatureStoryBanner story={getFeatureStory('page-id')} />`.
- **Page layout**: `<PageHeader title={...} />` follows the banner, then page-specific content.
- **Imports**: New `.tsx` files use `@/` alias (`@/components/ui/button`). Legacy `.jsx` may use relative `../../`.

### API Calls
- Use `apiGet()`, `apiPost()`, `apiPatch()`, `apiPut()`, `apiDelete()` from `lib/api/client.js`.
- Never import or call `axios` directly — the client wrapper handles token injection, error normalization, and envelope unwrapping.
- Response is already unwrapped: `{ ok, data, meta, error }`.
- Error objects: `{ ok: false, code, message }` — catch with try/catch.

### Auth & Permissions
- **Route protection**: `<PrivateRoute requiredPerm={Permissions.X}>` in `App.jsx`.
- **Permission check**: `hasPermission(user, Permissions.X)` — never compare `user.role` directly.
- **Action button visibility**: `<Guard permission={Permissions.X}>` for conditional render.
- **Demo account**: `<Guard>` shows all buttons; page handlers check `isDemoUser` and block writes with a toast.
- **Auth state**: `useAuth()` hook provides `{ user, loading, login, logout, api }`.

### UI Patterns
- **Icons**: In-page use `lucide-react` (`RefreshCw`, `AlertTriangle`, etc.). Legacy code uses Material Symbols (`<span class="material-symbols-outlined">icon_name</span>`).
- **StatCards**: `shared/StatCard.tsx` for new pages (takes `ReactNode` icon). Legacy `ui/StatCard.jsx` takes Material Symbol string.
- **Tables**: Prefer shadcn `<Table>` from `@/components/ui/table`. Legacy pages use `DataTable.jsx`.
- **Empty state**: Use `<EmptyState>` when data is null/empty after loading.
- **Loading**: Use `<Skeleton>` from shadcn for new pages, `<ProgressBar>` for legacy.

### Data Fetching Pattern
- Pages manage state locally with `useState` + `useCallback` (no global state manager).
- Fetch in `useEffect` with cleanup via `useRef` or `active` flag.
- Auto-refresh pages use `setInterval` inside `useEffect`, cleanup in return.
- Demo user checks: `const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo')`.

### Time & Dates
- **All times are WIB** (Asia/Jakarta, UTC+7).
- Import from `lib/date.js`: `formatDate()`, `formatTime()`, `formatDateTime()`, `getWibToday()`.
- Never use `new Date().toLocaleString()` — it respects the browser locale, not WIB.
- EOD window check: `isWithinEodWindowNow()` (returns true after 19:30 WIB).

### Project Context (Portfolio Stories)
- Every feature has a story in `data/stories.js` with `{ id, tagline, problem, solution, impact, metrics, techHighlight }`.
- The `<FeatureStoryBanner>` displays Problem/Solution/Impact on the page.
- The `/about` page renders the full catalog of all 16 feature stories.

### Design Tokens
- CSS variables in `index.css`: `--radius: 14px`, `--section-gap: 24px`, `--success`, `--warning`, `--info`, etc.
- Semantic colors exposed as Tailwind: `text-status-success`, `border-status-info/30`, `bg-status-error/10`.
- Spacing: `page-container` (max-width), `section-title`, `surface-card`.
