import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type NotificationType = 'shift_status' | 'geofence_alert' | 'admin_announcement';

interface SendNotificationParams {
  user_ids?: string[];
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  broadcast?: boolean;
}

export function useSendNotification() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendNotification = useCallback(async (params: SendNotificationParams) => {
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: params,
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to send notification',
        });
        return { success: false, error };
      }

      toast({
        title: 'Notification Sent',
        description: `Sent to ${data.sent_count} device(s)`,
      });

      return { success: true, data };
    } catch (err) {
      console.error('Failed to send notification:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification',
      });
      return { success: false, error: err };
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  // Convenience methods for specific notification types
  const sendShiftStatusNotification = useCallback(
    (userIds: string[], title: string, body: string, data?: Record<string, unknown>) => 
      sendNotification({ user_ids: userIds, notification_type: 'shift_status', title, body, data }),
    [sendNotification]
  );

  const sendGeofenceAlert = useCallback(
    (userIds: string[], title: string, body: string, data?: Record<string, unknown>) => 
      sendNotification({ user_ids: userIds, notification_type: 'geofence_alert', title, body, data }),
    [sendNotification]
  );

  const sendAdminAnnouncement = useCallback(
    (title: string, body: string, data?: Record<string, unknown>) => 
      sendNotification({ notification_type: 'admin_announcement', title, body, data, broadcast: true }),
    [sendNotification]
  );

  return {
    sendNotification,
    sendShiftStatusNotification,
    sendGeofenceAlert,
    sendAdminAnnouncement,
    isSending,
  };
}
