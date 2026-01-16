import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snowflake, LogOut, User, Truck, Shovel, Shield, Users } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, roles, signOut, isAdminOrManager, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      case 'driver':
        return <Truck className="h-4 w-4" />;
      case 'shovel_crew':
        return <Shovel className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'manager':
        return 'bg-warning text-warning-foreground';
      case 'driver':
        return 'bg-plow text-plow-foreground';
      case 'shovel_crew':
        return 'bg-shovel text-shovel-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Snowflake className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">WinterWatch Pro</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your WinterWatch Pro dashboard
          </p>
        </div>

        {/* Role badges */}
        <div className="mb-8 flex flex-wrap gap-2">
          {roles.length > 0 ? (
            roles.map((role) => (
              <Badge key={role} className={getRoleColor(role)}>
                {getRoleIcon(role)}
                <span className="ml-1 capitalize">{role.replace('_', ' ')}</span>
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <User className="mr-1 h-4 w-4" />
              No role assigned
            </Badge>
          )}
        </div>

        {/* Dashboard cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile
              </CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Name:</strong> {profile?.full_name || 'Not set'}</p>
              <p><strong>Phone:</strong> {profile?.phone || 'Not set'}</p>
            </CardContent>
          </Card>

          {/* Plow/Driver section */}
          {(hasRole('driver') || isAdminOrManager()) && (
            <Card className="border-plow/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-plow">
                  <Truck className="h-5 w-5" />
                  Plow Operations
                </CardTitle>
                <CardDescription>Manage plow routes and work logs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Check in/out of accounts, log snow removal activities, and track equipment usage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shovel section */}
          {(hasRole('shovel_crew') || isAdminOrManager()) && (
            <Card className="border-shovel/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-shovel">
                  <Shovel className="h-5 w-5" />
                  Shovel Operations
                </CardTitle>
                <CardDescription>Manage sidewalk clearing activities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Check in/out of accounts, log shovel work, and record salt usage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Admin section */}
          {isAdminOrManager() && (
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Shield className="h-5 w-5" />
                  Administration
                </CardTitle>
                <CardDescription>Manage users, accounts, and equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access employee management, account setup, reports, and system configuration.
                </p>
              </CardContent>
            </Card>
          )}

          {/* No roles message */}
          {roles.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Pending Role Assignment</CardTitle>
                <CardDescription>
                  Your account has been created but no role has been assigned yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Please contact an administrator to assign you a role. Once assigned, you'll have access to the appropriate features.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}