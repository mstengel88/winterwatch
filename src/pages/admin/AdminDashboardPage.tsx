import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2, ShieldCheck, UserCog, Users, Wrench, Briefcase, ArrowRight } from 'lucide-react';
import { ForceCheckoutPanel } from '@/components/admin/ForceCheckoutPanel';
import { EmployeeShiftStatusPanel } from '@/components/admin/EmployeeShiftStatusPanel';
import { ActiveShiftsFeed } from '@/components/dashboard/ActiveShiftsFeed';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type WorkspaceCounts = {
  users: number;
  employees: number;
  accounts: number;
  equipment: number;
};

export default function AdminDashboardPage() {
  const { organizations, activeOrganizationId, roles } = useAuth();
  const [counts, setCounts] = useState<WorkspaceCounts | null>(null);
  const [isCountsLoading, setIsCountsLoading] = useState(false);

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations],
  );

  useEffect(() => {
    if (!activeOrganizationId) {
      setCounts(null);
      return;
    }

    let ignore = false;

    const loadCounts = async () => {
      setIsCountsLoading(true);
      try {
        const [rolesResult, employeesResult, accountsResult, equipmentResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('user_id')
            .eq('organization_id', activeOrganizationId),
          supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', activeOrganizationId),
          supabase
            .from('accounts')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', activeOrganizationId),
          supabase
            .from('equipment')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', activeOrganizationId),
        ]);

        if (rolesResult.error) throw rolesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (accountsResult.error) throw accountsResult.error;
        if (equipmentResult.error) throw equipmentResult.error;

        if (!ignore) {
          setCounts({
            users: new Set((rolesResult.data ?? []).map((row) => row.user_id)).size,
            employees: employeesResult.count ?? 0,
            accounts: accountsResult.count ?? 0,
            equipment: equipmentResult.count ?? 0,
          });
        }
      } catch (error) {
        console.error('Failed to load workspace readiness counts:', error);
        if (!ignore) {
          setCounts(null);
        }
      } finally {
        if (!ignore) {
          setIsCountsLoading(false);
        }
      }
    };

    void loadCounts();

    return () => {
      ignore = true;
    };
  }, [activeOrganizationId]);

  const readinessItems = useMemo(() => {
    if (!counts) {
      return [];
    }

    return [
      {
        label: 'Users',
        count: counts.users,
        ready: counts.users > 0,
        href: '/admin/users',
        icon: Users,
      },
      {
        label: 'Employees',
        count: counts.employees,
        ready: counts.employees > 0,
        href: '/admin/employees',
        icon: Users,
      },
      {
        label: 'Accounts',
        count: counts.accounts,
        ready: counts.accounts > 0,
        href: '/admin/accounts',
        icon: Briefcase,
      },
      {
        label: 'Equipment',
        count: counts.equipment,
        ready: counts.equipment > 0,
        href: '/admin/equipment',
        icon: Wrench,
      },
    ];
  }, [counts]);

  const nextRecommendedStep = useMemo(() => {
    const nextMissing = readinessItems.find((item) => !item.ready);
    if (!nextMissing) {
      return {
        title: 'Workspace is ready',
        description: 'This customer workspace has the core setup records in place.',
        href: '/admin/reports',
        cta: 'Open Reports',
      };
    }

    return {
      title: `Next step: ${nextMissing.label}`,
      description: `This workspace still needs ${nextMissing.label.toLowerCase()} before day-one operations are fully ready.`,
      href: nextMissing.href,
      cta: `Open ${nextMissing.label}`,
    };
  }, [readinessItems]);

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
                <Link to="/admin/leads">Website Leads</Link>
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
            <div className="rounded-xl border border-border/50 bg-background/40 p-3">
              4. Review website leads and move qualified customers into onboarding.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">Workspace Readiness</CardTitle>
            <CardDescription>
              {activeOrganization
                ? `Track what still needs to be finished for ${activeOrganization.name}.`
                : 'Select a workspace to see its setup progress.'}
            </CardDescription>
          </div>
          {activeOrganization ? <Badge variant="outline">{activeOrganization.slug}</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeOrganization ? (
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
              Switch into a customer workspace to see onboarding completion progress.
            </div>
          ) : isCountsLoading ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading workspace setup state...
            </div>
          ) : counts ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {readinessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-primary" />
                          {item.label}
                        </div>
                        {item.ready ? (
                          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Needs setup</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-semibold">{item.count}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.ready ? `Configured ${item.label.toLowerCase()}.` : `No ${item.label.toLowerCase()} yet.`}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/40 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">{nextRecommendedStep.title}</p>
                  <p className="text-sm text-muted-foreground">{nextRecommendedStep.description}</p>
                </div>
                <Button asChild className="gap-2">
                  <Link to={nextRecommendedStep.href}>
                    {nextRecommendedStep.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
              We could not load workspace readiness right now.
            </div>
          )}
        </CardContent>
      </Card>

      <ActiveShiftsFeed organizationId={activeOrganizationId} />
      <EmployeeShiftStatusPanel organizationId={activeOrganizationId} />
      <ForceCheckoutPanel organizationId={activeOrganizationId} />
    </div>
  );
}
