import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/auth/permissions';

interface PrivateRouteProps {
  requiredPerm?: string;
  children?: ReactNode;
}

export default function PrivateRoute({ requiredPerm, children }: PrivateRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-4 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (location.pathname === '/live') {
    if (children) return <>{children}</>;
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPerm && !hasPermission(user, requiredPerm)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="size-8 text-destructive" />
          </div>
          <h1 className="mb-2 text-xl font-semibold">Access Denied</h1>
          <p className="mb-4 text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <Button
            type="button"
            onClick={() => window.history.back()}
            variant="secondary"
            className="gap-2 rounded-lg"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}
