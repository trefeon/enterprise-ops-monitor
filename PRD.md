# Phase 1 — Product Requirements Document: Branch Ops Compliance

**Status:** GATE 1 — Awaiting approval
**Based on:** RESEARCH.md (Phase 0) + Kurnia's decisions 2026-07-07

---

## 1. Product Positioning

### Positioning Statement

**Branch Ops Compliance** is a multi-tenant SaaS platform that monitors end-of-day compliance, sync health, backup status, and branch operations across distributed retail and F&B networks. It turns scattered nightly check-ins into a single live dashboard.

### Go-to-Market Hook

> "Stop chasing WhatsApp check-ins. Know which branches synced — and which ones didn't — before tomorrow morning."

Lead with **EOD sync failures** as the wedge. That's the acute pain for Indonesian franchise/multi-branch operators — branch managers sending WhatsApp photos of a terminal screen, ops teams compiling Google Sheets at midnight. Once they're in, the product reveals backup health, system monitoring, agent updates, and Live Menu Display as natural extensions.

### Why Not "Franchise Ops Platform"

Too broad. That label triggers ERP expectations and scares off the single 3-branch F&B owner who just wants to stop chasing WhatsApp check-ins.

### Why Not "Tools-Only"

The competitive moat identified in Phase 0 (17 competitors, none bundling EOD + sync + backup + signage) is the entire product case. Splitting it destroys the differentiator.

---

## 2. Tenant Model

| Concept | Definition |
|---------|-----------|
| **Organization** | A tenant. One franchise/retail-chain owner. Has its own isolated workspace, users, branches, and data. 1 Org = 1 customer account. |
| **Branch** | A physical location owned by an Org. Formerly "hub/store" in EOM. An Org has 1-N branches. |
| **User** | Belongs to an Org. Has org-level role (owner/admin/member) + branch-scoped permissions (existing RBAC v2 pattern extended). |
| **Org Owner** | The person who signs up. Can: manage billing, invite users, set org-wide settings, delete org. |
| **Org Admin** | Can manage users, branches, and most settings within the org. Cannot delete org or change billing. |
| **Org Member** | Branch-scoped operational access only. |

**Isolation boundary:** The PostgreSQL `tenants` table plus RLS on every domain table. No cross-org data reachable from any endpoint.

---

## 3. Feature Inventory — v1 Scope

### Generalization Map (Existing → SaaS)

| Existing Feature | SaaS Name | v1 Ship? | Changes for Multi-Tenant |
|---|---|---|---|
| Dashboard | Org Dashboard | ✅ v1 | KPI cards + alerts scoped to active org's branches |
| Store Sync | Branch Sync Health | ✅ v1 | Branch-scoped (per org), dynamic branch list |
| EOD Monitor | EOD Compliance Tracker | ✅ v1 | Branch-scoped, per-org EOD deadlines |
| Store Directory | Branch & Store Directory | ✅ v1 | Org-scoped, dynamic branch list |
| Employee Directory | Employee Directory | ✅ v1 | Org-scoped, dynamic branch list |
| Backups | Backup Health Monitor | ✅ v1 | Per-org backup logs, retention, restore |
| System Health | System Health | ✅ v1 | Per-org service status, log viewer |
| Agent Updater | Agent Updater | ✅ v1 | Per-org agent fleet management |
| Office Agent Monitor | Office Agent Monitor | ✅ v1 | Per-org office machine health |
| Accounts | User Management | ✅ v1 | Org-scoped user CRUD, invites |
| Roles | Role Manager | ✅ v1 | Org-scoped roles + permission overrides (extend existing RBAC) |
| After Hours | After-Hours Monitor | ✅ v1 | Per-org violation tracking, Telegram warnings |
| — | **Live Menu Display** | ✅ **v1 (new)** | Paid add-on per screen |
| — | **Onboarding / Signup** | ✅ **v1 (new)** | Org creation, Google OAuth + email/password, first-user flow |
| — | **Org Switcher** | ✅ **v1 (new)** | Multi-org account management |
| — | **Billing / Subscriptions** | ✅ **v1 (new)** | Midtrans integration, pricing page, payment portal |

### What's Cut for v1

| Feature | Why Cut |
|---------|---------|
| Full calendar scheduling for Live Menu Display | v2 — v1 ships simple day-parting only |
| Advanced analytics / ML on EOD trends | v2 — v1 ships static trend charts only |
| Public API for third-party integrations | v2 — v1 ships internal APIs only |
| White-label / custom domain per tenant | Post-v1 (Platinum tier) |
| Role-Based sub-account billing | v2 — v1 bills org owner only |

---

## 4. Live Menu Display — Spec

### 4.1 Content Model

```
Screen (belongs to a Branch)
  └── belongs_to_many Playlist(s)
        └── has_many PlaylistItems (ordered)
              └── each has one MediaAsset (image or video)
```

