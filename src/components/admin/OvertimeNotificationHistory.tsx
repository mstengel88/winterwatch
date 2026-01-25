import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { History, Loader2, RefreshCw, Clock, Users, Send, RotateCcw, ChevronDown, Zap } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface NotificationRecord {
  id: string;
  employee_id: string;
  time_clock_id: string;
  threshold_hours: number;
  sent_at: string;
  employee: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Employee {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
}

interface OvertimeSetting {
  id: string;
  threshold_hours: number;
  is_enabled: boolean;
}

export function OvertimeNotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overtimeSettings, setOvertimeSettings] = useState<OvertimeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingOvertimeTest, setIsSendingOvertimeTest] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('self');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notificationsRes, employeesRes, settingsRes] = await Promise.all([
        supabase
          .from('overtime_notifications_sent')
          .select(`
            id,
            employee_id,
            time_clock_id,
            threshold_hours,
            sent_at,
            employee:employees(first_name, last_name)
          `)
          .order('sent_at', { ascending: false })
          .limit(50),
        supabase
          .from('employees')
          .select('id, user_id, first_name, last_name')
          .eq('is_active', true)
          .order('last_name'),
        supabase
          .from('overtime_notification_settings')
          .select('id, threshold_hours, is_enabled')
          .eq('is_enabled', true)
          .order('threshold_hours'),
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (settingsRes.error) throw settingsRes.error;
      
      // Transform data to handle the joined employee data
      const transformedData = (notificationsRes.data || []).map(record => ({
        ...record,
        employee: Array.isArray(record.employee) ? record.employee[0] : record.employee
      }));
      
      setNotifications(transformedData);
      setEmployees(employeesRes.data || []);
      setOvertimeSettings(settingsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load notification history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      let targetUserId: string;

      if (selectedEmployeeId === 'self') {
        // Send to current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to send a test notification');
          return;
        }
        targetUserId = user.id;
      } else {
        // Find the employee's user_id
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee?.user_id) {
          toast.error('This employee does not have a linked user account');
          return;
        }
        targetUserId = employee.user_id;
      }

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_ids: [targetUserId],
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify your push notification system is working correctly.',
          notification_type: 'admin_announcement',
        },
      });

      if (error) throw error;

      const employeeName = selectedEmployeeId === 'self' 
        ? 'yourself' 
        : employees.find(e => e.id === selectedEmployeeId)?.first_name || 'employee';

      if (data?.success && data?.sent_count > 0) {
        toast.success(`Test notification sent to ${employeeName}!`);
      } else if (data?.sent_count === 0) {
        toast.warning(`No active device found for ${employeeName}. They need to enable push notifications.`);
      } else if (data?.error) {
        toast.error(`Failed to send: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleResendLastNotification = async () => {
    if (notifications.length === 0) {
      toast.error('No previous overtime notifications to resend');
      return;
    }

    const lastNotification = notifications[0];
    const employee = employees.find(e => e.id === lastNotification.employee_id);

    if (!employee?.user_id) {
      toast.error('Cannot resend: Employee does not have a linked user account');
      return;
    }

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_ids: [employee.user_id],
          title: `⏰ Overtime Alert (${lastNotification.threshold_hours}h)`,
          body: `You have been clocked in for over ${lastNotification.threshold_hours} hours. This is a resent notification.`,
          notification_type: 'shift_status',
        },
      });

      if (error) throw error;

      const employeeName = `${employee.first_name} ${employee.last_name}`;

      if (data?.success && data?.sent_count > 0) {
        toast.success(`Overtime notification resent to ${employeeName}!`);
      } else if (data?.sent_count === 0) {
        toast.warning(`No active device found for ${employeeName}. They need to enable push notifications.`);
      } else if (data?.error) {
        toast.error(`Failed to resend: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resending notification:', error);
      toast.error('Failed to resend notification');
    } finally {
      setIsResending(false);
    }
  };

  const getEmployeeName = (record: NotificationRecord) => {
    if (record.employee) {
      return `${record.employee.first_name} ${record.employee.last_name}`;
    }
    return 'Unknown Employee';
  };

  const handleSendOvertimeTest = async (thresholdHours: number) => {
    if (selectedEmployeeId === 'self') {
      toast.error('Please select an employee (not yourself) for overtime test notifications');
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee?.user_id) {
      toast.error('This employee does not have a linked user account');
      return;
    }

    setIsSendingOvertimeTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_ids: [employee.user_id],
          title: `⏰ Overtime Alert (${thresholdHours}h)`,
          body: `You have been clocked in for over ${thresholdHours} hours. Please check in with your manager.`,
          notification_type: 'shift_status',
        },
      });

      if (error) throw error;

      const employeeName = `${employee.first_name} ${employee.last_name}`;

      if (data?.success && data?.sent_count > 0) {
        toast.success(`${thresholdHours}h overtime alert sent to ${employeeName}!`);
      } else if (data?.sent_count === 0) {
        toast.warning(`No active device found for ${employeeName}. They need to enable push notifications.`);
      } else if (data?.error) {
        toast.error(`Failed to send: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending overtime test:', error);
      toast.error('Failed to send overtime test notification');
    } finally {
      setIsSendingOvertimeTest(false);
    }
  };

  // Get unique threshold values from settings
  const uniqueThresholds = [...new Set(overtimeSettings.map(s => s.threshold_hours))].sort((a, b) => a - b);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <History className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Recent overtime notifications sent to employees
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {/* Resend Last Notification Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendLastNotification}
              disabled={isResending || notifications.length === 0}
              className="gap-2"
              title={notifications.length > 0 
                ? `Resend to ${getEmployeeName(notifications[0])}` 
                : 'No notifications to resend'}
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Resend Last
            </Button>

            {/* Employee Selector for Test */}
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Send test to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Myself</SelectItem>
                {employees.filter(e => e.user_id).map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="default"
              size="sm"
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="gap-2"
            >
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Test Push
            </Button>

            {/* Overtime Test Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isSendingOvertimeTest || selectedEmployeeId === 'self'}
                  className="gap-2"
                >
                  {isSendingOvertimeTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Test Overtime
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card z-50">
                <DropdownMenuLabel>Send Overtime Alert</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueThresholds.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No thresholds configured
                  </DropdownMenuItem>
                ) : (
                  uniqueThresholds.map(threshold => (
                    <DropdownMenuItem
                      key={threshold}
                      onClick={() => handleSendOvertimeTest(threshold)}
                      className="gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      {threshold} Hour Alert
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSendOvertimeTest(8)}
                  className="gap-2 text-muted-foreground"
                >
                  <Clock className="h-4 w-4" />
                  Custom: 8h
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No overtime notifications sent yet</p>
            <p className="text-sm">Notifications will appear here when employees exceed their thresholds</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Threshold</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {notifications.map((notification, index) => (
                  <tr 
                    key={notification.id} 
                    className={`hover:bg-muted/20 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getEmployeeName(notification)}
                          </span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">Latest</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {notification.threshold_hours} hours
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(notification.sent_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {notifications.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing {notifications.length} most recent notifications
          </p>
        )}
      </CardContent>
    </Card>
  );
}
