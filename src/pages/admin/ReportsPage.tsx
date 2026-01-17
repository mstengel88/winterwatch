import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, FileDown, Filter, Clock, Plus, Eye, Pencil, Trash2, 
  Image as ImageIcon, RefreshCw, Settings, FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { generateWorkLogsPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';
import { ShiftDialog } from '@/components/reports/ShiftDialog';
import { WorkLogDialog, WorkLogFormData } from '@/components/reports/WorkLogDialog';
import { DeleteConfirmDialog } from '@/components/reports/DeleteConfirmDialog';

interface TimeClockEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface WorkLogEntry {
  id: string;
  type: 'plow' | 'shovel';
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  account_id: string;
  account_name: string;
  employee_id: string;
  service_type: string;
  snow_depth_inches: number | null;
  salt_used_lbs: number | null;
  ice_melt_used_lbs: number | null;
  weather_conditions: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  employee_name: string;
  team_member_names: string[];
  photo_urls: string[] | null;
  notes: string | null;
}

interface Account {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  category: string;
}

interface Equipment {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Filter state
  const [fromDate, setFromDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [logType, setLogType] = useState('all');
  const [selectedPlowAccount, setSelectedPlowAccount] = useState('all');
  const [selectedShovelLocation, setSelectedShovelLocation] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [minSnow, setMinSnow] = useState('');
  const [minSalt, setMinSalt] = useState('');

  // Selection state for bulk actions
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [selectedWorkLogs, setSelectedWorkLogs] = useState<Set<string>>(new Set());

  // Dialog state
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [workLogDialogOpen, setWorkLogDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'shifts' | 'worklogs'>('shifts');
  const [editingShift, setEditingShift] = useState<TimeClockEntry | null>(null);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'shift' | 'worklog'; id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      const [
        timeClockRes,
        workLogsRes,
        shovelLogsRes,
        accountsRes,
        employeesRes,
        equipmentRes
      ] = await Promise.all([
        supabase
          .from('time_clock')
          .select('*, employee:employees(first_name, last_name)')
          .gte('clock_in_time', startDate.toISOString())
          .lte('clock_in_time', endDate.toISOString())
          .order('clock_in_time', { ascending: false }),
        supabase
          .from('work_logs')
          .select('*, account:accounts(name), employee:employees(first_name, last_name), equipment:equipment(name)')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('shovel_work_logs')
          .select('*, account:accounts(name), employee:employees(first_name, last_name)')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('accounts').select('id, name').eq('is_active', true).order('name'),
        supabase.from('employees').select('id, first_name, last_name, category').eq('is_active', true).order('first_name'),
        supabase.from('equipment').select('id, name').eq('is_active', true).order('name'),
      ]);

      setTimeClockEntries((timeClockRes.data || []) as TimeClockEntry[]);
      setAccounts((accountsRes.data || []) as Account[]);
      setEmployees((employeesRes.data || []) as Employee[]);
      setEquipment((equipmentRes.data || []) as Equipment[]);

      // Map work logs to unified format
      const plowLogs: WorkLogEntry[] = (workLogsRes.data || []).map((log: any) => ({
        id: log.id,
        type: 'plow' as const,
        date: log.created_at,
        check_in_time: log.check_in_time,
        check_out_time: log.check_out_time,
        account_id: log.account_id,
        account_name: log.account?.name || 'Unknown',
        employee_id: log.employee_id,
        service_type: log.service_type,
        snow_depth_inches: log.snow_depth_inches,
        salt_used_lbs: log.salt_used_lbs,
        ice_melt_used_lbs: null,
        weather_conditions: log.weather_conditions,
        equipment_id: log.equipment_id,
        equipment_name: log.equipment?.name || null,
        employee_name: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown',
        team_member_names: [],
        photo_urls: log.photo_urls,
        notes: log.notes,
      }));

      // For shovel logs, fetch team member names if available
      const shovelLogsData = shovelLogsRes.data || [];
      const shovelLogs: WorkLogEntry[] = await Promise.all(
        shovelLogsData.map(async (log: any) => {
          let teamMemberNames: string[] = [];
          if (log.team_member_ids && log.team_member_ids.length > 0) {
            const { data: teamMembers } = await supabase
              .from('employees')
              .select('first_name, last_name')
              .in('id', log.team_member_ids);
            teamMemberNames = (teamMembers || []).map((m: any) => `${m.first_name} ${m.last_name}`);
          }
          return {
            id: log.id,
            type: 'shovel' as const,
            date: log.created_at,
            check_in_time: log.check_in_time,
            check_out_time: log.check_out_time,
            account_id: log.account_id,
            account_name: log.account?.name || 'Unknown',
            employee_id: log.employee_id,
            service_type: log.service_type,
            snow_depth_inches: log.snow_depth_inches,
            salt_used_lbs: null,
            ice_melt_used_lbs: log.ice_melt_used_lbs,
            weather_conditions: log.weather_conditions,
            equipment_id: null,
            equipment_name: null,
            employee_name: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown',
            team_member_names: teamMemberNames,
            photo_urls: log.photo_urls,
            notes: log.notes,
          };
        })
      );

      setWorkLogs([...plowLogs, ...shovelLogs].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  // Filtered data
  const filteredShifts = useMemo(() => {
    return timeClockEntries.filter(entry => {
      if (selectedEmployee !== 'all' && entry.employee_id !== selectedEmployee) return false;
      return true;
    });
  }, [timeClockEntries, selectedEmployee]);

  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter(log => {
      if (logType !== 'all' && log.type !== logType) return false;
      if (selectedServiceType !== 'all' && log.service_type !== selectedServiceType) return false;
      if (log.type === 'plow' && selectedPlowAccount !== 'all') {
        const account = accounts.find(a => a.id === selectedPlowAccount);
        if (account && log.account_name !== account.name) return false;
      }
      if (log.type === 'shovel' && selectedShovelLocation !== 'all') {
        const account = accounts.find(a => a.id === selectedShovelLocation);
        if (account && log.account_name !== account.name) return false;
      }
      if (selectedEmployee !== 'all') {
        const emp = employees.find(e => e.id === selectedEmployee);
        if (emp && log.employee_name !== `${emp.first_name} ${emp.last_name}`) return false;
      }
      if (selectedEquipment !== 'all' && log.type === 'plow') {
        const eq = equipment.find(e => e.id === selectedEquipment);
        if (eq && log.equipment_name !== eq.name) return false;
      }
      if (minSnow && log.snow_depth_inches !== null && log.snow_depth_inches < parseFloat(minSnow)) return false;
      if (minSalt) {
        const saltAmount = log.type === 'plow' ? log.salt_used_lbs : log.ice_melt_used_lbs;
        if (saltAmount !== null && saltAmount < parseFloat(minSalt)) return false;
      }
      return true;
    });
  }, [workLogs, logType, selectedPlowAccount, selectedShovelLocation, selectedEmployee, selectedServiceType, selectedEquipment, minSnow, minSalt, accounts, employees, equipment]);

  // Stats
  const stats = useMemo(() => {
    const plowCount = filteredWorkLogs.filter(l => l.type === 'plow').length;
    const shovelCount = filteredWorkLogs.filter(l => l.type === 'shovel').length;
    const saltCount = filteredWorkLogs.filter(l => 
      l.service_type === 'salt' || l.service_type === 'both' || l.service_type === 'ice_melt'
    ).length;
    const uniqueLocations = new Set(filteredWorkLogs.map(l => l.account_name)).size;
    return {
      total: filteredWorkLogs.length,
      plow: plowCount,
      shovel: shovelCount,
      salt: saltCount,
      locations: uniqueLocations,
    };
  }, [filteredWorkLogs]);

  const clearFilters = () => {
    setLogType('all');
    setSelectedPlowAccount('all');
    setSelectedShovelLocation('all');
    setSelectedEmployee('all');
    setSelectedServiceType('all');
    setSelectedEquipment('all');
    setMinSnow('');
    setMinSalt('');
  };

  const formatDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatHours = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  };

  const handleExportPDF = () => {
    const rawLogs = filteredWorkLogs.map(log => ({
      id: log.id,
      date: format(new Date(log.date), 'MM/dd/yy'),
      account: log.account_name,
      employee: log.employee_name,
      serviceType: log.service_type,
      duration: formatDuration(log.check_in_time, log.check_out_time),
      saltLbs: log.salt_used_lbs || undefined,
      iceMeltLbs: log.ice_melt_used_lbs || undefined,
      notes: log.weather_conditions || undefined,
    }));

    const totalHours = filteredWorkLogs.reduce((sum, log) => {
      if (log.check_in_time && log.check_out_time) {
        return sum + differenceInMinutes(new Date(log.check_out_time), new Date(log.check_in_time)) / 60;
      }
      return sum;
    }, 0);

    generateWorkLogsPDF(rawLogs, {
      totalJobs: stats.total,
      totalHours,
      totalSaltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.salt_used_lbs || 0), 0),
      totalIceMeltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.ice_melt_used_lbs || 0), 0),
      dateRange: `${format(new Date(fromDate), 'MM/dd/yy')} - ${format(new Date(toDate), 'MM/dd/yy')}`,
    });
    toast.success('PDF exported successfully');
  };

  const toggleAllShifts = () => {
    if (selectedShifts.size === filteredShifts.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(filteredShifts.map(s => s.id)));
    }
  };

  const toggleAllWorkLogs = () => {
    if (selectedWorkLogs.size === filteredWorkLogs.length) {
      setSelectedWorkLogs(new Set());
    } else {
      setSelectedWorkLogs(new Set(filteredWorkLogs.map(l => l.id)));
    }
  };

  // CRUD Handlers for Shifts
  const handleSaveShift = async (data: {
    id?: string;
    employee_id: string;
    clock_in_date: string;
    clock_in_time: string;
    clock_out_time: string;
  }) => {
    setIsSaving(true);
    try {
      const clockInDateTime = new Date(`${data.clock_in_date}T${data.clock_in_time}`);
      const clockOutDateTime = data.clock_out_time 
        ? new Date(`${data.clock_in_date}T${data.clock_out_time}`)
        : null;

      if (data.id) {
        // Update existing shift
        const { error } = await supabase
          .from('time_clock')
          .update({
            employee_id: data.employee_id,
            clock_in_time: clockInDateTime.toISOString(),
            clock_out_time: clockOutDateTime?.toISOString() || null,
          })
          .eq('id', data.id);
        if (error) throw error;
        toast.success('Shift updated successfully');
      } else {
        // Create new shift
        const { error } = await supabase
          .from('time_clock')
          .insert({
            employee_id: data.employee_id,
            clock_in_time: clockInDateTime.toISOString(),
            clock_out_time: clockOutDateTime?.toISOString() || null,
          });
        if (error) throw error;
        toast.success('Shift created successfully');
      }
      setShiftDialogOpen(false);
      setEditingShift(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error('Failed to save shift');
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD Handlers for Work Logs
  const handleSaveWorkLog = async (data: WorkLogFormData) => {
    setIsSaving(true);
    try {
      const checkInDateTime = data.check_in_time 
        ? new Date(`${data.date}T${data.check_in_time}`)
        : null;
      const checkOutDateTime = data.check_out_time 
        ? new Date(`${data.date}T${data.check_out_time}`)
        : null;

      if (data.type === 'plow') {
        const payload = {
          account_id: data.account_id,
          employee_id: data.employee_id,
          equipment_id: data.equipment_id || null,
          service_type: data.service_type as 'plow' | 'salt' | 'both' | 'shovel' | 'ice_melt',
          status: 'completed' as const,
          check_in_time: checkInDateTime?.toISOString() || null,
          check_out_time: checkOutDateTime?.toISOString() || null,
          snow_depth_inches: data.snow_depth_inches || null,
          salt_used_lbs: data.salt_used_lbs || null,
          weather_conditions: data.weather_conditions || null,
          notes: data.notes || null,
        };

        if (data.id) {
          const { error } = await supabase.from('work_logs').update(payload).eq('id', data.id);
          if (error) throw error;
          toast.success('Work log updated successfully');
        } else {
          const { error } = await supabase.from('work_logs').insert(payload);
          if (error) throw error;
          toast.success('Work log created successfully');
        }
      } else {
        const payload = {
          account_id: data.account_id,
          employee_id: data.employee_id,
          service_type: data.service_type as 'plow' | 'salt' | 'both' | 'shovel' | 'ice_melt',
          status: 'completed' as const,
          check_in_time: checkInDateTime?.toISOString() || null,
          check_out_time: checkOutDateTime?.toISOString() || null,
          snow_depth_inches: data.snow_depth_inches || null,
          ice_melt_used_lbs: data.ice_melt_used_lbs || null,
          weather_conditions: data.weather_conditions || null,
          notes: data.notes || null,
        };

        if (data.id) {
          const { error } = await supabase.from('shovel_work_logs').update(payload).eq('id', data.id);
          if (error) throw error;
          toast.success('Work log updated successfully');
        } else {
          const { error } = await supabase.from('shovel_work_logs').insert(payload);
          if (error) throw error;
          toast.success('Work log created successfully');
        }
      }
      setWorkLogDialogOpen(false);
      setEditingWorkLog(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving work log:', error);
      toast.error('Failed to save work log');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      if (deleteTarget.type === 'shift') {
        const { error } = await supabase.from('time_clock').delete().eq('id', deleteTarget.id);
        if (error) throw error;
        toast.success('Shift deleted successfully');
      } else {
        // Determine which table to delete from
        const workLog = workLogs.find(l => l.id === deleteTarget.id);
        if (workLog) {
          const table = workLog.type === 'plow' ? 'work_logs' : 'shovel_work_logs';
          const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
          if (error) throw error;
          toast.success('Work log deleted successfully');
        }
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk delete handlers
  const handleBulkDelete = async () => {
    setIsSaving(true);
    try {
      if (bulkDeleteType === 'shifts') {
        const ids = Array.from(selectedShifts);
        if (ids.length === 0) return;
        const { error } = await supabase.from('time_clock').delete().in('id', ids);
        if (error) throw error;
        toast.success(`${ids.length} shift(s) deleted successfully`);
        setSelectedShifts(new Set());
      } else {
        const ids = Array.from(selectedWorkLogs);
        if (ids.length === 0) return;
        
        // Separate plow and shovel logs
        const plowIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'plow').map(l => l.id);
        const shovelIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'shovel').map(l => l.id);
        
        if (plowIds.length > 0) {
          const { error } = await supabase.from('work_logs').delete().in('id', plowIds);
          if (error) throw error;
        }
        if (shovelIds.length > 0) {
          const { error } = await supabase.from('shovel_work_logs').delete().in('id', shovelIds);
          if (error) throw error;
        }
        toast.success(`${ids.length} work log(s) deleted successfully`);
        setSelectedWorkLogs(new Set());
      }
      setBulkDeleteDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete selected items');
    } finally {
      setIsSaving(false);
    }
  };

  const openBulkDeleteShifts = () => {
    setBulkDeleteType('shifts');
    setBulkDeleteDialogOpen(true);
  };

  const openBulkDeleteWorkLogs = () => {
    setBulkDeleteType('worklogs');
    setBulkDeleteDialogOpen(true);
  };

  // Open dialog handlers
  const openAddShift = () => {
    setEditingShift(null);
    setShiftDialogOpen(true);
  };

  const openEditShift = (shift: TimeClockEntry) => {
    setEditingShift(shift);
    setShiftDialogOpen(true);
  };

  const openDeleteShift = (shift: TimeClockEntry) => {
    const empName = shift.employee ? `${shift.employee.first_name} ${shift.employee.last_name}` : 'Unknown';
    setDeleteTarget({ type: 'shift', id: shift.id, name: empName });
    setDeleteDialogOpen(true);
  };

  const openAddWorkLog = () => {
    setEditingWorkLog(null);
    setWorkLogDialogOpen(true);
  };

  const openEditWorkLog = (log: WorkLogEntry) => {
    setEditingWorkLog(log);
    setWorkLogDialogOpen(true);
  };

  const openDeleteWorkLog = (log: WorkLogEntry) => {
    setDeleteTarget({ type: 'worklog', id: log.id, name: log.account_name });
    setDeleteDialogOpen(true);
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Service Reports</h1>
            <p className="text-muted-foreground text-sm">View, edit, and export work logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-red-600 hover:bg-red-700">
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="bg-[hsl(var(--card))]/80 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Report Filters</span>
          </div>
          
          <div className="grid gap-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-[hsl(var(--background))] border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-[hsl(var(--background))] border-border/50"
                />
              </div>
            </div>

            {/* Log Type */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Log Type</Label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="plow">Plow Only</SelectItem>
                  <SelectItem value="shovel">Shovel Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account / Location / Employee */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Account (Plow)</Label>
                <Select value={selectedPlowAccount} onValueChange={setSelectedPlowAccount}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Location (Shovel)</Label>
                <Select value={selectedShovelLocation} onValueChange={setSelectedShovelLocation}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service Type / Equipment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Service Type</Label>
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="plow">Plow</SelectItem>
                    <SelectItem value="salt">Salt</SelectItem>
                    <SelectItem value="both">Plow/Salt</SelectItem>
                    <SelectItem value="shovel">Shovel Walks</SelectItem>
                    <SelectItem value="ice_melt">Salt Walks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-border/50">
                    <SelectValue placeholder="All Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Min Snow / Min Salt */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Min Snow (in)</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={minSnow}
                  onChange={(e) => setMinSnow(e.target.value)}
                  className="bg-[hsl(var(--background))] border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Min Salt (lbs)</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={minSalt}
                  onChange={(e) => setMinSalt(e.target.value)}
                  className="bg-[hsl(var(--background))] border-border/50"
                />
              </div>
            </div>

            <div className="text-center">
              <Button variant="link" className="text-muted-foreground text-sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Shifts Section */}
      <Card className="bg-[hsl(var(--card))]/80 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Daily Shifts ({filteredShifts.length} shifts)</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedShifts.size > 0 && (
                <Button size="sm" variant="destructive" onClick={openBulkDeleteShifts}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedShifts.size})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openAddShift}>
                <Plus className="h-4 w-4 mr-1" />
                Add Shift
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedShifts.size === filteredShifts.length && filteredShifts.length > 0}
                      onCheckedChange={toggleAllShifts}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.slice(0, 10).map(entry => (
                  <TableRow key={entry.id} className="border-border/30">
                    <TableCell>
                      <Checkbox 
                        checked={selectedShifts.has(entry.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedShifts);
                          if (checked) newSet.add(entry.id);
                          else newSet.delete(entry.id);
                          setSelectedShifts(newSet);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : 'Unknown'}
                    </TableCell>
                    <TableCell>{format(new Date(entry.clock_in_time), 'MM/dd')}</TableCell>
                    <TableCell>{format(new Date(entry.clock_in_time), 'HH:mm')}</TableCell>
                    <TableCell>
                      {entry.clock_out_time ? format(new Date(entry.clock_out_time), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-cyan-400 cursor-pointer hover:underline">
                        {formatHours(entry.clock_in_time, entry.clock_out_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.clock_in_latitude && entry.clock_in_longitude ? (
                        <Button variant="link" size="sm" className="text-cyan-400 p-0 h-auto">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditShift(entry)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDeleteShift(entry)}>
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredShifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No shifts found for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-[hsl(var(--card))]/50 border-border/30">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))]/50 border-border/30">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Plow</p>
            <p className="text-3xl font-bold text-blue-400">{stats.plow}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))]/50 border-border/30">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Shovel</p>
            <p className="text-3xl font-bold text-purple-400">{stats.shovel}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))]/50 border-border/30">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Salt</p>
            <p className="text-3xl font-bold text-green-400">{stats.salt}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))]/50 border-border/30">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Locations</p>
            <p className="text-3xl font-bold text-orange-400">{stats.locations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Work Log Entries Section */}
      <Card className="bg-[hsl(var(--card))]/80 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Work Log Entries ({filteredWorkLogs.length})</span>
            <div className="flex items-center gap-2">
              {selectedWorkLogs.size > 0 && (
                <Button size="sm" variant="destructive" onClick={openBulkDeleteWorkLogs}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedWorkLogs.size})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openAddWorkLog}>
                <Plus className="h-4 w-4 mr-1" />
                Add Entry
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedWorkLogs.size === filteredWorkLogs.length && filteredWorkLogs.length > 0}
                      onCheckedChange={toggleAllWorkLogs}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Dur.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Snow/Salt</TableHead>
                  <TableHead>Weather</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Crew</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkLogs.slice(0, 20).map(log => (
                  <TableRow key={log.id} className="border-border/30">
                    <TableCell>
                      <Checkbox 
                        checked={selectedWorkLogs.has(log.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedWorkLogs);
                          if (checked) newSet.add(log.id);
                          else newSet.delete(log.id);
                          setSelectedWorkLogs(newSet);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={log.type === 'plow' ? 'bg-blue-600' : 'bg-purple-600'}>
                        {log.type === 'plow' ? 'Plow' : 'Shov'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(log.date), 'MM/dd')}</TableCell>
                    <TableCell>
                      {log.check_in_time ? format(new Date(log.check_in_time), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      {log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{formatDuration(log.check_in_time, log.check_out_time)}</TableCell>
                    <TableCell className="max-w-[100px] truncate" title={log.account_name}>
                      {log.account_name}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          log.service_type === 'plow' ? 'border-blue-500 text-blue-400' :
                          log.service_type === 'salt' || log.service_type === 'ice_melt' ? 'border-green-500 text-green-400' :
                          log.service_type === 'shovel' ? 'border-purple-500 text-purple-400' :
                          'border-cyan-500 text-cyan-400'
                        }
                      >
                        {log.type === 'plow' 
                          ? (log.service_type === 'both' ? 'Plow/Salt' : 
                             log.service_type === 'plow' ? 'Plow' : 
                             log.service_type === 'salt' ? 'Salt' : log.service_type)
                          : (log.service_type === 'both' ? 'Shovel/Salt' : 
                             log.service_type === 'ice_melt' ? 'Salt' : 
                             log.service_type === 'shovel' ? 'Shovel' : log.service_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.snow_depth_inches !== null ? `${log.snow_depth_inches}"` : '-'} / {' '}
                      {log.salt_used_lbs !== null ? `${log.salt_used_lbs}lb` : 
                       log.ice_melt_used_lbs !== null ? `${log.ice_melt_used_lbs}lb` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[80px] truncate text-sm" title={log.weather_conditions || '-'}>
                      {log.weather_conditions || '-'}
                    </TableCell>
                    <TableCell className="max-w-[80px] truncate text-sm" title={log.equipment_name || '-'}>
                      {log.equipment_name || '-'}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate text-sm" title={log.team_member_names.join(', ') || log.employee_name}>
                      {log.team_member_names.length > 0 ? log.team_member_names.join(', ') : log.employee_name}
                    </TableCell>
                    <TableCell>
                      {log.photo_urls && log.photo_urls.length > 0 ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWorkLog(log)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDeleteWorkLog(log)}>
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredWorkLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                      No work logs found for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Shift Dialog */}
      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        employees={employees}
        initialData={editingShift}
        onSave={handleSaveShift}
        isLoading={isSaving}
      />

      {/* Work Log Dialog */}
      <WorkLogDialog
        open={workLogDialogOpen}
        onOpenChange={setWorkLogDialogOpen}
        accounts={accounts}
        employees={employees}
        equipment={equipment}
        initialData={editingWorkLog ? {
          id: editingWorkLog.id,
          type: editingWorkLog.type,
          account_id: editingWorkLog.account_id,
          employee_id: editingWorkLog.employee_id,
          equipment_id: editingWorkLog.equipment_id || undefined,
          service_type: editingWorkLog.service_type,
          check_in_time: editingWorkLog.check_in_time,
          check_out_time: editingWorkLog.check_out_time,
          snow_depth_inches: editingWorkLog.snow_depth_inches,
          salt_used_lbs: editingWorkLog.salt_used_lbs,
          ice_melt_used_lbs: editingWorkLog.ice_melt_used_lbs,
          weather_conditions: editingWorkLog.weather_conditions,
          notes: editingWorkLog.notes,
        } : null}
        onSave={handleSaveWorkLog}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteTarget?.type === 'shift' ? 'Delete Shift' : 'Delete Work Log'}
        description={`Are you sure you want to delete this ${deleteTarget?.type === 'shift' ? 'shift' : 'work log'} for "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={isSaving}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={bulkDeleteType === 'shifts' ? `Delete ${selectedShifts.size} Shifts` : `Delete ${selectedWorkLogs.size} Work Logs`}
        description={`Are you sure you want to delete ${bulkDeleteType === 'shifts' ? selectedShifts.size : selectedWorkLogs.size} selected ${bulkDeleteType === 'shifts' ? 'shift(s)' : 'work log(s)'}? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        isLoading={isSaving}
      />
    </div>
  );
}
