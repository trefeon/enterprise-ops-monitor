/**
 * Tenant resolution middleware.
 *
 * Reads the tenant identifier from:
 *   1. req.params.orgId (org-scoped routes)
 *   2. req.user.orgId (set by auth middleware from JWT)
 *
 * Sets req.tenantId and issues a parameterized
 * `SELECT set_config('app.tenant_id', $1, false)` for RLS (ADR-1).
 *
 * Security (ADR-1):
 *   - orgId is validated as a UUID BEFORE it can reach any SQL, closing the
 *     node-postgres simple-query protocol injection via req.params.orgId.
 *   - Session settings are always written with bind parameters only — no
 *     string interpolation of request data.
 *   - app.tenant_id / app.is_super_admin are explicitly written on EVERY
 *     request (NULL / 'false' when no tenant applies) and reset again on
 *     response finish, so pooled connections never leak tenant context
 *     between requests.
 *
 * The set_config work is shared with authMiddleware via
 * tenantContext.applyTenantContext, so the RLS context is ALSO established
 * after JWT verification on legacy /api/* paths (where this mount-level
 * middleware runs before authMiddleware and req.user is not yet available).
 */
const { applyTenantContext, UUID_RE } = require("./tenantContext");

module.exports = async function tenantMiddleware(req, res, next) {
  // Priority 1: explicit orgId from URL param
  let tenantId = req.params?.orgId || null;

  // SECURITY: orgId must be a UUID. Reject anything else (including SQL
  // injection probes) before it can reach the database.
  if (tenantId && !UUID_RE.test(tenantId)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_ORG_ID",
        message: "Invalid organization id",
      },
    });
  }

  // SECURITY: Validate URL param orgId matches JWT orgId
  // Prevents a user with Org A's JWT from accessing Org B's data by changing :orgId in URL
  if (tenantId && req.user?.orgId && tenantId !== req.user.orgId) {
    return res.status(403).json({
      ok: false,
      error: {
        code: "TENANT_MISMATCH",
        message: "Organization mismatch",
      },
    });
  }

  // Priority 2: from authenticated user's orgId (only when no URL param)
  if (!tenantId && req.user?.orgId) {
    tenantId = req.user.orgId;
  }

  if (tenantId) {
    req.tenantId = tenantId;
  }

  // ADR-1 reset discipline: explicitly write BOTH settings on every request
  // (NULL / 'false' when no tenant applies) so a pooled connection can never
  // carry the previous request's tenant context. Non-fatal on DB errors
  // (handled inside applyTenantContext).
  await applyTenantContext(res, {
    tenantId,
    isSuperAdmin: req.user?.id === "env_admin",
  });

  next();
};
// WAVE A COMPLETE — tenantMiddleware.js
