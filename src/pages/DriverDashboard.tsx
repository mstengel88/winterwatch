import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useWorkLogs } from '@/hooks/useWorkLogs';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Snowflake, 
  Truck, 
  Clock, 
  MapPin,
  Loader2,
  AlertCircle,
  LogIn,
  ClipboardList,
  Navigation,
  Play,
  Eye,
  Calendar,
  Thermometer,
  Cloud,
  Wind,
  ImageIcon,
  Camera
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const { employee, activeShift, isLoading: employeeLoading, clockIn, clockOut } = useEmployee();
  const { 
    accounts, 
    activeWorkLog, 
    recentWorkLogs, 
    isLoading: workLogsLoading,
    checkIn,
    checkOut 
  } = useWorkLogs();
  const { location: geoLocation } = useGeolocation();
  const { toast } = useToast();

  // Form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [serviceType, setServiceType] = useState<'plow' | 'salt' | 'both'>('plow');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('31');
  const [weather, setWeather] = useState('Overcast');
  const [windSpeed, setWindSpeed] = useState('7');
  const [notes, setNotes] = useState('');
  const [equipment, setEquipment] = useState<any[]>([]);

  // Fetch equipment
  useState(() => {
    supabase.from('equipment').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setEquipment(data);
    });
  });

  // Calculate nearest account
  const nearestAccount = useMemo(() => {
    if (!geoLocation || accounts.length === 0) return null;
    
    let nearest = accounts[0];
    let minDist = Infinity;
    
    accounts.forEach((acc) => {
      if (acc.latitude && acc.longitude) {
        const dist = Math.sqrt(
          Math.pow((acc.latitude - geoLocation.latitude) * 111, 2) +
          Math.pow((acc.longitude - geoLocation.longitude) * 111 * Math.cos(geoLocation.latitude * Math.PI / 180), 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = acc;
        }
      }
    });
    
    return { account: nearest, distance: minDist };
  }, [geoLocation, accounts]);

  // Today's stats
  const todayStats = useMemo(() => {
    const plowed = recentWorkLogs.filter(l => l.service_type === 'plow' || l.service_type === 'both').length;
    const salted = recentWorkLogs.filter(l => l.service_type === 'salt' || l.service_type === 'both').length;
    return {
      total: recentWorkLogs.length,
      plowed,
      salted,
      accounts: accounts.length,
    };
  }, [recentWorkLogs, accounts]);

  // Weekly hours
  const weeklyHours = useMemo(() => {
    if (!activeShift) return '0.0';
    const mins = differenceInMinutes(new Date(), new Date(activeShift.clock_in_time));
    return (mins / 60).toFixed(1);
  }, [activeShift]);

  const handleClockIn = async () => {
    const success = await clockIn();
    if (success) {
      toast({ title: 'Shift started!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to start shift' });
    }
  };

  const handleClockOut = async () => {
    const success = await clockOut();
    if (success) {
      toast({ title: 'Shift ended!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to end shift' });
    }
  };

  const handleCheckIn = async () => {
    if (!selectedAccountId) {
      toast({ variant: 'destructive', title: 'Please select an account' });
      return;
    }
    if (!activeShift) {
      toast({ variant: 'destructive', title: 'Please start your shift first' });
      return;
    }
    const success = await checkIn(selectedAccountId);
    if (success) {
      toast({ title: 'Checked in!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check in' });
    }
  };

  const handleCheckOut = async () => {
    const success = await checkOut({
      snowDepthInches: snowDepth ? parseFloat(snowDepth) : undefined,
      saltUsedLbs: saltUsed ? parseFloat(saltUsed) : undefined,
      weatherConditions: `${temperature}°F ${weather}`,
      notes,
      photoUrls: [],
    });
    if (success) {
      toast({ title: 'Work completed!' });
      setNotes('');
      setSnowDepth('');
      setSaltUsed('');
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
  };

  const isLoading = employeeLoading || workLogsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Employee Record Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your user account is not linked to an employee record. Please contact your manager.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Snowflake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              WinterWatch-Pro
              <span className="text-sm font-normal text-muted-foreground">{temperature}°F</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {profile?.full_name || employee.first_name}! Track your plowing and salting services.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="flex items-center gap-1 text-lg font-semibold">
            <Clock className="h-4 w-4" />
            {weeklyHours}h
          </p>
        </div>
      </div>

      {/* Daily Shift Card */}
      <Card className="mb-6 bg-card/50">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Daily Shift</p>
              <p className="text-sm text-muted-foreground">
                {activeShift ? 'Currently on shift' : 'Shift not started'}
              </p>
            </div>
          </div>
          {activeShift ? (
            <Button variant="destructive" onClick={handleClockOut}>
              <LogIn className="mr-2 h-4 w-4" />
              End Shift
            </Button>
          ) : (
            <Button className="bg-success hover:bg-success/90" onClick={handleClockIn}>
              <LogIn className="mr-2 h-4 w-4" />
              Start Shift
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Today's Overview */}
      <div className="mb-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Today's Overview
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-card/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <p className="mt-1 text-2xl font-bold">{todayStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Services</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <p className="mt-1 text-2xl font-bold">{todayStats.plowed}</p>
              <p className="text-xs text-muted-foreground">Plowed</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-success">
                <Snowflake className="h-4 w-4" />
              </div>
              <p className="mt-1 text-2xl font-bold">{todayStats.salted}</p>
              <p className="text-xs text-muted-foreground">Salted</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-success">
                <MapPin className="h-4 w-4" />
              </div>
              <p className="mt-1 text-2xl font-bold">{todayStats.accounts}</p>
              <p className="text-xs text-muted-foreground">Properties</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Log Entry */}
        <div>
          <h2 className="mb-3 text-sm font-medium">Quick Log Entry</h2>
          
          {/* Nearest Location */}
          {nearestAccount && (
            <Card className="mb-4 border-primary/50 bg-primary/10">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Nearest: </span>
                      <span className="font-medium text-primary">{nearestAccount.account.name}</span>
                      <span className="ml-2 text-muted-foreground">{nearestAccount.distance.toFixed(1)}km</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GPS accuracy: ±{geoLocation?.accuracy?.toFixed(0) || 0} meters
                    </p>
                  </div>
                </div>
                <Navigation className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          )}

          {/* Account Select */}
          <div className="mb-4">
            <Label className="text-muted-foreground">Select Account (verify or change)</Label>
            <Select 
              value={selectedAccountId || nearestAccount?.account.id} 
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="mt-1 bg-muted/30">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                    {nearestAccount?.account.id === acc.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {nearestAccount.distance.toFixed(1)}km
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Check In Button or Active Work */}
          {!activeWorkLog ? (
            <>
              <Button 
                variant="outline" 
                className="mb-3 w-full"
                onClick={handleCheckIn}
                disabled={!activeShift}
              >
                <Play className="mr-2 h-4 w-4" />
                Check In & Start Timer
              </Button>
              
              {!activeShift && (
                <p className="mb-4 text-center text-sm text-warning">
                  Start your <span className="text-primary">daily shift</span> first via Time Clock
                </p>
              )}
            </>
          ) : (
            <Card className="mb-4 border-success bg-success/10">
              <CardContent className="py-3">
                <p className="text-sm font-medium text-success">Currently working at location</p>
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(activeWorkLog.check_in_time!), 'h:mm a')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Service Type */}
          <div className="mb-4">
            <Label className="text-muted-foreground">Service Type</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { value: 'plow', label: 'Plow Only', icon: Truck },
                { value: 'salt', label: 'Salt Only', icon: Snowflake },
                { value: 'both', label: 'Plow & Salt', icon: ClipboardList },
              ].map((type) => (
                <Button
                  key={type.value}
                  variant={serviceType === type.value ? 'default' : 'outline'}
                  className={serviceType === type.value ? 'bg-primary' : 'bg-muted/30'}
                  onClick={() => setServiceType(type.value as any)}
                >
                  <type.icon className="mr-2 h-4 w-4" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Equipment & Employees */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Equipment</Label>
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="mt-1 bg-muted/30">
                  <SelectValue placeholder="Select equipment..." />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Employees</Label>
              <Select value={selectedEmployees} onValueChange={setSelectedEmployees}>
                <SelectTrigger className="mt-1 bg-muted/30">
                  <SelectValue placeholder="Select employees..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Just me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Snow & Salt */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Snow Depth (inches)</Label>
              <Input 
                type="number"
                placeholder="e.g., 3.5"
                value={snowDepth}
                onChange={(e) => setSnowDepth(e.target.value)}
                className="mt-1 bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Salt Used (lbs)</Label>
              <Input 
                type="number"
                placeholder="e.g., 150"
                value={saltUsed}
                onChange={(e) => setSaltUsed(e.target.value)}
                className="mt-1 bg-muted/30"
              />
            </div>
          </div>

          {/* Weather */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> Temp (°F)
              </Label>
              <Input 
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="mt-1 bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Cloud className="h-3 w-3" /> Weather
              </Label>
              <Input 
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="mt-1 bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Wind className="h-3 w-3" /> Wind (mph)
              </Label>
              <Input 
                type="number"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
                className="mt-1 bg-muted/30"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <Label className="text-muted-foreground">Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-muted/30"
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-4">
            <Label className="text-muted-foreground">Photo (Optional)</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" className="bg-muted/30">
                <ImageIcon className="mr-2 h-4 w-4" />
                Choose from gallery
              </Button>
              <Button variant="outline" className="bg-muted/30">
                <Camera className="mr-2 h-4 w-4" />
                Take photo
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          {activeWorkLog && (
            <Button 
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
              onClick={handleCheckOut}
            >
              Check Out & Complete
            </Button>
          )}
          
          {!activeWorkLog && !activeShift && (
            <Button variant="outline" className="w-full" disabled>
              Check In First
            </Button>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-3 text-sm font-medium">Recent Activity</h2>
          {recentWorkLogs.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground">Start logging your work!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentWorkLogs.map((log: any) => (
                <Card key={log.id} className="bg-card/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Snowflake className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{log.account?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.check_in_time || log.created_at), 'MMM d, h:mm a')} • {log.employee?.first_name || 'Unknown'}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary"
                        className={
                          log.service_type === 'plow' || log.service_type === 'both' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-success/20 text-success'
                        }
                      >
                        {log.service_type === 'plow' ? 'Plowed' : log.service_type === 'salt' ? 'Salted' : 'Both'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
