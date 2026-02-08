import { useState, useEffect, useMemo, useRef, type MouseEvent, type TouchEvent } from 'react';
import { ForceCheckoutPanel } from '@/components/admin/ForceCheckoutPanel';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, FileDown, Filter, Clock, Plus, Eye, Pencil, Trash2, 
  Image as ImageIcon, RefreshCw, FileText, ChevronLeft, ChevronRight, Printer, ChevronDown, Archive, CheckCircle, Cloud
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { generateWorkLogsPDF, generateTimesheetsPDF, generateSummaryPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';
import { ShiftDialog } from '@/components/reports/ShiftDialog';
import { WorkLogDialog, WorkLogFormData } from '@/components/reports/WorkLogDialog';
import { BulkEditWorkLogDialog, BulkEditFormData } from '@/components/reports/BulkEditWorkLogDialog';
import { DeleteConfirmDialog } from '@/components/reports/DeleteConfirmDialog';
import { PhotoThumbnails } from '@/components/reports/PhotoThumbnails';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoogleDriveExport } from '@/hooks/useGoogleDriveExport';
import { cn } from '@/lib/utils';

interface TimeClockEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  billing_status: 'current' | 'billable' | 'completed';
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
  billed: boolean;
  billing_status: 'current' | 'billable' | 'completed';
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
  is_active?: boolean;
}

interface Equipment {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { isNative } = useNativePlatform();
  const isMobile = useIsMobile();
  const { isExporting, exportPdfToDrive } = useGoogleDriveExport();

  const [isLoading, setIsLoading] = useState(true);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // iOS/Native + mobile web: ensure table action buttons are large enough to tap reliably.
  const tableIconButtonClass = cn("h-7 w-7", (isNative || isMobile) && "h-11 w-11");

  // iOS Safari can occasionally miss `click` on small icon buttons inside tables.
  // Using `touchend` + preventing the subsequent synthetic click improves reliability.
  const lastTouchAtRef = useRef(0);

  const tapHandlers = (action: () => void) => ({
    onClick: (e: MouseEvent) => {
      // Native iOS may fire touchend + a synthetic click. Ignore the click if a touch just happened.
      if (Date.now() - lastTouchAtRef.current < 750) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      action();
    },
    onTouchEnd: (e: TouchEvent) => {
      lastTouchAtRef.current = Date.now();
      e.preventDefault();
      e.stopPropagation();
      action();
    },
  });

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
  const [activeTab, setActiveTab] = useState('current');
  const [activeShiftTab, setActiveShiftTab] = useState('current');

  // Selection state for bulk actions
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [selectedWorkLogs, setSelectedWorkLogs] = useState<Set<string>>(new Set());

