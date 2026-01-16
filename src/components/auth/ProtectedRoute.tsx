import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireAnyRole?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireAnyRole = false 
}: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If specific roles are required, check them
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
    if (!hasAllowedRole) {
      // Redirect to appropriate dashboard based on user's actual role
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If any role is required (user must have at least one role)
  if (requireAnyRole && roles.length === 0) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}