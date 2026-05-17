import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/auth/permissions';
import { Loader2 } from 'lucide-react';

/**
 * PrivateRoute component for protecting routes
 * @param {Object} props
 * @param {string} [props.requiredPerm] - Optional permission required to access route
 * @param {React.ReactNode} [props.children] - Optional children (for element-wrapping usage)
 */
export default function PrivateRoute({ requiredPerm, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Public paths that should never redirect to login
  // (defense-in-depth: these routes are also defined outside PrivateRoute in App.jsx)
  const publicPaths = ['/live'];
  if (publicPaths.includes(location.pathname)) {
    if (children) return <>{children}</>;
    return <Outlet />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Permission check
  if (requiredPerm && !hasPermission(user, requiredPerm)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-destructive">lock</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Support both patterns:
  // 1) Route element wrapper: <Route element={<PrivateRoute />}> ... <Outlet/>
  // 2) Element composition: <Route element={<PrivateRoute><Page/></PrivateRoute>} />
  if (children) return <>{children}</>;
  return <Outlet />;
}
