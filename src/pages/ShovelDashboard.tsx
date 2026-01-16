import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useShovelWorkLogs } from '@/hooks/useShovelWorkLogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShiftTimer } from '@/components/dashboard/ShiftTimer';
import { AccountList } from '@/components/dashboard/AccountList';
import { ActiveShovelWorkCard } from '@/components/dashboard/ActiveShovelWorkCard';
import { RecentWorkList } from '@/components/dashboard/RecentWorkList';
import { 
  LogOut, 
  Shovel, 
  Clock, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ShovelDashboard() {
  const { signOut } = useAuth();
  const { employee, activeShift, isLoading: employeeLoading, clockIn, clockOut } = useEmployee();
  const { 
    accounts, 
    activeWorkLog, 
    recentWorkLogs, 
    isLoading: workLogsLoading,
    checkIn,
    checkOut 
  } = useShovelWorkLogs();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleClockIn = async () => {
    const success = await clockIn();
    if (success) {
      toast({ title: 'Clocked in successfully!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to clock in' });
    }
  };

  const handleClockOut = async () => {
    const success = await clockOut();
    if (success) {
      toast({ title: 'Clocked out successfully!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to clock out' });
    }
  };

  const handleCheckIn = async (accountId: string) => {
    const success = await checkIn(accountId);
    if (success) {
      toast({ title: 'Checked in at account!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check in' });
    }
    return success;
  };

  const handleCheckOut = async (data: Parameters<typeof checkOut>[0]) => {
    const success = await checkOut(data);
    if (success) {
      toast({ title: 'Work completed!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
    return success;
  };

  const isLoading = employeeLoading || workLogsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-shovel" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-shovel">
                <Shovel className="h-5 w-5 text-shovel-foreground" />
              </div>
              <span className="text-lg font-semibold">Shovel Dashboard</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <main className="container px-4 py-8">
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Employee Record Not Found
              </CardTitle>
              <CardDescription>
                Your user account is not linked to an employee record. Please contact your manager to set up your employee profile.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background theme-shovel">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-shovel">
              <Shovel className="h-5 w-5 text-shovel-foreground" />
            </div>
            <div>
              <span className="text-lg font-semibold">Shovel Dashboard</span>
              <p className="text-xs text-muted-foreground">
                {employee.first_name} {employee.last_name}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="container space-y-6 px-4 py-6">
        {/* Time Clock Section */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {activeShift ? (
            <>
              <ShiftTimer clockInTime={activeShift.clock_in_time} className="flex-1" />
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleClockOut}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Clock className="mr-2 h-4 w-4" />
                Clock Out
              </Button>
            </>
          ) : (
            <Card className="flex-1">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Not clocked in</p>
                  <p className="text-sm text-muted-foreground">Start your shift to begin logging work</p>
                </div>
                <Button size="lg" onClick={handleClockIn}>
                  <Clock className="mr-2 h-4 w-4" />
                  Clock In
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Active Work or Account List */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            {activeWorkLog ? 'Current Job' : 'Available Accounts'}
          </h2>

          {activeWorkLog ? (
            <ActiveShovelWorkCard 
              workLog={activeWorkLog} 
              onCheckOut={handleCheckOut}
            />
          ) : (
            <AccountList 
              accounts={accounts} 
              onCheckIn={handleCheckIn}
              variant="shovel"
            />
          )}
        </section>

        {/* Recent Work */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Today's Work</h2>
          <RecentWorkList workLogs={recentWorkLogs} variant="shovel" />
        </section>
      </main>
    </div>
  );
}