const { DEFAULT_AFTERHOURS_CONFIG } = require("../config/afterhoursDefaults");

async function ensureEodLogUniqueIndex(db) {
  if (!db?.sequelize) return;

  // This app expects one EOD log per (store_code, date). The Sequelize model
  // defines an index, but that doesn't automatically apply to existing DBs.
  const indexName = "eodlogs_store_code_date_uq";

  try {
    const tableName = db.EODLog?.getTableName ? db.EODLog.getTableName() : "EODLogs";

    // Quote table name safely using QueryInterface when possible.
    const qi = db.sequelize.getQueryInterface();
    const quotedTable = qi?.quoteTable ? qi.quoteTable(tableName) : `"${tableName}"`;

    const [rows] = await db.sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = $1 LIMIT 1;`,
      { bind: [indexName] }
    );

    if (Array.isArray(rows) && rows.length > 0) return;

    await db.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON ${quotedTable} ("store_code", "date");`
    );
  } catch (err) {
    // If duplicates already exist, Postgres will reject the unique index.
    // Don’t crash the server; log and continue.
    const code = err?.original?.code || err?.parent?.code || err?.code;
    if (code === "23505") {
      // unique_violation
      console.warn(
        "[ensureDb] Cannot create unique index for EODLogs(store_code,date) due to existing duplicates. " +
          "Clean up duplicates and re-run."
      );
      return;
    }

    console.warn("[ensureDb] Non-fatal DB ensure step failed:", err?.message || err);
  }
}

async function ensureServiceHeartbeatsTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_heartbeats (
        service_name VARCHAR(64) PRIMARY KEY,
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_service_heartbeats_last_seen
      ON service_heartbeats (last_seen_at DESC);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (service_heartbeats):",
      err?.message || err
    );
  }
}

async function ensureNormalizedSchema(db) {
  if (!db?.sequelize) return;

  try {
    // Branches
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS data_branches (
        branch_id SMALLINT PRIMARY KEY,
        branch_name VARCHAR(64) NOT NULL,
        source_code VARCHAR(8),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.sequelize.query(`
      INSERT INTO data_branches (branch_id, branch_name, source_code)
      VALUES
        (2, 'NORTH HUB', '302'),
        (3, 'EAST HUB', '303'),
        (4, 'CENTRAL HUB', '304'),
        (5, 'COASTAL HUB', '305'),
        (6, 'HIGHLAND HUB', '306'),
        (7, 'WEST HUB', '307'),
        (8, 'RIVER HUB', '308'),
        (9, 'SOUTH HUB', '309')
      ON CONFLICT (branch_id) DO UPDATE SET
        branch_name = EXCLUDED.branch_name,
        source_code = EXCLUDED.source_code,
        updated_at = NOW();
    `);

    // Stores
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS data_stores (
        store_code INTEGER PRIMARY KEY,
        store_name VARCHAR(255) NOT NULL,
        branch_id SMALLINT REFERENCES data_branches(branch_id),
        area VARCHAR(255),
        regional VARCHAR(255),
        nik_ac VARCHAR(50),
        nik_rh VARCHAR(50),
        last_seen_at TIMESTAMPTZ,
        last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raw_payload JSONB
      );
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_stores_branch
      ON data_stores (branch_id, store_code);
    `);

    // Latest EOD status per store
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS data_store_eod_current (
        store_code INTEGER PRIMARY KEY REFERENCES data_stores(store_code) ON DELETE CASCADE,
        business_date DATE,
        status_sales VARCHAR(50),
        upload_stock_percent SMALLINT,
        upload_stock_raw VARCHAR(50),
        eod_at TIMESTAMPTZ,
        upload_at TIMESTAMPTZ,
        max_upload_at TIMESTAMPTZ,
        source_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raw_payload JSONB
      );
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_store_eod_current_business_date
      ON data_store_eod_current (business_date, store_code);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_store_eod_current_status
      ON data_store_eod_current (status_sales, business_date);
    `);

    // Daily EOD snapshots
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS data_store_eod_history (
        id BIGSERIAL PRIMARY KEY,
        store_code INTEGER NOT NULL REFERENCES data_stores(store_code) ON DELETE CASCADE,
        business_date DATE,
        recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status_sales VARCHAR(50),
        upload_stock_percent SMALLINT,
        upload_stock_raw VARCHAR(50),
        eod_at TIMESTAMPTZ,
        upload_at TIMESTAMPTZ,
        max_upload_at TIMESTAMPTZ,
        raw_payload JSONB
      );
    `);
    await db.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_data_store_eod_history_store_recorded_date
      ON data_store_eod_history (store_code, recorded_date);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_store_eod_history_recorded_date
      ON data_store_eod_history (recorded_date DESC, store_code);
    `);

    // Employees (nik_toko)
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS data_employees (
        nik VARCHAR(20) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        job_name VARCHAR(100),
        branch_id SMALLINT REFERENCES data_branches(branch_id),
        store_code INTEGER REFERENCES data_stores(store_code),
        branch_name VARCHAR(100),
        store_name VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raw_payload JSONB
      );
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_employees_branch
      ON data_employees (branch_id, nik);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_data_employees_store
      ON data_employees (store_code, nik);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (internal data schema):",
      err?.message || err
    );
  }
}

