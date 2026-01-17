import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Shovel, 
  Shield, 
  User, 
  Clock, 
  ClipboardList, 
  BarChart3, 
  Users, 
  Building2,
  ChevronRight,
  Snowflake,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile, roles, isAdminOrManager, hasRole } = useAuth();
  const navigate = useNavigate();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'manager': return <Users className="h-3 w-3" />;
      case 'driver': return <Truck className="h-3 w-3" />;
      case 'shovel_crew': return <Shovel className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'manager': return 'bg-warning/20 text-warning border-warning/30';
      case 'driver': return 'bg-plow/20 text-plow border-plow/30';
      case 'shovel_crew': return 'bg-shovel/20 text-shovel border-shovel/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
            <p className="text-muted-foreground">Here's your WinterWatch Pro dashboard</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="outline" className={getRoleColor(role)}>
                  {getRoleIcon(role)}
                  <span className="ml-1 capitalize">{role.replace('_', ' ')}</span>
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <User className="mr-1 h-3 w-3" />
                No role assigned
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <p className="text-xl font-bold text-primary">Active</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-plow/10 to-plow/5 border-plow/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plow Ready</p>
                  <p className="text-xl font-bold text-plow">Available</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-plow/20 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-plow" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-shovel/10 to-shovel/5 border-shovel/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shovel Ready</p>
                  <p className="text-xl font-bold text-shovel">Available</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-shovel/20 flex items-center justify-center">
                  <Shovel className="h-5 w-5 text-shovel" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Weather</p>
                  <p className="text-xl font-bold text-blue-400">32°F</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Snowflake className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-Based Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Plow Driver Card */}
          {(hasRole('driver') || isAdminOrManager()) && (
            <Card 
              className="group cursor-pointer border-plow/30 hover:border-plow/60 transition-all hover:shadow-lg hover:shadow-plow/10"
              onClick={() => navigate('/driver')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-plow/20 to-plow/10 flex items-center justify-center border border-plow/30">
                    <Truck className="h-6 w-6 text-plow" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-plow transition-colors" />
                </div>
                <CardTitle className="text-lg text-plow">Plow Operations</CardTitle>
                <CardDescription>Manage plow routes and log snow removal work</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-plow/30 text-plow hover:bg-plow/10">
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Shovel Crew Card */}
          {(hasRole('shovel_crew') || isAdminOrManager()) && (
            <Card 
              className="group cursor-pointer border-shovel/30 hover:border-shovel/60 transition-all hover:shadow-lg hover:shadow-shovel/10"
              onClick={() => navigate('/shovel')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-shovel/20 to-shovel/10 flex items-center justify-center border border-shovel/30">
                    <Shovel className="h-6 w-6 text-shovel" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-shovel transition-colors" />
                </div>
                <CardTitle className="text-lg text-shovel">Shovel Operations</CardTitle>
                <CardDescription>Manage sidewalk clearing and ice melt activities</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-shovel/30 text-shovel hover:bg-shovel/10">
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin Card */}
          {isAdminOrManager() && (
            <Card 
              className="group cursor-pointer border-warning/30 hover:border-warning/60 transition-all hover:shadow-lg hover:shadow-warning/10"
              onClick={() => navigate('/admin')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center border border-warning/30">
                    <Shield className="h-6 w-6 text-warning" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-warning transition-colors" />
                </div>
                <CardTitle className="text-lg text-warning">Administration</CardTitle>
                <CardDescription>Manage users, accounts, and equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-warning/30 text-warning hover:bg-warning/10">
                  Open Admin Panel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Access for Managers */}
        {isAdminOrManager() && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/work-logs')}
            >
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Work Logs</p>
                  <p className="text-xs text-muted-foreground">View all records</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/time-clock')}
            >
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Time Clock</p>
                  <p className="text-xs text-muted-foreground">Track hours</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/admin/accounts')}
            >
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Accounts</p>
                  <p className="text-xs text-muted-foreground">Manage locations</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/admin/reports')}
            >
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Reports</p>
                  <p className="text-xs text-muted-foreground">View analytics</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No roles message */}
        {roles.length === 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <User className="h-5 w-5" />
                Pending Role Assignment
              </CardTitle>
              <CardDescription>
                Your account has been created but no role has been assigned yet.
                Please contact an administrator to assign you a role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Once assigned, you'll have access to the appropriate features based on your role.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{profile?.full_name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{profile?.phone || 'Not set'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
