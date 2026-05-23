import type { ReactNode } from 'react';
import { hasPermission } from '../../lib/auth/permissions';
import { hasAtLeast } from '../../lib/auth/roles';

interface GuardUser {
  role?: string;
  roleNames?: string[];
  isDemo?: boolean;
  effectivePerms?: string[];
}

interface GuardProps {
  user?: GuardUser | null;
  role?: string;
  permission?: string;
  requiredRole?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Guard({
  user,
  role,
  permission,
  requiredRole,
  children,
  fallback = null,
}: GuardProps) {
  const effectiveUser = user || (role ? { role } : null);
  const effectiveRole = role || user?.role;
  const isDemo = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';

  if (isDemo) {
    return <>{children}</>;
  }

  if (permission && hasPermission(effectiveUser as any, permission)) {
    return <>{children}</>;
  }

  if (requiredRole && effectiveRole && hasAtLeast(effectiveRole as any, requiredRole as any)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
