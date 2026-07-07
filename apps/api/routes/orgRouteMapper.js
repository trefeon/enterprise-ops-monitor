/**
 * Org-scoped route mapper.
 *
 * Creates Express middleware that mounts the same route file under both:
 *   - /api/... (legacy, backward-compatible)
 *   - /api/orgs/:orgId/... (new, multi-tenant)
 *
 * Usage:
 *   const { mountOrgRoute } = require("./orgRouteMapper");
 *   mountOrgRoute(app, "/api/stores", storeRoutes);
 *   // Mounts at /api/stores AND /api/orgs/:orgId/stores
 */
const tenantMiddleware = require("../middleware/tenantMiddleware");

/**
 * Mount a route file under both legacy and org-scoped paths.
 *
 * @param {import('express').Express} app - Express app instance
 * @param {string} legacyPath - Legacy path e.g. "/api/stores"
 * @param {import('express').Router} router - Express router
 * @param {Object} [options]
 * @param {boolean} [options.skipTenantMwOnLegacy=true] - Don't apply tenant middleware on legacy path
 */
function mountOrgRoute(app, legacyPath, router, options = {}) {
  const { skipTenantMwOnLegacy = true } = options;

  // Legacy path (backward compat)
  if (skipTenantMwOnLegacy) {
    app.use(legacyPath, router);
  } else {
    app.use(legacyPath, tenantMiddleware, router);
  }

  // Org-scoped path
  // e.g. /api/orgs/:orgId/stores
  const basePath = legacyPath.replace(/^\/api\//, "/api/orgs/:orgId/");
  // auth/scoped routes: auth routes at /api/auth stay at /api/auth
  // but /api/stores becomes /api/orgs/:orgId/stores
  app.use(basePath, tenantMiddleware, router);

  // NOTE: Legacy path intentionally OMITS tenantMiddleware because all
  // new code should use the org-scoped path. The legacy path is for
  // backward compat only and will be deprecated.
  // RLS provides a safety net on boot-time tables for any missing filters.
}

/**
 * Mount a route that should NOT be org-scoped (keeps only legacy path).
 */
function mountLegacyOnly(app, legacyPath, router) {
  app.use(legacyPath, router);
}

module.exports = { mountOrgRoute, mountLegacyOnly };
// WAVE A COMPLETE — orgRouteMapper.js
