import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Circle, Loader2, Plus, Users, Briefcase, Wrench, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type WorkspaceCounts = {
  users: number;
  employees: number;
  accounts: number;
  equipment: number;
};

type ConvertedLeadSummary = {
  company_name: string;
  contact_name: string;
  created_at: string;
  onboarding_started_at: string | null;
  converted_at: string | null;
};

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { organizations, activeOrganizationId, switchOrganization, isLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [workspaceCounts, setWorkspaceCounts] = useState<Record<string, WorkspaceCounts>>({});
  const [convertedLeadsByOrganization, setConvertedLeadsByOrganization] = useState<Record<string, ConvertedLeadSummary>>({});
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

  const filteredOrganizations = useMemo(() => {
    if (!search.trim()) return organizations;
    const query = search.toLowerCase();
    return organizations.filter((organization) =>
      organization.name.toLowerCase().includes(query) ||
      organization.slug.toLowerCase().includes(query) ||
      organization.plan.toLowerCase().includes(query)
    );
  }, [organizations, search]);

  const activeOrganization =
    organizations.find((organization) => organization.id === activeOrganizationId) ?? null;

  useEffect(() => {
    if (organizations.length === 0) {
      setWorkspaceCounts({});
      setConvertedLeadsByOrganization({});
      return;
    }

    let ignore = false;

    const loadWorkspaceData = async () => {
      setIsWorkspaceLoading(true);
      try {
        const organizationIds = organizations.map((organization) => organization.id);
        const [rolesResult, employeesResult, accountsResult, equipmentResult, leadsResult] = await Promise.all([
          supabase.from('user_roles').select('organization_id, user_id').in('organization_id', organizationIds),
          supabase.from('employees').select('organization_id, id').in('organization_id', organizationIds),
          supabase.from('accounts').select('organization_id, id').in('organization_id', organizationIds),
          supabase.from('equipment').select('organization_id, id').in('organization_id', organizationIds),
          supabase
            .from('marketing_leads')
            .select('converted_organization_id, company_name, contact_name, created_at, onboarding_started_at, converted_at')
            .in('converted_organization_id', organizationIds)
            .order('converted_at', { ascending: false }),
        ]);

        if (rolesResult.error) throw rolesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (accountsResult.error) throw accountsResult.error;
        if (equipmentResult.error) throw equipmentResult.error;
        if (leadsResult.error) throw leadsResult.error;

        const nextCounts = Object.fromEntries(
          organizationIds.map((organizationId) => [
            organizationId,
            { users: 0, employees: 0, accounts: 0, equipment: 0 },
          ]),
        ) as Record<string, WorkspaceCounts>;

        const roleUsers = new Map<string, Set<string>>();
        for (const row of rolesResult.data ?? []) {
          const organizationId = row.organization_id;
          if (!organizationId) continue;
          if (!roleUsers.has(organizationId)) {
            roleUsers.set(organizationId, new Set());
          }
          roleUsers.get(organizationId)?.add(row.user_id);
        }

        for (const [organizationId, users] of roleUsers.entries()) {
          nextCounts[organizationId].users = users.size;
        }

        for (const row of employeesResult.data ?? []) {
          const organizationId = row.organization_id;
          if (organizationId && nextCounts[organizationId]) {
            nextCounts[organizationId].employees += 1;
          }
        }

        for (const row of accountsResult.data ?? []) {
          const organizationId = row.organization_id;
          if (organizationId && nextCounts[organizationId]) {
            nextCounts[organizationId].accounts += 1;
          }
        }

        for (const row of equipmentResult.data ?? []) {
          const organizationId = row.organization_id;
          if (organizationId && nextCounts[organizationId]) {
            nextCounts[organizationId].equipment += 1;
          }
        }

        const latestLeads: Record<string, ConvertedLeadSummary> = {};
        for (const lead of leadsResult.data ?? []) {
          const organizationId = lead.converted_organization_id;
          if (!organizationId || latestLeads[organizationId]) continue;
          latestLeads[organizationId] = {
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            created_at: lead.created_at,
            onboarding_started_at: lead.onboarding_started_at,
            converted_at: lead.converted_at,
          };
        }

        if (!ignore) {
          setWorkspaceCounts(nextCounts);
          setConvertedLeadsByOrganization(latestLeads);
        }
      } catch (error) {
        console.error('Failed to load organization workspace data:', error);
        if (!ignore) {
          setWorkspaceCounts({});
          setConvertedLeadsByOrganization({});
        }
      } finally {
        if (!ignore) {
          setIsWorkspaceLoading(false);
        }
      }
    };

    void loadWorkspaceData();

    return () => {
      ignore = true;
    };
  }, [organizations]);

  const getWorkspaceCounts = (organizationId: string): WorkspaceCounts => {
    return workspaceCounts[organizationId] ?? { users: 0, employees: 0, accounts: 0, equipment: 0 };
  };

  const getWorkspaceProgress = (organizationId: string) => {
    const counts = getWorkspaceCounts(organizationId);
    const steps = [
      { label: 'Users', count: counts.users, href: '/admin/users' },
      { label: 'Employees', count: counts.employees, href: '/admin/employees' },
      { label: 'Accounts', count: counts.accounts, href: '/admin/accounts' },
      { label: 'Equipment', count: counts.equipment, href: '/admin/equipment' },
    ];
    const readyCount = steps.filter((step) => step.count > 0).length;
    const nextStep = steps.find((step) => step.count === 0) ?? null;

    return {
      steps,
      readyCount,
      progressPercent: Math.round((readyCount / steps.length) * 100),
      nextStep,
    };
  };

  const handleSwitch = async (organizationId: string) => {
    setSwitchingId(organizationId);
    try {
      await switchOrganization(organizationId);
      toast({
        title: 'Organization switched',
        description: 'Your active workspace has been updated.',
      });
    } catch (error) {
      console.error('Error switching organization:', error);
      toast({
        variant: 'destructive',
        title: 'Switch failed',
        description: error instanceof Error ? error.message : 'Unable to switch organizations.',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  const handleOpenWorkspaceArea = async (organizationId: string, path: string) => {
    setSwitchingId(organizationId);
    try {
      if (organizationId !== activeOrganizationId) {
        await switchOrganization(organizationId);
      }
      navigate(path);
    } catch (error) {
      console.error('Error opening workspace area:', error);
      toast({
        variant: 'destructive',
        title: 'Open failed',
        description: error instanceof Error ? error.message : 'Unable to open that workspace area.',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="text-muted-foreground">View every customer workspace and switch into the one you need.</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => navigate('/admin/customer-setup')}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizations..."
          />
        </CardContent>
      </Card>

      {activeOrganization && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Active Workspace</CardTitle>
                <CardDescription>
                  You are currently managing <span className="font-medium text-foreground">{activeOrganization.name}</span>.
                </CardDescription>
              </div>
              <Badge className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{activeOrganization.slug}</Badge>
              <Badge variant="outline">{activeOrganization.plan}</Badge>
              <Badge variant="outline">{activeOrganization.status}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {getWorkspaceProgress(activeOrganization.id).steps.map((step) => (
                <div key={step.label} className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{step.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{step.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.count > 0 ? 'Configured' : 'Needs setup'}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4" />
                Admin Overview
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/users')}>
                <Users className="h-4 w-4" />
                Users & Roles
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/leads')}>
                <Building2 className="h-4 w-4" />
                Website Leads
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/employees')}>
                <Users className="h-4 w-4" />
                Employees
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/accounts')}>
                <Briefcase className="h-4 w-4" />
                Accounts
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/equipment')}>
                <Wrench className="h-4 w-4" />
                Equipment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredOrganizations.map((organization) => {
          const isActive = organization.id === activeOrganizationId;
          const progress = getWorkspaceProgress(organization.id);
          const leadSummary = convertedLeadsByOrganization[organization.id] ?? null;
          return (
            <Card key={organization.id} className="bg-card/50 border-border/50">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{organization.name}</CardTitle>
                    <CardDescription>{organization.slug}</CardDescription>
                  </div>
                  {isActive ? (
                    <Badge className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Circle className="h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{organization.plan}</Badge>
                  <Badge variant="outline">{organization.status}</Badge>
                  <Badge variant="outline">{progress.progressPercent}% ready</Badge>
                </div>
                <div className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Workspace readiness</p>
                      <p className="text-xs text-muted-foreground">
                        {progress.readyCount} of {progress.steps.length} core setup areas are ready.
                      </p>
                    </div>
                    <Badge
                      variant={progress.readyCount === progress.steps.length ? 'secondary' : 'outline'}
                      className={progress.readyCount === progress.steps.length ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : ''}
                    >
                      {progress.readyCount === progress.steps.length ? 'Ready' : 'In progress'}
                    </Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {progress.steps.map((step) => (
                      <div key={step.label} className="rounded-md border border-border/50 px-2 py-1.5">
                        <span className="font-medium text-foreground">{step.count}</span> {step.label.toLowerCase()}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    {progress.nextStep ? (
                      <>
                        Next step: <span className="font-medium text-foreground">{progress.nextStep.label}</span>
                      </>
                    ) : (
                      <>Core workspace setup is complete.</>
                    )}
                  </div>
                </div>
                {leadSummary ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
                    <p className="font-medium text-foreground">Converted from lead</p>
                    <p className="mt-1 text-muted-foreground">
                      {leadSummary.company_name} · {leadSummary.contact_name}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Lead in: {new Date(leadSummary.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Onboarding: {leadSummary.onboarding_started_at ? new Date(leadSummary.onboarding_started_at).toLocaleString() : 'Not tracked'}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Button
                    variant={isActive ? 'secondary' : 'default'}
                    className="w-full"
                    disabled={switchingId === organization.id}
                    onClick={() =>
                      isActive
                        ? navigate('/admin')
                        : handleSwitch(organization.id)
                    }
                  >
                    {switchingId === organization.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : isActive ? (
                      'Current Organization'
                    ) : (
                      'Switch To Organization'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={switchingId === organization.id || isWorkspaceLoading}
                    onClick={() =>
                      handleOpenWorkspaceArea(
                        organization.id,
                        progress.nextStep?.href ?? '/admin',
                      )
                    }
                  >
                    <ArrowRight className="h-4 w-4" />
                    {progress.nextStep ? `Open ${progress.nextStep.label}` : 'Open Admin Workspace'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOrganizations.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No organizations match your search yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
