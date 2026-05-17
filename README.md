# Enterprise Operations Monitor

> Real-time tracking for Store EOD processes, data integrity, and system health across the entire retail network.

---

## 📋 Context

**Enterprise Operations Monitor** is a centralized operations dashboard built for retail networks with multiple branch locations. It provides real-time visibility into End-of-Day (EOD) processes, data synchronization health, system status, and team accountability.

---

## 🚨 The Problem

Managing EOD compliance across 8+ retail branches was a nightly challenge:
- Ops team had to manually check each branch one by one
- Sync failures went undetected until the next morning
- Backup procedures were inconsistent and untracked
- Agent software updates required physical visits to each location
- No audit trail for who changed what or when

---

## ✨ Features

| Feature | Problem → Solution → Impact |
| **Dashboard** | Manual branch checks → Single-pane view with KPIs & trends → 80% fewer check-in calls |
| **EOD Monitor** | Late submissions discovered next morning → Real-time status with deadline enforcement → 95%+ compliance |
| **Store Sync** | Cascading failures from one bad branch → Per-branch error isolation → Zero blind spots |
| **Store Directory** | Outdated spreadsheets → Centralized source of truth → No more version confusion |
| **Employee Directory** | Wrong NIK assignments → Centralized NIK-to-store mapping → Near-zero mapping errors |
| **System Health** | No backend visibility → Live health checks with latency metrics → <2 minute MTTD |
| **Agent Updater** | Manual per-branch updates → Centralized push with heartbeat tracking → 2 hours → 5 minutes |
| **After Hours** | Missed anomalies → Automated monitoring window → Caught 3 data corruption incidents |
| **RBAC** | Shared admin login → 5 roles, 14 permissions, branch scoping → Full audit accountability |

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 3, React Router 7, Axios |
| **Auth & Security** | JWT, bcryptjs, RBAC v2 (5 roles, 14 permissions, branch-level scoping), Helmet, CORS, Rate Limiting |
| **Testing** | Vitest, Supertest, Node Test Runner |
| **Infrastructure** | Docker, Docker Compose, Nginx (reverse proxy + caching) |
| **Demo/Mock** | Express + @faker-js/faker (fully simulated data) |

---

## 🏗️ Project Structure

```
enterprise-ops-monitor/
├── apps/
│   ├── api/                  # Express REST API (port 3000)
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # Sequelize models (Store, EODLog, User, etc.)
│   │   ├── services/         # Business logic (sync, auth, notifications)
│   │   ├── middleware/       # Auth, RBAC, validation, error handling
│   │   ├── routes/           # API route definitions
│   │   ├── migrations/       # Database migrations
│   │   └── utils/            # Helpers (pagination, validators, time utils)
│   └── web/                  # React SPA (port 5173)
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── pages/        # Route pages
│           └── lib/          # API client, auth context
├── mock-api/                 # Standalone mock API for demo (port 4000)
├── docs/                     # Documentation
├── .env.example              # Environment template
├── docker-compose.yml        # Full stack (API + Web + DB + Autoheal)
├── docker-compose.demo.yml   # Demo mode (mock API + Web only)
├── PORTFOLIO.md              # Full storytelling & portfolio narrative
└── README.md                 # You are here
```

---

## 🚀 Running Locally

> **Note:** All commands should be run from the `enterprise-ops-monitor/` directory.

### Option 1: Demo Mode (Mock API — No database required)

```bash
# Terminal 1: Start the mock API
cd mock-api && npm install && npm start

# Terminal 2: Start the frontend pointed at mock API
cd apps/web && npm install && VITE_API_URL=http://localhost:4000 npm run dev
```

Then open **http://localhost:5173** in your browser.

### Option 2: Full Stack (Docker)

```bash
# Copy environment template
cp .env.example .env
# Edit .env with your values (DB_PASS, JWT_SECRET, etc.)

# Start everything
docker compose up -d --build

# Access the web app at http://localhost:5173
# API is at http://localhost:3000
```

### Option 3: Full Stack Demo (Docker, no DB needed)

```bash
docker compose -f docker-compose.demo.yml up -d --build
```

---

## 🔌 API Endpoints

The REST API provides these endpoints (all prefixed with `/api`):

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Dashboard summary with KPIs |
| `GET /api/eod/status` | Per-store EOD status |
| `GET /api/eod/history` | Historical EOD logs |
| `GET /api/stores` | Store directory with branch info |
| `GET /api/employees` | Employee list with NIK-to-store mapping |
| `GET /api/sync/status` | Sync health per store |
| `GET /api/sync/audit` | Sync audit log entries |
| `GET /api/backups` | Backup file list |
| `GET /api/agents` | Agent heartbeat status |
| `GET /api/alerts` | Active alerts |
| `GET /api/system/health` | System health metrics |
| `GET /api/afterhours` | After-hours upload activity |
| `POST /api/sync/trigger` | Trigger manual sync |
| `POST /api/backup/trigger` | Trigger manual backup |
| `POST /api/auth/login` | Authentication |
| `GET /api/users`, `POST /api/users`, etc. | User management |
| `GET /api/roles`, etc. | Role & permission management |

---

## 📖 Full Portfolio Story

See **[PORTFOLIO.md](./PORTFOLIO.md)** for the complete narrative — the problem context, technical challenges, solutions, and impact metrics that make this project stand out.

---

## 📚 Additional Documentation

- [Architecture Overview](docs/architecture.md)
- [Database Schema](docs/database.md)
- [Synchronization Flow](docs/synchronization.md)
- [API Contracts](docs/api_contracts.md)

---

## 🧪 Running Tests

```bash
# API tests
cd apps/api && npm test

# Web tests
cd apps/web && npm test
```

---

## 📄 License

This project is shared for portfolio demonstration purposes. Built with Node.js, React, and PostgreSQL.