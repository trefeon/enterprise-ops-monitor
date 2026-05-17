// Keep this aligned with dashboard-web/src/lib/auth/permissions.js

/**
 * All available permissions in the system
 * Grouped by category for organization
 */
const Permissions = {
  // Section/Menu permissions
  DASHBOARD_VIEW: "DASHBOARD_VIEW",
  SYNC_VIEW: "SYNC_VIEW",
  EOD_VIEW: "EOD_VIEW",
  STORES_VIEW: "STORES_VIEW",
  EMPLOYEES_VIEW: "EMPLOYEES_VIEW",
  BACKUPS_VIEW: "BACKUPS_VIEW",
  SYSTEM_VIEW: "SYSTEM_VIEW",
  ACCOUNTS_VIEW: "ACCOUNTS_VIEW",

  // EOD granular
  EOD_SYNC: "EOD_SYNC",
  EOD_RETRY: "EOD_RETRY",

  // Stores granular
  STORES_EDIT: "STORES_EDIT",

  // Identity/NIK
  NIK_LOOKUP: "NIK_LOOKUP",

  // Backups granular
  BACKUPS_RUN: "BACKUPS_RUN",
  BACKUPS_DELETE: "BACKUPS_DELETE",
  BACKUPS_RESTORE: "BACKUPS_RESTORE",

  // System granular
  SYSTEM_HEALTHCHECK: "SYSTEM_HEALTHCHECK",
  SYSTEM_RESTART: "SYSTEM_RESTART",

  // Accounts/Users granular
  USERS_VIEW: "USERS_VIEW",
  USERS_CREATE: "USERS_CREATE",
  USERS_EDIT: "USERS_EDIT",
  USERS_RESET_PASSWORD: "USERS_RESET_PASSWORD",
  USERS_CHANGE_PASSWORD: "USERS_CHANGE_PASSWORD",
  USERS_ROLE_EDIT: "USERS_ROLE_EDIT",
  USERS_PERMISSION_EDIT: "USERS_PERMISSION_EDIT",
  USERS_SCOPE_EDIT: "USERS_SCOPE_EDIT",
  USERS_DELETE: "USERS_DELETE",

  // Roles granular
  ROLES_VIEW: "ROLES_VIEW",
  ROLES_EDIT: "ROLES_EDIT",

  // After Hours
  AFTERHOURS_VIEW: "AFTERHOURS_VIEW",

  // Agent Update
  AGENT_UPDATE: "AGENT_UPDATE",
};

/**
 * Permission categories for UI grouping
 */
const PermissionGroups = {
  Dashboard: ["DASHBOARD_VIEW"],
  "Store Sync": ["SYNC_VIEW"],
  "EOD Monitor": ["EOD_VIEW", "EOD_SYNC", "EOD_RETRY"],
  Stores: ["STORES_VIEW", "STORES_EDIT"],
  Employees: ["EMPLOYEES_VIEW", "NIK_LOOKUP"],
  Backups: ["BACKUPS_VIEW", "BACKUPS_RUN", "BACKUPS_DELETE", "BACKUPS_RESTORE"],
  System: ["SYSTEM_VIEW", "SYSTEM_HEALTHCHECK", "SYSTEM_RESTART", "AGENT_UPDATE"],
  "After Hours": ["AFTERHOURS_VIEW"],
  Accounts: [
    "ACCOUNTS_VIEW",
    "USERS_VIEW",
    "USERS_CREATE",
    "USERS_EDIT",
    "USERS_RESET_PASSWORD",
    "USERS_CHANGE_PASSWORD",
    "USERS_ROLE_EDIT",
    "USERS_PERMISSION_EDIT",
    "USERS_SCOPE_EDIT",
    "ROLES_VIEW",
    "ROLES_EDIT",
    "USERS_DELETE",
  ],
};

/**
 * All permissions as array
 */
const ALL_PERMISSIONS = Object.values(Permissions);

/**
 * Legacy RolePermissions map for backward compatibility
 * @deprecated Use database-driven roles instead
 */
const RolePermissions = {
  viewer: [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "STORES_VIEW",
    "EMPLOYEES_VIEW",
    "NIK_LOOKUP",
    "BACKUPS_VIEW",
    "SYSTEM_VIEW",
  ],
  ops: [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "EOD_SYNC",
    "EOD_RETRY",
    "STORES_VIEW",
    "EMPLOYEES_VIEW",
    "NIK_LOOKUP",
    "BACKUPS_VIEW",
    "BACKUPS_RUN",
    "SYSTEM_VIEW",
  ],
  admin: [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "EOD_SYNC",
    "EOD_RETRY",
    "STORES_VIEW",
    "STORES_EDIT",
    "EMPLOYEES_VIEW",
    "NIK_LOOKUP",
    "BACKUPS_VIEW",
    "BACKUPS_RUN",
    "BACKUPS_DELETE",
    "SYSTEM_VIEW",
    "SYSTEM_HEALTHCHECK",
    "ACCOUNTS_VIEW",
    "USERS_VIEW",
    "USERS_CREATE",
    "USERS_EDIT",
    "USERS_RESET_PASSWORD",
    "USERS_ROLE_EDIT",
    "USERS_PERMISSION_EDIT",
    "USERS_SCOPE_EDIT",
    "USERS_DELETE",
    "ROLES_VIEW",
    "AFTERHOURS_VIEW",
    "AGENT_UPDATE",
  ],
  super_admin: ALL_PERMISSIONS,
  demo: [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "STORES_VIEW",
    "EMPLOYEES_VIEW",
    "NIK_LOOKUP",
    "BACKUPS_VIEW",
    "SYSTEM_VIEW",
    "ACCOUNTS_VIEW",
    "USERS_VIEW",
    "ROLES_VIEW",
    "AFTERHOURS_VIEW",
    "AGENT_UPDATE",
    "SYSTEM_HEALTHCHECK",
  ],
  it: [
    "DASHBOARD_VIEW",
    "SYNC_VIEW",
    "EOD_VIEW",
    "EOD_SYNC",
    "EOD_RETRY",
    "STORES_VIEW",
    "EMPLOYEES_VIEW",
    "NIK_LOOKUP",
    "BACKUPS_VIEW",
    "BACKUPS_RUN",
    "SYSTEM_VIEW",
    "SYSTEM_HEALTHCHECK",
    "AGENT_UPDATE",
  ],
  hc: ["DASHBOARD_VIEW", "EMPLOYEES_VIEW", "NIK_LOOKUP"],
};

/**
 * Legacy can() function for backward compatibility
 * @deprecated Use req.authz.effectivePerms instead
 */
function can(role, permission) {
  const { normalizeRole } = require("../utils/roleMap");
  const normalized = normalizeRole(role);
  return (RolePermissions[normalized] || []).includes(permission);
}

module.exports = {
  Permissions,
  PermissionGroups,
  ALL_PERMISSIONS,
  RolePermissions,
  can,
};
