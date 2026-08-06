"use strict";

/**
 * Migration: refresh_tokens table with rotation + revocation support (issue #12).
 *
 * DB-backed refresh tokens: the raw 256-bit token is stored ONLY as a SHA-256
 * hash (token_hash UNIQUE), so a database leak does not expose usable tokens.
 * Rotation revokes the old row (revoked_at) and inserts a fresh one; expiry is
 * 30 days (expires_at).
 *
 * RLS mirrors 20260806_002_strict_tenant_policies.js: strict tenant isolation
 * (org_id must be set and match app.tenant_id) plus the super_admin escape
 * hatch. FORCE ROW LEVEL SECURITY keeps the table owner subject to the policies.
 *
 * NOTE on user_id type: it is INTEGER (not uuid) because the `Users` primary
 * key is INTEGER (see 20260123_000_create_users.js); a uuid column could
 * never store a real user id nor host the FK.
 *
 * Idempotent/forward-only: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS,
 * no `down` (matches the runner convention — run.js only calls `.up`).
 */
module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
        org_id UUID,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Idempotent policy (re)creation — drop-before-create like 20260806_002.
    await sequelize.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON refresh_tokens;`);
    await sequelize.query(`DROP POLICY IF EXISTS super_admin_policy ON refresh_tokens;`);

    // Strict tenant isolation (ADR-2): NULL-org rows are never readable across
    // tenants, and an unset app.tenant_id yields zero rows.
    await sequelize.query(`
      CREATE POLICY tenant_isolation_policy ON refresh_tokens
        FOR ALL
        USING (org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE))
        WITH CHECK (org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE));
    `);

    // env_admin escape (ADR-2): app.is_super_admin is set by tenantMiddleware.
    await sequelize.query(`
      CREATE POLICY super_admin_policy ON refresh_tokens
        USING (current_setting('app.is_super_admin', TRUE) = 'true');
    `);

    // Keep RLS enabled + forced (ENABLE re-asserted idempotently).
    await sequelize.query(`ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;`);
    await sequelize.query(`ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;`);
  },

  down: null,
};
