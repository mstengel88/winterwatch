import { Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

export default function AdminLayout() {
  const location = useLocation();
  const isWideLayout = location.pathname.includes('/admin/reports') || location.pathname.includes('/admin/map');

  return (
    <AppLayout variant={isWideLayout ? 'wide' : 'default'}>
      <Outlet />
    </AppLayout>
  );
}
