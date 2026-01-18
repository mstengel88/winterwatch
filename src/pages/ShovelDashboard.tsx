import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useShovelWorkLogs } from '@/hooks/useShovelWorkLogs';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { AppLayout } from '@/components/layout/AppLayout';
import { PhotoUpload } from '@/components/dashboard/PhotoUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftStatsWidget, WeatherWidget, QuickActionsWidget } from '@/components/dashboard/widgets';
import { 
  Shovel, 
  Clock, 
  Loader2,
  AlertCircle,
  LogIn,
  MapPin,
  Snowflake,
  Navigation,
  Play,
  Footprints,
  LogOut,
  Timer
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { Account, Employee } from '@/types/database';
import { calculateDistance, formatDistance } from '@/lib/distance';

interface AccountWithDistance {
  account: Account;
  distance: number | null;
}

export default function ShovelDashboard() {
  const { profile } = useAuth();
  const { employee, activeShift, isLoading: employeeLoading, clockIn, clockOut } = useEmployee();
  const { 
    accounts, 
    activeWorkLog, 
    recentWorkLogs, 
    isLoading: workLogsLoading,
    checkIn,
    checkOut,
    updateActiveWorkLog,
  } = useShovelWorkLogs();
  const { location: geoLocation, getCurrentLocation, isLoading: geoLoading } = useGeolocation();
  const {
    photos,
    previews,
    isUploading,
    uploadProgress,
    addPhotos,
    removePhoto,
    clearPhotos,
    uploadPhotos,
    canAddMore,
  } = usePhotoUpload({ folder: 'shovel-logs' });
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
  const [shiftTimer, setShiftTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [workTimer, setWorkTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [shovelEmployees, setShovelEmployees] = useState<Employee[]>([]);

  // Key for storing team members per shift in localStorage
  const shiftTeamStorageKey = activeShift ? `shovel-team-${activeShift.id}` : null;

  // Track if we've loaded team members for current shift
  const [hasLoadedTeam, setHasLoadedTeam] = useState(false);

  // Load saved team members when shift becomes available
  useEffect(() => {
    if (shiftTeamStorageKey && !hasLoadedTeam) {
      const savedTeam = localStorage.getItem(shiftTeamStorageKey);
      if (savedTeam) {
        try {
          const parsed = JSON.parse(savedTeam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedTeamMembers(parsed);
          }
        } catch {
          // Ignore parse errors
        }
      }
      setHasLoadedTeam(true);
    }
    // Reset when shift changes
    if (!shiftTeamStorageKey) {
      setHasLoadedTeam(false);
    }
  }, [shiftTeamStorageKey, hasLoadedTeam]);

  // Save team members to localStorage whenever they change during a shift
  useEffect(() => {
    if (shiftTeamStorageKey && selectedTeamMembers.length > 0) {
      localStorage.setItem(shiftTeamStorageKey, JSON.stringify(selectedTeamMembers));
    }
  }, [shiftTeamStorageKey, selectedTeamMembers]);

  // Clear stored team when shift ends (avoid clearing during initial load refresh)
  const prevShiftIdRef = useRef<string | null>(activeShift?.id ?? null);

  useEffect(() => {
    const prevShiftId = prevShiftIdRef.current;
    const currentShiftId = activeShift?.id ?? null;

    // Only clear when we had an active shift and it is now gone (explicit clock-out)
    if (prevShiftId && !currentShiftId) {
      localStorage.removeItem(`shovel-team-${prevShiftId}`);
    }

    prevShiftIdRef.current = currentShiftId;
  }, [activeShift?.id]);

  // Get location on mount and set up periodic refresh
  useEffect(() => {
    getCurrentLocation();
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 30000); // Refresh location every 30 seconds
    return () => clearInterval(interval);
  }, [getCurrentLocation]);

  // Fetch shovel employees from database
  useEffect(() => {
    const fetchShovelEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .in('category', ['shovel', 'both'])
        .eq('is_active', true)
        .order('first_name');
      
      if (!error && data) {
        setShovelEmployees(data as Employee[]);
      }
    };
    fetchShovelEmployees();
  }, []);

  // Shift timer
  useEffect(() => {
    if (!activeShift) {
      setShiftTimer({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateTimer = () => {
      const start = new Date(activeShift.clock_in_time);
      const now = new Date();
      const totalSeconds = differenceInSeconds(now, start);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setShiftTimer({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Work timer (elapsed time at current location)
  useEffect(() => {
    if (!activeWorkLog || !activeWorkLog.check_in_time) {
      setWorkTimer({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateWorkTimer = () => {
      const start = new Date(activeWorkLog.check_in_time!);
      const now = new Date();
      const totalSeconds = differenceInSeconds(now, start);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setWorkTimer({ hours, minutes, seconds });
    };

    updateWorkTimer();
    const interval = setInterval(updateWorkTimer, 1000);
    return () => clearInterval(interval);
  }, [activeWorkLog]);

  // Sort accounts by distance
  const sortedAccounts = useMemo((): AccountWithDistance[] => {
    if (!geoLocation) {
      return accounts.map(account => ({ account, distance: null }));
    }

    return accounts
      .map(account => {
        if (account.latitude && account.longitude) {
          const distance = calculateDistance(
            geoLocation.latitude,
            geoLocation.longitude,
            account.latitude,
            account.longitude
          );
          return { account, distance };
        }
        return { account, distance: null };
      })
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }, [geoLocation, accounts]);

  // Get nearest account
  const nearestAccount = useMemo(() => {
    if (sortedAccounts.length === 0) return null;
    const nearest = sortedAccounts[0];
    if (nearest.distance !== null) return nearest;
    return null;
  }, [sortedAccounts]);

  // Auto-select nearest account
  useEffect(() => {
    if (nearestAccount && !selectedAccount) {
      setSelectedAccount(nearestAccount.account.id);
    }
  }, [nearestAccount, selectedAccount]);

  const handleRefreshLocation = useCallback(async () => {
    await getCurrentLocation();
    toast({ title: 'Location updated' });
  }, [getCurrentLocation, toast]);

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
    // Map 'salt' to 'ice_melt' for database compatibility
    const dbServiceType = serviceType === 'salt' ? 'ice_melt' : serviceType;
    // Pass selected team members to the check-in
    const success = await checkIn(selectedAccount, dbServiceType, selectedTeamMembers);
    if (success) {
      toast({ title: 'Checked in at account!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check in' });
    }
  };

  const handleCheckOut = async () => {
    let photoUrls: string[] = [];
    if (photos.length > 0 && activeWorkLog) {
      photoUrls = await uploadPhotos(activeWorkLog.id);
    }
    
    const success = await checkOut({
      areasCleared: [],
      iceMeltUsedLbs: saltUsed ? parseFloat(saltUsed) : undefined,
      snowDepthInches: snowDepth ? parseFloat(snowDepth) : undefined,
      notes: notes || undefined,
      weatherConditions: weather || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
    if (success) {
      // Save team members for this shift so they auto-populate for next log
      if (shiftTeamStorageKey && selectedTeamMembers.length > 0) {
        localStorage.setItem(shiftTeamStorageKey, JSON.stringify(selectedTeamMembers));
      }
      toast({ title: 'Work completed!' });
      setNotes('');
      setSaltUsed('');
      setSnowDepth('');
      clearPhotos();
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
  };

  const handleLogService = async () => {
    if (activeWorkLog) {
      await handleCheckOut();
    } else {
      await handleCheckIn();
    }
  };

  const toggleTeamMember = (member: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member)
        : [...prev, member]
    );
  };

  // Validation: all fields required except notes and photos
  // Salt used is optional when service type is 'shovel'
  // Snow depth is optional when service type is 'salt'
  const isFormValid = useMemo(() => {
    // Account is always required
    if (!selectedAccount) return false;
    
    // Team members required (at least one)
    if (selectedTeamMembers.length === 0) return false;
    
    // Snow depth required unless service type is 'salt'
    if (serviceType !== 'salt' && (!snowDepth || snowDepth.trim() === '')) return false;
    
    // Salt used required unless service type is 'shovel'
    if (serviceType !== 'shovel' && (!saltUsed || saltUsed.trim() === '')) return false;
    
    // Temperature required
    if (!temperature || temperature.trim() === '') return false;
    
    // Weather required
    if (!weather || weather.trim() === '') return false;
    
    // Wind required
    if (!wind || wind.trim() === '') return false;
    
    return true;
  }, [selectedAccount, selectedTeamMembers, snowDepth, saltUsed, temperature, weather, wind, serviceType]);

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

  const employeeName = `${employee.first_name} ${employee.last_name}`;
  const completedToday = recentWorkLogs.filter(log => log.status === 'completed').length;
  const shoveled = recentWorkLogs.filter(log => log.service_type === 'shovel' || log.service_type === 'both').length;
  const salted = recentWorkLogs.filter(log => log.service_type === 'ice_melt' || log.service_type === 'salt').length;

  const formatTime = (value: number) => value.toString().padStart(2, '0');

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
            Welcome back, {employeeName}! Track your shovel crew services.
          </p>
        </div>

        {/* Daily Shift Card with Timer */}
        <Card className="bg-[hsl(var(--card))]/80 border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Daily Shift</p>
                  {activeShift ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-bold text-purple-400">
                        {formatTime(shiftTimer.hours)}:{formatTime(shiftTimer.minutes)}:{formatTime(shiftTimer.seconds)}
                      </span>
                      <span className="text-xs text-muted-foreground">elapsed</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Shift not started</p>
                  )}
                </div>
              </div>
              {activeShift ? (
                <Button 
                  onClick={handleClockOut}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
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

        {/* Dashboard Widgets Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Widget */}
          <ShiftStatsWidget
            totalJobs={completedToday}
            completedJobs={completedToday}
            primaryServiceCount={shoveled}
            secondaryServiceCount={salted}
            hoursWorked={activeShift ? (shiftTimer.hours + shiftTimer.minutes / 60).toFixed(1) : '0.0'}
            accountsAvailable={accounts.length}
            variant="shovel"
          />

          {/* Weather Widget */}
          <WeatherWidget
            temperature={temperature}
            conditions={weather}
            windSpeed={wind}
            variant="shovel"
          />

          {/* Quick Actions Widget */}
          <QuickActionsWidget
            isShiftActive={!!activeShift}
            isCheckedIn={!!activeWorkLog}
            hasAccountSelected={!!selectedAccount}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onRefreshLocation={handleRefreshLocation}
            isLoading={geoLoading}
            variant="shovel"
            nearestAccountName={nearestAccount?.account?.name}
          />
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
                  {nearestAccount ? (
                    <>
                      <p className="font-medium text-white">
                        <span className="text-purple-200">Nearest:</span> {nearestAccount.account.name}{' '}
                        <span className="text-purple-200">
                          {nearestAccount.distance !== null 
                            ? formatDistance(nearestAccount.distance)
                            : ''}
                        </span>
                      </p>
                      <p className="text-sm text-purple-200">
                        GPS accuracy: ±{geoLocation?.accuracy ? Math.round(geoLocation.accuracy) : '--'} meters
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-white">
                        {geoLoading ? 'Getting location...' : 'Location unavailable'}
                      </p>
                      <p className="text-sm text-purple-200">
                        {geoLoading ? 'Please wait' : 'Enable GPS to find nearest account'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefreshLocation}
                disabled={geoLoading}
                className="p-2 rounded-full hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                <Navigation className={`h-5 w-5 text-white ${geoLoading ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Select Account */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Account (verify or change)</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={!!activeWorkLog}>
                <SelectTrigger className="bg-[hsl(var(--card))]/80 border-border/50">
                  <SelectValue placeholder="Select nearest account" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--card))] border-border">
                  {sortedAccounts
                    .filter(({ account }) => account.id && account.id.trim() !== '')
                    .map(({ account, distance }) => (
                      <SelectItem key={account.id} value={account.id}>
                        <span className="flex items-center justify-between w-full gap-2">
                          <span>{account.name}</span>
                          {distance !== null && (
                            <span className="text-muted-foreground text-xs">
                              {formatDistance(distance)}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check In Button - right after account selection */}
            {!activeWorkLog && (
              <>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleCheckIn}
                  disabled={!activeShift || !selectedAccount}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Check In & Start Timer
                </Button>

                {/* Warning Messages */}
                {!activeShift && (
                  <p className="text-center text-sm">
                    <span className="text-red-400">Start your </span>
                    <span className="text-yellow-400">daily shift</span>
                    <span className="text-red-400"> first via Time Clock</span>
                  </p>
                )}
              </>
            )}

            {/* Active Work Card */}
            {activeWorkLog && (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-400">Currently working at location</p>
                      <p className="text-xs text-muted-foreground">
                        Started {activeWorkLog.check_in_time ? format(new Date(activeWorkLog.check_in_time), 'h:mm a') : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-green-400" />
                      <span className="text-lg font-mono font-bold text-green-400">
                        {formatTime(workTimer.hours)}:{formatTime(workTimer.minutes)}:{formatTime(workTimer.seconds)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Type */}
            <div className="space-y-2">
              <Label className="text-sm">Service Type <span className="text-red-400">*</span></Label>
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

            {/* Team Members - editable before and after check-in */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Footprints className="h-4 w-4" />
                  Team Members <span className="text-red-400">*</span>
                </Label>
                {activeWorkLog && selectedTeamMembers.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                    onClick={async () => {
                      const dbServiceType = serviceType === 'salt' ? 'ice_melt' : serviceType;
                      const success = await updateActiveWorkLog({ 
                        teamMemberIds: selectedTeamMembers,
                        serviceType: dbServiceType,
                      });
                      if (success) {
                        toast({ title: 'Team updated!' });
                      } else {
                        toast({ variant: 'destructive', title: 'Failed to update team' });
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
              {!activeWorkLog && selectedTeamMembers.length === 0 && (
                <p className="text-xs text-amber-400">Select at least one team member to check in</p>
              )}
              <Card className="bg-[hsl(var(--card))]/50 border-border/30">
                <CardContent className="py-3 space-y-2">
                  {shovelEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shovel crew members found</p>
                  ) : (
                    shovelEmployees.map((emp) => (
                      <div 
                        key={emp.id}
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleTeamMember(emp.id)}
                      >
                        <Checkbox 
                          checked={selectedTeamMembers.includes(emp.id)}
                          className="border-purple-500 data-[state=checked]:bg-purple-600"
                        />
                        <span className="text-sm">{emp.first_name} {emp.last_name}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Snow Depth and Salt Used */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">
                  Snow Depth (inches) {serviceType !== 'salt' && <span className="text-red-400">*</span>}
                </Label>
                <Input 
                  placeholder="e.g., 3.5"
                  value={snowDepth}
                  onChange={(e) => setSnowDepth(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
                  Salt Used (lbs) {serviceType !== 'shovel' && <span className="text-red-400">*</span>}
                </Label>
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
                <Label className="text-sm">Temp (°F) <span className="text-red-400">*</span></Label>
                <Input 
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Weather <span className="text-red-400">*</span></Label>
                <Input 
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="bg-[hsl(var(--card))]/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Wind (mph) <span className="text-red-400">*</span></Label>
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
              <PhotoUpload
                photos={photos}
                previews={previews}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                canAddMore={canAddMore}
                onAddPhotos={addPhotos}
                onRemovePhoto={removePhoto}
              />
            </div>

            {/* Log Service Button */}
            <Button
              onClick={handleLogService}
              disabled={!activeShift || !isFormValid || isUploading}
              className={`w-full py-6 text-lg font-semibold transition-colors ${
                !activeShift || !isFormValid || isUploading
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading Photos...
                </>
              ) : activeWorkLog ? (
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  Complete & Log Service
                </>
              ) : (
                <>
                  <Shovel className="h-5 w-5 mr-2" />
                  Log Service
                </>
              )}
            </Button>
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
