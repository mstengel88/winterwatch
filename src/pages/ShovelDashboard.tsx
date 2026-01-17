import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useShovelWorkLogs } from '@/hooks/useShovelWorkLogs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShiftTimer } from '@/components/dashboard/ShiftTimer';
import { 
  Shovel, 
  Clock, 
  Loader2,
  AlertCircle,
  Play,
  Square,
  MapPin,
  Thermometer,
  Users,
  CheckCircle2,
  Camera,
  Footprints,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

const AREAS_OPTIONS = [
  'Front Walkway',
  'Side Entrance',
  'Back Entrance',
  'Parking Lot',
  'Steps/Stairs',
  'Ramp',
  'Patio',
  'Emergency Exit',
];

export default function ShovelDashboard() {
  const { profile } = useAuth();
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

  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [iceMeltUsed, setIceMeltUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [weatherConditions, setWeatherConditions] = useState('');

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

  const handleCheckOut = async () => {
    const success = await checkOut({
      areasCleared: selectedAreas,
      iceMeltUsedLbs: iceMeltUsed ? parseFloat(iceMeltUsed) : undefined,
      notes: notes || undefined,
      weatherConditions: weatherConditions || undefined,
    });
    if (success) {
      toast({ title: 'Work completed!' });
      setSelectedAreas([]);
      setIceMeltUsed('');
      setNotes('');
      setWeatherConditions('');
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
    return success;
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const isLoading = employeeLoading || workLogsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-shovel" />
      </div>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Employee Record Not Found
            </CardTitle>
            <CardDescription>
              Your user account is not linked to an employee record. Please contact your manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || employee.first_name;
  const completedToday = recentWorkLogs.filter(log => log.status === 'completed').length;
  const totalIceMelt = recentWorkLogs.reduce((sum, log) => sum + (log.ice_melt_used_lbs || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Purple Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-shovel/30 to-shovel/10 flex items-center justify-center border border-shovel/30">
                <Shovel className="h-5 w-5 text-shovel" />
              </div>
              <span>Shovel Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-1">Welcome back, {firstName}!</p>
          </div>
          <Badge variant="outline" className="bg-shovel/10 text-shovel border-shovel/30 self-start">
            <Users className="h-3 w-3 mr-1" />
            Shovel Crew
          </Badge>
        </div>

        {/* Daily Shift Card */}
        <Card className="bg-gradient-to-br from-shovel/10 to-shovel/5 border-shovel/30">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {activeShift ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-shovel/20 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-shovel" />
                    </div>
                    <ShiftTimer clockInTime={activeShift.clock_in_time} />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleClockOut}
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Square className="h-4 w-4 mr-2 fill-current" />
                    Clock Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Not clocked in</p>
                      <p className="text-sm text-muted-foreground">Start your shift to begin logging work</p>
                    </div>
                  </div>
                  <Button onClick={handleClockIn} className="bg-shovel hover:bg-shovel/90">
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Clock In
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-shovel/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-shovel" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedToday}</p>
                  <p className="text-xs text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Thermometer className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalIceMelt}</p>
                  <p className="text-xs text-muted-foreground">lbs Ice Melt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{accounts.length}</p>
                  <p className="text-xs text-muted-foreground">Available Sites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Footprints className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentWorkLogs.length}</p>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Work or Account Selection */}
        {activeWorkLog ? (
          <Card className="border-shovel/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-shovel">
                  <MapPin className="h-5 w-5" />
                  Active Job
                </CardTitle>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                  In Progress
                </Badge>
              </div>
              <CardDescription>
                {(activeWorkLog as any).account?.name} - {(activeWorkLog as any).account?.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Areas Cleared */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Areas Cleared</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AREAS_OPTIONS.map((area) => (
                    <div
                      key={area}
                      onClick={() => toggleArea(area)}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedAreas.includes(area)
                          ? 'bg-shovel/20 border-shovel/50 text-shovel'
                          : 'bg-muted/30 border-border hover:border-shovel/30'
                      }`}
                    >
                      <Checkbox checked={selectedAreas.includes(area)} />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Ice Melt Used */}
                <div className="space-y-2">
                  <Label htmlFor="iceMelt">Ice Melt Used (lbs)</Label>
                  <Input
                    id="iceMelt"
                    type="number"
                    placeholder="0"
                    value={iceMeltUsed}
                    onChange={(e) => setIceMeltUsed(e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                {/* Weather Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="weather">Weather Conditions</Label>
                  <Input
                    id="weather"
                    placeholder="e.g., Light snow, 28°F"
                    value={weatherConditions}
                    onChange={(e) => setWeatherConditions(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              {/* Photo Upload Placeholder */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Upload completion photos</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Choose Files
                </Button>
              </div>

              {/* Complete Button */}
              <Button 
                onClick={handleCheckOut} 
                className="w-full bg-shovel hover:bg-shovel/90"
                size="lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Available Accounts</CardTitle>
              <CardDescription>Select an account to check in and start work</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No accounts available</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="group p-4 rounded-lg border border-border/50 hover:border-shovel/50 transition-colors cursor-pointer bg-background/50"
                      onClick={() => handleCheckIn(account.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{account.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{account.address}</span>
                          </p>
                          {account.priority && account.priority <= 3 && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Priority {account.priority}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="shrink-0 text-shovel group-hover:bg-shovel/20"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Today's Work</CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorkLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No work logged today</p>
            ) : (
              <div className="space-y-3">
                {recentWorkLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-shovel/20 flex items-center justify-center">
                        <Shovel className="h-4 w-4 text-shovel" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{(log as any).account?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.check_in_time && format(new Date(log.check_in_time), 'h:mm a')}
                          {log.check_out_time && ` - ${format(new Date(log.check_out_time), 'h:mm a')}`}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={
                        log.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {log.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
