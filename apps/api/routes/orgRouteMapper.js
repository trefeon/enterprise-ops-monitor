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
 * @param {boolean} [options.skipTenantMwOnLegacy=false] - Opt out of tenant middleware on
 *   the legacy path (only for routes that must stay auth-free / boot-time, e.g. public
 *   agent version endpoints). Default applies tenant isolation to legacy paths too (ADR-4).
 */
function mountOrgRoute(app, legacyPath, router, options = {}) {
  const { skipTenantMwOnLegacy = false } = options;

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

  // NOTE: The legacy path now runs tenantMiddleware too (default). Every legacy request
  // explicitly (re)writes app.tenant_id / app.is_super_admin at request start, so a
  // pooled connection can never carry a previous org-scoped request's tenant context
  // into a legacy request. Routes that must remain auth-free / boot-time (agent version,
  // TV dashboards, media display) can opt out via { skipTenantMwOnLegacy: true }.
}

/**
 * Mount a route that should NOT be org-scoped (keeps only legacy path).
 */
function mountLegacyOnly(app, legacyPath, router) {
  app.use(legacyPath, router);
}

module.exports = { mountOrgRoute, mountLegacyOnly };
// WAVE A COMPLETE — orgRouteMapper.js
