# Testing Guide

## Overview

The project uses two separate test runners:

| App | Runner | Config |
|-----|--------|--------|
| API (`apps/api`) | Node Test Runner (`node --test`) | `apps/api/package.json` — `"test": "node --test"` |
| Web (`apps/web`) | Vitest 4 | `apps/web/vite.config.js` — Vitest config |

## Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter api test

# Web tests only
pnpm --filter web test

# Full check (lint + typecheck + format + test)
pnpm check:all
```

## API Tests (`apps/api/tests/`)

Node `node:test` + `supertest` for HTTP assertions.

### Smoke Tests

| File | Description |
|------|-------------|
| `auth.smoke.test.js` | Auth endpoints — login, me, change-password |
| `meta.smoke.test.js` | Metadata endpoint |
| `sync.smoke.test.js` | Sync endpoints |
| `time.test.js` | Time utility tests |

### Unit Tests

| File | Description |
|------|-------------|
| `unit/validators.test.js` | Zod password schema validation |
| `unit/afterhours_service.test.js` | After-hours detection logic |
| `unit/afterhours_window.test.js` | After-hours time window tests |
| `unit/afterhours_monthly_report.test.js` | Monthly report generation |
| `unit/data_client_retry.test.js` | External API retry logic |
| `unit/dataSyncService_optimization.test.js` | Sync optimization |
| `unit/dashboard_summary.test.js` | Dashboard summary aggregation |
| `unit/notify_service.test.js` | Notification dispatch |
| `unit/rbac_escalation.test.js` | RBAC privilege escalation prevention |
| `unit/store_controller_export.test.js` | Store export functionality |
| `unit/sync_query_optimization.test.js` | Sync query performance |
| `unit/system_controller_export_logs.test.js` | System log export |

### Benchmark

| File | Description |
|------|-------------|
| `benchmark_sync_logic.js` | Sync logic performance benchmark |

### Test Patterns

```js
// Smoke test pattern
const { describe, it } = require("node:test");
const request = require("supertest");
const app = require("../server");

describe("Auth endpoints", () => {
  it("should login with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "password" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.data.token);
  });
});
```

## Web Tests (`apps/web/src/`)

Vitest + @testing-library/react + jsdom.

### Test Files

| File | Description |
|------|-------------|
| `components/PrivateRoute.test.jsx` | Auth guard component (3 cases) |

### Test Patterns

```jsx
// Component test pattern
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivateRoute from "./PrivateRoute";

describe("PrivateRoute", () => {
  it("redirects to /login when unauthenticated", () => {
    // ...
  });
});
```

## Typechecking

```bash
pnpm typecheck
```

- API: No TypeScript (plain JS with JSDoc)
- Web: `tsc --noEmit` — validates `.ts` and `.tsx` files

## Linting & Formatting

```bash
# Lint all
pnpm lint

# Check formatting
pnpm format:check

# Auto-fix formatting
pnpm format:write
```

| Tool | Configuration |
|------|---------------|
| ESLint | `apps/api/eslint.config.js`, `apps/web/eslint.config.js` |
| Prettier | `apps/api/.prettierrc`, `apps/web/.prettierrc.json` |
| lint-staged | Root `package.json` — runs ESLint + Prettier on staged files |

## CI Contract

Before committing or merging:

```bash
pnpm check:all
```

This runs: lint → typecheck → format check → tests. All must pass.
