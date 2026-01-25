import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { History, Loader2, RefreshCw, Clock, Users, Send } from 'lucide-react';
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

export function OvertimeNotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
        .limit(50);

      if (error) throw error;
      
      // Transform data to handle the joined employee data
      const transformedData = (data || []).map(record => ({
        ...record,
        employee: Array.isArray(record.employee) ? record.employee[0] : record.employee
      }));
      
      setNotifications(transformedData);
    } catch (error) {
      console.error('Error fetching notification history:', error);
      toast.error('Failed to load notification history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      // Get current user's info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to send a test notification');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_ids: [user.id],
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify your push notification system is working correctly.',
          notification_type: 'admin_announcement',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Test notification sent! Check your device.');
      } else if (data?.error) {
        toast.error(`Failed to send: ${data.error}`);
      } else {
        toast.info('Notification sent, but no active devices found. Make sure push is enabled.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSendingTest(false);
    }
  };

  const getEmployeeName = (record: NotificationRecord) => {
    if (record.employee) {
      return `${record.employee.first_name} ${record.employee.last_name}`;
    }
    return 'Unknown Employee';
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">
                          {getEmployeeName(notification)}
                        </span>
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
