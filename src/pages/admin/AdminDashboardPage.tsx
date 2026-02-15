import { ForceCheckoutPanel } from '@/components/admin/ForceCheckoutPanel';
import { EmployeeShiftStatusPanel } from '@/components/admin/EmployeeShiftStatusPanel';
import { ActiveShiftsFeed } from '@/components/dashboard/ActiveShiftsFeed';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Overview and quick actions</p>
      </div>
      <ActiveShiftsFeed />
      <EmployeeShiftStatusPanel />
      <ForceCheckoutPanel />
    </div>
  );
}
