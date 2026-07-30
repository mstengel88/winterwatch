import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Redirects users to their appropriate dashboard based on their role.
 * - Admin/Manager → Admin Dashboard
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

  // Admin and managers should land in the admin workspace first.
  if (roles.includes('admin') || roles.includes('manager')) {
    return <Navigate to="/admin/organizations" replace />;
  }

  // Dispatch driver accounts now use the main dashboard.
  if (roles.includes('dispatch_driver')) {
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

  // Trucker accounts now use the main dashboard.
  if (roles.includes('trucker')) {
    return <Navigate to="/dashboard" replace />;
  }

  // No recognized role - send to pending
  return <Navigate to="/pending" replace />;
}
