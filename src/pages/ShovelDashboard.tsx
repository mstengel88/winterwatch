import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useShovelWorkLogs } from '@/hooks/useShovelWorkLogs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shovel, 
  Clock, 
  Loader2,
  AlertCircle,
  LogIn,
  MapPin,
  Snowflake,
  Users,
  Navigation,
  Play,
  Image,
  Camera,
  Footprints
} from 'lucide-react';
import { format } from 'date-fns';

const TEAM_MEMBERS = [
  'Gavin Peeks',
  'Mitchell Anderson',
  'Mike (Pops) Anderson',
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

  const [selectedAccount, setSelectedAccount] = useState('');
  const [serviceType, setServiceType] = useState<'shovel' | 'salt' | 'both'>('shovel');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('31');
  const [weather, setWeather] = useState('Cloudy');
  const [wind, setWind] = useState('11');
  const [notes, setNotes] = useState('');

  const handleClockIn = async () => {
    const success = await clockIn();
    if (success) {
      toast({ title: 'Shift started successfully!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to start shift' });
    }
  };

  const handleClockOut = async () => {
    const success = await clockOut();
    if (success) {
      toast({ title: 'Shift ended successfully!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to end shift' });
    }
  };

  const handleCheckIn = async () => {
    if (!selectedAccount) {
      toast({ variant: 'destructive', title: 'Please select an account' });
      return;
    }
    const success = await checkIn(selectedAccount);
    if (success) {
      toast({ title: 'Checked in at account!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check in' });
    }
  };

  const handleCheckOut = async () => {
    const success = await checkOut({
      areasCleared: [],
      iceMeltUsedLbs: saltUsed ? parseFloat(saltUsed) : undefined,
      notes: notes || undefined,
      weatherConditions: weather || undefined,
    });
    if (success) {
      toast({ title: 'Work completed!' });
      setNotes('');
      setSaltUsed('');
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
  };

  const toggleTeamMember = (member: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member)
        : [...prev, member]
    );
  };

  const isLoading = employeeLoading || workLogsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Employee Record Not Found</span>
            </div>
            <p className="text-muted-foreground mt-2">
              Your user account is not linked to an employee record. Please contact your manager.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const firstName = profile?.full_name || employee.first_name;
  const completedToday = recentWorkLogs.filter(log => log.status === 'completed').length;
  const shoveled = recentWorkLogs.filter(log => log.service_type === 'shovel' || log.service_type === 'both').length;
  const salted = recentWorkLogs.filter(log => log.service_type === 'ice_melt' || log.service_type === 'salt').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Footprints className="h-5 w-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold">Shovel Crew</h1>
            <Badge variant="outline" className="bg-[hsl(var(--card))]/50 border-border/50 text-muted-foreground">
              {temperature}°F
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Welcome back, {firstName}! Track your shovel crew services.
          </p>
        </div>

        {/* Daily Shift Card */}
        <Card className="bg-[hsl(var(--card))]/80 border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Daily Shift</p>
                  <p className="text-sm text-muted-foreground">
                    {activeShift ? 'Shift in progress' : 'Shift not started'}
                  </p>
                </div>
              </div>
              {activeShift ? (
                <Button 
                  onClick={handleClockOut}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  End Shift
                </Button>
              ) : (
                <Button 
                  onClick={handleClockIn}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Start Shift
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TODAY'S OVERVIEW */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-3 tracking-wide">TODAY'S OVERVIEW</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-[hsl(var(--card))]/50 border-border/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{completedToday}</p>
                    <p className="text-xs text-muted-foreground">Total Services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--card))]/50 border-border/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Footprints className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold">{shoveled}</p>
                    <p className="text-xs text-muted-foreground">Shoveled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--card))]/50 border-border/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Snowflake className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold">{salted}</p>
                    <p className="text-xs text-muted-foreground">Salted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--card))]/50 border-border/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold">{accounts.length}</p>
                    <p className="text-xs text-muted-foreground">Locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Log Entry */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Quick Log Entry</h2>
            
            {/* Nearest Location Card */}
            <div className="bg-purple-600 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-purple-200" />
                <div>
                  <p className="font-medium text-white">
                    <span className="text-purple-200">Nearest:</span> Green Hills Supply{' '}
                    <span className="text-purple-200">2.1km</span>
                  </p>
                  <p className="text-sm text-purple-200">GPS accuracy: ±35 meters</p>
                </div>
              </div>
              <Navigation className="h-5 w-5 text-white" />
            </div>

            {/* Select Account */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Account (verify or change)</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="bg-[hsl(var(--card))]/80 border-border/50">
                  <SelectValue placeholder="Green Hills Supply  2.1km" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--card))] border-border">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check In Button */}
            <Button 
              variant="ghost" 
              className="w-full justify-center text-muted-foreground"
              onClick={handleCheckIn}
              disabled={!activeShift}
            >
              <Play className="h-4 w-4 mr-2" />
              Check In & Start Timer
            </Button>

            {/* Warning Message */}
            {!activeShift && (
              <p className="text-center text-sm">
                <span className="text-red-400">Start your </span>
                <span className="text-yellow-400">daily shift</span>
                <span className="text-red-400"> first via Time Clock</span>
              </p>
            )}

            {/* Service Type */}
            <div className="space-y-2">
              <Label className="text-sm">Service Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={serviceType === 'shovel' ? 'default' : 'ghost'}
                  className={serviceType === 'shovel' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('shovel')}
                >
                  <Footprints className="h-4 w-4 mr-2" />
                  Shovel Walks
                </Button>
                <Button
                  variant={serviceType === 'salt' ? 'default' : 'ghost'}
                  className={serviceType === 'salt' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('salt')}
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  Salt Walks
                </Button>
                <Button
                  variant={serviceType === 'both' ? 'default' : 'ghost'}
                  className={serviceType === 'both' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('both')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Shovel/Salt Walks
                </Button>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Footprints className="h-4 w-4" />
                Team Members
              </Label>
              <Card className="bg-[hsl(var(--card))]/50 border-border/30">
                <CardContent className="py-3 space-y-2">
                  {TEAM_MEMBERS.map((member) => (
                    <div 
                      key={member}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleTeamMember(member)}
                    >
                      <Checkbox 
                        checked={selectedTeamMembers.includes(member)}
                        className="border-purple-500 data-[state=checked]:bg-purple-600"
                      />
                      <span className="text-sm">{member}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Snow Depth and Salt Used */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Snow Depth (inches)</Label>
                <Input 
                  placeholder="e.g., 3.5"
                  value={snowDepth}
                  onChange={(e) => setSnowDepth(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Salt Used (lbs)</Label>
                <Input 
                  placeholder="e.g., 50"
                  value={saltUsed}
                  onChange={(e) => setSaltUsed(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
            </div>

            {/* Temp, Weather, Wind */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Temp (°F)</Label>
                <Input 
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Weather</Label>
                <Input 
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Wind (mph)</Label>
                <Input 
                  value={wind}
                  onChange={(e) => setWind(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes (Optional)</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[hsl(var(--card))]/50 border-border/30 min-h-[80px]"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="text-sm">Photo (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="bg-[hsl(var(--card))]/50 border-border/30">
                  <Image className="h-4 w-4 mr-2" />
                  Choose from gallery
                </Button>
                <Button variant="outline" className="bg-[hsl(var(--card))]/50 border-border/30">
                  <Camera className="h-4 w-4 mr-2" />
                  Take photo
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Recent Activity</h2>
            <Card className="bg-[hsl(var(--card))]/50 border-border/30 min-h-[300px]">
              <CardContent className="py-6">
                {recentWorkLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="font-medium text-muted-foreground">No activity yet</p>
                    <p className="text-sm text-muted-foreground">Start logging your work!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentWorkLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Shovel className="h-4 w-4 text-purple-400" />
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
                          {log.status === 'completed' ? 'Done' : 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
