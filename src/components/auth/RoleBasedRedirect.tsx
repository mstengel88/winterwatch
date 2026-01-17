import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Redirects users to their appropriate dashboard based on their role.
 * - Admin/Manager → Driver Dashboard (has access to everything)
 * - Driver → Driver Dashboard
 * - Shovel Crew → Shovel Dashboard
 * - No role → Pending approval page
 */
export default function RoleBasedRedirect() {
  const { roles, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin and Manager can access everything, default to driver dashboard
  if (roles.includes('admin') || roles.includes('manager')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Driver goes to driver dashboard
  if (roles.includes('driver')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Shovel crew goes to shovel dashboard
  if (roles.includes('shovel_crew')) {
    return <Navigate to="/shovel" replace />;
  }

  // No recognized role - send to pending
  return <Navigate to="/pending" replace />;
}