async function ensureStoreSyncSnapshotTable(db) {
  if (!db?.sequelize) return;

  try {
    // Snapshot semantics: one row per store.
    // We keep legacy columns (like fetched_at) if they exist, but KPIs must come from this table.
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_sync_snapshot (
        kodetoko BIGINT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        nama_toko TEXT,
        last_sync_epoch BIGINT,
        age_sec INTEGER,
        status TEXT NOT NULL DEFAULT 'problem',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Migrate older schema forward (non-fatal):
    // - previous PK: (branch_id, kodetoko)
    // - previous statuses: fresh|stale|problem|missingToday
    // - previous timestamp column: fetched_at
    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`
    );
    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NOT NULL DEFAULT now();`
    );

    await db.sequelize.query(`
      UPDATE store_sync_snapshot
      SET updated_at = COALESCE(updated_at, fetched_at, now())
      WHERE updated_at IS NULL;
    `);

    // Replace status check constraint with an explicit, stable name.
    // Drop the legacy constraint *before* we normalize status values (older DBs may forbid 'synced').
    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot DROP CONSTRAINT IF EXISTS store_sync_snapshot_status_check;`
    );

    // Normalize old status values into the new lanes.
    await db.sequelize.query(`
      UPDATE store_sync_snapshot
      SET status = CASE
        WHEN status = 'fresh' THEN 'synced'
        WHEN status = 'synced' THEN 'synced'
        WHEN status = 'stale' THEN 'stale'
        WHEN status = 'problem' THEN 'problem'
        WHEN status = 'missingToday' THEN 'problem'
        WHEN status IS NULL THEN 'problem'
        ELSE 'problem'
      END;
    `);

    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot ALTER COLUMN status SET DEFAULT 'problem';`
    );
    await db.sequelize.query(`ALTER TABLE store_sync_snapshot ALTER COLUMN status SET NOT NULL;`);

    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot ADD CONSTRAINT store_sync_snapshot_status_check CHECK (status IN ('synced','stale','problem'));`
    );

    // Ensure primary key is kodetoko.
    await db.sequelize.query(
      `ALTER TABLE store_sync_snapshot DROP CONSTRAINT IF EXISTS store_sync_snapshot_pkey;`
    );
    await db.sequelize.query(`ALTER TABLE store_sync_snapshot ADD PRIMARY KEY (kodetoko);`);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_status
      ON store_sync_snapshot(status);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_branch
      ON store_sync_snapshot(branch_id);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_kodetoko
      ON store_sync_snapshot(kodetoko);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_age
      ON store_sync_snapshot(age_sec DESC);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_last_sync_epoch
      ON store_sync_snapshot(last_sync_epoch ASC);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_sync_updated_at
      ON store_sync_snapshot(updated_at DESC);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (store_sync_snapshot):",
      err?.message || err
    );
  }
}

async function ensureStoresMasterTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS stores_master (
        kodetoko BIGINT PRIMARY KEY,
        nama_toko TEXT,
        branch_id TEXT NOT NULL,
        area TEXT,
        regional TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_master_branch
      ON stores_master(branch_id);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_master_active
      ON stores_master(is_active);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_master_last_seen_at
      ON stores_master(last_seen_at DESC);
    `);

    // Seed from existing normalized stores to keep Total Stores stable immediately.
    await db.sequelize.query(`
      INSERT INTO stores_master (
        kodetoko,
        nama_toko,
        branch_id,
        area,
        regional,
        is_active,
        last_seen_at,
        created_at,
        updated_at
      )
      SELECT
        s.store_code::bigint AS kodetoko,
        s.store_name AS nama_toko,
        COALESCE(s.branch_id::text, '0') AS branch_id,
        s.area,
        s.regional,
        TRUE AS is_active,
        COALESCE(s.last_seen_at, now()) AS last_seen_at,
        now() AS created_at,
        now() AS updated_at
      FROM data_stores s
      WHERE s.store_code IS NOT NULL
      ON CONFLICT (kodetoko) DO UPDATE SET
        nama_toko = COALESCE(EXCLUDED.nama_toko, stores_master.nama_toko),
        branch_id = CASE
          WHEN EXCLUDED.branch_id = '0' THEN stores_master.branch_id
          ELSE EXCLUDED.branch_id
        END,
        area = COALESCE(EXCLUDED.area, stores_master.area),
        regional = COALESCE(EXCLUDED.regional, stores_master.regional),
        last_seen_at = GREATEST(stores_master.last_seen_at, EXCLUDED.last_seen_at),
        updated_at = now();
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (stores_master):",
      err?.message || err
    );
  }
}

async function ensureSyncAudLatestTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sync_aud_latest (
        kodetoko BIGINT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        nama_toko TEXT,
        last_sync_epoch BIGINT,
        source_fetched_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_aud_latest_branch
      ON sync_aud_latest(branch_id);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_aud_latest_source_fetched_at
      ON sync_aud_latest(source_fetched_at DESC);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (sync_aud_latest):",
      err?.message || err
    );
  }
}

async function ensureAfterhoursTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS afterhours_pc_log (
        id SERIAL PRIMARY KEY,
        check_date DATE NOT NULL,
        store_code VARCHAR(20) NOT NULL,
        store_name VARCHAR(255),
        branch_id VARCHAR(10) NOT NULL,
        branch_name VARCHAR(100),
        last_sync_at TIMESTAMPTZ,
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notified BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT ux_afterhours_pc_log_date_store UNIQUE (check_date, store_code)
      );
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_afterhours_pc_log_check_date
      ON afterhours_pc_log(check_date DESC);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_afterhours_pc_log_branch
      ON afterhours_pc_log(branch_id, check_date DESC);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (afterhours_pc_log):",
      err?.message || err
    );
  }
}

async function ensureAfterhoursConfigTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS afterhours_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const [key, value] of Object.entries(DEFAULT_AFTERHOURS_CONFIG)) {
      await db.sequelize.query(
        `INSERT INTO afterhours_config (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_at = NOW()
         WHERE afterhours_config.value IS NULL OR BTRIM(afterhours_config.value) = ''`,
        { bind: [key, value] }
      );
    }
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (afterhours_config):",
      err?.message || err
    );
  }
}

function isMissingTimestampColumnError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return (
    (msg.includes("column") && msg.includes("createdat") && msg.includes("does not exist")) ||
    (msg.includes("column") && msg.includes("updatedat") && msg.includes("does not exist"))
  );
}

async function insertRolePermission(db, roleName, permission) {
  await db.sequelize.query(
    `
      INSERT INTO role_permissions (role_id, permission, "createdAt", "updatedAt")
      SELECT r.id, :permission, NOW(), NOW()
      FROM roles r
      WHERE r.name = :roleName
      ON CONFLICT (role_id, permission) DO NOTHING;
    `,
    { replacements: { roleName, permission } }
  );
}

async function insertRolePermissionLegacy(db, roleName, permission) {
  await db.sequelize.query(
    `
      INSERT INTO role_permissions (role_id, permission)
      SELECT r.id, :permission
      FROM roles r
      WHERE r.name = :roleName
      ON CONFLICT (role_id, permission) DO NOTHING;
    `,
    { replacements: { roleName, permission } }
  );
}

async function upsertRolePermissionCompatible(db, roleName, permission) {
  try {
    await insertRolePermission(db, roleName, permission);
  } catch (err) {
    if (!isMissingTimestampColumnError(err)) throw err;
    await insertRolePermissionLegacy(db, roleName, permission);
  }
}

async function ensureAfterhoursRbacPermission(db) {
  if (!db?.sequelize) return;

  try {
    // Backfill permission for existing deployments where RBAC was seeded
    // before AFTERHOURS_VIEW was introduced.
    await upsertRolePermissionCompatible(db, "admin", "AFTERHOURS_VIEW");
    await upsertRolePermissionCompatible(db, "super_admin", "AFTERHOURS_VIEW");
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (afterhours rbac permission):",
      err?.message || err
    );
  }
}

async function ensureAccountRbacPermissions(db) {
  if (!db?.sequelize) return;

  const adminPerms = [
    "EMPLOYEES_EDIT",
    "ACCOUNTS_VIEW",
    "USERS_VIEW",
    "USERS_CREATE",
    "USERS_EDIT",
    "USERS_RESET_PASSWORD",
    "USERS_ROLE_EDIT",
    "USERS_PERMISSION_EDIT",
    "USERS_SCOPE_EDIT",
    "USERS_DELETE",
    "ROLES_VIEW",
  ];

  const superAdminPerms = [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "STORES_VIEW",
    "EMPLOYEES_VIEW",
    "BACKUPS_VIEW",
    "SYSTEM_VIEW",
    "ACCOUNTS_VIEW",
    "EOD_SYNC",
    "EOD_RETRY",
    "STORES_EDIT",
    "NIK_LOOKUP",
    "EMPLOYEES_EDIT",
    "BACKUPS_RUN",
    "BACKUPS_DELETE",
    "BACKUPS_RESTORE",
    "SYSTEM_HEALTHCHECK",
    "SYSTEM_RESTART",
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
    "AGENT_UPDATE",
  ];

  try {
    for (const permission of adminPerms) {
      await upsertRolePermissionCompatible(db, "admin", permission);
    }

    for (const permission of superAdminPerms) {
      await upsertRolePermissionCompatible(db, "super_admin", permission);
    }
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (account rbac permissions):",
      err?.message || err
    );
  }
}

async function ensureLegacyUsersHaveRbacRole(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      INSERT INTO user_roles (user_id, role_id, "createdAt", "updatedAt")
      SELECT
        u.id,
        COALESCE(target_role.id, viewer_role.id) AS role_id,
        NOW(),
        NOW()
      FROM "Users" u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles target_role ON target_role.name = (
        CASE
          WHEN LOWER(COALESCE(u.role, '')) IN ('superadmin', 'super_admin', 'super-admin') THEN 'super_admin'
          WHEN LOWER(COALESCE(u.role, '')) = 'admin' THEN 'admin'
          WHEN LOWER(COALESCE(u.role, '')) IN ('ops', 'operator') THEN 'ops'
          WHEN LOWER(COALESCE(u.role, '')) IN ('hc', 'human capital') THEN 'hc'
          WHEN LOWER(COALESCE(u.role, '')) IN ('it', 'support') THEN 'it'
          WHEN LOWER(COALESCE(u.role, '')) IN ('user', 'viewer') THEN 'viewer'
          WHEN LOWER(COALESCE(u.role, '')) = '' THEN 'viewer'
          ELSE LOWER(COALESCE(u.role, 'viewer'))
        END
      )
      LEFT JOIN roles viewer_role ON viewer_role.name = 'viewer'
      WHERE ur.user_id IS NULL
        AND (target_role.id IS NOT NULL OR viewer_role.id IS NOT NULL)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (legacy users to user_roles):",
      err?.message || err
    );
  }
}

async function ensureAfterhoursMonthlyReportTable(db) {
  if (!db?.sequelize) return;

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS afterhours_monthly_report (
        id SERIAL PRIMARY KEY,
        report_month DATE NOT NULL,
        report_window_start VARCHAR(5),
        report_window_end_exclusive VARCHAR(5),
        store_code VARCHAR(20) NOT NULL,
        store_name VARCHAR(255),
        branch_id VARCHAR(10) NOT NULL,
        branch_name VARCHAR(100),
        violation_count INT NOT NULL DEFAULT 0,
        violation_dates JSONB,
        violation_timestamps JSONB,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ux_afterhours_monthly_store UNIQUE (report_month, store_code)
      );
    `);

    await db.sequelize.query(`
      ALTER TABLE afterhours_monthly_report
      ADD COLUMN IF NOT EXISTS report_window_start VARCHAR(5);
    `);

    await db.sequelize.query(`
      ALTER TABLE afterhours_monthly_report
      ADD COLUMN IF NOT EXISTS report_window_end_exclusive VARCHAR(5);
    `);

    await db.sequelize.query(`
      ALTER TABLE afterhours_monthly_report
      ADD COLUMN IF NOT EXISTS violation_timestamps JSONB;
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ah_monthly_report_month
      ON afterhours_monthly_report(report_month DESC);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ah_monthly_report_branch
      ON afterhours_monthly_report(branch_id, report_month DESC);
    `);

    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ah_monthly_report_count
      ON afterhours_monthly_report(report_month, violation_count DESC);
    `);
  } catch (err) {
    console.warn(
      "[ensureDb] Non-fatal DB ensure step failed (afterhours_monthly_report):",
      err?.message || err
    );
  }
}

module.exports = async function ensureDb(db) {
  await ensureEodLogUniqueIndex(db);
  await ensureServiceHeartbeatsTable(db);
  await ensureNormalizedSchema(db);
  await ensureStoresMasterTable(db);
  await ensureSyncAudLatestTable(db);
  await ensureAfterhoursTable(db);
  await ensureAfterhoursConfigTable(db);
  await ensureAfterhoursRbacPermission(db);
  await ensureAccountRbacPermissions(db);
  await ensureLegacyUsersHaveRbacRole(db);
  await ensureAfterhoursMonthlyReportTable(db);
  await ensureStoreSyncSnapshotTable(db);

  // Ensure SyncLogs table exists (historical sync data)
  if (db.SyncLog) {
    try {
      await db.SyncLog.sync({ alter: true });

      // Query patterns:
      // - history: WHERE store_code = ? AND polled_at >= ? ORDER BY polled_at DESC
      // - branch scans: WHERE branch_id = ? AND polled_at >= ?
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_synclogs_store_code_polled_at
        ON "SyncLogs" (store_code, polled_at);
      `);
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_synclogs_branch_id_polled_at
        ON "SyncLogs" (branch_id, polled_at);
      `);
    } catch (err) {
      console.warn("[ensureDb] Failed to sync SyncLog table:", err.message);
    }
  }

  // Ensure SyncSummary table exists (bucketed history)
  if (db.SyncSummary) {
    try {
      await db.SyncSummary.sync({ alter: true });

      // Hot path: WHERE bucket_minutes = ? AND bucket_start >= ?
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_syncsummary_bucket_minutes_bucket_start
        ON "SyncSummaries" (bucket_minutes, bucket_start);
      `);
    } catch (err) {
      console.warn("[ensureDb] Failed to sync SyncSummary table:", err.message);
    }
  }

  // Ensure SyncAlertState table exists (stale alert tracking)
  if (db.SyncAlertState) {
    try {
      await db.SyncAlertState.sync({ alter: true });
    } catch (err) {
      console.warn("[ensureDb] Failed to sync SyncAlertState table:", err.message);
    }
  }
};
