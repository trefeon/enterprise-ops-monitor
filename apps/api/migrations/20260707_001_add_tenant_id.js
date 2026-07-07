"use strict";

const ORG_ID_COLUMN = {
  type: "UUID",
  allowNull: true,
};

const TABLES = [
  // Sequelize model tables
  { table: "Users", column: "org_id" },
  { table: "Stores", column: "org_id" },
  { table: "EODLogs", column: "org_id" },
  { table: "BackupLogs", column: "org_id" },
  { table: "SystemLogs", column: "org_id" },
  { table: "Employees", column: "org_id" },
  { table: "SyncLogs", column: "org_id" },
  { table: "SyncSummaries", column: "org_id" },
  { table: "SyncAlertStates", column: "org_id" },
  { table: "agent_monitoring", column: "org_id" },
  // RBAC tables
  { table: "Roles", column: "org_id" },
  { table: "RolePermissions", column: "org_id" },
  { table: "UserRoles", column: "org_id" },
  { table: "UserPermissionOverrides", column: "org_id" },
  { table: "UserBranchScopes", column: "org_id" },
  // Boot-time schema tables
  { table: "data_branches", column: "org_id" },
  { table: "data_stores", column: "org_id" },
  { table: "data_store_eod_current", column: "org_id" },
  { table: "data_store_eod_history", column: "org_id" },
  { table: "data_employees", column: "org_id" },
  { table: "store_sync_snapshot", column: "org_id" },
  { table: "stores_master", column: "org_id" },
  { table: "sync_aud_latest", column: "org_id" },
  { table: "afterhours_pc_log", column: "org_id" },
  { table: "afterhours_config", column: "org_id" },
  { table: "afterhours_monthly_report", column: "org_id" },
  { table: "service_heartbeats", column: "org_id" },
];

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    for (const { table, column } of TABLES) {
      try {
        await queryInterface.addColumn(table, column, ORG_ID_COLUMN);
      } catch (err) {
        // Column may already exist; non-fatal
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("already exists")) continue;
        console.warn(`[migration 001] addColumn ${table}.${column} skipped: ${err.message}`);
      }
    }
  },

  down: async (queryInterface, _Sequelize) => {
    // Drop columns in reverse order
    const reversed = [...TABLES].reverse();
    for (const { table, column } of reversed) {
      try {
        await queryInterface.removeColumn(table, column);
      } catch (err) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("does not exist")) continue;
        console.warn(`[migration 001] removeColumn ${table}.${column} skipped: ${err.message}`);
      }
    }
  },
};
// WAVE A COMPLETE — 20260707_001_add_tenant_id.js
