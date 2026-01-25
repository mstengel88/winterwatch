import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const PROMPT_DISMISSED_KEY = 'push_notification_prompt_dismissed';

export function PostLoginNotificationPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isRegistered, isLoading, permissionStatus, registerDevice, isNativePlatform } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // Only show on native platforms
    if (!isNativePlatform) return;
    
    // Wait for loading to complete
    if (isLoading) return;
    
    // Don't show if already registered
    if (isRegistered) return;
    
    // Don't show if permission was denied (user needs to enable in system settings)
    if (permissionStatus === 'denied') return;
    
    // Don't show if user is not logged in
    if (!user) return;
    
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed === user.id) return;
    
    // Longer delay on iOS to let WebView fully stabilize after login
    const delay = Capacitor.getPlatform() === 'ios' ? 3000 : 1500;
    
    const timer = setTimeout(() => {
      console.log('[PostLoginPrompt] Showing notification prompt');
      setShowPrompt(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [isNativePlatform, isLoading, isRegistered, permissionStatus, user]);

  const handleEnable = async () => {
    console.log('[PostLoginPrompt] User tapped Enable Notifications');
    setIsEnabling(true);
    
    try {
      await registerDevice();
      console.log('[PostLoginPrompt] Registration completed');
      setShowPrompt(false);
    } catch (err) {
      console.error('[PostLoginPrompt] Registration failed:', err);
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: 'Could not enable notifications. Please try again in Settings.',
      });
      setShowPrompt(false);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    console.log('[PostLoginPrompt] User dismissed prompt');
    setShowPrompt(false);
    if (user) {
      localStorage.setItem(PROMPT_DISMISSED_KEY, user.id);
    }
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Stay Updated</DialogTitle>
          <DialogDescription className="text-center">
            Enable push notifications to receive important alerts about your shifts, 
            job assignments, and team announcements.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleEnable} disabled={isEnabling} className="w-full">
            {isEnabling ? 'Enabling...' : 'Enable Notifications'}
          </Button>
          <Button variant="ghost" onClick={handleDismiss} disabled={isEnabling} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
