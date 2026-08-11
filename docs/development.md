# Development Guide

A practical guide for humans and AI agents: run the demo, add a page, add a mock endpoint, test, build, deploy, and debug. Everything here is grounded in the actual code and scripts — no invented commands.

---

## 1. Run the demo locally

The app needs two processes: the mock API and the Vite dev server.

```bash
# Terminal 1 — mock API on http://localhost:4000
pnpm dev:mock
#   (runs `node mock-api/server.js`; mock-api has no watch mode in the root script,
#    use `pnpm --dir mock-api dev` = `node --watch server.js` if you want auto-restart)

# Terminal 2 — Vite dev server on http://localhost:5173
VITE_API_URL=http://localhost:4000 pnpm dev
```

- `pnpm dev` runs `pnpm --filter web dev` (Vite). Pointing `VITE_API_URL` at the mock API makes the web client call `http://localhost:4000/api/...` directly (the mock API reflects origins via `cors({ origin: true, credentials: true })`).
- Log in with `demo` / `demo123` — or click the **Demo Account** quick-login button.
- Without `VITE_API_URL`, the client defaults to same-origin `/api` and Vite proxies it to `http://localhost:3000` (`apps/web/vite.config.js`) — that default target is the real stack's port, so always pass `VITE_API_URL=http://localhost:4000` when using the mock API.
- Windows PowerShell: `$env:VITE_API_URL="http://localhost:4000"; pnpm dev`

Docker alternative (the exact default path): `docker compose up -d --build`, then http://localhost:5173.

---

## 2. Add a page

Structure: `apps/web/src/pages/<Name>/index.tsx` + router entry in `apps/web/src/router/index.tsx` (React Router 7, lazy-loaded).

**Step 1 — create the page component** (`src/pages/MyFeature/index.tsx`):

```tsx
import { useEffect, useState } from 'react';
import { getMyFeatureData } from '@/lib/api/myFeature'; // API client (see below)

export default function MyFeature() {
  const [data, setData] = useState([]);
  useEffect(() => {
    getMyFeatureData().then(setData);
  }, []);
  return <div>{/* render */}</div>;
}
```

**Step 2 — register the route** in `src/router/index.tsx`:

```tsx
const MyFeature = lazy(() => import('../pages/MyFeature'));

// inside <Routes>, under the /app PrivateRoute block:
<Route
  path="my-feature"
  element={
    <PrivateRoute requiredPerm={Permissions.MY_FEATURE_VIEW}>
      <MyFeature />
    </PrivateRoute>
  }
/>
```

- Routes under `/app` are permission-gated: add the permission constant to `src/lib/auth/permissions.js` and use it in `PrivateRoute requiredPerm`.
- Public routes (like `/live`) register at the top level of `<Routes>`.
- Legacy routes are declared as redirect pairs in `legacyRedirects` in the router.

**Step 3 — add the API client** (`src/lib/api/myFeature.ts`). Keep axios calls in `src/lib/api/`, never in pages:

```ts
import { apiGet } from './client';
import type { ApiResponse } from './types';

export async function getMyFeatureData(): Promise<MyFeatureItem[]> {
  const res = await apiGet<MyFeatureItem[]>('/my-feature');
  return res.data;
}
```

`client.ts` unwraps the `{ ok, data, meta, error }` envelope, normalizes errors (`code`, `message`), and attaches credentials. Domain modules: `auth.ts`, `eod.ts`, `stores.ts`, `downloadExport.ts` are the existing examples.

**Step 4 — if the page needs a new endpoint**, see section 3.

**Step 5 — verify:** `pnpm --filter web typecheck`, `pnpm --filter web build`, then boot the two processes and open the route; if routing/UI behavior changed, extend `apps/web/e2e/` and run `pnpm test:e2e:demo`.

---

## 3. Add a mock endpoint

Everything lives in one file: `mock-api/server.js` (CommonJS, Express 5). 99 endpoints already exist under `/api/*`.

**Pattern** (copy an existing endpoint):

```js
// 1. Module-level mock state — MOCK_* arrays / generated collections.
const MOCK_MY_FEATURES = [];
for (let i = 0; i < 12; i += 1) {
  MOCK_MY_FEATURES.push({ id: faker.string.uuid(), name: faker.company.name() });
}

// 2. Route + envelope helpers.
app.get('/api/my-feature', (req, res) => {
  const result = paginate(MOCK_MY_FEATURES, req.query); // { data, meta }
  return ok(res, result.data, result.meta);
});
```

Key helpers (all in `mock-api/server.js`):

- `ok(res, data, meta)` — `{ ok: true, data, meta: meta || null, error: null }`
- `fail(res, status, code, message)` — `{ ok: false, data: null, meta: null, error: { code, message } }`
- `paginate(items, query)` — reads `page` / `pageSize` (max 200), returns `{ data, meta: { pagination: { page, pageSize, total }, timezone: 'Asia/Jakarta' } }`
- Faker: `faker.string.uuid()`, `faker.company.name()`, `faker.location.city()`, `faker.person.*`, `faker.date.*`, `faker.lorem.*`; plus local helpers `randomInt(min, max)`, `pickRandom(arr)`, `randomWeighted(weights)`.
- WIB timezone helpers: `toWibDate()`, `toWibIso()`, `nowWib()` (Asia/Jakarta, +07:00).
- XLSX exports: `buildWorkbookPayload(fileName, sheets, summary)` (exceljs) → `{ fileName, contentType, contentBase64 }`.

