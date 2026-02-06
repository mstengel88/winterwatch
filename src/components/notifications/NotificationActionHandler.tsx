import { useEffect, useRef, useState } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useOvertimeAction } from '@/hooks/useOvertimeAction';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface PendingStopShift {
  timeClockId: string;
  employeeId: string;
}

/**
 * Listens for push notification action button taps (e.g., "Stop Shift", "Stay on Shift")
 * and triggers the appropriate backend action.
 */
export function NotificationActionHandler() {
  const { stopShift, stayOnShift } = useOvertimeAction();
  const { user } = useAuth();
  const { toast } = useToast();
  const listenerRef = useRef<PluginListenerHandle | null>(null);
  
  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStopShift, setPendingStopShift] = useState<PendingStopShift | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle confirmed stop shift
  const handleConfirmStopShift = async () => {
    if (!pendingStopShift) return;
    
    setIsProcessing(true);
    try {
      const result = await stopShift(pendingStopShift.timeClockId, pendingStopShift.employeeId);
      if (result.success) {
        // Force a page refresh to update the UI
        window.location.reload();
      }
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
      setPendingStopShift(null);
    }
  };

  const handleCancelStopShift = () => {
    setShowConfirmDialog(false);
    setPendingStopShift(null);
    toast({
      title: 'Shift Continues',
      description: 'Your shift was not ended.',
    });
  };

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
        // Show confirmation dialog instead of immediately stopping
        setPendingStopShift({ timeClockId, employeeId });
        setShowConfirmDialog(true);
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
  }, [user, stayOnShift, toast]);

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

  return (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Your Shift?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to clock out? This will end your current shift and record your clock-out time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelStopShift} disabled={isProcessing}>
            Keep Working
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmStopShift}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            End Shift
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
