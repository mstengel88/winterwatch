import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, UserCog, Users } from 'lucide-react';
import { ForceCheckoutPanel } from '@/components/admin/ForceCheckoutPanel';
import { EmployeeShiftStatusPanel } from '@/components/admin/EmployeeShiftStatusPanel';
import { ActiveShiftsFeed } from '@/components/dashboard/ActiveShiftsFeed';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
  const { organizations, activeOrganizationId, roles } = useAuth();

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Overview and quick actions</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-xl">Customer management</CardTitle>
              <CardDescription>
                Create organizations, switch between customer workspaces, and keep admin setup moving.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roles.includes('admin') ? 'Admin access' : 'Manager access'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  Organizations
                </div>
                <p className="text-2xl font-semibold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Customer workspaces currently available to you.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Active workspace
                </div>
                <p className="text-base font-semibold">{activeOrganization?.name ?? 'Not selected'}</p>
                <p className="text-sm text-muted-foreground">
                  {activeOrganization ? activeOrganization.slug : 'Choose an organization to scope admin actions.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/admin/customer-setup">New Customer</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/organizations">Manage Organizations</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/users">Users & Roles</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/employees">Employees</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Next setup steps</CardTitle>
            <CardDescription>Use this order when you onboard a new customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/50 bg-background/40 p-3">
              1. Create the organization and primary admin account.
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-3">
              2. Switch into that workspace before adding employees, users, and equipment.
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-3">
              3. Assign roles so the customer can log in without getting stuck on approval screens.
            </div>
          </CardContent>
        </Card>
      </div>

      <ActiveShiftsFeed />
      <EmployeeShiftStatusPanel />
      <ForceCheckoutPanel />
    </div>
  );
}
