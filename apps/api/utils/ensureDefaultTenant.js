const db = require("../models");
const logger = require("./logger");

/**
 * Ensures a default tenant exists in the database at boot time.
 *
 * Creates the default tenant ("Org 1") if no tenants exist yet,
 * then updates all boot-time data table rows with the tenant's org_id.
 */
async function ensureDefaultTenant() {
  // 1. Create default tenant if missing
  const [tenantRows] = await db.sequelize.query(
    `SELECT id, slug FROM tenants ORDER BY created_at ASC LIMIT 1;`
  );

  let defaultTenantId;

  if (!tenantRows || tenantRows.length === 0) {
    const tenantName = process.env.DEFAULT_TENANT_NAME || "Org 1";
    const [created] = await db.sequelize.query(
      `INSERT INTO tenants (name, slug, settings_json, created_at, updated_at)
       VALUES ($1, $2, '{}'::jsonb, NOW(), NOW())
       RETURNING id;`,
      { bind: [tenantName, tenantName.toLowerCase().replace(/\s+/g, "-")] }
    );
    defaultTenantId = created?.[0]?.id;
    if (defaultTenantId) {
      logger.info(
        `[ensureDefaultTenant] Created default tenant "${tenantName}" (${defaultTenantId})`
      );
    }
  } else {
    defaultTenantId = tenantRows[0].id;
    logger.info(`[ensureDefaultTenant] Found existing tenant: ${defaultTenantId}`);
  }

  if (!defaultTenantId) {
    logger.warn("[ensureDefaultTenant] No tenant ID available — skipping org_id backfill");
    return null;
  }

  // 2. Backfill org_id on boot-time tables where org_id IS NULL
  const backfillTables = [
    "data_branches",
    "data_stores",
    "data_store_eod_current",
    "data_store_eod_history",
    "data_employees",
    "store_sync_snapshot",
    "stores_master",
    "sync_aud_latest",
    "afterhours_pc_log",
    "afterhours_config",
    "afterhours_monthly_report",
    "service_heartbeats",
  ];

  for (const table of backfillTables) {
    try {
      const [result] = await db.sequelize.query(
        `UPDATE "${table}" SET org_id = $1 WHERE org_id IS NULL;`,
        { bind: [defaultTenantId] }
      );
      if (result?.rowCount && result.rowCount > 0) {
        logger.info(
          `[ensureDefaultTenant] Backfilled ${result.rowCount} rows in ${table} with org_id`
        );
      }
    } catch (err) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("does not exist") || msg.includes("column") || msg.includes("not found")) {
        // Table or column may not exist yet — non-fatal during initial boot
        continue;
      }
      logger.warn(`[ensureDefaultTenant] Backfill ${table} failed: ${err.message}`);
    }
  }

  return defaultTenantId;
}

module.exports = ensureDefaultTenant;
// WAVE A COMPLETE — ensureDefaultTenant.js
