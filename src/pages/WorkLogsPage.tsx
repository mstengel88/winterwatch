import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Search, Filter, Truck, Shovel, Clock, MapPin, Calendar, FileDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { generateWorkLogsPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';

interface WorkLog {
  id: string;
  account: { name: string; address: string } | null;
  employee: { first_name: string; last_name: string } | null;
  equipment: { name: string } | null;
  service_type: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  snow_depth_inches: number | null;
  salt_used_lbs: number | null;
  notes: string | null;
  created_at: string;
  type: 'plow' | 'shovel';
  ice_melt_used_lbs?: number | null;
  areas_cleared?: string[] | null;

  // Shovel logs: selected team members from the Shovel Crew page
  team_member_ids?: string[] | null;
  teamMemberNames?: string[];
}

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('7');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateFilter);
      const startDate = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      const [workLogsRes, shovelLogsRes] = await Promise.all([
        supabase
          .from('work_logs')
          .select('*, employee:employees(first_name, last_name), account:accounts(name, address), equipment:equipment(name)')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('billing_status', 'current')
          .order('created_at', { ascending: false }),
        supabase
          .from('shovel_work_logs')
          .select('*, employee:employees(first_name, last_name), account:accounts(name, address)')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('billing_status', 'current')
          .order('created_at', { ascending: false }),
      ]);

      // Resolve shovel team member names in one query (avoid N+1).
      const shovelTeamIds = Array.from(
        new Set(
          (shovelLogsRes.data || []).flatMap((l: any) => (l.team_member_ids as string[] | null) || [])
        )
      );

      const teamMemberNameById = new Map<string, string>();
      if (shovelTeamIds.length > 0) {
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', shovelTeamIds);

        if (!teamMembersError && teamMembers) {
          for (const m of teamMembers as any[]) {
            teamMemberNameById.set(m.id, `${m.first_name} ${m.last_name}`);
          }
        }
      }

      const workLogs: WorkLog[] = (workLogsRes.data || []).map((log) => ({
        ...log,
        type: 'plow' as const,
        equipment: log.equipment,
      }));

      const shovelLogs: WorkLog[] = (shovelLogsRes.data || []).map((log: any) => ({
        ...log,
        type: 'shovel' as const,
        equipment: null,
        snow_depth_inches: null,
        salt_used_lbs: null,
        teamMemberNames: ((log.team_member_ids as string[] | null) || [])
          .map((id) => teamMemberNameById.get(id))
          .filter(Boolean) as string[],
      }));

      const allLogs = [...workLogs, ...shovelLogs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(allLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load work logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter]);

  const filteredLogs = logs.filter((log) => {
    // Tab filter
    if (activeTab === 'plow' && log.type !== 'plow') return false;
    if (activeTab === 'shovel' && log.type !== 'shovel') return false;

    // Status filter
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const accountName = log.account?.name?.toLowerCase() || '';
      const employeeName = log.employee
        ? `${log.employee.first_name} ${log.employee.last_name}`.toLowerCase()
        : '';
      if (!accountName.includes(searchLower) && !employeeName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  const getDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceTypeLabel = (type: 'plow' | 'shovel', serviceType: string): string => {
    if (type === 'plow') {
      switch (serviceType) {
        case 'plow': return 'Plow';
        case 'salt': return 'Salt';
        case 'both': return 'Plow/Salt';
        default: return serviceType;
      }
    } else {
      switch (serviceType) {
        case 'shovel': return 'Shovel';
        case 'ice_melt': return 'Salt';
        case 'both': return 'Shovel/Salt';
        default: return serviceType;
      }
    }
  };

  const getServiceTypeBadge = (log: WorkLog) => {
    const label = getServiceTypeLabel(log.type, log.service_type);
    if (log.type === 'shovel') {
      return (
        <Badge className="bg-shovel/20 text-shovel border-shovel/30">
          <Shovel className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    }
    return (
      <Badge className="bg-plow/20 text-plow border-plow/30">
        <Truck className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const handleExportPDF = () => {
    const rawLogs = filteredLogs.map((log) => ({
      id: log.id,
      type: log.type,
      date: format(new Date(log.created_at), 'MM/dd/yy'),
      checkIn: log.check_in_time ? format(new Date(log.check_in_time), 'HH:mm') : '-',
      checkOut: log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : '-',
      duration: getDuration(log.check_in_time, log.check_out_time),
      account: log.account?.name || 'Unknown',
      serviceType: getServiceTypeLabel(log.type, log.service_type),
      snowDepth: log.snow_depth_inches ? `${log.snow_depth_inches}"` : '-',
      saltLbs: log.salt_used_lbs ? `${log.salt_used_lbs}lb` : log.ice_melt_used_lbs ? `${log.ice_melt_used_lbs}lb` : '-',
      equipment: log.equipment?.name || '-',
      employee: log.type === 'shovel' && log.teamMemberNames && log.teamMemberNames.length > 0
        ? log.teamMemberNames.join(', ')
        : log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown',
      conditions: '-',
      notes: log.notes || undefined,
    }));

    const totalHours = filteredLogs.reduce((total, log) => {
      if (log.check_in_time && log.check_out_time) {
        const diff = new Date(log.check_out_time).getTime() - new Date(log.check_in_time).getTime();
        return total + diff / (1000 * 60 * 60);
      }
      return total;
    }, 0);

    const dateRangeLabel = dateFilter === '7' ? 'Last 7 days' 
      : dateFilter === '14' ? 'Last 14 days'
      : dateFilter === '30' ? 'Last 30 days'
      : 'Last 90 days';

    // Count unique properties
    const uniqueAccounts = new Set(filteredLogs.map(log => log.account?.name)).size;
    const plowCount = filteredLogs.filter(log => log.service_type === 'plow' || log.service_type === 'both').length;
    const saltCount = filteredLogs.filter(log => log.service_type === 'salt' || log.service_type === 'ice_melt' || log.service_type === 'both').length;

    generateWorkLogsPDF(rawLogs, {
      totalJobs: filteredLogs.length,
      totalHours,
      totalSaltLbs: filteredLogs.reduce((sum, log) => sum + (log.salt_used_lbs || 0), 0),
      totalIceMeltLbs: filteredLogs.reduce((sum, log) => sum + (log.ice_melt_used_lbs || 0), 0),
      plowCount,
      saltCount,
      propertyCount: uniqueAccounts,
      dateRange: dateRangeLabel,
    });
    
    toast.success('PDF exported successfully');
  };

  return (
    <AppLayout variant="wide">
      <div 
        className="
          space-y-6
          w-full max-w-full
          px-4 sm:px-6
          [padding-left:calc(1rem-area-inset-left)]
          [padding-right:calc(1rem-area-inset-right)]
        ">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Work Logs
            </h1>
            <p className="text-muted-foreground">View and manage all service records</p>
          </div>
          <Button variant="outline" onClick={handleExportPDF} disabled={filteredLogs.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by account or employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <div className="flex gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-background/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-background">
              All Logs ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="plow" className="data-[state=active]:bg-plow/20 data-[state=active]:text-plow">
              <Truck className="h-4 w-4 mr-1" />
              Plow ({logs.filter((l) => l.type === 'plow').length})
            </TabsTrigger>
            <TabsTrigger value="shovel" className="data-[state=active]:bg-shovel/20 data-[state=active]:text-shovel">
              <Shovel className="h-4 w-4 mr-1" />
              Shovel ({logs.filter((l) => l.type === 'shovel').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No work logs found matching your criteria.
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead>Date</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id} className="border-border/50">
                            <TableCell className="font-medium">
                              {format(new Date(log.created_at), 'MM/dd/yy')}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'h:mm a')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{log.account?.name || '-'}</div>
                              {log.account?.address && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {log.account.address.slice(0, 30)}...
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.type === 'shovel' && log.teamMemberNames && log.teamMemberNames.length > 0
                                ? log.teamMemberNames.join(', ')
                                : log.employee
                                  ? `${log.employee.first_name} ${log.employee.last_name}`
                                  : '-'}
                            </TableCell>
                            <TableCell>{getServiceTypeBadge(log)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {getDuration(log.check_in_time, log.check_out_time)}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {log.type === 'plow' && log.salt_used_lbs && (
                                  <div>Salt: {log.salt_used_lbs} lbs</div>
                                )}
                                {log.type === 'plow' && log.snow_depth_inches && (
                                  <div>Snow: {log.snow_depth_inches}"</div>
                                )}
                                {log.type === 'shovel' && log.ice_melt_used_lbs && (
                                  <div>Ice Melt: {log.ice_melt_used_lbs} lbs</div>
                                )}
                                {log.equipment?.name && <div>Equip: {log.equipment.name}</div>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
