"use strict";

/**
 * Migration: Add composite indexes for multi-tenant access patterns.
 *
 * Creates (org_id, id) and (org_id, created_at) indexes on key tables
 * to ensure efficient tenant-scoped queries.
 */
module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    const indexDefs = [
      // Sequelize model tables
      { table: "Users", columns: ["org_id", "id"] },
      { table: "Users", columns: ["org_id", "username"] },
      { table: "Stores", columns: ["org_id", "store_code"] },
      { table: "EODLogs", columns: ["org_id", "store_code", "date"] },
      { table: "BackupLogs", columns: ["org_id", "created_at"] },
      { table: "SystemLogs", columns: ["org_id", "created_at"] },
      { table: "Employees", columns: ["org_id", "nik"] },
      { table: "SyncLogs", columns: ["org_id", "store_code", "polled_at"] },
      { table: "SyncSummaries", columns: ["org_id", "bucket_minutes", "bucket_start"] },
      { table: "SyncAlertStates", columns: ["org_id", "store_code"] },
      { table: "agent_monitoring", columns: ["org_id", "store_id"] },
      // RBAC tables
      { table: "Roles", columns: ["org_id", "name"] },
      { table: "UserRoles", columns: ["org_id", "user_id", "role_id"] },
      { table: "UserBranchScopes", columns: ["org_id", "user_id", "branch_id"] },
      // Boot-time schema tables
      { table: "data_stores", columns: ["org_id", "store_code"] },
      { table: "data_employees", columns: ["org_id", "nik"] },
      { table: "data_store_eod_current", columns: ["org_id", "store_code"] },
      { table: "data_store_eod_history", columns: ["org_id", "store_code", "recorded_date"] },
      { table: "data_branches", columns: ["org_id", "branch_id"] },
      { table: "store_sync_snapshot", columns: ["org_id", "kodetoko"] },
      { table: "stores_master", columns: ["org_id", "kodetoko"] },
      { table: "sync_aud_latest", columns: ["org_id", "kodetoko"] },
      { table: "afterhours_pc_log", columns: ["org_id", "store_code", "check_date"] },
      { table: "afterhours_monthly_report", columns: ["org_id", "report_month", "store_code"] },
      { table: "service_heartbeats", columns: ["org_id", "service_name"] },
    ];

    for (const { table, columns } of indexDefs) {
      const indexName = `idx_${table.toLowerCase()}_${columns.join("_")}`;
      try {
        await sequelize.query(`
          CREATE INDEX IF NOT EXISTS "${indexName}"
          ON "${table}" (${columns.map((c) => `"${c}"`).join(", ")});
        `);
      } catch (err) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("already exists") || msg.includes("does not exist")) {
          console.warn(`[index migration] Skipping ${indexName}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }
  },

  down: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    const indexNames = [
      "idx_Users_org_id_id",
      "idx_Users_org_id_username",
      "idx_Stores_org_id_store_code",
      "idx_EODLogs_org_id_store_code_date",
      "idx_BackupLogs_org_id_created_at",
      "idx_SystemLogs_org_id_created_at",
      "idx_Employees_org_id_nik",
      "idx_SyncLogs_org_id_store_code_polled_at",
      "idx_SyncSummaries_org_id_bucket_minutes_bucket_start",
      "idx_SyncAlertStates_org_id_store_code",
      "idx_agent_monitoring_org_id_store_id",
      "idx_Roles_org_id_name",
      "idx_UserRoles_org_id_user_id_role_id",
      "idx_UserBranchScopes_org_id_user_id_branch_id",
      "idx_data_stores_org_id_store_code",
      "idx_data_employees_org_id_nik",
      "idx_data_store_eod_current_org_id_store_code",
      "idx_data_store_eod_history_org_id_store_code_recorded_date",
      "idx_data_branches_org_id_branch_id",
      "idx_store_sync_snapshot_org_id_kodetoko",
      "idx_stores_master_org_id_kodetoko",
      "idx_sync_aud_latest_org_id_kodetoko",
      "idx_afterhours_pc_log_org_id_store_code_check_date",
      "idx_afterhours_monthly_report_org_id_report_month_store_code",
      "idx_service_heartbeats_org_id_service_name",
    ];

    for (const name of indexNames) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${name}";`);
      } catch (err) {
        console.warn(`[index migration] Skipping drop ${name}: ${err.message}`);
      }
    }
  },
};
// WAVE A COMPLETE — 20260707_003_add_composite_indexes.js
