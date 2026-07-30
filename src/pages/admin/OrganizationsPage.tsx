import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Circle, Loader2, Plus, Users, Briefcase, Wrench, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { organizations, activeOrganizationId, switchOrganization, isLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4" />
                Admin Overview
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/admin/users')}>
                <Users className="h-4 w-4" />
                Users & Roles
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
                </div>
                <Button
                  variant={isActive ? 'secondary' : 'default'}
                  className="w-full"
                  disabled={isActive || switchingId === organization.id}
                  onClick={() => handleSwitch(organization.id)}
                >
                  {switchingId === organization.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Switching...
                    </>
                  ) : isActive ? (
                    'Current Organization'
                  ) : (
                    'Switch To Organization'
                  )}
                </Button>
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
