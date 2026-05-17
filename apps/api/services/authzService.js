/**
 * Authorization service for loading user permissions and branch scopes
 */
const db = require("../models");

/**
 * Load complete authorization context for a user
 * @param {number} userId
 * @returns {Promise<Object>} Authorization context
 */
async function loadUserAuthz(userId) {
  // Load user with roles, permission overrides, and branch scopes
  const user = await db.User.findByPk(userId, {
    include: [
      {
        model: db.Role,
        as: "roles",
        include: [
          {
            model: db.RolePermission,
            as: "permissions",
            attributes: ["permission"],
          },
        ],
      },
      {
        model: db.UserPermissionOverride,
        as: "permissionOverrides",
        attributes: ["permission", "effect"],
      },
      {
        model: db.UserBranchScope,
        as: "branchScopes",
        attributes: ["branch_id"],
      },
    ],
  });

  if (!user) {
    return null;
  }

  // Extract role names
  const roleNames = (user.roles || []).map((r) => r.name);

  // Collect permissions from all roles
  const rolePermsSet = new Set();
  for (const role of user.roles || []) {
    for (const rp of role.permissions || []) {
      rolePermsSet.add(rp.permission);
    }
  }
  const rolePerms = Array.from(rolePermsSet);

  // Extract overrides
  const overridesAllow = [];
  const overridesDeny = [];
  for (const override of user.permissionOverrides || []) {
    if (override.effect === "allow") {
      overridesAllow.push(override.permission);
    } else if (override.effect === "deny") {
      overridesDeny.push(override.permission);
    }
  }

  // Compute effective permissions:
  // 1) Start with role permissions
  // 2) Remove denied
  // 3) Add allowed
  const effectivePermsSet = new Set(rolePerms);
  for (const perm of overridesDeny) {
    effectivePermsSet.delete(perm);
  }
  for (const perm of overridesAllow) {
    effectivePermsSet.add(perm);
  }
  const effectivePerms = Array.from(effectivePermsSet);

  // Extract branch scopes - normalize to strings for consistent comparison
  const scopeBranches = (user.branchScopes || []).map((bs) => String(bs.branch_id));
  const isAllBranches = scopeBranches.length === 0;

  return {
    userId,
    roleNames,
    rolePerms,
    overridesAllow,
    overridesDeny,
    effectivePerms,
    scopeBranches,
    isAllBranches,
  };
}

/**
 * Check if user has a specific permission
 * @param {Object} authz - Authorization context from loadUserAuthz
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(authz, permission) {
  if (!authz) return false;
  return authz.effectivePerms.includes(permission);
}

/**
 * Check if user can access a specific branch
 * @param {Object} authz - Authorization context
 * @param {number} branchId - Branch ID to check
 * @returns {boolean}
 */
function canAccessBranch(authz, branchId) {
  if (!authz) return false;
  if (authz.isAllBranches) return true;
  return authz.scopeBranches.includes(String(branchId));
}

/**
 * Get allowed branch IDs for query filtering
 * @param {Object} authz - Authorization context
 * @returns {number[]|null} - Array of branch IDs or null if all branches allowed
 */
function getAllowedBranches(authz) {
  if (!authz) return [];
  if (authz.isAllBranches) return null; // null means no filter needed
  return authz.scopeBranches;
}

module.exports = {
  loadUserAuthz,
  hasPermission,
  canAccessBranch,
  getAllowedBranches,
};
