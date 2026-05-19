# Data Synchronization

## Overview

The system fetches real-time operational data from external APIs, caches it in memory, optionally persists to the database, and serves it to authenticated and unauthenticated (live) endpoints.

## Architecture

```
External APIs
  ├── EOD API (DATA_EOD_API_URL/branches/{id}/eod)
  ├── Employee API (DATA_EMPLOYEE_API_URL/branches/{id}/employees)
  └── Sync Audit API (DATA_EOD_API_URL/branches/{id}/sync-aud)

dataClient.js (fetchWithRetry)
  ├── Sequential per-branch iteration (8 branches)
  ├── Configurable timeout (DATA_API_TIMEOUT_MS)
  ├── Configurable retries (DATA_API_RETRY_ATTEMPTS)
  └── Collects per-branch errors (partial results)

dataGateway/ (caching facade)
  ├── cache.js (in-memory Map with TTL)
  ├── ttl.js (time-of-day adaptive TTL)
  └── meta.js (standardized metadata)

dataPersist.js (when DATA_PERSIST_ENABLED=true)
  └── dataDb.js (raw SQL upserts)

dataScheduler.js (when DATA_SCHEDULER_ENABLED=true)
  └── Periodic: 30s polling loop in WIB timezone

Controller routes
  ├── dataSource.js (DB-first, live-fallback)
  ├── Sequelize models (CRUD operations)
  └── dataGateway (live endpoints)
```

## 8 Branches

Static configuration in `apps/api/services/dataClient.js`:

| ID  | Name         | Code |
| --- | ------------ | ---- |
| 2   | NORTH HUB    | 302  |
| 3   | EAST HUB     | 303  |
| 4   | CENTRAL HUB  | 304  |
| 5   | COASTAL HUB  | 305  |
| 6   | HIGHLAND HUB | 306  |
| 7   | WEST HUB     | 307  |
| 8   | RIVER HUB    | 308  |
| 9   | SOUTH HUB    | 309  |

## Data Client (`dataClient.js`)

Core fetch logic with these behaviors:

- **Sequential branch iteration**: Branches are fetched one at a time (not parallel) for sync audit to avoid upstream duplication/missing data
- **Retry**: `fetchWithRetry(url, options, attempt)` with configurable attempts
- **Timeout**: Per-request timeout from `DATA_API_TIMEOUT_MS`
- **Error isolation**: Per-branch errors are collected and returned as `branchErrors` array; successful branches are still included
- **Business date**: Uses `getEffectiveBusinessDate()` — before 19:30 WIB = yesterday, after = today

## Caching Layer (`dataGateway/`)

### cache.js

In-memory `Map`-based TTL cache with request dedup:

- `get(key, fetcher, ttlMs)` — Returns cached value or calls `fetcher()` and caches result
- Concurrent requests for the same key share one in-flight request (via `inFlight` Map of promises)
- `invalidateAll()` — Clears all caches

### ttl.js — Adaptive EOD TTL

EOD cache TTL varies by time of day (WIB):

| Time Window   | TTL    | Rationale                            |
| ------------- | ------ | ------------------------------------ |
| Before 16:00  | 20 min | Low activity, no need for fresh data |
| 16:00 – 20:00 | 5 min  | EOD window approaching               |
| 20:00 – 23:59 | 90 sec | Peak EOD processing — near real-time |

Sync cache: 30s static TTL. Employee cache: 12h static TTL.

## Scheduler (`dataScheduler.js`)

Polling loop at 30s cadence in WIB timezone. Checks current WIB time against configured schedules:

| Trigger             | Config                                     | Description                                                                                  |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| EOD sync            | `DATA_EOD_POLL_MS`                         | Periodic EOD data fetch                                                                      |
| EOD final sync      | `DATA_EOD_FINAL_SYNC_TIMES`                | Comma-separated WIB times (e.g. "21:00,22:00,23:00")                                         |
| Employee daily sync | `DATA_EMPLOYEE_DAILY_SYNC_HHMM`            | HHMM WIB time for daily employee sync                                                        |
| After-hours check   | `afterhours_config.warning_schedule_times` | Periodic PC detection check; defaults to `23:15`, `23:30`, `23:45`, `00:00` WIB when missing |
| Monthly report      | Configurable day                           | Generate monthly after-hours report                                                          |

All events recorded in `service_heartbeats` table.

## Persistence (`dataPersist.js` + `dataDb.js`)

When `DATA_PERSIST_ENABLED=true`:

1. Fetch from external API via dataClient
2. Parse and transform payloads
3. Upsert into normalized DB tables using raw SQL
4. Tables: `data_branches`, `data_stores`, `data_store_eod_current`, `data_store_eod_history`, `data_employees`, `store_sync_snapshot`, `sync_aud_latest`

## Data Source Resolution (`dataSource.js`)

Intelligent retrieval:

1. If `DATA_USE_DB=true` (default): Query DB tables first
2. If DB unavailable or `DATA_USE_DB=false`: Fall back to live API via dataGateway

## Sync Alerting

`syncAlertService.js` monitors sync freshness:

- Checks stores against stale thresholds
- Creates `SyncAlertState` records for problematic stores
- Can trigger notifications via `notifyService.js`

## Notifications (`notifyService.js`)

Dispatches after-hours alerts via:

- **Telegram**: `sendTelegramMessage(chatId, message)` — uses `TELEGRAM_BOT_TOKEN`
- **WhatsApp**: `sendWhatsAppMessage(to, message)` — uses `WHATSAPP_API_URL` + `WHATSAPP_API_KEY`
- Configurable via `afterhours_config` KV table
