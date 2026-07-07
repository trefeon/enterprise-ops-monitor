"use strict";

/**
 * Migration: Enable Row-Level Security and add RLS policies.
 *
 * Enables RLS on the boot-time data tables and creates policies
 * that filter rows by the `org_id` column using the `app.tenant_id`
 * session variable set by tenantMiddleware.
 */
module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    const tables = [
      // Boot-time data tables
      "data_stores",
      "data_employees",
      "data_store_eod_current",
      "data_store_eod_history",
      "store_sync_snapshot",
      "sync_aud_latest",
      "afterhours_pc_log",
      "afterhours_monthly_report",
      // Sequelize model tables
      "\"Stores\"",
      "\"EODLogs\"",
      "\"Employees\"",
      "\"SyncLogs\"",
      "\"SyncSummaries\"",
      "\"SyncAlertStates\"",
      "\"BackupLogs\"",
      "\"SystemLogs\"",
      "agent_monitoring",
      // RBAC tables
      "\"Roles\"",
      "\"RolePermissions\"",
      "\"UserRoles\"",
      "\"UserPermissionOverrides\"",
      "\"UserBranchScopes\"",
      "\"Users\"",
      // Live Menu Display tables
      "screens",
      "playlists",
      "screen_playlists",
      "playlist_items",
      "media_assets",
      // Billing tables
      "subscriptions",
      "billing_invoices",
    ];

    for (const table of tables) {
      try {
        // Enable RLS
        await sequelize.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

        // Drop existing policy if any (idempotent)
        await sequelize.query(`
          DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";
        `);

        // Create tenant isolation policy
        // Uses SET LOCAL app.tenant_id set by tenantMiddleware
        await sequelize.query(`
          CREATE POLICY tenant_isolation_policy ON "${table}"
            FOR ALL
            USING (org_id IS NULL OR org_id::text = current_setting('app.tenant_id', TRUE))
            WITH CHECK (org_id IS NULL OR org_id::text = current_setting('app.tenant_id', TRUE));
        `);

        // Grant usage to the application role (default role)
        await sequelize.query(`
          ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
        `);
      } catch (err) {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("already exists") ||
          msg.includes("is not a superuser") ||
          msg.includes("permission denied")
        ) {
          console.warn(`[rls migration] Skipping RLS for ${table}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }
  },

  down: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    const tables = [
      // Boot-time data tables
      "data_stores",
      "data_employees",
      "data_store_eod_current",
      "data_store_eod_history",
      "store_sync_snapshot",
      "sync_aud_latest",
      "afterhours_pc_log",
      "afterhours_monthly_report",
      // Sequelize model tables
      "\"Stores\"",
      "\"EODLogs\"",
      "\"Employees\"",
      "\"SyncLogs\"",
      "\"SyncSummaries\"",
      "\"SyncAlertStates\"",
      "\"BackupLogs\"",
      "\"SystemLogs\"",
      "agent_monitoring",
      // RBAC tables
      "\"Roles\"",
      "\"RolePermissions\"",
      "\"UserRoles\"",
      "\"UserPermissionOverrides\"",
      "\"UserBranchScopes\"",
      "\"Users\"",
      // Live Menu Display tables
      "screens",
      "playlists",
      "screen_playlists",
      "playlist_items",
      "media_assets",
      // Billing tables
      "subscriptions",
      "billing_invoices",
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
        await sequelize.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
      } catch (err) {
        console.warn(`[rls migration] Skipping RLS cleanup for ${table}: ${err.message}`);
      }
    }
  },
};
// WAVE A COMPLETE — 20260707_002_enable_rls.js
