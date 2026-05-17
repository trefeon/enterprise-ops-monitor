/**
 * @typedef {'viewer' | 'ops' | 'admin' | 'super_admin'} Role
 */

import { normalizeRole } from './roleMap';

export const RoleRank = {
  viewer: 1,
  ops: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Check if userRole meets the required role level
 * @param {Role} userRole
 * @param {Role} required
 * @returns {boolean}
 */
export function hasAtLeast(userRole, required) {
  return (RoleRank[normalizeRole(userRole)] || 0) >= (RoleRank[normalizeRole(required)] || 0);
}
