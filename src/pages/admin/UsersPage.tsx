import { Navigate } from 'react-router-dom';

export default function UsersPage() {
  return <Navigate to="/admin/employees?tab=users" replace />;
}