  // Dialog state
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [workLogDialogOpen, setWorkLogDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'shifts' | 'worklogs'>('shifts');
  const [editingShift, setEditingShift] = useState<TimeClockEntry | null>(null);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'shift' | 'worklog'; id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Photo viewer state
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Get signed URLs for photos from private bucket
  const getSignedUrls = async (filePaths: string[]): Promise<string[]> => {
    if (filePaths.length === 0) return [];
    
    const signedUrls: string[] = [];
    
    for (const path of filePaths) {
      // Check if it's already a full URL (legacy data)
      if (path.startsWith('http')) {
        signedUrls.push(path);
        continue;
      }
      
      const { data, error } = await supabase.storage
        .from('work-photos')
        .createSignedUrl(path, 3600); // 1 hour expiration

      if (!error && data?.signedUrl) {
        signedUrls.push(data.signedUrl);
      }
    }
    
    return signedUrls;
  };

  // Open photo viewer with signed URLs
  const openPhotoViewer = async (photoPaths: string[]) => {
    if (!photoPaths || photoPaths.length === 0) return;
    
    setLoadingPhotos(true);
    setPhotoViewerOpen(true);
    setCurrentPhotoIndex(0);
    
    const urls = await getSignedUrls(photoPaths);
    setViewingPhotos(urls);
    setLoadingPhotos(false);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % viewingPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + viewingPhotos.length) % viewingPhotos.length);
  };

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
        supabase.from('equipment').select('id, name').eq('is_active', true).eq('status', 'available').order('name'),
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
        employee_id: log.employee_id || '',
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
        billed: log.billed || false,
        billing_status: (log.billing_status || 'current') as 'current' | 'billable' | 'completed',
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
            employee_id: log.employee_id || '',
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
            billed: log.billed || false,
            billing_status: (log.billing_status || 'current') as 'current' | 'billable' | 'completed',
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
      // Filter by billing_status based on active shift tab
      if (activeShiftTab === 'current' && entry.billing_status !== 'current') return false;
      if (activeShiftTab === 'billable' && entry.billing_status !== 'billable') return false;
      if (activeShiftTab === 'completed' && entry.billing_status !== 'completed') return false;
      if (selectedEmployee !== 'all' && entry.employee_id !== selectedEmployee) return false;
      return true;
    });
  }, [timeClockEntries, selectedEmployee, activeShiftTab]);

  // Counts for shift tabs based on billing_status
  const shiftCurrentCount = useMemo(() => timeClockEntries.filter(e => e.billing_status === 'current').length, [timeClockEntries]);
  const shiftBillableCount = useMemo(() => timeClockEntries.filter(e => e.billing_status === 'billable').length, [timeClockEntries]);
  const shiftCompletedCount = useMemo(() => timeClockEntries.filter(e => e.billing_status === 'completed').length, [timeClockEntries]);

  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter(log => {
      // Filter by billing_status based on active tab
      if (activeTab === 'current' && log.billing_status !== 'current') return false;
      if (activeTab === 'billable' && log.billing_status !== 'billable') return false;
      if (activeTab === 'completed' && log.billing_status !== 'completed') return false;
      
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
  }, [workLogs, logType, selectedPlowAccount, selectedShovelLocation, selectedEmployee, selectedServiceType, selectedEquipment, minSnow, minSalt, accounts, employees, equipment, activeTab]);

  // Counts for tabs based on billing_status
  const currentCount = useMemo(() => workLogs.filter(l => l.billing_status === 'current').length, [workLogs]);
  const billableCount = useMemo(() => workLogs.filter(l => l.billing_status === 'billable').length, [workLogs]);
  // Completed = billed/archived
  const completedCount = useMemo(() => workLogs.filter(l => l.billed).length, [workLogs]);

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

  const handlePrintPDF = () => {
    handleExportPDF();
    // Open print dialog after a short delay to allow PDF generation
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportPDF = () => {
    const rawLogs = filteredWorkLogs.map((log) => {
      const employeeDisplay =
        log.type === 'shovel' && log.team_member_names && log.team_member_names.length > 0
          ? log.team_member_names.join(', ')
          : log.employee_name;

      return {
        id: log.id,
        type: log.type,
        date: format(new Date(log.date), 'MM/dd/yy'),
        checkIn: log.check_in_time ? format(new Date(log.check_in_time), 'HH:mm') : '-',
        checkOut: log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : '-',
        duration: formatDuration(log.check_in_time, log.check_out_time),
        account: log.account_name,
        serviceType: log.service_type,
        snowDepth: log.snow_depth_inches ? `${log.snow_depth_inches}"` : '-',
        saltLbs: log.salt_used_lbs
          ? `${log.salt_used_lbs}lb`
          : log.ice_melt_used_lbs
            ? `${log.ice_melt_used_lbs}lb`
            : '-',
        equipment: log.equipment_name || '-',
        employee: employeeDisplay,
        conditions: log.weather_conditions || '-',
        notes: log.notes || undefined,
      };
    });


    const totalHours = filteredWorkLogs.reduce((sum, log) => {
      if (log.check_in_time && log.check_out_time) {
        return sum + differenceInMinutes(new Date(log.check_out_time), new Date(log.check_in_time)) / 60;
      }
      return sum;
    }, 0);

    // Count unique properties
    const uniqueAccounts = new Set(filteredWorkLogs.map(log => log.account_name)).size;
    const plowCount = filteredWorkLogs.filter(log => log.service_type === 'plow' || log.service_type === 'both').length;
    const saltCount = filteredWorkLogs.filter(log => log.service_type === 'salt' || log.service_type === 'ice_melt' || log.service_type === 'both').length;

    generateWorkLogsPDF(rawLogs, {
      totalJobs: stats.total,
      totalHours,
      totalSaltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.salt_used_lbs || 0), 0),
      totalIceMeltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.ice_melt_used_lbs || 0), 0),
      plowCount,
      saltCount,
      propertyCount: uniqueAccounts,
      dateRange: `${format(new Date(fromDate), 'yyyy-MM-dd')} to ${format(new Date(toDate), 'yyyy-MM-dd')}`,
    });
    toast.success('PDF exported successfully');
  };

  const handleExportToDrive = async () => {
    const rawLogs = filteredWorkLogs.map((log) => {
      const employeeDisplay =
        log.type === 'shovel' && log.team_member_names && log.team_member_names.length > 0
          ? log.team_member_names.join(', ')
          : log.employee_name;

      return {
        id: log.id,
        type: log.type,
        date: format(new Date(log.date), 'MM/dd/yy'),
        checkIn: log.check_in_time ? format(new Date(log.check_in_time), 'HH:mm') : '-',
        checkOut: log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : '-',
        duration: formatDuration(log.check_in_time, log.check_out_time),
        account: log.account_name,
        serviceType: log.service_type,
        snowDepth: log.snow_depth_inches ? `${log.snow_depth_inches}"` : '-',
        saltLbs: log.salt_used_lbs
          ? `${log.salt_used_lbs}lb`
          : log.ice_melt_used_lbs
            ? `${log.ice_melt_used_lbs}lb`
            : '-',
        equipment: log.equipment_name || '-',
        employee: employeeDisplay,
        conditions: log.weather_conditions || '-',
        notes: log.notes || undefined,
      };
    });

    const totalHours = filteredWorkLogs.reduce((sum, log) => {
      if (log.check_in_time && log.check_out_time) {
        return sum + differenceInMinutes(new Date(log.check_out_time), new Date(log.check_in_time)) / 60;
      }
      return sum;
    }, 0);

    const uniqueAccounts = new Set(filteredWorkLogs.map(log => log.account_name)).size;
    const plowCount = filteredWorkLogs.filter(log => log.service_type === 'plow' || log.service_type === 'both').length;
    const saltCount = filteredWorkLogs.filter(log => log.service_type === 'salt' || log.service_type === 'ice_melt' || log.service_type === 'both').length;

    // Generate PDF blob
    const pdfBlob = generateWorkLogsPDF(rawLogs, {
      totalJobs: stats.total,
      totalHours,
      totalSaltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.salt_used_lbs || 0), 0),
      totalIceMeltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.ice_melt_used_lbs || 0), 0),
      plowCount,
      saltCount,
      propertyCount: uniqueAccounts,
      dateRange: `${format(new Date(fromDate), 'yyyy-MM-dd')} to ${format(new Date(toDate), 'yyyy-MM-dd')}`,
    }, 'Work Logs Report', { returnBlob: true });

    if (!pdfBlob) {
      toast.error('Failed to generate PDF');
      return;
    }

    const fileName = `work-logs-report-${format(new Date(fromDate), 'yyyy-MM-dd')}-to-${format(new Date(toDate), 'yyyy-MM-dd')}.pdf`;
    
    toast.loading('Uploading to Google Drive...', { id: 'drive-export' });
    
    const result = await exportPdfToDrive(pdfBlob, fileName, 'WinterWatch Reports');
    
    if (result.success) {
      toast.success('Exported to Google Drive!', { id: 'drive-export' });
      if (result.webViewLink) {
        toast.info('Click to open in Drive', {
          action: {
            label: 'Open',
            onClick: () => window.open(result.webViewLink, '_blank'),
          },
        });
      }
    } else {
      toast.error(result.error || 'Failed to export to Google Drive', { id: 'drive-export' });
      
      if (result.code === 'NO_PROVIDER_TOKEN' || result.code === 'TOKEN_EXPIRED' || result.code === 'ACCESS_DENIED') {
        toast.info('Please sign out and sign back in with Google to grant Drive permissions.');
      }
    }
  };

  const handleExportTimeSheets = () => {
    // Generate PDF for time sheets
    const entries = filteredShifts.map(shift => {
      const employeeName = shift.employee ? `${shift.employee.first_name} ${shift.employee.last_name}` : 'Unknown';
      const hours = formatHours(shift.clock_in_time, shift.clock_out_time);
      const location = shift.clock_in_latitude && shift.clock_in_longitude 
        ? `${shift.clock_in_latitude.toFixed(4)}, ${shift.clock_in_longitude.toFixed(4)}` 
        : '-';
      return {
        employeeName,
        date: format(new Date(shift.clock_in_time), 'MM/dd/yyyy'),
        clockIn: format(new Date(shift.clock_in_time), 'HH:mm'),
        clockOut: shift.clock_out_time ? format(new Date(shift.clock_out_time), 'HH:mm') : '-',
        hoursWorked: hours,
        location
      };
    });

    const dateRange = `${format(new Date(fromDate), 'MMM d, yyyy')} - ${format(new Date(toDate), 'MMM d, yyyy')}`;
    generateTimesheetsPDF(entries, dateRange);
    toast.success('Time sheets PDF exported successfully');
  };

  const handleExportSummary = () => {
    // Calculate summary statistics
    const totalShiftHours = filteredShifts.reduce((sum, shift) => {
      if (shift.clock_in_time && shift.clock_out_time) {
        return sum + differenceInMinutes(new Date(shift.clock_out_time), new Date(shift.clock_in_time)) / 60;
      }
      return sum;
    }, 0);

    const totalWorkLogHours = filteredWorkLogs.reduce((sum, log) => {
      if (log.check_in_time && log.check_out_time) {
        return sum + differenceInMinutes(new Date(log.check_out_time), new Date(log.check_in_time)) / 60;
      }
      return sum;
    }, 0);

    const uniqueEmployees = new Set([
      ...filteredShifts.map(s => s.employee_id),
      ...filteredWorkLogs.map(l => l.employee_id)
    ].filter(Boolean)).size;

    const summaryStats = {
      totalShifts: filteredShifts.length,
      totalShiftHours,
      totalJobs: stats.total,
      plowJobs: stats.plow,
      shovelJobs: stats.shovel,
      saltApplications: stats.salt,
      totalWorkHours: totalWorkLogHours,
      uniqueLocations: stats.locations,
      activeEmployees: uniqueEmployees,
      totalSaltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.salt_used_lbs || 0), 0),
      totalIceMeltLbs: filteredWorkLogs.reduce((sum, l) => sum + (l.ice_melt_used_lbs || 0), 0),
    };

    const dateRange = `${format(new Date(fromDate), 'MMM d, yyyy')} - ${format(new Date(toDate), 'MMM d, yyyy')}`;
    generateSummaryPDF(summaryStats, dateRange);
    toast.success('Summary PDF exported successfully');
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

      // Persist multi-select employees:
      // - plow logs only store a single employee_id (legacy) -> use the first selected
      // - shovel logs store full crew in team_member_ids
      const primaryEmployeeId = (data.employee_ids?.[0] || data.employee_id || '').trim();

      if (data.type === 'plow') {
        const payload = {
          account_id: data.account_id,
          employee_id: primaryEmployeeId,
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
          employee_id: primaryEmployeeId,
          team_member_ids: (data.employee_ids || []).filter(Boolean),
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

  // Bulk mark as billed/unbilled (also updates billing_status)
  const handleBulkMarkBilled = async (billed: boolean) => {
    const ids = Array.from(selectedWorkLogs);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const plowIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'plow').map(l => l.id);
      const shovelIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'shovel').map(l => l.id);
      
      const updateData = billed 
        ? { billed: true, billing_status: 'completed' }
        : { billed: false, billing_status: 'billable' };
      
      if (plowIds.length > 0) {
        const { error } = await supabase.from('work_logs').update(updateData).in('id', plowIds);
        if (error) throw error;
      }
      if (shovelIds.length > 0) {
        const { error } = await supabase.from('shovel_work_logs').update(updateData).in('id', shovelIds);
        if (error) throw error;
      }
      
      toast.success(`${ids.length} work log(s) marked as ${billed ? 'billed' : 'unbilled'}`);
      setSelectedWorkLogs(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error updating billed status:', error);
      toast.error('Failed to update billed status');
    } finally {
      setIsSaving(false);
    }
  };

  // Mark single work log as billed/unbilled (also updates billing_status)
  const handleToggleBilled = async (log: WorkLogEntry) => {
    setIsSaving(true);
    try {
      const table = log.type === 'plow' ? 'work_logs' : 'shovel_work_logs';
      const newBilled = !log.billed;
      const updateData = newBilled 
        ? { billed: true, billing_status: 'completed' }
        : { billed: false, billing_status: 'billable' };
      
      const { error } = await supabase.from(table).update(updateData).eq('id', log.id);
      if (error) throw error;
      
      toast.success(`Work log marked as ${newBilled ? 'billed' : 'unbilled'}`);
      await fetchData();
    } catch (error) {
      console.error('Error toggling billed status:', error);
      toast.error('Failed to update billed status');
    } finally {
      setIsSaving(false);
    }
  };

  // Move logs back to current (only updates billing_status, no data changes)
  const handleBulkMoveToCurrent = async () => {
    const ids = Array.from(selectedWorkLogs);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const plowIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'plow').map(l => l.id);
      const shovelIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'shovel').map(l => l.id);
      
      if (plowIds.length > 0) {
        const { error } = await supabase.from('work_logs').update({ billing_status: 'current' }).in('id', plowIds);
        if (error) throw error;
      }
      if (shovelIds.length > 0) {
        const { error } = await supabase.from('shovel_work_logs').update({ billing_status: 'current' }).in('id', shovelIds);
        if (error) throw error;
      }
      
      toast.success(`${ids.length} work log(s) moved to current`);
      setSelectedWorkLogs(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error moving logs to current:', error);
      toast.error('Failed to move logs to current');
    } finally {
      setIsSaving(false);
    }
  };

  // Move logs to billable (only updates billing_status, no data changes)
  const handleBulkMoveToBillable = async () => {
    const ids = Array.from(selectedWorkLogs);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const plowIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'plow').map(l => l.id);
      const shovelIds = workLogs.filter(l => ids.includes(l.id) && l.type === 'shovel').map(l => l.id);
      
      if (plowIds.length > 0) {
        const { error } = await supabase.from('work_logs').update({ billing_status: 'billable' }).in('id', plowIds);
        if (error) throw error;
      }
      if (shovelIds.length > 0) {
        const { error } = await supabase.from('shovel_work_logs').update({ billing_status: 'billable' }).in('id', shovelIds);
        if (error) throw error;
      }
      
      toast.success(`${ids.length} work log(s) moved to billable`);
      setSelectedWorkLogs(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error moving logs to billable:', error);
      toast.error('Failed to move logs to billable');
    } finally {
      setIsSaving(false);
    }
  };

  // Move shifts to current
  const handleBulkMoveShiftsToCurrent = async () => {
    const ids = Array.from(selectedShifts);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('time_clock').update({ billing_status: 'current' }).in('id', ids);
      if (error) throw error;
      
      toast.success(`${ids.length} shift(s) moved to current`);
      setSelectedShifts(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error moving shifts to current:', error);
      toast.error('Failed to move shifts to current');
    } finally {
      setIsSaving(false);
    }
  };

  // Move shifts to billable
  const handleBulkMoveShiftsToBillable = async () => {
    const ids = Array.from(selectedShifts);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('time_clock').update({ billing_status: 'billable' }).in('id', ids);
      if (error) throw error;
      
      toast.success(`${ids.length} shift(s) moved to billable`);
      setSelectedShifts(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error moving shifts to billable:', error);
      toast.error('Failed to move shifts to billable');
    } finally {
      setIsSaving(false);
    }
  };

  // Move shifts to completed
  const handleBulkMoveShiftsToCompleted = async () => {
    const ids = Array.from(selectedShifts);
    if (ids.length === 0) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('time_clock').update({ billing_status: 'completed' }).in('id', ids);
      if (error) throw error;
      
      toast.success(`${ids.length} shift(s) marked as completed`);
      setSelectedShifts(new Set());
      await fetchData();
    } catch (error) {
      console.error('Error marking shifts as completed:', error);
      toast.error('Failed to mark shifts as completed');
    } finally {
      setIsSaving(false);
    }
  };

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

  // Bulk edit handler for work logs
  const handleBulkEditWorkLogs = async (data: BulkEditFormData) => {
    const ids = Array.from(selectedWorkLogs);
    if (ids.length === 0) return;

    setIsSaving(true);
    try {
      const plowLogs = workLogs.filter(l => ids.includes(l.id) && l.type === 'plow');
      const shovelLogs = workLogs.filter(l => ids.includes(l.id) && l.type === 'shovel');
      const plowIds = plowLogs.map(l => l.id);
      const shovelIds = shovelLogs.map(l => l.id);

      // Build update payloads based on what fields were toggled
      const buildPlowPayload = () => {
        const payload: Record<string, any> = {};
        if (data.account_id) payload.account_id = data.account_id;
        if (data.employee_ids && data.employee_ids.length > 0) payload.employee_id = data.employee_ids[0];
        if (data.equipment_id !== undefined) payload.equipment_id = data.equipment_id || null;
        if (data.service_type) payload.service_type = data.service_type;
        if (data.snow_depth_inches !== undefined) payload.snow_depth_inches = data.snow_depth_inches ?? null;
        if (data.salt_used_lbs !== undefined) payload.salt_used_lbs = data.salt_used_lbs ?? null;
        if (data.weather_conditions !== undefined) payload.weather_conditions = data.weather_conditions || null;
        if (data.notes !== undefined) payload.notes = data.notes || null;
        if (data.billing_status) payload.billing_status = data.billing_status;
        if (data.billing_status === 'completed') payload.billed = true;
        if (data.billing_status === 'billable' || data.billing_status === 'current') payload.billed = false;
        return payload;
      };

      const buildShovelPayload = () => {
        const payload: Record<string, any> = {};
        if (data.account_id) payload.account_id = data.account_id;
        if (data.employee_ids && data.employee_ids.length > 0) {
          payload.employee_id = data.employee_ids[0];
          payload.team_member_ids = data.employee_ids;
        }
        if (data.service_type) payload.service_type = data.service_type;
        if (data.snow_depth_inches !== undefined) payload.snow_depth_inches = data.snow_depth_inches ?? null;
        if (data.salt_used_lbs !== undefined) payload.ice_melt_used_lbs = data.salt_used_lbs ?? null;
        if (data.weather_conditions !== undefined) payload.weather_conditions = data.weather_conditions || null;
        if (data.notes !== undefined) payload.notes = data.notes || null;
        if (data.billing_status) payload.billing_status = data.billing_status;
        if (data.billing_status === 'completed') payload.billed = true;
        if (data.billing_status === 'billable' || data.billing_status === 'current') payload.billed = false;
        return payload;
      };

      // Handle date/time updates - need to update each log individually if dates are involved
      if (data.date || data.check_in_time !== undefined || data.check_out_time !== undefined) {
        // Update each log individually to handle date/time correctly
        for (const logId of plowIds) {
          const log = plowLogs.find(l => l.id === logId);
          if (!log) continue;
          
          const payload = buildPlowPayload();
          const baseDate = data.date || (log.check_in_time ? new Date(log.check_in_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          
          if (data.check_in_time !== undefined) {
            payload.check_in_time = data.check_in_time ? new Date(`${baseDate}T${data.check_in_time}`).toISOString() : null;
          }
          if (data.check_out_time !== undefined) {
            payload.check_out_time = data.check_out_time ? new Date(`${baseDate}T${data.check_out_time}`).toISOString() : null;
          }
          
          if (Object.keys(payload).length > 0) {
            const { error } = await supabase.from('work_logs').update(payload).eq('id', logId);
            if (error) throw error;
          }
        }

        for (const logId of shovelIds) {
          const log = shovelLogs.find(l => l.id === logId);
          if (!log) continue;
          
          const payload = buildShovelPayload();
          const baseDate = data.date || (log.check_in_time ? new Date(log.check_in_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          
          if (data.check_in_time !== undefined) {
            payload.check_in_time = data.check_in_time ? new Date(`${baseDate}T${data.check_in_time}`).toISOString() : null;
          }
          if (data.check_out_time !== undefined) {
            payload.check_out_time = data.check_out_time ? new Date(`${baseDate}T${data.check_out_time}`).toISOString() : null;
          }
          
          if (Object.keys(payload).length > 0) {
            const { error } = await supabase.from('shovel_work_logs').update(payload).eq('id', logId);
            if (error) throw error;
          }
        }
      } else {
        // No date/time updates - can use bulk update
        const plowPayload = buildPlowPayload();
        const shovelPayload = buildShovelPayload();

        if (plowIds.length > 0 && Object.keys(plowPayload).length > 0) {
          const { error } = await supabase.from('work_logs').update(plowPayload).in('id', plowIds);
          if (error) throw error;
        }
        if (shovelIds.length > 0 && Object.keys(shovelPayload).length > 0) {
          const { error } = await supabase.from('shovel_work_logs').update(shovelPayload).in('id', shovelIds);
          if (error) throw error;
        }
      }

      toast.success(`${ids.length} work log(s) updated successfully`);
      setSelectedWorkLogs(new Set());
      setBulkEditDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error bulk editing work logs:', error);
      toast.error('Failed to update work logs');
    } finally {
      setIsSaving(false);
    }
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
          <Button size="sm" variant="outline" onClick={handlePrintPDF}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <FileDown className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export Work Logs PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTimeSheets}>
                <Clock className="h-4 w-4 mr-2" />
                Export Time Sheets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSummary}>
                <FileDown className="h-4 w-4 mr-2" />
                Export Summary Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportToDrive} disabled={isExporting}>
                <Cloud className="h-4 w-4 mr-2" />
                {isExporting ? 'Uploading...' : 'Export to Google Drive'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    {accounts
                      .filter((acc) => acc.id && acc.id.trim() !== '')
                      .map((acc) => (
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
                    {accounts
                      .filter((acc) => acc.id && acc.id.trim() !== '')
                      .map((acc) => (
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
                    {employees
                      .filter((emp) => emp.id && emp.id.trim() !== '')
                      .map((emp) => (
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
                    {equipment
                      .filter((eq) => eq.id && eq.id.trim() !== '')
                      .map((eq) => (
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
                <>
                  {activeShiftTab === 'billable' && (
                    <Button size="sm" variant="outline" onClick={handleBulkMoveShiftsToCurrent} disabled={isSaving}>
                      <Archive className="h-4 w-4 mr-1" />
                      Move to Current
                    </Button>
                  )}
                  {activeShiftTab === 'current' && (
                    <Button size="sm" variant="outline" onClick={handleBulkMoveShiftsToBillable} disabled={isSaving}>
                      <Archive className="h-4 w-4 mr-1" />
                      Move to Billable
                    </Button>
                  )}
                  {activeShiftTab === 'billable' && (
                    <Button size="sm" variant="default" onClick={handleBulkMoveShiftsToCompleted} disabled={isSaving}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Completed
                    </Button>
                  )}
                  {activeShiftTab === 'completed' && (
                    <Button size="sm" variant="outline" onClick={handleBulkMoveShiftsToBillable} disabled={isSaving}>
                      <Archive className="h-4 w-4 mr-1" />
                      Move to Billable
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={openBulkDeleteShifts}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedShifts.size})
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={openAddShift}>
                <Plus className="h-4 w-4 mr-1" />
                Add Shift
              </Button>
            </div>
          </div>

          {/* Shift Tabs */}
          <Tabs value={activeShiftTab} onValueChange={(v) => { setActiveShiftTab(v); setSelectedShifts(new Set()); }} className="mb-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="current" className="text-base">
                Current ({shiftCurrentCount})
              </TabsTrigger>
              <TabsTrigger value="billable" className="text-base text-red-500">
                Billable ({shiftBillableCount})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-base text-blue-500">
                Completed ({shiftCompletedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
                        <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openEditShift(entry))}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openDeleteShift(entry))}>
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
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setSelectedWorkLogs(new Set()); }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="current" className="gap-1.5 text-sm sm:text-base">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Current</span>
                  <Badge variant="secondary" className="ml-1 text-xs">{currentCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="billable" className="gap-1.5 text-sm sm:text-base text-red-500">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Billable</span>
                  <Badge variant="secondary" className="ml-1 text-xs">{billableCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1.5 text-sm sm:text-base text-blue-500">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Completed</span>
                  <Badge variant="secondary" className="ml-1 text-xs">{completedCount}</Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedWorkLogs.size > 0 && (
                  <>
                    {activeTab === 'current' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleBulkMoveToBillable}
                        disabled={isSaving}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Move to Billable ({selectedWorkLogs.size})
                      </Button>
                    )}
                    {activeTab === 'billable' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleBulkMoveToCurrent}
                          disabled={isSaving}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Move to Current ({selectedWorkLogs.size})
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleBulkMarkBilled(true)}
                          disabled={isSaving}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Mark Billed ({selectedWorkLogs.size})
                        </Button>
                      </>
                    )}
                    {activeTab === 'completed' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleBulkMarkBilled(false)}
                        disabled={isSaving}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Unarchive ({selectedWorkLogs.size})
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => setBulkEditDialogOpen(true)} 
                      disabled={isSaving}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit ({selectedWorkLogs.size})
                    </Button>
                    <Button size="sm" variant="destructive" onClick={openBulkDeleteWorkLogs} disabled={isSaving}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedWorkLogs.size})
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={openAddWorkLog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Entry
                </Button>
              </div>
            </div>

            <TabsContent value="current" className="mt-0">
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
                    {filteredWorkLogs.slice(0, 50).map(log => (
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
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
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
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.weather_conditions || '-'}
                        </TableCell>
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.equipment_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
                          {log.team_member_names.length > 0 ? log.team_member_names.join(', ') : log.employee_name}
                        </TableCell>
                        <TableCell>
                          <PhotoThumbnails 
                            photoPaths={log.photo_urls || []} 
                            onViewPhotos={openPhotoViewer}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openEditWorkLog(log))}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openDeleteWorkLog(log))}>
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredWorkLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                          No in-progress work logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="billable" className="mt-0">
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
                    {filteredWorkLogs.slice(0, 50).map(log => (
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
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
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
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.weather_conditions || '-'}
                        </TableCell>
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.equipment_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
                          {log.team_member_names.length > 0 ? log.team_member_names.join(', ') : log.employee_name}
                        </TableCell>
                        <TableCell>
                          <PhotoThumbnails 
                            photoPaths={log.photo_urls || []} 
                            onViewPhotos={openPhotoViewer}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={tableIconButtonClass} 
                              onClick={() => handleToggleBilled(log)}
                              title="Mark as billed"
                              disabled={isSaving}
                            >
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openEditWorkLog(log))}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openDeleteWorkLog(log))}>
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredWorkLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                          No billable work logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
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
                    {filteredWorkLogs.slice(0, 50).map(log => (
                      <TableRow key={log.id} className="border-border/30 opacity-75">
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
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
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
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.weather_conditions || '-'}
                        </TableCell>
                        <TableCell className="max-w-[120px] whitespace-normal text-sm">
                          {log.equipment_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] whitespace-normal text-sm">
                          {log.team_member_names.length > 0 ? log.team_member_names.join(', ') : log.employee_name}
                        </TableCell>
                        <TableCell>
                          <PhotoThumbnails 
                            photoPaths={log.photo_urls || []} 
                            onViewPhotos={openPhotoViewer}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={tableIconButtonClass} 
                              onClick={() => handleToggleBilled(log)}
                              title="Unarchive"
                              disabled={isSaving}
                            >
                              <Archive className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openEditWorkLog(log))}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className={tableIconButtonClass} {...tapHandlers(() => openDeleteWorkLog(log))}>
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredWorkLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                          No completed/billed work logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Bulk Edit Work Logs Dialog */}
      <BulkEditWorkLogDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        accounts={accounts}
        employees={employees}
        equipment={equipment}
        selectedCount={selectedWorkLogs.size}
        onSave={handleBulkEditWorkLogs}
        isLoading={isSaving}
      />

      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {loadingPhotos ? 'Loading photos...' : `Photo ${currentPhotoIndex + 1} of ${viewingPhotos.length}`}
            </DialogTitle>
          </DialogHeader>
          {loadingPhotos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewingPhotos.length > 0 ? (
            <div className="relative">
              <img
                src={viewingPhotos[currentPhotoIndex]}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              {viewingPhotos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No photos available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
