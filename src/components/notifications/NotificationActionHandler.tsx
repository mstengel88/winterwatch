import { useEffect, useRef } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useOvertimeAction } from '@/hooks/useOvertimeAction';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Listens for push notification action button taps (e.g., "Stop Shift", "Stay on Shift")
 * and triggers the appropriate backend action.
 */
export function NotificationActionHandler() {
  const { stopShift, stayOnShift } = useOvertimeAction();
  const { user } = useAuth();
  const { toast } = useToast();
  const listenerRef = useRef<PluginListenerHandle | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    const setupListener = async () => {
      // Listen for app URL opens which can contain notification action data on iOS
      try {
        listenerRef.current = await App.addListener('appUrlOpen', async (data) => {
          console.log('[NotificationAction] appUrlOpen:', data.url);
          
          // Check if URL contains notification action
          const url = new URL(data.url);
          if (url.pathname.includes('notification-action')) {
            const action = url.searchParams.get('action');
            const timeClockId = url.searchParams.get('time_clock_id');
            const employeeId = url.searchParams.get('employee_id');
            
            if (action && timeClockId && employeeId) {
              await handleNotificationAction(action, timeClockId, employeeId);
            }
          }
        });
      } catch (e) {
        console.error('[NotificationAction] Error setting up URL listener:', e);
      }
    };

    // Also listen for the native notification event via custom event
    const handleNativeAction = async (event: CustomEvent) => {
      console.log('[NotificationAction] Native notification action received:', event.detail);
      const data = event.detail;
      
      // Check for overtime action data
      if (data?.custom?.a?.type === 'overtime_alert' || data?.type === 'overtime_alert') {
        const actionId = data.actionId || data.action;
        const timeClockId = data.custom?.a?.time_clock_id || data.time_clock_id;
        const employeeId = data.custom?.a?.employee_id || data.employee_id;
        
        if (actionId && timeClockId && employeeId) {
          await handleNotificationAction(actionId, timeClockId, employeeId);
        }
      }
    };

    const handleNotificationAction = async (
      action: string,
      timeClockId: string,
      employeeId: string
    ) => {
      console.log('[NotificationAction] Handling action:', { action, timeClockId, employeeId });
      
      if (action === 'stop_shift') {
        const result = await stopShift(timeClockId, employeeId);
        if (result.success) {
          // Force a page refresh to update the UI
          window.location.reload();
        }
      } else if (action === 'stay_on_shift') {
        await stayOnShift(timeClockId, employeeId);
        toast({
          title: 'Continuing Shift',
          description: 'Stay safe out there!',
        });
      }
    };

    setupListener();

    // Listen for iOS notification action events
    window.addEventListener('pushNotificationActionPerformed', handleNativeAction as EventListener);

    return () => {
      listenerRef.current?.remove();
      window.removeEventListener('pushNotificationActionPerformed', handleNativeAction as EventListener);
    };
  }, [user, stopShift, stayOnShift, toast]);

  // Also handle when app is opened from a notification
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    // Check if app was launched with notification data
    const checkLaunchData = async () => {
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('[NotificationAction] App launched with URL:', launchUrl.url);
          // Handle similar to appUrlOpen
        }
      } catch (e) {
        console.log('[NotificationAction] No launch URL or error:', e);
      }
    };

    // Delay check to avoid startup conflicts
    const timeout = setTimeout(checkLaunchData, 1500);
    return () => clearTimeout(timeout);
  }, [user]);

  return null;
}
