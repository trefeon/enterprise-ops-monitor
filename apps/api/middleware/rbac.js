const { fail } = require("../utils/response");
const { hasPermission, canAccessBranch, getAllowedBranches } = require("../services/authzService");
const db = require("../models");

function getRequestAllowedBranches(req) {
  if (Object.prototype.hasOwnProperty.call(req, "allowedBranches")) {
    return req.allowedBranches;
  }
  return getAllowedBranches(req.authz);
}

function extractStoreIdentifier(req) {
  const candidates = [
    req.params?.storeCode,
    req.query?.storeCode,
    req.body?.storeCode,
    req.params?.store_code,
    req.query?.store_code,
    req.body?.store_code,
    req.params?.kodetoko,
    req.query?.kodetoko,
    req.body?.kodetoko,
    req.params?.id,
    req.query?.id,
    req.body?.id,
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const text = String(candidate).trim();
    if (text) return text;
  }

  return null;
}

async function lookupStoreBranchId(storeCode) {
  if (!storeCode) return null;

  const [storeResult] = await db.sequelize.query(
    `SELECT branch_id FROM data_stores WHERE store_code = :storeCode LIMIT 1`,
    { replacements: { storeCode: String(storeCode) }, type: db.Sequelize.QueryTypes.SELECT }
  );

  if (!storeResult || storeResult.branch_id == null) {
    return null;
  }

  const branchId = String(storeResult.branch_id).trim();
  return branchId || null;
}

function ensureBranchAccessForBranchId(req, branchId, options = {}) {
  const { failClosed = true } = options;
  const allowedBranches = getRequestAllowedBranches(req);

  if (allowedBranches === null) {
    return { ok: true, branchId: branchId == null ? null : String(branchId) };
  }

  if (!Array.isArray(allowedBranches) || allowedBranches.length === 0) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Access denied for this branch",
      details: { branchId: null },
    };
  }

  if (branchId == null || String(branchId).trim() === "") {
    if (!failClosed) {
      return { ok: true, branchId: null, unresolved: true };
    }
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Branch scope could not be resolved",
      details: { branchId: null },
    };
  }

  const normalizedBranchId = String(branchId);
  if (!allowedBranches.includes(normalizedBranchId)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Access denied for this branch",
      details: { branchId: normalizedBranchId },
    };
  }

  return { ok: true, branchId: normalizedBranchId };
}

async function ensureStoreBranchAccess(req, storeCode, options = {}) {
  const { failClosed = true } = options;
  const allowedBranches = getRequestAllowedBranches(req);

  if (allowedBranches === null) {
    return { ok: true, branchId: null };
  }

  if (!Array.isArray(allowedBranches) || allowedBranches.length === 0) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Access denied for this branch",
      details: { branchId: null },
    };
  }

  const branchId = await lookupStoreBranchId(storeCode);
  if (!branchId) {
    if (!failClosed) {
      return { ok: true, branchId: null, unresolved: true };
    }
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Branch scope could not be resolved for this store",
      details: { storeCode: String(storeCode || "") || null },
    };
  }

  return ensureBranchAccessForBranchId(req, branchId, { failClosed: true });
}

/**
 * Middleware to require a specific permission
 * @param {string} permission - Required permission
 * @param {Object} [options] - Optional scope configuration
 * @param {string} [options.scope] - 'branch' | 'none' (default: 'none')
 * @param {string} [options.branchFrom] - Where to get branch_id: 'params' | 'query' | 'body' | 'auto'
 * @param {boolean} [options.storeLookup] - If true, lookup store's branch_id from storeCode
 * @returns {Function} Express middleware
 */
function requirePermission(permission, options = {}) {
  const { scope = "none", branchFrom = "params", storeLookup = false } = options;

  return async (req, res, next) => {
    const authz = req.authz;

    // Check authentication
    if (!authz) {
      return fail(res, 401, "UNAUTHORIZED", "Not authenticated");
    }

    // Check permission
    if (!hasPermission(authz, permission)) {
      return fail(res, 403, "FORBIDDEN", "Insufficient permissions", { permission });
    }

    req.allowedBranches = getAllowedBranches(authz);

    // If no scope check needed, proceed
    if (scope !== "branch") {
      return next();
    }

    // If user has all branches, no need to check
    if (authz.isAllBranches) {
      return next();
    }

    // Extract branch_id for scope check
    let branchId = null;

    if (branchFrom === "auto" || storeLookup) {
      // Auto-detect: try to find store identifiers and lookup branch
      const storeIdentifier = extractStoreIdentifier(req);
      if (storeIdentifier) {
        branchId = await lookupStoreBranchId(storeIdentifier);
      }
    }

    if (!branchId) {
      // Try explicit branch_id from request
      if (branchFrom === "params" || branchFrom === "auto") {
        branchId = req.params?.branchId || req.params?.branch_id;
      }
      if (!branchId && (branchFrom === "query" || branchFrom === "auto")) {
        branchId = req.query?.branchId || req.query?.branch_id;
      }
      if (!branchId && (branchFrom === "body" || branchFrom === "auto")) {
        branchId = req.body?.branchId || req.body?.branch_id;
      }
    }

    // If we have a branch_id, check access
    if (branchId && !canAccessBranch(authz, branchId)) {
      return fail(res, 403, "FORBIDDEN", "Access denied for this branch", { branchId });
    }

    return next();
  };
}

/**
 * Middleware to ensure user has scope for branch-filtered queries
 * Attaches req.allowedBranches for use in controllers
 */
function attachBranchScope() {
  return (req, res, next) => {
    const authz = req.authz;
    if (authz) {
      req.allowedBranches = getAllowedBranches(authz);
    }
    return next();
  };
}

/**
 * Check if request can access a specific store
 * For use in controllers after the initial permission check
 * @param {Object} authz - Authorization context
 * @param {number} storeCode - Store code to check
 * @returns {Promise<boolean>}
 */
async function canAccessStore(authz, storeCode) {
  if (!authz) return false;
  if (authz.isAllBranches) return true;

  const branchId = await lookupStoreBranchId(storeCode);
  if (!branchId) return false;
  return canAccessBranch(authz, branchId);
}

/**
 * Middleware to enforce all-branch scope for global operations.
 */
function requireAllBranchScope() {
  return (req, res, next) => {
    if (!req.authz) {
      return fail(res, 401, "UNAUTHORIZED", "Not authenticated");
    }

    const allowedBranches = getAllowedBranches(req.authz);
    req.allowedBranches = allowedBranches;

    if (allowedBranches !== null) {
      return fail(res, 403, "FORBIDDEN", "This operation requires all-branch scope");
    }

    return next();
  };
}

/**
 * Middleware to reject demo accounts from write operations
 */
function requireNotDemo() {
  return (req, res, next) => {
    if (!req.authz) {
      return fail(res, 401, "UNAUTHORIZED", "Not authenticated");
    }
    const user = req.authz.user || req.user;
    if (user?.isDemo || String(user?.role || '') === 'demo' || (req.authz.roleNames || []).includes('demo')) {
      return fail(res, 403, "DEMO_RESTRICTED", "This action is not available for demo accounts");
    }
    return next();
  };
}

module.exports = {
  requirePermission,
  requireNotDemo,
  requireAllBranchScope,
  attachBranchScope,
  canAccessStore,
  getRequestAllowedBranches,
  extractStoreIdentifier,
  lookupStoreBranchId,
  ensureBranchAccessForBranchId,
  ensureStoreBranchAccess,
};
