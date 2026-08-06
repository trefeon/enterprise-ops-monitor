"use strict";

/**
 * Migration: Replace permissive RLS policies with strict tenant + super-admin policies.
 *
 * PRD ADR-2 / ARCHITECTURE.md §2.2: the old policy (`org_id IS NULL OR org_id::text =
 * current_setting('app.tenant_id', TRUE)`) exposes every NULL-org row to every tenant.
 * After 20260806_001 backfills those rows, we drop it and create:
 *
 *   - tenant_isolation_policy (FOR ALL): `org_id IS NOT NULL AND org_id::text =
 *     current_setting('app.tenant_id', TRUE)` (same WITH CHECK) — "NULL-safe: if
 *     app.tenant_id is not set, return zero rows".
 *   - super_admin_policy: `current_setting('app.is_super_admin', TRUE) = 'true'` —
 *     the env_admin escape hatch (set by tenantMiddleware per request).
 *
 * FORCE ROW LEVEL SECURITY is kept where it was (and ENABLE re-asserted idempotently so
 * the migration is self-sufficient if the earlier RLS migration skipped a table).
 *
 * Only tables that actually have an org_id column are processed (queried from
 * information_schema.columns — screen_playlists / playlist_items / billing_invoices have
 * no org_id and are skipped with a warning; no hardcoded exception list).
 *
 * Idempotent: DROP POLICY IF EXISTS before CREATE.
 * Forward-only: no `down` — matches the runner convention (run.js only calls `.up`).
 *
 * Deployment note: execute `node apps/api/migrations/run.js` on first deploy with real
 * Postgres (no local DB in the dev environment — this migration is syntax/schema reviewed,
 * must be executed against the production database).
 */
module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    // Same table list as 20260707_002_enable_rls.js (all tables that had RLS applied).
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

    // Only tables that carry an org_id column can host the strict policy — it references
    // org_id directly. Resolved from information_schema so no exception list is hardcoded.
    const [columns] = await sequelize.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'org_id';`
    );
    const tablesWithOrgId = new Set(columns.map((c) => c.table_name));

    for (const table of tables) {
      const bare = table.replace(/^"|"$/g, "");
      if (!tablesWithOrgId.has(bare)) {
        console.warn(`[rls-strict] ${bare}: no org_id column — policy skipped`);
        continue;
      }

      try {
        // Idempotent: drop both policies before creating (drop-before-create).
        await sequelize.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`);
        await sequelize.query(`DROP POLICY IF EXISTS super_admin_policy ON ${table};`);

        // Strict tenant isolation (ADR-2): NULL org_id rows are never visible, and an
        // unset app.tenant_id yields zero rows.
        await sequelize.query(`
          CREATE POLICY tenant_isolation_policy ON ${table}
            FOR ALL
            USING (org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE))
            WITH CHECK (org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE));
        `);

        // env_admin escape (ADR-2): app.is_super_admin is set by tenantMiddleware.
        await sequelize.query(`
          CREATE POLICY super_admin_policy ON ${table}
            USING (current_setting('app.is_super_admin', TRUE) = 'true');
        `);

        // Keep RLS enabled + forced where it was (ENABLE re-asserted idempotently).
        await sequelize.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
        await sequelize.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);

        console.log(`[rls-strict] ${bare}: strict tenant + super_admin policies applied`);
      } catch (err) {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("already exists") ||
          msg.includes("is not a superuser") ||
          msg.includes("permission denied")
        ) {
          console.warn(`[rls-strict] Skipping ${bare}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }
  },

  down: null,
};
