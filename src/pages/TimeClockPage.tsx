import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Search, Calendar, Users, Timer, Loader2, MapPin, Play, Square, LogOut } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, differenceInMinutes, differenceInHours } from 'date-fns';
import { toast } from 'sonner';

interface TimeClockEntry {
  id: string;
  employee_id: string;
  employee: { first_name: string; last_name: string } | null;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  notes: string | null;
}

interface EmployeeSummary {
  name: string;
  totalHours: number;
  shifts: number;
  isActive: boolean;
}

// Real-time elapsed time component
function ElapsedTime({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(clockInTime).getTime();
      const now = Date.now();
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [clockInTime]);

  return <span className="font-mono tabular-nums">{elapsed}</span>;
}

export default function TimeClockPage() {
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('7');
  const [clockingOut, setClockingOut] = useState<string | null>(null);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateFilter);
      const startDate = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      const { data, error } = await supabase
        .from('time_clock')
        .select('*, employee:employees(first_name, last_name)')
        .gte('clock_in_time', startDate)
        .lte('clock_in_time', endDate)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast.error('Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [dateFilter]);

  const handleClockOut = async (entryId: string) => {
    setClockingOut(entryId);
    try {
      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Employee clocked out successfully');
      fetchEntries();
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out employee');
    } finally {
      setClockingOut(null);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const employeeName = entry.employee
      ? `${entry.employee.first_name} ${entry.employee.last_name}`.toLowerCase()
      : '';
    return employeeName.includes(searchLower);
  });

  // Calculate employee summaries
  const employeeSummaries: EmployeeSummary[] = (() => {
    const summaryMap = new Map<string, EmployeeSummary>();

    entries.forEach((entry) => {
      if (!entry.employee) return;
      const name = `${entry.employee.first_name} ${entry.employee.last_name}`;
      const existing = summaryMap.get(name) || { name, totalHours: 0, shifts: 0, isActive: false };

      // Calculate hours for this entry
      if (entry.clock_in_time) {
        const clockOut = entry.clock_out_time ? new Date(entry.clock_out_time) : new Date();
        const hours = differenceInMinutes(clockOut, new Date(entry.clock_in_time)) / 60;
        existing.totalHours += hours;
        existing.shifts += 1;
        if (!entry.clock_out_time) existing.isActive = true;
      }

      summaryMap.set(name, existing);
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  })();

  // Stats
  const totalHours = employeeSummaries.reduce((sum, e) => sum + e.totalHours, 0);
  const activeShifts = entries.filter((e) => !e.clock_out_time).length;
  const uniqueEmployees = new Set(entries.map((e) => e.employee_id)).size;

  const getDuration = (clockIn: string, clockOut: string | null): string => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'h:mm a');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Time Clock
          </h1>
          <p className="text-muted-foreground">Track employee work hours and shifts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                Last {dateFilter} days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{activeShifts}</div>
              <p className="text-xs text-muted-foreground">
                Currently clocked in
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{uniqueEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Active this period
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shifts Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{entries.length}</div>
              <p className="text-xs text-muted-foreground">
                Total entries
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee Breakdown */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Employee Hours
              </CardTitle>
              <CardDescription>Total hours per employee</CardDescription>
            </CardHeader>
            <CardContent>
              {employeeSummaries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No data available</p>
              ) : (
                <div className="space-y-3">
                  {employeeSummaries.slice(0, 8).map((summary) => (
                    <div key={summary.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {summary.isActive && (
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                        <span className="text-sm font-medium">{summary.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{summary.shifts} shifts</span>
                        <Badge variant="outline">{summary.totalHours.toFixed(1)}h</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Entries Table */}
          <Card className="lg:col-span-2 bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">Time Entries</CardTitle>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employee..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-background/50"
                    />
                  </div>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[130px] bg-background/50">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No time entries found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.slice(0, 15).map((entry) => (
                        <TableRow key={entry.id} className="border-border/50">
                          <TableCell className="font-medium">
                            {entry.employee
                              ? `${entry.employee.first_name} ${entry.employee.last_name}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.clock_in_time), 'MM/dd/yy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Play className="h-3 w-3 text-green-500" />
                              {formatTime(entry.clock_in_time)}
                            </div>
                            {entry.clock_in_latitude && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                GPS recorded
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.clock_out_time ? (
                              <div className="flex items-center gap-1">
                                <Square className="h-3 w-3 text-red-500" />
                                {formatTime(entry.clock_out_time)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              {entry.clock_out_time ? (
                                getDuration(entry.clock_in_time, entry.clock_out_time)
                              ) : (
                                <ElapsedTime clockInTime={entry.clock_in_time} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.clock_out_time ? (
                              <Badge variant="outline">Completed</Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!entry.clock_out_time && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleClockOut(entry.id)}
                                disabled={clockingOut === entry.id}
                                className="h-7 px-2"
                              >
                                {clockingOut === entry.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <LogOut className="h-3 w-3 mr-1" />
                                    Clock Out
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
