/**
 * All available permissions in the system
 * Keep aligned with dashboard-api/lib/permissions.js
 */

/**
 * @typedef {'DASHBOARD_VIEW' | 'SYNC_VIEW' | 'EOD_VIEW' | 'STORES_VIEW' | 'EMPLOYEES_VIEW' | 'BACKUPS_VIEW' | 'SYSTEM_VIEW' | 'ACCOUNTS_VIEW' | 'EOD_SYNC' | 'EOD_RETRY' | 'STORES_EDIT' | 'NIK_LOOKUP' | 'EMPLOYEES_EDIT' | 'BACKUPS_RUN' | 'BACKUPS_DELETE' | 'BACKUPS_RESTORE' | 'SYSTEM_HEALTHCHECK' | 'SYSTEM_RESTART' | 'USERS_VIEW' | 'USERS_CREATE' | 'USERS_EDIT' | 'USERS_DELETE' | 'USERS_RESET_PASSWORD' | 'USERS_CHANGE_PASSWORD' | 'USERS_ROLE_EDIT' | 'USERS_PERMISSION_EDIT' | 'USERS_SCOPE_EDIT' | 'ROLES_VIEW' | 'ROLES_EDIT' | 'AFTERHOURS_VIEW' | 'AGENT_UPDATE'} Permission
 */

/**
 * Permission constants
 */
export const Permissions = {
  // Section/Menu permissions
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  SYNC_VIEW: 'SYNC_VIEW',
  EOD_VIEW: 'EOD_VIEW',
  STORES_VIEW: 'STORES_VIEW',
  EMPLOYEES_VIEW: 'EMPLOYEES_VIEW',
  BACKUPS_VIEW: 'BACKUPS_VIEW',
  SYSTEM_VIEW: 'SYSTEM_VIEW',
  ACCOUNTS_VIEW: 'ACCOUNTS_VIEW',

  // EOD granular
  EOD_SYNC: 'EOD_SYNC',
  EOD_RETRY: 'EOD_RETRY',

  // Stores granular
  STORES_EDIT: 'STORES_EDIT',

  // Identity/NIK
  NIK_LOOKUP: 'NIK_LOOKUP',
  EMPLOYEES_EDIT: 'EMPLOYEES_EDIT',

  // Backups granular
  BACKUPS_RUN: 'BACKUPS_RUN',
  BACKUPS_DELETE: 'BACKUPS_DELETE',
  BACKUPS_RESTORE: 'BACKUPS_RESTORE',

  // System granular
  SYSTEM_HEALTHCHECK: 'SYSTEM_HEALTHCHECK',
  SYSTEM_RESTART: 'SYSTEM_RESTART',

  // Accounts/Users granular
  USERS_VIEW: 'USERS_VIEW',
  USERS_CREATE: 'USERS_CREATE',
  USERS_EDIT: 'USERS_EDIT',
  USERS_RESET_PASSWORD: 'USERS_RESET_PASSWORD',
  USERS_CHANGE_PASSWORD: 'USERS_CHANGE_PASSWORD',
  USERS_ROLE_EDIT: 'USERS_ROLE_EDIT',
  USERS_PERMISSION_EDIT: 'USERS_PERMISSION_EDIT',
  USERS_SCOPE_EDIT: 'USERS_SCOPE_EDIT',
  USERS_DELETE: 'USERS_DELETE',

  // Roles granular
  ROLES_VIEW: 'ROLES_VIEW',
  ROLES_EDIT: 'ROLES_EDIT',

  // After Hours
  AFTERHOURS_VIEW: 'AFTERHOURS_VIEW',

  // Agent Update
  AGENT_UPDATE: 'AGENT_UPDATE',
};

/**
 * Permission categories for UI grouping
 */
export const PermissionGroups = {
  Monitoring: ['DASHBOARD_VIEW', 'SYNC_VIEW', 'EOD_VIEW'], // View-only Dashboards
  'Store Operations': ['STORES_VIEW', 'STORES_EDIT', 'EOD_SYNC', 'EOD_RETRY'], // Store & EOD Actions
  'Employee Data': ['EMPLOYEES_VIEW', 'NIK_LOOKUP', 'EMPLOYEES_EDIT'], // HR Data
  Backups: ['BACKUPS_VIEW', 'BACKUPS_RUN', 'BACKUPS_DELETE', 'BACKUPS_RESTORE'], // Data Safety
  System: ['SYSTEM_VIEW', 'SYSTEM_HEALTHCHECK', 'SYSTEM_RESTART', 'AGENT_UPDATE'],
  'After Hours': ['AFTERHOURS_VIEW'], // Server Health
  'User Management': [
    // Consolidated Account Mgmt
    'ACCOUNTS_VIEW',
    'USERS_VIEW',
    'USERS_CREATE',
    'USERS_EDIT',
    'USERS_DELETE',
    'USERS_RESET_PASSWORD',
    'USERS_CHANGE_PASSWORD',
    'USERS_ROLE_EDIT',
    'USERS_PERMISSION_EDIT',
    'USERS_SCOPE_EDIT',
    'ROLES_VIEW',
    'ROLES_EDIT',
  ],
};

