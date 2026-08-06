"use strict";

/**
 * Migration: Backfill NULL org_id on tenant business tables (data-only, forward-only).
 *
 * PRD §5 / ARCHITECTURE.md §6 (003): before RLS policies go strict (20260806_002),
 * every row on org-scoped tables must carry an org_id. Rows with NULL org_id are
 * currently exposed to every tenant by the old permissive policy, so we assign them
 * to the default tenant (oldest by creation — same rule as utils/ensureDefaultTenant.js).
 *
 * Ordering matters: this runs BEFORE 20260806_002_strict_tenant_policies.js in the same
 * run (the runner sorts by filename, and `001_backfill` < `002_strict`), so the UPDATEs
 * here are NOT subject to strict policies yet.
 *
 * Idempotent: `WHERE org_id IS NULL` makes it safe to re-run (second run matches 0 rows).
 * Forward-only: no `down` — matches the runner convention (run.js only calls `.up`).
 *
 * Deployment note: execute `node apps/api/migrations/run.js` on first deploy with real
 * Postgres (no local DB in the dev environment — this migration is syntax/schema reviewed,
 * must be executed against the production database).
 */
module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    // Same table list as 20260707_002_enable_rls.js: every table that receives strict
    // policies must have its legacy NULL rows backfilled first. "Users" etc. are
    // case-sensitive Sequelize identifiers (quoted); data_* are lowercase boot-time tables.
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
      '"Stores"',
      '"EODLogs"',
      '"Employees"',
      '"SyncLogs"',
      '"SyncSummaries"',
      '"SyncAlertStates"',
      '"BackupLogs"',
      '"SystemLogs"',
      "agent_monitoring",
      // RBAC tables
      '"Roles"',
      '"RolePermissions"',
      '"UserRoles"',
      '"UserPermissionOverrides"',
      '"UserBranchScopes"',
      '"Users"',
      // Live Menu Display tables (screen_playlists / playlist_items / billing_invoices
      // have no org_id column — they are skipped by the information_schema check below)
      "screens",
      "playlists",
      "media_assets",
      "screen_playlists",
      "playlist_items",
      // Billing tables
      "subscriptions",
      "billing_invoices",
    ];

    await sequelize.transaction(async (t) => {
      // Resolve the default tenant once (oldest by created_at) — same rule as
      // utils/ensureDefaultTenant.js.
      const [tenantRows] = await sequelize.query(
        `SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1;`,
        { transaction: t }
      );
      const defaultTenantId = tenantRows?.[0]?.id;
      if (!defaultTenantId) {
        console.warn(
          "[backfill-org-id] No tenants exist yet — skipping org_id backfill (run again after tenant creation)"
        );
        return;
      }
      console.log(`[backfill-org-id] Default tenant: ${defaultTenantId}`);

      // Discover which tables actually carry an org_id column (no hardcoded exception
      // list). information_schema returns the literal name, so quoted identifiers
      // ("Users") and lowercase boot-time tables both match their bare names.
      const [columns] = await sequelize.query(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema = 'public' AND column_name = 'org_id';`,
        { transaction: t }
      );
      const tablesWithOrgId = new Set(columns.map((c) => c.table_name));

      for (const table of tables) {
        const bare = table.replace(/^"|"$/g, "");
        if (!tablesWithOrgId.has(bare)) {
          console.warn(`[backfill-org-id] ${bare}: no org_id column — skipped`);
          continue;
        }
        try {
          const [result] = await sequelize.query(
            `UPDATE ${table} SET org_id = $1 WHERE org_id IS NULL;`,
            { bind: [defaultTenantId], transaction: t }
          );
          console.log(`[backfill-org-id] ${bare}: ${result?.rowCount ?? 0} rows`);
        } catch (err) {
          const msg = String(err?.message || "").toLowerCase();
          if (
            msg.includes("does not exist") ||
            msg.includes("column") ||
            msg.includes("not found")
          ) {
            console.warn(`[backfill-org-id] ${bare}: skipped (${err.message})`);
            continue;
          }
          throw err;
        }
      }
    });
  },

  down: null,
};
