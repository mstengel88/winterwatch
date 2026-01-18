import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployee';
import { useWorkLogs } from '@/hooks/useWorkLogs';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { PhotoUpload } from '@/components/dashboard/PhotoUpload';
import { 
  Snowflake, 
  Truck, 
  Clock, 
  MapPin,
  Loader2,
  AlertCircle,
  LogIn,
  Navigation,
  Play,
  RefreshCw,
  Timer
} from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Account, Employee } from '@/types/database';
import { calculateDistance, formatDistance } from '@/lib/distance';

// Format time with leading zeros
function formatTime(value: number): string {
  return value.toString().padStart(2, '0');
}

interface AccountWithDistance extends Account {
  distance?: number;
}

export default function DriverDashboard() {
  const { profile } = useAuth();
  const { employee, activeShift, isLoading: employeeLoading, clockIn, clockOut } = useEmployee();
  const { location: geoLocation, getCurrentLocation, isLoading: geoLoading, error: geoError } = useGeolocation();
  const { toast } = useToast();
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
  } = usePhotoUpload({ folder: 'work-logs' });

  // Get location on mount and set up periodic refresh
  useEffect(() => {
    getCurrentLocation();
    
    // Refresh location every 30 seconds for real-time updates
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [getCurrentLocation]);

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
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [plowEmployees, setPlowEmployees] = useState<Employee[]>([]);
  const [shiftTimer, setShiftTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [workTimer, setWorkTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Employee selection for UI display only - doesn't affect work log tracking
  const selectedEmployeeNameForUi = useMemo(() => {
    if (!selectedEmployees) {
      return employee ? `${employee.first_name} ${employee.last_name}` : 'Employee';
    }
    const found = plowEmployees.find((e) => e.id === selectedEmployees);
    return found ? `${found.first_name} ${found.last_name}` : 'Employee';
  }, [selectedEmployees, employee, plowEmployees]);

  // Always use logged-in user's employee ID for tracking active work log
  // Employee selection only affects what gets saved at checkout
  const {
    accounts,
    activeWorkLog,
    recentWorkLogs,
    isLoading: workLogsLoading,
    checkIn,
    checkOut,
  } = useWorkLogs({ employeeId: employee?.id });

  // Filter equipment based on selected service type and sort by number descending
  // Plow → show 'plow' and 'both', Salt/Both → show 'both' only
  const filteredEquipment = useMemo(() => {
    let filtered;
    if (serviceType === 'plow') {
      filtered = allEquipment.filter(eq => eq.service_type === 'plow' || eq.service_type === 'both');
    } else {
      filtered = allEquipment.filter(eq => eq.service_type === 'both');
    }
    // Sort by extracting numbers from name, descending
    return filtered.sort((a, b) => {
      const numA = parseInt(a.name?.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name?.match(/\d+/)?.[0] || '0', 10);
      return numB - numA;
    });
  }, [allEquipment, serviceType]);

  // Clear equipment selection when service type changes if current selection doesn't match
  useEffect(() => {
    if (selectedEquipment) {
      const isValid = filteredEquipment.some(eq => eq.id === selectedEquipment);
      if (!isValid) {
        setSelectedEquipment('');
      }
    }
  }, [serviceType, filteredEquipment, selectedEquipment]);

  // Fetch equipment and plow employees
  useEffect(() => {
    supabase.from('equipment').select('*').eq('is_active', true).eq('status', 'available').then(({ data }) => {
      if (data) setAllEquipment(data);
    });
    
    // Fetch employees with plow or both category
    supabase
      .from('employees')
      .select('*')
      .in('category', ['plow', 'both'])
      .eq('is_active', true)
      .order('first_name')
      .then(({ data }) => {
        if (data) setPlowEmployees(data as Employee[]);
      });
  }, []);

  // Auto-select employee matching logged-in user's email
  useEffect(() => {
    if (profile?.email && plowEmployees.length > 0 && !selectedEmployees) {
      const matchingEmployee = plowEmployees.find(
        (emp) => emp.email?.toLowerCase() === profile.email?.toLowerCase()
      );
      if (matchingEmployee) {
        setSelectedEmployees(matchingEmployee.id);
      }
    }
  }, [profile?.email, plowEmployees, selectedEmployees]);

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

  // Work timer for check-in at location
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

  // Calculate sorted accounts by distance
  const sortedAccounts = useMemo((): AccountWithDistance[] => {
    if (!geoLocation || accounts.length === 0) {
      return accounts.map(acc => ({ ...acc, distance: undefined }));
    }
    
    return accounts
      .map((acc) => {
        let distance: number | undefined = undefined;
        if (acc.latitude && acc.longitude) {
          distance = calculateDistance(
            geoLocation.latitude,
            geoLocation.longitude,
            acc.latitude,
            acc.longitude
          );
        }
        return { ...acc, distance };
      })
      .sort((a, b) => {
        // Accounts with distance first, sorted by distance
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [geoLocation, accounts]);

  // Get nearest account
  const nearestAccount = useMemo(() => {
    if (sortedAccounts.length === 0) return null;
    const first = sortedAccounts[0];
    if (first.distance !== undefined) {
      return { account: first, distance: first.distance };
    }
    return null;
  }, [sortedAccounts]);

  // Auto-select nearest account when location updates and no account selected
  useEffect(() => {
    if (nearestAccount && !selectedAccountId) {
      setSelectedAccountId(nearestAccount.account.id);
    }
  }, [nearestAccount, selectedAccountId]);

  // Handle manual location refresh
  const handleRefreshLocation = useCallback(async () => {
    await getCurrentLocation();
    toast({ title: 'Location updated' });
  }, [getCurrentLocation, toast]);

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
      // Refresh location after clocking in
      getCurrentLocation();
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
    if (!selectedEmployees) {
      toast({ variant: 'destructive', title: 'Please select an employee' });
      return;
    }
    // Convert "self" to actual employee ID
    const employeeIdToUse = selectedEmployees === 'self' ? employee?.id : selectedEmployees;
    if (!employeeIdToUse) {
      toast({ variant: 'destructive', title: 'Employee not found' });
      return;
    }
    const success = await checkIn(selectedAccountId, selectedEquipment || undefined, serviceType, employeeIdToUse);
    if (success) {
      toast({ title: 'Checked in!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to check in' });
    }
  };

  const handleCheckOut = async () => {
    // Validate required fields based on service type
    const missingFields: string[] = [];
    
    if (!selectedEquipment) missingFields.push('Equipment');
    if (!selectedEmployees) missingFields.push('Employees');
    
    // Snow depth required for plow and both
    if ((serviceType === 'plow' || serviceType === 'both') && (!snowDepth || snowDepth.trim() === '')) {
      missingFields.push('Snow Depth');
    }
    
    // Salt used required for salt and both
    if ((serviceType === 'salt' || serviceType === 'both') && (!saltUsed || saltUsed.trim() === '')) {
      missingFields.push('Salt Used');
    }
    
    if (!temperature || temperature.trim() === '') missingFields.push('Temperature');
    if (!weather || weather.trim() === '') missingFields.push('Weather');
    if (!windSpeed || windSpeed.trim() === '') missingFields.push('Wind Speed');
    
    if (missingFields.length > 0) {
      toast({ 
        variant: 'destructive', 
        title: 'Required fields missing',
        description: `Please fill in: ${missingFields.join(', ')}`
      });
      return;
    }

    // Upload photos first if any
    let photoUrls: string[] = [];
    if (photos.length > 0 && activeWorkLog) {
      photoUrls = await uploadPhotos(activeWorkLog.id);
    }

    // Get the currently selected employee ID for checkout (or fallback to logged-in user)
    const employeeIdToUse = selectedEmployees || employee?.id;

    const success = await checkOut({
      snowDepthInches: snowDepth ? parseFloat(snowDepth) : undefined,
      saltUsedLbs: saltUsed ? parseFloat(saltUsed) : undefined,
      weatherConditions: `${temperature}°F ${weather} Wind: ${windSpeed}mph`,
      notes,
      photoUrls,
      equipmentId: selectedEquipment || undefined,
      employeeId: employeeIdToUse,
      serviceType,
    });
    if (success) {
      toast({ title: 'Work completed!' });
      setNotes('');
      setSnowDepth('');
      setSaltUsed('');
      setSelectedEquipment('');
      setSelectedEmployees('');
      clearPhotos();
    } else {
      toast({ variant: 'destructive', title: 'Failed to check out' });
    }
  };

  const isLoading = employeeLoading || workLogsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <Card className="border-warning bg-card">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Employee Record Not Found</p>
                <p className="text-sm text-muted-foreground">
                  Your user account is not linked to an employee record. Please contact your manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Snowflake className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                WinterWatch-Pro
                <span className="text-sm font-normal text-muted-foreground">{temperature}°F</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {employee.first_name} {employee.last_name}! Track your plowing and salting services.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="flex items-center justify-end gap-1.5 text-lg font-semibold text-success">
              <Clock className="h-4 w-4" />
              {weeklyHours}h
            </p>
          </div>
        </div>

        {/* Daily Shift Card */}
        <Card className="bg-[hsl(var(--card))]/80 border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Daily Shift</p>
                  {activeShift ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-primary">
                        {formatTime(shiftTimer.hours)}:{formatTime(shiftTimer.minutes)}:{formatTime(shiftTimer.seconds)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Started {format(new Date(activeShift.clock_in_time), 'h:mm a')}
                      </span>
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
                  <LogIn className="h-4 w-4 mr-2" />
                  End Shift
                </Button>
              ) : (
                <Button 
                  onClick={handleClockIn}
                  className="bg-primary hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Start Shift
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Overview */}
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Today's Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50 bg-card">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{todayStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Services</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{todayStats.plowed}</p>
                <p className="text-xs text-muted-foreground">Plowed</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Snowflake className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold">{todayStats.salted}</p>
                <p className="text-xs text-muted-foreground">Salted</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold">{todayStats.accounts}</p>
                <p className="text-xs text-muted-foreground">Properties</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Log Entry */}
          <div>
            <h2 className="mb-3 text-base font-semibold">Quick Log Entry</h2>
            
            {/* Nearest Location Card */}
            <div className="bg-primary rounded-lg p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-primary-foreground/70" />
                <div>
                  {geoLoading ? (
                    <p className="font-medium text-primary-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting location...
                    </p>
                  ) : geoError ? (
                    <p className="font-medium text-primary-foreground">
                      {geoError}
                    </p>
                  ) : nearestAccount ? (
                    <>
                      <p className="font-medium text-primary-foreground">
                        <span className="text-primary-foreground/70">Nearest:</span> {nearestAccount.account.name}{' '}
                        <span className="text-primary-foreground/70">{formatDistance(nearestAccount.distance)}</span>
                      </p>
                      <p className="text-sm text-primary-foreground/70">
                        GPS accuracy: ±{geoLocation?.accuracy?.toFixed(0) || 0} meters
                      </p>
                    </>
                  ) : (
                    <p className="font-medium text-primary-foreground">
                      No accounts with coordinates found
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshLocation}
                disabled={geoLoading}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Navigation className={`h-5 w-5 ${geoLoading ? 'animate-pulse' : ''}`} />
              </Button>
            </div>

            {/* Account Select */}
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground">Select Account (verify or change)</Label>
              <Select 
                value={selectedAccountId} 
                onValueChange={setSelectedAccountId}
                disabled={!!activeWorkLog}
              >
                <SelectTrigger className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus:ring-primary/20">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30">
                  {sortedAccounts
                    .filter((acc) => acc.id && acc.id.trim() !== '')
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{acc.name}</span>
                          {acc.distance !== undefined && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatDistance(acc.distance)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check In Button or Active Work */}
            {!activeWorkLog ? (
              <>
                <Button 
                  className="w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground mb-3"
                  onClick={handleCheckIn}
                  disabled={!activeShift || !selectedAccountId}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Check In & Start Timer
                </Button>
                
                {!activeShift && (
                  <p className="text-center text-sm mb-4">
                    <span className="text-red-400">Start your </span>
                    <span className="text-yellow-400">daily shift</span>
                    <span className="text-red-400"> first via Time Clock</span>
                  </p>
                )}
              </>
            ) : (
              <Card className="mb-4 border-primary/50 bg-primary/10">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">Currently working at location</p>
                      <p className="text-xs text-muted-foreground">
                        Started {format(new Date(activeWorkLog.check_in_time!), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-primary" />
                      <span className="text-lg font-mono font-bold text-primary">
                        {formatTime(workTimer.hours)}:{formatTime(workTimer.minutes)}:{formatTime(workTimer.seconds)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Type */}
            <div className="space-y-2 mb-4">
              <Label className="text-sm">Service Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={serviceType === 'plow' ? 'default' : 'ghost'}
                  className={serviceType === 'plow' 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('plow')}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Plow Only
                </Button>
                <Button
                  variant={serviceType === 'salt' ? 'default' : 'ghost'}
                  className={serviceType === 'salt' 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('salt')}
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  Salt Only
                </Button>
                <Button
                  variant={serviceType === 'both' ? 'default' : 'ghost'}
                  className={serviceType === 'both' 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-transparent hover:bg-muted/30'
                  }
                  onClick={() => setServiceType('both')}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Plow & Salt
                </Button>
              </div>
            </div>

            {/* Equipment & Employees */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Equipment <span className="text-red-400">*</span></Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/30">
                    {filteredEquipment
                      .filter((eq) => eq.id && eq.id.trim() !== '')
                      .map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Employees <span className="text-red-400">*</span></Label>
                <Select value={selectedEmployees} onValueChange={setSelectedEmployees}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select employees..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/30">
                    {plowEmployees
                      .filter((emp) => emp.id && emp.id.trim() !== '')
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            {/* Snow & Salt */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Snow Depth (inches) {(serviceType === 'plow' || serviceType === 'both') && <span className="text-red-400">*</span>}
                </Label>
                <Input 
                  type="number"
                  placeholder="e.g., 3.5"
                  value={snowDepth}
                  onChange={(e) => setSnowDepth(e.target.value)}
                  className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Salt Used (lbs) {(serviceType === 'salt' || serviceType === 'both') && <span className="text-red-400">*</span>}
                </Label>
                <Input 
                  type="number"
                  placeholder="e.g., 150"
                  value={saltUsed}
                  onChange={(e) => setSaltUsed(e.target.value)}
                  className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Weather */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  Temp (°F) <span className="text-red-400">*</span>
                </Label>
                <Input 
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  Weather <span className="text-red-400">*</span>
                </Label>
                <Input 
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  Wind (mph) <span className="text-red-400">*</span>
                </Label>
                <Input 
                  type="number"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground">Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 bg-secondary border-primary/30 focus:border-primary focus-visible:ring-primary/20 min-h-[80px]"
              />
            </div>

            {/* Photo Upload */}
            <div className="mb-4">
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

            {/* Submit Button */}
            {activeWorkLog ? (
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCheckOut}
              >
                Check Out & Complete
              </Button>
            ) : (
              <Button 
                className="w-full bg-primary/50 hover:bg-primary/40 text-primary-foreground cursor-not-allowed"
                disabled
              >
                Check In First
              </Button>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
            {recentWorkLogs.length === 0 ? (
              <Card className="border-border/50 bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground">Start logging your work!</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card">
                <CardContent className="py-2 px-0">
                  <div className="divide-y divide-border">
                    {recentWorkLogs.map((log: any) => {
                      const isInProgress = log.status === 'in_progress' || (log.check_in_time && !log.check_out_time);
                      return (
                        <div key={log.id} className={`flex items-start gap-3 py-3 px-4 ${isInProgress ? 'bg-primary/5' : ''}`}>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg mt-0.5 ${isInProgress ? 'bg-warning/20' : 'bg-primary/20'}`}>
                            <Truck className={`h-4 w-4 ${isInProgress ? 'text-warning' : 'text-primary'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{log.account?.name || 'Unknown'}</p>
                              {isInProgress ? (
                                <Badge className="bg-warning/20 text-warning border-warning/30 text-xs px-2 py-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-warning mr-1.5 animate-pulse" />
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge 
                                  className="bg-success text-success-foreground text-xs px-2 py-0.5"
                                >
                                  {log.service_type === 'plow' ? 'Plowed' : log.service_type === 'salt' ? 'Salted' : 'Both'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(log.check_in_time || log.created_at), 'MMM d, h:mm a')} • {log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown'}
                            </p>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