/**
 * Legacy RolePermissions for backward compatibility during transition
 * @deprecated Use user.effectivePerms from API instead
 */
export const RolePermissions = {
  viewer: [
    'DASHBOARD_VIEW',
    'SYNC_VIEW',
    'EOD_VIEW',
    'STORES_VIEW',
    'EMPLOYEES_VIEW',
    'NIK_LOOKUP',
    'BACKUPS_VIEW',
    'SYSTEM_VIEW',
  ],
  ops: [
    'DASHBOARD_VIEW',
    'SYNC_VIEW',
    'EOD_VIEW',
    'EOD_SYNC',
    'EOD_RETRY',
    'STORES_VIEW',
    'EMPLOYEES_VIEW',
    'NIK_LOOKUP',
    'BACKUPS_VIEW',
    'BACKUPS_RUN',
    'SYSTEM_VIEW',
  ],
  admin: [
    'DASHBOARD_VIEW',
    'SYNC_VIEW',
    'EOD_VIEW',
    'EOD_SYNC',
    'EOD_RETRY',
    'STORES_VIEW',
    'STORES_EDIT',
    'EMPLOYEES_VIEW',
    'NIK_LOOKUP',
    'EMPLOYEES_EDIT',
    'BACKUPS_VIEW',
    'BACKUPS_RUN',
    'BACKUPS_DELETE',
    'SYSTEM_VIEW',
    'SYSTEM_HEALTHCHECK',
    'ACCOUNTS_VIEW',
    'USERS_VIEW',
    'USERS_CREATE',
    'USERS_EDIT',
    'USERS_RESET_PASSWORD',
    'USERS_ROLE_EDIT',
    'USERS_PERMISSION_EDIT',
    'USERS_SCOPE_EDIT',
    'USERS_DELETE',
    'ROLES_VIEW',
    'AFTERHOURS_VIEW',
    'AGENT_UPDATE',
  ],
  super_admin: Object.values(Permissions),
  demo: [
    'DASHBOARD_VIEW',
    'SYNC_VIEW',
    'EOD_VIEW',
    'STORES_VIEW',
    'EMPLOYEES_VIEW',
    'NIK_LOOKUP',
    'BACKUPS_VIEW',
    'SYSTEM_VIEW',
    'ACCOUNTS_VIEW',
    'USERS_VIEW',
    'ROLES_VIEW',
    'AFTERHOURS_VIEW',
    'AGENT_UPDATE',
    'SYSTEM_HEALTHCHECK',
  ],
  it: [
    'DASHBOARD_VIEW',
    'SYNC_VIEW',
    'EOD_VIEW',
    'EOD_SYNC',
    'EOD_RETRY',
    'STORES_VIEW',
    'EMPLOYEES_VIEW',
    'NIK_LOOKUP',
    'BACKUPS_VIEW',
    'BACKUPS_RUN',
    'SYSTEM_VIEW',
    'SYSTEM_HEALTHCHECK',
    'AGENT_UPDATE',
  ],
  hc: ['DASHBOARD_VIEW', 'EMPLOYEES_VIEW', 'NIK_LOOKUP'],
};

import { normalizeRole } from './roleMap';

/**
 * Check if a role has specific permission (legacy)
 * @deprecated Use hasPermission(user, perm) instead
 * @param {string} role
 * @param {Permission|string} permission
 * @returns {boolean}
 */
export function can(role, permission) {
  return (RolePermissions[normalizeRole(role)] || []).includes(permission);
}

/**
 * Check if user has a specific permission using effectivePerms
 * @param {Object} user - User object with effectivePerms array
 * @param {Permission|string} permission
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  // Use effectivePerms if available (RBAC v2)
  if (user?.effectivePerms && Array.isArray(user.effectivePerms)) {
    return user.effectivePerms.includes(permission);
  }
  // Fallback to legacy role-based check
  return can(user?.role || 'viewer', permission);
}
