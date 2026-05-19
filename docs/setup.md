# Setup & Deployment Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose (for full stack)

## Quick Start

```bash
# Install all dependencies
pnpm i

# Run demo mode (mock API + web, no DB needed)
# Terminal 1:
pnpm --dir mock-api install
pnpm --dir mock-api start

# Terminal 2:
VITE_API_URL=http://localhost:4000 pnpm dev
```

Open http://localhost:5173.

## Run Modes

### 1. Demo Mode (Mock API — No DB)

Uses `mock-api/` — standalone Express server generates fake data with @faker-js/faker.

```bash
cp .env.example .env
docker compose -f docker-compose.demo.yml up -d --build
```

Mock accounts:

- `demo` / `demo-password` — read-only, 14 view permissions
- `superadmin` / `superadmin-password` — all 30 permissions

### 2. Full Stack (Docker)

```bash
cp .env.example .env
# Edit .env with: DB_PASS, JWT_SECRET, ADMIN_PASSWORD_HASH
docker compose up -d --build
```

Services: API (port 3000), Web (port 5173), PostgreSQL (port 5433), Autoheal.

### 3. Development (Manual)

```bash
pnpm i

# Terminal 1: API
pnpm dev:api    # nodemon on port 3000

# Terminal 2: Web
pnpm dev        # vite on port 5173
```

## Environment Variables

Full reference from `apps/api/config/env.js` (Zod-validated on boot):

### Core

| Variable     | Required | Default     | Description                    |
| ------------ | -------- | ----------- | ------------------------------ |
| `PORT`       | No       | 3000        | API HTTP port                  |
| `NODE_ENV`   | No       | development | dev, test, or production       |
| `JWT_SECRET` | Yes      | —           | JWT signing key (min 16 chars) |

### Database (one of two forms required)

| Variable       | Required    | Default                      |
| -------------- | ----------- | ---------------------------- |
| `DATABASE_URL` | No          | PostgreSQL connection string |
| `DB_HOST`      | Conditional | Database host                |
| `DB_PORT`      | No          | 5432                         |
| `DB_NAME`      | Conditional | Database name                |
| `DB_USER`      | Conditional | Database user                |
| `DB_PASS`      | Conditional | Database password            |

### Auth

| Variable              | Required    | Default                         |
| --------------------- | ----------- | ------------------------------- |
| `ADMIN_USERNAME`      | No          | Bootstrap admin username        |
| `ADMIN_PASSWORD_HASH` | Conditional | bcrypt hash for admin           |
| `CORS_ORIGINS`        | No          | Comma-separated allowed origins |

### Default Users

| Variable                       | Default    |
| ------------------------------ | ---------- |
| `DEFAULT_USERS_ENABLED`        | true       |
| `DEFAULT_USERS_FORCE_PASSWORD` | —          |
| `DEFAULT_VIEWER_USERNAME`      | viewer     |
| `DEFAULT_VIEWER_PASSWORD`      | —          |
| `DEFAULT_ADMIN_USERNAME`       | admin      |
| `DEFAULT_ADMIN_PASSWORD`       | —          |
| `DEFAULT_SUPERADMIN_USERNAME`  | superadmin |
| `DEFAULT_SUPERADMIN_PASSWORD`  | —          |
| `DEFAULT_DEMO_USERNAME`        | demo       |
| `DEFAULT_DEMO_PASSWORD`        | —          |

### Data Sync

| Variable                        | Default | Notes                       |
| ------------------------------- | ------- | --------------------------- |
| `DATA_EOD_API_URL`              | —       | External EOD API URL        |
| `DATA_EMPLOYEE_API_URL`         | —       | External employee API URL   |
| `DATA_API_TIMEOUT_MS`           | —       | Per-request timeout         |
| `DATA_API_RETRY_ATTEMPTS`       | —       | Retry count                 |
| `DATA_PERSIST_ENABLED`          | false   | Persist fetched data to DB  |
| `DATA_USE_DB`                   | —       | DB-first query mode         |
| `DATA_SCHEDULER_ENABLED`        | false   | Periodic sync scheduler     |
| `DATA_EOD_POLL_MS`              | —       | EOD poll interval (ms)      |
| `DATA_EOD_FINAL_SYNC_TIMES`     | —       | Comma-separated WIB times   |
| `DATA_EMPLOYEE_DAILY_SYNC_HHMM` | —       | Daily sync HHMM WIB         |
| `DATA_EMPLOYEE_REFRESH_MS`      | —       | Employee cache refresh (ms) |

### After Hours

| Variable                         | Default | Notes                     |
| -------------------------------- | ------- | ------------------------- |
| `AFTERHOURS_ONLINE_THRESHOLD_MS` | —       | PC still-on threshold     |
| `TELEGRAM_BOT_TOKEN`             | —       | Telegram notification bot |
| `WHATSAPP_API_URL`               | —       | WhatsApp API endpoint     |
| `WHATSAPP_API_KEY`               | —       | WhatsApp API key          |

After-hours warning times are stored in the `afterhours_config` table. On boot, `ensureDb.js` creates missing default rows for `warning_schedule_times`, `first_warning_time`, and `final_warning_time` using the default WIB schedule `23:15`, `23:30`, `23:45`, `00:00`.

### Backups

| Variable      | Default   |
| ------------- | --------- |
| `BACKUP_DIR`  | ./backups |
| `BACKUP_CRON` | —         |

## Docker Commands

```bash
# Start full stack
pnpm up                    # docker compose up -d

# Start demo
docker compose -f docker-compose.demo.yml up -d

# Start production
docker compose -f docker-compose.prod.yml up -d

# Stop
pnpm down                  # docker compose down

# View logs
pnpm logs                  # docker compose logs -f

# Create persistent volume (one-time for production)
docker volume create eom_postgres_data
```

## Useful Scripts

```bash
# Seed RBAC roles
node apps/api/seedRbac.js

# Seed demo data
node apps/api/seed.js

# Randomize demo data (for trade shows)
node apps/api/scripts/randomize-demo-data.js

# Run migrations
node apps/api/migrations/run.js
```

## Troubleshooting

| Problem                         | Solution                                              |
| ------------------------------- | ----------------------------------------------------- |
| `JWT_SECRET` required           | Set in `.env` — min 16 characters                     |
| `DB_PASS` required              | Set database password in `.env`                       |
| Port 3000 in use                | Change `PORT` in `.env`                               |
| Mock API not connecting         | Ensure `VITE_API_URL=http://localhost:4000`           |
| Database connection refused     | Check PostgreSQL is running and `.env` values match   |
| Permission denied in production | Verify user has required role + effective permissions |
