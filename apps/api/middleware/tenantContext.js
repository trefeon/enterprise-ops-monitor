/**
 * Shared tenant-context helper (ADR-1 / ADR-2).
 *
 * Writes the session-scoped `app.tenant_id` / `app.is_super_admin` settings
 * consumed by the strict RLS policies, and registers response-finish cleanup
 * so pooled connections never leak tenant context between requests.
 *
 * Used by both tenantMiddleware (mount level) and authMiddleware (after JWT
 * verification) so the RLS context is established on every path — including
 * legacy /api/* paths where the router's authMiddleware runs AFTER the
 * mount-level tenantMiddleware and req.user is not yet available there.
 *
 * Idempotent: calling twice for the same request is safe — the later call
 * wins for the request, and registering finish cleanup twice is harmless
 * (both handlers reset both settings to NULL).
 *
 * Security (ADR-1):
 *   - Session settings are always written with bind parameters only — no
 *     string interpolation of request data (closes the node-postgres
 *     simple-query protocol injection via req.params.orgId).
 *   - app.tenant_id / app.is_super_admin are explicitly written on EVERY
 *     request (NULL / 'false' when no tenant applies) and reset again on
 *     response finish, so pooled connections never leak tenant context
 *     between requests.
 *   - Failures are non-fatal (RLS may not exist yet on a fresh database).
 */
const db = require("../models");

// Tenants are created with gen_random_uuid() (UUID v4).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, false)";
const SET_SUPER_ADMIN_SQL = "SELECT set_config('app.is_super_admin', $1, false)";

/**
 * Apply the RLS tenant context for the current request's pooled connection.
 *
 * @param {object} res - Express response (used to register finish cleanup)
 * @param {{ tenantId?: string|null, isSuperAdmin?: boolean|string }} [ctx]
 *        tenantId — org UUID, or null/'false' semantics when not provided.
 *        isSuperAdmin — boolean (or 'true'/'false' string); default false.
 * @returns {Promise<void>} resolves always (errors are logged, non-fatal)
 */
async function applyTenantContext(res, { tenantId = null, isSuperAdmin = false } = {}) {
  const superAdminValue = isSuperAdmin === true || isSuperAdmin === "true" ? "true" : "false";

  try {
    await db.sequelize.query(SET_TENANT_SQL, { bind: [tenantId || null] });
    await db.sequelize.query(SET_SUPER_ADMIN_SQL, { bind: [superAdminValue] });
  } catch (err) {
    // RLS setup may not exist yet; non-fatal
    console.warn("[tenantContext] set_config failed:", err.message);
  }

  // ADR-1 reset discipline: clear the session settings once the response
  // completes so pooled connections never leak tenant context between requests.
  // Fire-and-forget: the request is already finishing, so failures are only
  // logged. Registering this twice for the same request is harmless (both
  // handlers reset both settings to NULL).
  res.on("finish", () => {
    db.sequelize
      .query(SET_TENANT_SQL, { bind: [null] })
      .catch((err) => console.warn("[tenantContext] reset app.tenant_id failed:", err.message));
    db.sequelize
      .query(SET_SUPER_ADMIN_SQL, { bind: [null] })
      .catch((err) =>
        console.warn("[tenantContext] reset app.is_super_admin failed:", err.message)
      );
  });
}

module.exports = { applyTenantContext, UUID_RE };