Follow the existing conventions: `MOCK_*` names for module state, envelope helpers on every route, `paginate()` for list endpoints. Then verify per AGENTS.md §5: boot the mock API and `curl http://localhost:4000/api/my-feature`.

---

## 4. Run tests

**Unit tests** (Vitest, jsdom):

```bash
pnpm --filter web test          # web unit tests (vitest run)
pnpm test                       # all workspace unit tests
```

**E2E demo suite** (Playwright):

```bash
pnpm test:e2e:demo              # `playwright test`
pnpm test:e2e:demo:headed       # headed browser
pnpm test:e2e:demo:ui           # Playwright UI mode
```

What the e2e suite boots (from `playwright.config.ts`):

- **mock-api** on `http://127.0.0.1:4000` — `pnpm dev:mock` (wait: `/api/system/health`).
- **web-demo** on `http://127.0.0.1:5182` — `node scripts/start-web-e2e.mjs`, which runs Vite with `VITE_APP_MODE=demo` and `VITE_API_URL=http://127.0.0.1:4000`.
- **Auth setup**: the `setup` project (`apps/web/e2e/auth.setup.ts`) logs in via API (`demo`/`demo123`), writes the token+user to localStorage, and saves `playwright/.auth/demo-user.json` as `storageState`. The `chromium-desktop` (1440x900) and `chromium-mobile` (390x844) projects consume it — tests start already authenticated.
- Suites: `all-pages.spec.ts` (public + authenticated + legacy-redirect routes), `crud-readonly.spec.ts`, `demo-data.spec.ts` (envelope + read-only assertions), `exports.spec.ts`.

**Full pre-flight** (run before finishing any change): `pnpm check:all` (`lint && typecheck && format:check && test`).

---

## 5. Build

```bash
pnpm --filter web build     # production bundle (vite build) — fast check for web-only changes
pnpm build                  # `pnpm -r build` across the workspace
```

The Docker image build is a multi-stage `node:22-alpine` → `nginx:1.27-alpine` build (`apps/web/Dockerfile`) with BuildKit cache mounts for the pnpm store; build args `VITE_API_URL=/api`, `VITE_APP_MODE=demo`.

---

## 6. Deploy the light demo

One script drives the whole deploy: `scripts/deploy-ops.sh`. Default mode is `demo` (no secrets needed):

```bash
bash scripts/deploy-ops.sh --host <ssh-target> --mode demo
```

Root alias with the usual target: `pnpm deploy:ops` (host `acerblue`, `--mode demo`, `--preserve-remote-env`).

**What `--mode demo` does:**

1. **Local preflight** — checks `git`, `ssh`, `pnpm` exist; verifies the local origin is `https://github.com/trefeon/enterprise-ops-monitor.git`; requires a clean worktree; runs `pnpm check:all` (skip with `--skip-checks`); resolves the target ref (`--ref`, default `master`) and requires the SHA to be on `origin`.
2. **Remote lock** — `mkdir /tmp/eom-deploy-demo.lock` (fails if a deploy is already running).
3. **Remote preflight** — requires `git`, `docker`, `curl`, `node`, `grep` and `docker compose` on the target; verifies remote repo + origin; clean remote worktree; **demo mode skips the `.env` / `DB_PASS` / `JWT_SECRET` checks** (prod mode requires them); validates `docker compose -f docker-compose.yml config -q`.
4. **Checkout** — remote `git checkout --detach <sha>`.
5. **Deploy** — `docker compose -f docker-compose.yml up -d --build --remove-orphans` with `BUILDKIT_COMPRESSION=zstd` + level 3 (fast layer export on slow disks); waits for `eom-web` and `eom-mock-api` to be running/healthy; runs `node scripts/deploy-check.js --demo`.
6. **Rollback** — if the deploy fails, the script re-checks-out the previous SHA and retries.

Also available: `pnpm deploy` / `pnpm deploy:demo` (`node scripts/deploy.js` — docker compose up, demo default) and `pnpm deploy:prod` (reference full stack via `docker-compose.full.yml` — not for the demo).

---

## 7. Debug

- **Container logs:** `pnpm logs` (`docker compose logs -f`) — or `docker compose logs <service>` / `docker logs <container>`.
- **Deployment validator:** `pnpm check:deploy` (`node scripts/deploy-check.js`) — 6 checks: containers (`eom-mock-api`, `eom-web` in demo mode), database (skipped in demo), web app on :5173, production API on :3000 (skipped in demo), mock API on :4000 (serving synthetic store codes), log anomaly scan. Pass/fail summary with exit code.
- **Quick API smoke:** `curl http://localhost:4000/api/system/health` and `curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo123"}'`.
- **Ports map (demo):** web 5173, mock API host 4000 (container 3000), e2e web 5182.
- **Standalone mock-api install** (it is not a workspace package): `pnpm --dir mock-api --ignore-workspace install`.
- **Windows note:** run `bash`-based scripts (deploy:ops) in Git Bash / WSL; Playwright's `start-web-e2e.mjs` already handles Windows (`pnpm.cmd`).

See `docs/architecture.md` for the full runtime diagram and `docs/research.md` for the build-speed and security history behind these choices.