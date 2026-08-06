/**
 * SaaS Demo Data Seeder
 *
 * Seeds 3 demo organizations with 90 days of realistic data:
 *   Org A — "Warung Kita" (F&B, 3 branches, FULL Live Menu Display)
 *   Org B — "Toko Makmur" (retail, 8 branches)
 *   Org C — "SuperStore Indonesia" (large chain, 15 branches)
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:  node seedSaaS.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./models");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ORGS = {
  A: {
    name: "Warung Kita",
    slug: "warung-kita",
    branchCount: 3,
    storeCount: 3,
    employeePerStore: 5,
  },
  B: {
    name: "Toko Makmur",
    slug: "toko-makmur",
    branchCount: 8,
    storeCount: 8,
    employeePerStore: 5,
  },
  C: {
    name: "SuperStore Indonesia",
    slug: "superstore-indonesia",
    branchCount: 15,
    storeCount: 15,
    employeePerStore: 5,
  },
};

const DAYS_BACKFILL = 90;

// Reliability profile per org (on-time completion % range, failure %)
const RELIABILITY = {
  A: { doneMin: 85, doneMax: 95, failRate: 0.05 },
  B: { doneMin: 75, doneMax: 90, failRate: 0.1 },
  C: { doneMin: 70, doneMax: 88, failRate: 0.15 },
};

// Live Menu Display config for Org A
const SCREENS_A = [
  { name: "Dining Room Display", branchIndex: 0 },
  { name: "Drive-Thru Display", branchIndex: 1 },
];

const PLAYLISTS_A = [
  { screenIndex: 0, name: "Menu Board – Food" },
  { screenIndex: 0, name: "Menu Board – Promotions" },
  { screenIndex: 1, name: "Drive-Thru Menu" },
  { screenIndex: 1, name: "Drive-Thru – Deals" },
];

const MEDIA_ITEMS = [
  { file: "menu-item-1.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 10 },
  { file: "menu-item-2.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 10 },
  { file: "menu-item-3.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 10 },
  { file: "promo-banner-1.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 8 },
  { file: "promo-banner-2.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 8 },
  { file: "specials-drinks.mp4", mime: "video/mp4", w: 1920, h: 1080, dur: 15 },
  { file: "daily-special.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 10 },
  { file: "testimonial-loop.mp4", mime: "video/mp4", w: 1920, h: 1080, dur: 20 },
  { file: "signature-dish.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 12 },
  { file: "happy-hour-banner.jpg", mime: "image/jpeg", w: 1920, h: 1080, dur: 8 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BCRYPT_ROUNDS = 6; // fast for demo

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomBool(probability) {
  return Math.random() < probability;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Return a random timestamp between 19:30 and 23:00 WIB for a given date.
 */
function randomWIBEvening(dateStr) {
  const h = randomInt(19, 22);
  const m = h === 22 ? randomInt(0, 59) : randomInt(0, 59);
  const s = randomInt(0, 59);
  // Construct as UTC — WIB is UTC+7
  return `${dateStr}T${String(h - 7).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}Z`;
}

