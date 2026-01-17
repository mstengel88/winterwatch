import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Clock, Users, Building2, Snowflake, Shovel, FileDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { generateWorkLogsPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';

interface WorkLogStats {
  totalJobs: number;
  totalHours: number;
  totalSaltLbs: number;
  totalIceMeltLbs: number;
  jobsByDay: { date: string; plow: number; shovel: number }[];
  jobsByEmployee: { name: string; count: number }[];
  jobsByAccount: { name: string; count: number }[];
}

interface RawWorkLog {
  id: string;
  date: string;
  account: string;
  employee: string;
  serviceType: string;
  duration: string;
  saltLbs?: number;
  iceMeltLbs?: number;
  notes?: string;
}

const COLORS = ['hsl(var(--plow))', 'hsl(var(--shovel))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))'];

export default function ReportsPage() {
  const [stats, setStats] = useState<WorkLogStats | null>(null);
  const [rawLogs, setRawLogs] = useState<RawWorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch work logs
      const [workLogsRes, shovelLogsRes, employeesRes, accountsRes] = await Promise.all([
        supabase
          .from('work_logs')
          .select('*, employee:employees(first_name, last_name), account:accounts(name)')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'completed'),
        supabase
          .from('shovel_work_logs')
          .select('*, employee:employees(first_name, last_name), account:accounts(name)')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'completed'),
        supabase.from('employees').select('id, first_name, last_name'),
        supabase.from('accounts').select('id, name'),
      ]);

      const workLogs = workLogsRes.data || [];
      const shovelLogs = shovelLogsRes.data || [];

      // Calculate total hours
      const calculateHours = (logs: any[]) => {
        return logs.reduce((total, log) => {
          if (log.check_in_time && log.check_out_time) {
            const diff = new Date(log.check_out_time).getTime() - new Date(log.check_in_time).getTime();
            return total + diff / (1000 * 60 * 60);
          }
          return total;
        }, 0);
      };

      // Jobs by day
      const jobsByDayMap = new Map<string, { plow: number; shovel: number }>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'MM/dd');
        jobsByDayMap.set(date, { plow: 0, shovel: 0 });
      }

      workLogs.forEach((log) => {
        const date = format(new Date(log.created_at), 'MM/dd');
        const existing = jobsByDayMap.get(date);
        if (existing) {
          existing.plow += 1;
        }
      });

      shovelLogs.forEach((log) => {
        const date = format(new Date(log.created_at), 'MM/dd');
        const existing = jobsByDayMap.get(date);
        if (existing) {
          existing.shovel += 1;
        }
      });

      const jobsByDay = Array.from(jobsByDayMap.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      }));

      // Jobs by employee
      const employeeJobCounts = new Map<string, number>();
      [...workLogs, ...shovelLogs].forEach((log: any) => {
        if (log.employee) {
          const name = `${log.employee.first_name} ${log.employee.last_name}`;
          employeeJobCounts.set(name, (employeeJobCounts.get(name) || 0) + 1);
        }
      });
      const jobsByEmployee = Array.from(employeeJobCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Jobs by account
      const accountJobCounts = new Map<string, number>();
      [...workLogs, ...shovelLogs].forEach((log: any) => {
        if (log.account) {
          const name = log.account.name;
          accountJobCounts.set(name, (accountJobCounts.get(name) || 0) + 1);
        }
      });
      const jobsByAccount = Array.from(accountJobCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate totals
      const totalSalt = workLogs.reduce((sum, log) => sum + (log.salt_used_lbs || 0), 0);
      const totalIceMelt = shovelLogs.reduce((sum, log) => sum + (log.ice_melt_used_lbs || 0), 0);

      // Helper to calculate duration string
      const getDuration = (checkIn: string | null, checkOut: string | null): string => {
        if (!checkIn || !checkOut) return '-';
        const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        const hours = diff / (1000 * 60 * 60);
        return `${hours.toFixed(1)}h`;
      };

      // Build raw logs for PDF export
      const allRawLogs: RawWorkLog[] = [
        ...workLogs.map((log: any) => ({
          id: log.id,
          date: format(new Date(log.created_at), 'MM/dd/yy'),
          account: log.account?.name || 'Unknown',
          employee: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown',
          serviceType: log.service_type === 'both' ? 'Plow & Salt' : log.service_type === 'plow' ? 'Plow' : 'Salt',
          duration: getDuration(log.check_in_time, log.check_out_time),
          saltLbs: log.salt_used_lbs,
          notes: log.notes,
        })),
        ...shovelLogs.map((log: any) => ({
          id: log.id,
          date: format(new Date(log.created_at), 'MM/dd/yy'),
          account: log.account?.name || 'Unknown',
          employee: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : 'Unknown',
          serviceType: log.service_type === 'ice_melt' ? 'Ice Melt' : 'Shovel',
          duration: getDuration(log.check_in_time, log.check_out_time),
          iceMeltLbs: log.ice_melt_used_lbs,
          notes: log.notes,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRawLogs(allRawLogs);

      setStats({
        totalJobs: workLogs.length + shovelLogs.length,
        totalHours: calculateHours([...workLogs, ...shovelLogs]),
        totalSaltLbs: totalSalt,
        totalIceMeltLbs: totalIceMelt,
        jobsByDay,
        jobsByEmployee,
        jobsByAccount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!stats) return;
    
    const dateRangeLabel = dateRange === '7' ? 'Last 7 days' 
      : dateRange === '14' ? 'Last 14 days'
      : dateRange === '30' ? 'Last 30 days'
      : 'Last 90 days';

    generateWorkLogsPDF(rawLogs, {
      totalJobs: stats.totalJobs,
      totalHours: stats.totalHours,
      totalSaltLbs: stats.totalSaltLbs,
      totalIceMeltLbs: stats.totalIceMeltLbs,
      dateRange: dateRangeLabel,
    });
    
    toast.success('PDF exported successfully');
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">View work history and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportPDF} disabled={!stats || rawLogs.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">Completed work logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHours.toFixed(1) || 0}h</div>
            <p className="text-xs text-muted-foreground">Work time logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Salt Used</CardTitle>
            <Snowflake className="h-4 w-4 text-plow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSaltLbs || 0} lbs</div>
            <p className="text-xs text-muted-foreground">Plow operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ice Melt Used</CardTitle>
            <Shovel className="h-4 w-4 text-shovel" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIceMeltLbs || 0} lbs</div>
            <p className="text-xs text-muted-foreground">Shovel operations</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jobs by Day Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Jobs by Day</CardTitle>
            <CardDescription>Completed work logs over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.jobsByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="plow" name="Plow" fill="hsl(var(--plow))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shovel" name="Shovel" fill="hsl(var(--shovel))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Employees
            </CardTitle>
            <CardDescription>Most jobs completed</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.jobsByEmployee.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data available</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.jobsByEmployee || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, count }) => `${name.split(' ')[0]}: ${count}`}
                    >
                      {stats?.jobsByEmployee.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Accounts
            </CardTitle>
            <CardDescription>Most frequently serviced</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.jobsByAccount.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {stats?.jobsByAccount.map((account, index) => (
                  <div key={account.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm">{account.name}</span>
                    </div>
                    <span className="text-sm font-medium">{account.count} jobs</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
