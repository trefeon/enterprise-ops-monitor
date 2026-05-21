/**
 * Normalize legacy role strings to the dashboard role model.
 * Keep behavior aligned with dashboard-api/utils/roleMap.js
 */
export function normalizeRole(role) {
  if (!role) return 'viewer';
  const r = String(role).toLowerCase();
  if (r === 'superadmin' || r === 'super_admin' || r === 'super-admin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'ops' || r === 'operator') return 'ops';
  if (r === 'hc' || r === 'human capital') return 'hc';
  if (r === 'it' || r === 'support') return 'it';
  if (r === 'user' || r === 'viewer') return 'viewer';
  return r;
}
