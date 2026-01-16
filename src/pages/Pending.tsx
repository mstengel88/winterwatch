import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Snowflake, LogOut, Clock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function Pending() {
  const { user, profile, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Force page reload to refresh auth state
    window.location.reload();
  };

  // If user now has roles, redirect to dashboard
  if (roles.length > 0) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Snowflake className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">WinterWatch</h1>
          <p className="text-sm text-muted-foreground">Pro</p>
        </div>
      </div>

      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/20">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle>Account Pending Approval</CardTitle>
          <CardDescription>
            Welcome, {profile?.full_name || user?.email}!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account has been created successfully, but you haven't been assigned a role yet.
            Please contact your administrator to get access to the system.
          </p>

          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Check for updates
            </Button>

            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Need help? Contact your system administrator.
      </p>
    </div>
  );
}