| Entity | Fields | Notes |
|--------|--------|-------|
| **Screen** | id, org_id, branch_id, name, token, is_active, created_at | Token = unique UUID generated at screen creation. Sent to /display/:token for kiosk mode. |
| **Playlist** | id, org_id, branch_id, name, is_active, daypart_config (JSON) | daypart_config: [{days, timeStart, timeEnd}] for simple time-window targeting |
| **PlaylistItem** | id, playlist_id, media_asset_id, sort_order, duration_sec | duration_sec only meaningful for images; video uses natural length |
| **MediaAsset** | id, org_id, uploaded_by_user_id, filename, original_name, mime_type, file_size_bytes, storage_path, thumb_path, duration_sec (video), created_at | |

### 4.2 File Constraints

| Type | Max Size | Allowed Formats |
|------|----------|----------------|
| Image | 10 MB | jpg, png, webp |
| Video | 200 MB | mp4, webm |
| Max upload per asset | 200 MB | — |

### 4.3 Storage

**v1: Local disk volume.** Simplest for demo and early scale. Mounted Docker volume at `/data/media/`.
**Upgrade path:** Swap to S3-compatible (MinIO / Wasabi) when real video assets push past local disk limits. Storage layer should be abstracted behind a service from day one — the local disk impl just swaps.

### 4.4 Display Client

- **Route:** `/display/:screenToken` — no auth, no dashboard chrome, no login UI
- **Renders:** Fullscreen rotating carousel of the screen's current playlist
- **Playback behavior:** Images display for `duration_sec`. Videos play to natural end. Loop repeats playlist.
- **Refresh:** Poll playlist endpoint every 60s for updates. A manager changing a menu slide waits max 60s to see it.
- **Error resilience:** If one asset fails to load (404, timeout, corrupt), skip it silently and continue the loop. Log the failure server-side. Never crash or blank the screen on a single bad asset.
- **Tech note:** Must survive weeks of uptime on an Android TV box / Chromecast / browser kiosk. Memory leak prevention on video elements is a real concern — implement `<video>` element pooling or `src` swapping with explicit cleanup.

### 4.5 Screen Pairing

1. Org admin creates a Screen in the dashboard → system generates UUID token + pairing URL
2. Dashboard shows the pairing URL and a QR code
3. Admin opens the QR code on the TV device (any browser) → device now displays that screen's playlist
4. The device has NO access to anything except its own playlist — no org name, no other branches, no admin functionality

### 4.6 Day-Parting (v1-lite)

Simple JSON config on each Playlist:
```json
{
  "enabled": true,
  "windows": [
    { "days": ["mon","tue","wed","thu","fri"], "timeStart": "06:00", "timeEnd": "11:00" },
    { "days": ["mon","tue","wed","thu","fri"], "timeStart": "11:00", "timeEnd": "17:00" }
  ]
}
```

At v1, the display client evaluates this client-side. v2 moves it to server-side scheduling.

### 4.7 Pricing Decision

| Item | Price | Notes |
|------|-------|-------|
| Base subscription | Rp49-99rb/branch/month | Tiered by branch count |
| Live Menu Display | **Rp30rb/screen/month** | Paid add-on. First screen free per org. |
| Pricing story | "5-15x cheaper than Zenput/Jolt" | USD competitors at $40-100/loc/mo (Rp640K-1.6M) |

First-screen-free removes the friction barrier — a 3-branch F&B owner can try the signage feature on their main TV at zero extra cost. If they like it and add a second screen, that's incremental revenue. This also creates a potential standalone upsell channel: F&B chains who don't need EOD monitoring but want cheap digital signage.

---

## 5. Pricing Tiers (Draft — Non-Binding)

| Tier | Branch Limit | Price | Live Menu | Target |
|------|-------------|-------|-----------|--------|
| **Starter** | ≤5 branches | Rp49rb/branch/mo | N/A | Single-location / micro-chain |
| **Growth** | ≤20 branches | Rp79rb/branch/mo | First screen free, +Rp30rb/screen/mo | Small franchise |
| **Scale** | ≤100 branches | Rp69rb/branch/mo | First screen free, +Rp25rb/screen/mo | Mid-size chain |
| **Enterprise** | Unlimited | Custom | Negotiated | Large franchise / corporate |

**Notes:**
- All tiers include the full feature set (EOD, sync, backups, agents, after-hours, RBAC, Live Menu Display add-on).
- Differentiation is purely branch count gating — not feature gating.
- Scale tier discounts the per-branch rate to incentivize 20+ branch commitments.
- Enterprise: custom quote, dedicated support, SLA.
- Pricing in IDR. Midtrans handles billing (from Phase 0 research).

---

## 6. Constraint Re-Evaluation

The 4 legacy constraints from the original EOM portfolio demo, re-evaluated for SaaS:

