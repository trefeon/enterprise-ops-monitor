import React from 'react';
import { hasPermission } from '../../lib/auth/permissions';
import { hasAtLeast } from '../../lib/auth/roles';

/**
 * @param {Object} props
 * @param {Object} [props.user] - Current user object (RBAC v2)
 * @param {import('../../lib/auth/roles').Role} [props.role] - Current user role (legacy fallback)
 * @param {import('../../lib/auth/permissions').Permission} [props.permission] - Required permission
 * @param {import('../../lib/auth/roles').Role} [props.requiredRole] - Required role (alternative to permission)
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.fallback=null]
 */
export const Guard = ({ user, role, permission, requiredRole, children, fallback = null }) => {
  const effectiveUser = user || (role ? { role } : null);
  const effectiveRole = role || user?.role;

  // Show all buttons for demo users (actions are blocked via handler checks + backend)
  const isDemo = user?.isDemo || (user?.roleNames || []).includes('demo') || user?.role === 'demo';
  if (isDemo) {
    return <>{children}</>;
  }

  if (permission && hasPermission(effectiveUser, permission)) {
    return <>{children}</>;
  }

  if (requiredRole && hasAtLeast(effectiveRole, requiredRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