function randomBackupTime(dateStr) {
  const h = randomInt(1, 4);
  const m = randomInt(0, 59);
  const s = randomInt(0, 59);
  return `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}Z`;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

const BRANCH_SUFFIXES = ["Hub", "Plaza", "Mall", "Center", "Outlet", "Point"];
const STORE_AREAS = ["Downtown", "Suburb", "Industrial", "Commercial", "Residential"];

// ---------------------------------------------------------------------------
// Main seeder
// ---------------------------------------------------------------------------
async function seedSaaS() {
  try {
    console.log("=== SaaS Demo Data Seeder ===\n");

    // 1. Sync models (alter to ensure schema)
    await db.sequelize.sync({ alter: true });
    console.log("✓ Database synced\n");

    // 1b. Ensure boot-time schema columns exist (mirrors ensureDb.js)
    // data_stores boot-time columns
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`
    );
    await db.sequelize.query(`ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS address TEXT;`);
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS pic_name VARCHAR(255);`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'sync';`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS manual_created_at TIMESTAMPTZ;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS manual_updated_at TIMESTAMPTZ;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS manual_updated_by INTEGER;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_stores ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;`
    );
    // data_employees boot-time columns
    await db.sequelize.query(
      `ALTER TABLE data_employees ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'sync';`
    );
    await db.sequelize.query(
      `ALTER TABLE data_employees ADD COLUMN IF NOT EXISTS manual_created_at TIMESTAMPTZ;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_employees ADD COLUMN IF NOT EXISTS manual_updated_at TIMESTAMPTZ;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_employees ADD COLUMN IF NOT EXISTS manual_updated_by INTEGER;`
    );
    await db.sequelize.query(
      `ALTER TABLE data_employees ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;`
    );
    // Sequelize model tables — add org_id where missing (migration ran before tables existed)
    for (const tbl of [
      '"Stores"',
      '"EODLogs"',
      '"BackupLogs"',
      '"SystemLogs"',
      '"Employees"',
      '"SyncLogs"',
      '"SyncSummaries"',
      '"SyncAlertStates"',
    ]) {
      await db.sequelize.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS org_id UUID;`);
    }
    // RBAC tables use lowercased names
    for (const tbl of ["roles", "role_permissions", "user_roles"]) {
      await db.sequelize.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS org_id UUID;`);
    }

    const counts = {
      tenants: 0,
      branches: 0,
      stores: 0,
      employees: 0,
      eodCurrent: 0,
      eodHistory: 0,
      syncSnapshot: 0,
      eodLogs: 0,
      syncLogs: 0,
      backupLogs: 0,
      systemLogs: 0,
      users: 0,
      roles: 0,
      rolePerms: 0,
      userRoles: 0,
      screens: 0,
      playlists: 0,
      media: 0,
      playlistItems: 0,
      screenPlaylists: 0,
    };

    for (const [orgKey, org] of Object.entries(ORGS)) {
      // ---- Check idempotency ----
      const [existing] = await db.sequelize.query(
        `SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 1;`,
        { bind: [org.slug] }
      );

      let tenantId;
      let isNew = false;

      if (existing && existing.length > 0) {
        tenantId = existing[0].id;
        console.log(`○ Org "${org.name}" (${org.slug}) already exists — id=${tenantId}`);
      } else {
        // 2a. Create tenant
        const [created] = await db.sequelize.query(
          `INSERT INTO tenants (id, name, slug, settings_json, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, '{}'::jsonb, NOW(), NOW())
           RETURNING id;`,
          { bind: [org.name, org.slug] }
        );
        tenantId = created[0].id;
        isNew = true;
        counts.tenants++;
        console.log(`✓ Created org "${org.name}" (${org.slug}) — id=${tenantId}`);
      }

      if (!isNew) {
        console.log(`  → Skipping data for existing org "${org.name}"\n`);
        continue;
      }

      // ==================================================================
      // 2b. Create Branches (data_branches)
      // ==================================================================
      const branchStartId = orgKey === "A" ? 100 : orgKey === "B" ? 200 : 300;
      const branchNames = [];
      const branchIds = [];

      for (let i = 0; i < org.branchCount; i++) {
        const bid = branchStartId + i;
        const bname =
          orgKey === "A"
            ? pick([
                "Bandung",
                "Jakarta",
                "Surabaya",
                "Yogyakarta",
                "Semarang",
                "Medan",
                "Makassar",
                "Denpasar",
                "Palembang",
                "Balikpapan",
                "Manado",
                "Padang",
                "Pontianak",
                "Banjarmasin",
                "Pekanbaru",
              ])
            : `${org.name.split(" ")[0]} ${pick(BRANCH_SUFFIXES)} ${i + 1}`;
        const src = String(100 + bid);
        branchNames.push(bname);

        await db.sequelize.query(
          `INSERT INTO data_branches (branch_id, branch_name, source_code, is_active, org_id, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, $4, NOW(), NOW())
           ON CONFLICT (branch_id) DO NOTHING;`,
          { bind: [bid, bname, src, tenantId] }
        );
        branchIds.push(bid);
        counts.branches++;
      }
      console.log(`  ✓ ${org.branchCount} branches created`);

      // ==================================================================
      // 2c. Create Stores (data_stores)
      // ==================================================================
      const storeStartCode = orgKey === "A" ? 100100 : orgKey === "B" ? 200200 : 300300;
      const storeCodes = [];

      for (let i = 0; i < org.storeCount; i++) {
        const sc = storeStartCode + i;
        const bi = branchIds[i % branchIds.length];
        const sname = `${branchNames[i % branchNames.length]} Store ${sc}`;
        const area = pick(STORE_AREAS);
        const regional = orgKey === "A" ? "Jabodetabek" : orgKey === "B" ? "Sumatra" : "Java";

        await db.sequelize.query(
          `INSERT INTO data_stores (store_code, store_name, branch_id, area, regional, is_active, last_seen_at, last_sync, org_id)
           VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW(), $6)
           ON CONFLICT (store_code) DO NOTHING;`,
          { bind: [sc, sname, bi, area, regional, tenantId] }
        );
        storeCodes.push(sc);
        counts.stores++;
      }
      console.log(`  ✓ ${org.storeCount} stores created`);

      // Also insert into the Sequelize Stores table (for the dashboard monitor)
      for (const sc of storeCodes) {
        const idx = storeCodes.indexOf(sc);
        const sname = `${branchNames[idx % branchNames.length]} Store ${sc}`;
        await db.sequelize.query(
          `INSERT INTO "Stores" (store_code, store_name, area, region, is_active, org_id, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, TRUE, $5, NOW(), NOW())
           ON CONFLICT (store_code) DO NOTHING;`,
          { bind: [String(sc), sname, pick(STORE_AREAS), "Region Demo", tenantId] }
        );
      }

      // Also populate stores_master
      for (const sc of storeCodes) {
        const idx = storeCodes.indexOf(sc);
        const sname = `${branchNames[idx % branchNames.length]} Store ${sc}`;
        const bi = branchIds[idx % branchIds.length];
        await db.sequelize.query(
          `INSERT INTO stores_master (kodetoko, nama_toko, branch_id, area, regional, is_active, last_seen_at, org_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), $6, NOW(), NOW())
           ON CONFLICT (kodetoko) DO NOTHING;`,
          { bind: [sc, sname, String(bi), pick(STORE_AREAS), "Region Demo", tenantId] }
        );
      }

      // ==================================================================
      // 2d. Create Users
      // ==================================================================
      const passHash = await bcrypt.hash("demo123", BCRYPT_ROUNDS);
      const username = `${org.slug}-owner`;

      const [userRows] = await db.sequelize.query(
        `INSERT INTO "Users" (username, password_hash, role, org_id, "createdAt", "updatedAt")
         VALUES ($1, $2, 'org_owner', $3, NOW(), NOW())
         ON CONFLICT (username) DO NOTHING
         RETURNING id;`,
        { bind: [username, passHash, tenantId] }
      );
      let userId;
      if (userRows && userRows.length > 0) {
        userId = userRows[0].id;
        counts.users++;
      } else {
        // Already existed, fetch it
        const [existingUser] = await db.sequelize.query(
          `SELECT id FROM "Users" WHERE username = $1 LIMIT 1;`,
          { bind: [username] }
        );
        userId = existingUser[0].id;
      }
      console.log(`  ✓ User "${username}" / demo123 ensured`);

      // ==================================================================
      // 2e. Create Employees (data_employees + Employees model)
      // ==================================================================
      for (let i = 0; i < org.storeCount; i++) {
        const sc = storeCodes[i];
        const bi = branchIds[i % branchIds.length];
        const bname = branchNames[i % branchNames.length];
        const storeName = `${bname} Store ${sc}`;
        const employeeCount = org.employeePerStore;

        for (let e = 1; e <= employeeCount; e++) {
          const nik = `${sc}${String(e).padStart(3, "0")}`;
          const names = [
            "Ahmad",
            "Sari",
            "Budi",
            "Dewi",
            "Rudi",
            "Maya",
            "Hendra",
            "Fitri",
            "Agus",
            "Wulan",
            "Bayu",
            "Rina",
            "Dedi",
            "Nina",
            "Eko",
          ];
          const jobs = ["Manager", "Staff", "Cashier", "Supervisor", "Stock Keeper"];
          const fname = pick(names);
          const lname = pick(names);
          const job = e === 1 ? "Manager" : pick(jobs);

          await db.sequelize.query(
            `INSERT INTO data_employees (nik, full_name, job_name, branch_id, store_code, branch_name, store_name, status, last_synced_at, source, org_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW(), 'seed', $8)
             ON CONFLICT (nik) DO NOTHING;`,
            { bind: [nik, `${fname} ${lname}`, job, bi, sc, bname, storeName, tenantId] }
          );
          counts.employees++;
        }
      }
      console.log(`  ✓ ${org.storeCount * org.employeePerStore} employees created`);

      // Sequelize Employees model
      for (const sc of storeCodes) {
        for (let e = 1; e <= 3; e++) {
          const nik = `S${sc}${String(e).padStart(3, "0")}`;
          const jobs = ["Manager", "Staff", "Staff"];
          await db.sequelize.query(
            `INSERT INTO "Employees" (nik, full_name, role, store_code, status, org_id, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW(), NOW())
             ON CONFLICT (nik) DO NOTHING;`,
            { bind: [nik, `Employee ${sc}-${e}`, jobs[e - 1], String(sc), tenantId] }
          );
        }
      }

      // ==================================================================
      // 2f. EOD Current + History (data_store_eod_current + history)
      // ==================================================================
      const reliability = RELIABILITY[orgKey];

      for (const sc of storeCodes) {
        // EOD Current — latest status
        const today = new Date();
        const bizDate = formatDate(today);
        const isDone = randomBool(reliability.doneMin / 100);
        const statusSales = isDone ? "ok" : randomBool(0.3) ? "pending" : "failed";
        const uploadPct = isDone ? randomInt(98, 100) : randomInt(20, 97);
        const eodAt = isDone ? randomWIBEvening(bizDate) : null;

        await db.sequelize.query(
          `INSERT INTO data_store_eod_current (store_code, business_date, status_sales, upload_stock_percent, upload_stock_raw, eod_at, upload_at, max_upload_at, source_synced_at, raw_payload, org_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), '{}'::jsonb, $9)
           ON CONFLICT (store_code) DO UPDATE SET
             business_date = EXCLUDED.business_date,
             status_sales = EXCLUDED.status_sales,
             upload_stock_percent = EXCLUDED.upload_stock_percent,
             eod_at = EXCLUDED.eod_at,
             upload_at = EXCLUDED.upload_at,
             source_synced_at = NOW();`,
          {
            bind: [
              sc,
              bizDate,
              statusSales,
              uploadPct,
              `${uploadPct}%`,
              eodAt,
              eodAt,
              eodAt,
              tenantId,
            ],
          }
        );
        counts.eodCurrent++;

        // EOD History — 90 days
        for (let d = DAYS_BACKFILL - 1; d >= 0; d--) {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          const dateStr = formatDate(date);

          const hDone = randomBool(
            randomFloat(reliability.doneMin / 100, reliability.doneMax / 100)
          );
          const hStatus = hDone ? "ok" : randomBool(reliability.failRate) ? "failed" : "pending";
          const hPct = hDone ? randomInt(95, 100) : randomInt(0, 94);
          const hEodAt = hDone ? randomWIBEvening(dateStr) : null;

          await db.sequelize.query(
            `INSERT INTO data_store_eod_history (store_code, business_date, recorded_date, recorded_at, status_sales, upload_stock_percent, upload_stock_raw, eod_at, upload_at, max_upload_at, raw_payload, org_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}'::jsonb, $11)
             ON CONFLICT (store_code, recorded_date) DO NOTHING;`,
            {
              bind: [
                sc,
                dateStr,
                dateStr,
                hEodAt || `${dateStr}T12:00:00Z`,
                hStatus,
                hPct,
                `${hPct}%`,
                hEodAt,
                hEodAt,
                hEodAt,
                tenantId,
              ],
            }
          );
          counts.eodHistory++;
        }
      }
      console.log(`  ✓ EOD data seeded (current + ${DAYS_BACKFILL} days history)`);

      // ==================================================================
      // 2g. EODLogs (Sequelize model — dashboard EOD)
      // ==================================================================
      for (const sc of storeCodes) {
        for (let d = DAYS_BACKFILL - 1; d >= 0; d--) {
          const date = new Date();
          date.setDate(date.getDate() - d);
          const dateStr = formatDate(date);

          const r = Math.random();
          let status, message;
          if (r < reliability.doneMin / 100) {
            status = "DONE";
            message = "Synced successfully";
          } else if (r < reliability.doneMin / 100 + reliability.failRate) {
            status = "FAILED";
            message = pick([
              "Connection Timeout",
              "Auth Error",
              "Network failure",
              "Server unreachable",
            ]);
          } else {
            status = "PENDING";
            message = "Awaiting sync";
          }

          const syncedAt = status === "DONE" ? randomWIBEvening(dateStr) : null;

          await db.sequelize.query(
            `INSERT INTO "EODLogs" (store_code, date, status, message, source, synced_at, org_id, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, 'BOT', $5, $6, NOW(), NOW())
             ON CONFLICT (store_code, date) DO NOTHING;`,
            { bind: [String(sc), dateStr, status, message, syncedAt, tenantId] }
          );
          counts.eodLogs++;
        }
      }
      console.log(`  ✓ EODLogs seeded (${DAYS_BACKFILL} days per store)`);

      // ==================================================================
      // 2h. Sync Snapshot (store_sync_snapshot — one row per store)
      // ==================================================================
      for (const sc of storeCodes) {
        const idx = storeCodes.indexOf(sc);
        const bi = branchIds[idx % branchIds.length];
        const sname = `${branchNames[idx % branchNames.length]} Store ${sc}`;
        const ageSec = randomInt(0, 3600);
        const lastEpoch = Math.floor(Date.now() / 1000) - ageSec;
        const isStale = randomBool(0.1);
        const isProblem = randomBool(0.08);
        const status = isProblem ? "problem" : isStale ? "stale" : "synced";

        await db.sequelize.query(
          `INSERT INTO store_sync_snapshot (kodetoko, branch_id, nama_toko, last_sync_epoch, age_sec, status, org_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (kodetoko) DO UPDATE SET
             branch_id = EXCLUDED.branch_id,
             nama_toko = EXCLUDED.nama_toko,
             last_sync_epoch = EXCLUDED.last_sync_epoch,
             age_sec = EXCLUDED.age_sec,
             status = EXCLUDED.status,
             updated_at = NOW();`,
          { bind: [sc, String(bi), sname, lastEpoch, ageSec, status, tenantId] }
        );
        counts.syncSnapshot++;
      }
      console.log(`  ✓ Sync snapshots created`);

      // ==================================================================
      // 2i. SyncLogs (Sequelize model — dashboard sync logs)
      // ==================================================================
      for (const sc of storeCodes) {
        const idx = storeCodes.indexOf(sc);
        const bi = branchIds[idx % branchIds.length];
        const bname = branchNames[idx % branchNames.length];
        const sname = `${bname} Store ${sc}`;

        for (let d = DAYS_BACKFILL - 1; d >= 0; d -= 3) {
          // Every 3 days to reduce volume
          const date = new Date();
          date.setDate(date.getDate() - d);
          const dateStr = formatDate(date);

          const isStale = randomBool(0.1);
          const isProblem = randomBool(0.08);
          const isMissingToday = randomBool(0.05);
          const polledAt = randomWIBEvening(dateStr);

          await db.sequelize.query(
            `INSERT INTO "SyncLogs" (store_code, store_name, branch_id, branch_name, last_sync_at, is_stale, is_problem, is_missing_today, polled_at, org_id, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
             ON CONFLICT DO NOTHING;`,
            {
              bind: [
                String(sc),
                sname,
                String(bi),
                bname,
                polledAt,
                isStale,
                isProblem,
                isMissingToday,
                polledAt,
                tenantId,
              ],
            }
          );
          counts.syncLogs++;
        }
      }
      console.log(`  ✓ SyncLogs seeded (~${Math.ceil(DAYS_BACKFILL / 3)} entries/store)`);

      // ==================================================================
      // 2j. BackupLogs (Sequelize model — one backup per org per day)
      // ==================================================================
      for (let d = DAYS_BACKFILL - 1; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dateStr = formatDate(date);
        const fileDate = dateStr.replace(/-/g, "");

        const isSuccess = randomBool(0.9);
        const sizeBytes = randomInt(1_000_000, 50_000_000);
        const bakTime = randomBackupTime(dateStr);

        await db.sequelize.query(
          `INSERT INTO "BackupLogs" (filename, type, size_bytes, status, message, created_at, org_id, "createdAt", "updatedAt")
           VALUES ($1, 'SCHEDULED', $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT DO NOTHING;`,
          {
            bind: [
              `backup_${fileDate}.sql`,
              sizeBytes,
              isSuccess ? "SUCCESS" : "FAILED",
              isSuccess ? null : pick(["Disk full", "Process timeout", "Permission denied"]),
              bakTime,
              tenantId,
            ],
          }
        );
        counts.backupLogs++;
      }
      console.log(`  ✓ BackupLogs seeded (${DAYS_BACKFILL} days)`);

      // ==================================================================
      // 2k. SystemLogs (Sequelize model)
      // ==================================================================
      const sysLogEntries = [
        { level: "INFO", component: "API", message: `Org ${org.name} onboarded` },
        { level: "INFO", component: "SCHEDULER", message: "Backup scheduler initialized" },
        {
          level: "WARNING",
          component: "BOT",
          message: pick(["Bot latency high", "Retry on sync timeout", "Memory usage above 80%"]),
        },
        { level: "INFO", component: "DATABASE", message: "Connection pool established" },
      ];
      for (const entry of sysLogEntries) {
        await db.sequelize.query(
          `INSERT INTO "SystemLogs" (level, component, message, metadata, org_id, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, '{}'::jsonb, $4, NOW(), NOW())
           ON CONFLICT DO NOTHING;`,
          { bind: [entry.level, entry.component, entry.message, tenantId] }
        );
        counts.systemLogs++;
      }

      // Backfill 90 days of system logs with some variation
      for (let d = DAYS_BACKFILL - 1; d >= 0; d -= 7) {
        const date = new Date();
        date.setDate(date.getDate() - d);

        await db.sequelize.query(
          `INSERT INTO "SystemLogs" (level, component, message, metadata, org_id, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, '{}'::jsonb, $4, NOW(), NOW())
           ON CONFLICT DO NOTHING;`,
          {
            bind: [
              pick(["INFO", "INFO", "INFO", "WARNING"]),
              pick(["API", "SCHEDULER", "DATABASE"]),
              pick(["Health check passed", "Routine maintenance", "Cache cleaned"]),
              tenantId,
            ],
          }
        );
        counts.systemLogs++;
      }
      console.log(`  ✓ SystemLogs seeded`);

      // ==================================================================
      // 2l. RBAC Roles
      // ==================================================================
      // Create org-level roles
      const orgRoleDefs = [
        {
          name: `org_owner_${org.slug}`,
          label: "Org Owner",
          description: `Owner of ${org.name}`,
          perms: [
            "DASHBOARD_VIEW",
            "SYNC_VIEW",
            "EOD_VIEW",
            "EOD_SYNC",
            "EOD_RETRY",
            "STORES_VIEW",
            "STORES_EDIT",
            "EMPLOYEES_VIEW",
            "NIK_LOOKUP",
            "EMPLOYEES_EDIT",
            "BACKUPS_VIEW",
            "BACKUPS_RUN",
            "BACKUPS_DELETE",
            "BACKUPS_RESTORE",
            "SYSTEM_VIEW",
            "SYSTEM_HEALTHCHECK",
            "SYSTEM_RESTART",
            "AGENT_UPDATE",
            "ACCOUNTS_VIEW",
            "USERS_VIEW",
            "USERS_CREATE",
            "USERS_EDIT",
            "USERS_RESET_PASSWORD",
            "USERS_CHANGE_PASSWORD",
            "USERS_ROLE_EDIT",
            "USERS_PERMISSION_EDIT",
            "USERS_SCOPE_EDIT",
            "USERS_DELETE",
            "ROLES_VIEW",
            "ROLES_EDIT",
            "AFTERHOURS_VIEW",
            "SCREENS_VIEW",
            "SCREENS_EDIT",
            "PLAYLISTS_VIEW",
            "PLAYLISTS_EDIT",
            "MEDIA_EDIT",
            "BILLING_VIEW",
          ],
        },
        {
          name: `org_admin_${org.slug}`,
          label: "Org Admin",
          description: `Administrator of ${org.name}`,
          perms: [
            "DASHBOARD_VIEW",
            "SYNC_VIEW",
            "EOD_VIEW",
            "EOD_SYNC",
            "EOD_RETRY",
            "STORES_VIEW",
            "STORES_EDIT",
            "EMPLOYEES_VIEW",
            "NIK_LOOKUP",
            "EMPLOYEES_EDIT",
            "BACKUPS_VIEW",
            "BACKUPS_RUN",
            "BACKUPS_DELETE",
            "SYSTEM_VIEW",
            "SYSTEM_HEALTHCHECK",
            "AGENT_UPDATE",
            "ACCOUNTS_VIEW",
            "USERS_VIEW",
            "USERS_CREATE",
            "USERS_EDIT",
            "USERS_RESET_PASSWORD",
            "USERS_CHANGE_PASSWORD",
            "ROLES_VIEW",
            "AFTERHOURS_VIEW",
            "SCREENS_VIEW",
            "SCREENS_EDIT",
            "PLAYLISTS_VIEW",
            "PLAYLISTS_EDIT",
            "MEDIA_EDIT",
            "BILLING_VIEW",
          ],
        },
        {
          name: `org_member_${org.slug}`,
          label: "Org Member",
          description: `Member of ${org.name}`,
          perms: [
            "DASHBOARD_VIEW",
            "SYNC_VIEW",
            "EOD_VIEW",
            "EOD_SYNC",
            "STORES_VIEW",
            "EMPLOYEES_VIEW",
            "NIK_LOOKUP",
            "BACKUPS_VIEW",
            "BACKUPS_RUN",
            "SYSTEM_VIEW",
            "AFTERHOURS_VIEW",
            "SCREENS_VIEW",
            "PLAYLISTS_VIEW",
          ],
        },
      ];

      let ownerRoleId = null;
      for (const roleDef of orgRoleDefs) {
        const [roleRows] = await db.sequelize.query(
          `INSERT INTO "Roles" (name, label, description, is_system, org_id, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, FALSE, $4, NOW(), NOW())
           ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label
           RETURNING id;`,
          { bind: [roleDef.name, roleDef.label, roleDef.description, tenantId] }
        );
        const roleId = roleRows[0].id;
        counts.roles++;

        if (roleDef.name === `org_owner_${org.slug}`) ownerRoleId = roleId;

        // Clear and re-add permissions
        await db.sequelize.query(`DELETE FROM "RolePermissions" WHERE role_id = $1;`, {
          bind: [roleId],
        });

        for (const perm of roleDef.perms) {
          await db.sequelize.query(
            `INSERT INTO "RolePermissions" (role_id, permission) VALUES ($1, $2)
             ON CONFLICT (role_id, permission) DO NOTHING;`,
            { bind: [roleId, perm] }
          );
          counts.rolePerms++;
        }
      }
      console.log(`  ✓ RBAC roles created (owner, admin, member)`);

      // ==================================================================
      // 2m. Assign user to org_owner role
      // ==================================================================
      if (ownerRoleId && userId) {
        await db.sequelize.query(
          `INSERT INTO "UserRoles" (user_id, role_id, org_id, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (user_id, role_id) DO NOTHING;`,
          { bind: [userId, ownerRoleId, tenantId] }
        );
        counts.userRoles++;
        console.log(`  ✓ User assigned to org_owner role`);
      }

      // ==================================================================
      // 2n. [ORG A ONLY] Live Menu Display
      // ==================================================================
      if (orgKey === "A") {
        const screenIds = [];

        // Create 2 screens
        for (let si = 0; si < SCREENS_A.length; si++) {
          const scr = SCREENS_A[si];
          const branchId = branchIds[scr.branchIndex];

          const [screenRows] = await db.sequelize.query(
            `INSERT INTO screens (org_id, branch_id, name, is_active, branding_primary_color)
             VALUES ($1, $2, $3, TRUE, $4)
             RETURNING id;`,
            {
              bind: [
                tenantId,
                branchId,
                scr.name,
                pick(["#1a73e8", "#e84393", "#00b894", "#6c5ce7"]),
              ],
            }
          );
          screenIds.push(screenRows[0].id);
          counts.screens++;

          // Create token for the screen (update the auto-generated token with a proper UUID)
          const [tokenRows] = await db.sequelize.query(
            `UPDATE screens SET token = gen_random_uuid() WHERE id = $1 RETURNING token;`,
            { bind: [screenRows[0].id] }
          );
          console.log(
            `    → Screen "${scr.name}" created (token=${tokenRows[0].token.slice(0, 8)}...)`
          );
        }
        console.log(`  ✓ 2 screens created`);

        // Create playlists
        const playlistIds = [];
        for (const pl of PLAYLISTS_A) {
          const [plRows] = await db.sequelize.query(
            `INSERT INTO playlists (org_id, branch_id, name, is_active, daypart_config)
             VALUES ($1, $2, $3, TRUE, '{"enabled": false}'::jsonb)
             RETURNING id;`,
            {
              bind: [tenantId, branchIds[SCREENS_A[pl.screenIndex].branchIndex], pl.name],
            }
          );
          playlistIds.push(plRows[0].id);
          counts.playlists++;
        }
        console.log(`  ✓ 4 playlists created`);

        // Link screens to playlists
        // Screen 0 gets playlists 0,1 (indices 0,1)
        // Screen 1 gets playlists 2,3 (indices 2,3)
        for (let si = 0; si < screenIds.length; si++) {
          const screenId = screenIds[si];
          const thesePlaylists = PLAYLISTS_A.map((pl, idx) => ({ ...pl, idx })).filter(
            (pl) => pl.screenIndex === si
          );

          for (const pl of thesePlaylists) {
            const plId = playlistIds[pl.idx];
            const sortOrder = thesePlaylists.indexOf(pl);
            await db.sequelize.query(
              `INSERT INTO screen_playlists (screen_id, playlist_id, sort_order)
               VALUES ($1, $2, $3)
               ON CONFLICT (screen_id, playlist_id) DO NOTHING;`,
              { bind: [screenId, plId, sortOrder] }
            );
            counts.screenPlaylists++;
          }
        }
        console.log(`  ✓ Screens linked to playlists`);

        // Create media assets and playlist items
        for (let pi = 0; pi < playlistIds.length; pi++) {
          const plId = playlistIds[pi];
          const count = randomInt(5, 8);

          for (let mi = 0; mi < count; mi++) {
            const media = MEDIA_ITEMS[mi % MEDIA_ITEMS.length];
            const [assetRows] = await db.sequelize.query(
              `INSERT INTO media_assets (org_id, filename, original_name, mime_type, file_size_bytes, storage_path, thumb_path, duration_sec, width, height)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id;`,
              {
                bind: [
                  tenantId,
                  `${pi}-${mi}-${media.file}`,
                  media.file,
                  media.mime,
                  randomInt(50_000, 5_000_000),
                  `/demo/assets/${media.file}`,
                  `/demo/assets/thumbs/${media.file}`,
                  media.dur,
                  media.w,
                  media.h,
                ],
              }
            );
            counts.media++;

            // Link to playlist
            await db.sequelize.query(
              `INSERT INTO playlist_items (playlist_id, media_asset_id, sort_order, duration_sec)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (playlist_id, sort_order) DO NOTHING;`,
              { bind: [plId, assetRows[0].id, mi, media.dur] }
            );
            counts.playlistItems++;
          }
        }
        console.log(
          `  ✓ ${counts.media} media assets and ${counts.playlistItems} playlist items created`
        );
      }

      console.log(""); // blank line between orgs
    }

    // ======================================================================
    // Summary
    // ======================================================================
    console.log("=== SEED COMPLETE ===");
    console.log(`Tenants created:    ${counts.tenants}`);
    console.log(`Branches created:   ${counts.branches}`);
    console.log(`Stores created:     ${counts.stores}`);
    console.log(`Employees created:  ${counts.employees}`);
    console.log(`EOD Current rows:   ${counts.eodCurrent}`);
    console.log(`EOD History rows:   ${counts.eodHistory}`);
    console.log(`EOD Logs:           ${counts.eodLogs}`);
    console.log(`Sync Snapshots:     ${counts.syncSnapshot}`);
    console.log(`Sync Logs:          ${counts.syncLogs}`);
    console.log(`Backup Logs:        ${counts.backupLogs}`);
    console.log(`System Logs:        ${counts.systemLogs}`);
    console.log(`Users created:      ${counts.users}`);
    console.log(`Roles created:      ${counts.roles}`);
    console.log(`Role Permissions:   ${counts.rolePerms}`);
    console.log(`User Roles:         ${counts.userRoles}`);
    console.log(`Screens:            ${counts.screens}`);
    console.log(`Playlists:          ${counts.playlists}`);
    console.log(`Media Assets:       ${counts.media}`);
    console.log(`Playlist Items:     ${counts.playlistItems}`);
    console.log(`Screen-Playlist:    ${counts.screenPlaylists}`);
    console.log("\n✓ SaaS seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ SaaS seeding failed:", error);
    process.exit(1);
  }
}

seedSaaS();