| # | Constraint | Status | Reasoning |
|---|-----------|--------|-----------|
| 1 | **Never upgrade package versions** | ✅ **DROPPED** | Cannot ship a real SaaS on stale packages. Security patches, bug fixes, and dependency compatibility for Passport/Sequelize/Express require version bumps. Will upgrade with care (minor+patch only where possible). |
| 2 | **Preserve mock API** | ❌ **DROPPED — confirmed** | A real SaaS needs a real data pipeline. Mock API is a portfolio crutch. The internal API must become the source of truth. |
| 3 | **Never rename existing public API endpoints** | ⚠️ **PRESERVED (with exceptions)** | Existing endpoints under `/api/` will be preserved as-is for internal consistency, but will gain tenant scoping. New SaaS-only endpoints (auth, org, billing, Live Menu Display) follow `/api/` but with org-aware routing. If an existing endpoint name structurally conflicts with multi-tenant routing, we'll rename with deprecation notice in the diff. |
| 4 | **CommonJS backend** | ⚠️ **PRESERVED for v1** | Keep `require()` for v1 to minimize refactor risk. Migrate to ESM only if a v1 dependency forces it. This is a low-priority tech debt item. |
| 5 | **Forced dark mode** | 🟡 **PRESERVED for v1** | Keep forced dark mode for v1. Making it configurable is a trivial CSS variable toggle (no architectural complexity), but it's not blocking v1. Revisit when there's a user request. |

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | Dashboard loads <2s. EOD page refreshes every 30s. Display client polls every 60s. |
| **Security** | RLS on all tenant tables. Passport JWT with 24h expiry. Rate limiting on auth endpoints. No cross-tenant data leak (tested explicitly in Phase 4). |
| **Backup** | Per-org backup logs continue working. Org deletion must cascade or be reversible. |
| **Localization** | Indonesian language UI for v1. English fallback. Time zones: WIB default. |
| **Browser support** | Modern browsers (Chrome, Firefox, Edge, Safari last 2 major versions). Display client: any browser-based kiosk (including Android TV Chrome). |
| **Deployment** | Docker Compose + Nginx (existing), add secrets for OAuth + Midtrans + SMTP. |

---

## 8. Demo Data Plan

| Org | Branches | Employees/Org | EOD History | Sync History | Backup History | Live Menu Display |
|-----|----------|---------------|-------------|--------------|----------------|-------------------|
| **Org A: "Warung Kita"** (small F&B chain) | 3 branches (Bandung, Jakarta, Surabaya) | 15 employees | 90 days backfill | 90 days backfill | 90 days backfill | ✅ **Fully populated** — 2 screens (dining room + drive-thru), 2 playlists each, 5-8 slides mixing image + short video per playlist |
| **Org B: "Toko Makmur"** (mid-size retail) | 8 branches (reuse current dummy scale) | 40 employees | 90 days backfill | 90 days backfill | 90 days backfill | ❌ No Live Menu (retail tenant — validates paid-addon gating) |
| **Org C: "SuperStore Indonesia"** (large chain) | 15 branches across Java | 75 employees | 90 days backfill | 90 days backfill | 90 days backfill | ❌ No Live Menu |

**Backfill detail:** 90 days of realistic but random EOD completion (70-95% on-time, 5-30% late, escalations), sync logs with occasional failures, backup logs with daily snapshots. Trend charts need variance, not flat perfect data.

**Media for Org A's Live Menu:** Use royalty-free sample images (Unsplash) and short stock video clips (Mixkit/Pexels) styled as F&B menu items. Never anything that looks like a real restaurant's actual branding.

---

## 9. Tech Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Multi-tenancy pattern** | Shared schema + tenant_id + RLS | Phase 0 research: Sequelize-compatible, days to ship, RLS-safe |
| **Auth** | Passport.js + Sequelize | Phase 0 research: boring, proven, no adapter risk mid-refactor. Better Auth reconsider post-v1 |
| **Mock API** | Dropped | Confirmed. Real data pipeline required for SaaS |
| **Billing** | Midtrans primary, Xendit at scale | Phase 0 research: fastest onboarding, lowest cost (Rp36K/mo for 10 branches vs Xendit Rp82-107K) |
| **Media storage** | Local disk v1 → S3 later | Phase 0 research path |
| **Backend** | CommonJS (keep) | Minimize refactor risk. ESM = low-priority tech debt |
| **Frontend** | Tailwind + shadcn/ui + framer-motion | Keep existing stack |
| **Database** | PostgreSQL 15 + Sequelize 6 | Keep existing |
| **Dark mode** | Keep forced for v1 | Trivial config toggle, not blocking |

---

## 10. Open Items (Require Kurnia Input)

| # | Item | Suggestion |
|---|------|-----------|
| 1 | **SMTP provider for invite emails** | Resend (free tier: 100/day) vs SendGrid vs SES. Resend cheapest for low volume. |
| 2 | **Google OAuth credentials** | Need a GCP project + OAuth client ID/secret. Do you have one, or need me to set it up? |
| 3 | **Midtrans account** | Need merchant ID + server key. Existing account or create new? |
| 4 | **Landing page domain** | Existing eom-demo domain or new one for the SaaS? |
| 5 | **Org slug strategy** | Assign randomly (uuid prefix) vs user-chosen (e.g. "warung-kita") vs auto-generated from store-first-created? |
| 6 | **Demo media assets** | I'll source royalty-free food images + short video loops. Any specific cuisine theme for Org A? |

---

## GATE 1 — STOP

**PRD.md written.** Awaiting explicit "go" before proceeding to Phase 2 (Architecture Redesign).
