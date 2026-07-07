/**
 * Tenant resolution middleware.
 *
 * Reads the tenant identifier from:
 *   1. req.params.orgId (org-scoped routes)
 *   2. req.user.orgId (set by auth middleware from JWT)
 *
 * Sets req.tenantId and issues SET LOCAL app.tenant_id for RLS.
 */
const db = require("../models");

module.exports = async function tenantMiddleware(req, res, next) {
  // Priority 1: explicit orgId from URL param
  let tenantId = req.params?.orgId || null;

  // SECURITY: Validate URL param orgId matches JWT orgId
  // Prevents a user with Org A's JWT from accessing Org B's data by changing :orgId in URL
  if (tenantId && req.user?.orgId) {
    if (tenantId !== req.user.orgId) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "TENANT_MISMATCH",
          message: "Organization mismatch",
        },
      });
    }
  }

  // Priority 2: from authenticated user's orgId (only when no URL param)
  if (!tenantId && req.user?.orgId) {
    tenantId = req.user.orgId;
  }

  if (tenantId) {
    req.tenantId = tenantId;

    // Set session-local variable for RLS policies to read
    try {
      await db.sequelize.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    } catch (err) {
      // RLS setup may not exist yet; non-fatal
      console.warn("[tenantMiddleware] SET LOCAL app.tenant_id failed:", err.message);
    }
  }

  next();
};
// WAVE A COMPLETE — tenantMiddleware.js
