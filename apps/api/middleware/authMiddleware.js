const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");
const { normalizeRole } = require("../utils/roleMap");
const { loadUserAuthz } = require("../services/authzService");
const { ALL_PERMISSIONS } = require("../lib/permissions");
const { applyTenantContext } = require("./tenantContext");
const { setOrgId } = require("../services/dataClient");
const env = require("../config/env");

module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return fail(res, 401, "UNAUTHORIZED", "Missing Authorization bearer token", {
      requestId: req.id || null,
    });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    // Basic user info from JWT
    req.user = {
      id: payload.id,
      username: payload.username,
      role: normalizeRole(payload.role), // Legacy: keep for backward compatibility
      orgId: payload.orgId || null, // Org from JWT claim, used for tenant isolation
    };

    // Special handling for env_admin (non-database user from .env)
    // The env_admin has ID 'env_admin' (string) which cannot be queried in the Users table
    if (payload.id === "env_admin") {
      // Provide synthetic super_admin authz for env_admin
      req.authz = {
        userId: "env_admin",
        roleNames: ["super_admin"],
        rolePerms: ALL_PERMISSIONS,
        overridesAllow: [],
        overridesDeny: [],
        effectivePerms: ALL_PERMISSIONS,
        scopeBranches: [],
        isAllBranches: true,
      };
      req.user.role = "super_admin";
      // ADR-1/ADR-2: establish the RLS context AFTER JWT verification. On
      // legacy paths the mount-level tenantMiddleware runs before us (when
      // req.user was still undefined), so this is what actually scopes the
      // request. env_admin bypasses tenant isolation.
      await applyTenantContext(res, {
        tenantId: req.user.orgId,
        isSuperAdmin: payload.id === "env_admin",
      });
      return next();
    }

    // Load full authorization context from database for regular users
    const authz = await loadUserAuthz(payload.id);
    if (!authz) {
      return fail(res, 401, "UNAUTHORIZED", "User not found", { requestId: req.id || null });
    }

    req.authz = authz;

    // Also attach primary role name for backward compatibility
    if (authz.roleNames.length > 0) {
      req.user.role = authz.roleNames[0];
    }

    // ADR-1/ADR-2: establish the RLS context AFTER JWT verification using the
    // JWT orgId claim (same reason as the env_admin branch above — legacy
    // paths run mount-level tenantMiddleware before authMiddleware).
    await applyTenantContext(res, {
      tenantId: req.user.orgId,
      isSuperAdmin: payload.id === "env_admin",
    });

    // Slice 4: activate org-scoped dataClient cache keys and load the JWT
    // org's branches for the live fetchers. Only when an orgId is present
    // (env_admin has none — legacy `data:legacy:*` keys stay correct for its
    // cross-tenant views). Non-fatal: setOrgId falls back to legacy branches
    // when the DB fetch fails, so a failure here must not break the request.
    const orgId = req.user.orgId || req.tenantId || null;
    if (orgId) {
      try {
        await setOrgId(orgId);
      } catch (err) {
        console.warn("[authMiddleware] setOrgId failed (non-fatal):", err?.message || err);
      }
    }

    return next();
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return fail(res, 401, "UNAUTHORIZED", "Invalid or expired token", {
        requestId: req.id || null,
      });
    }
    console.error("Auth middleware error:", e);
    return fail(res, 500, "INTERNAL_ERROR", "Authentication error", { requestId: req.id || null });
  }
};
