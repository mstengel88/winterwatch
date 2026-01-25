import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bell, X } from 'lucide-react';
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

const PROMPT_DISMISSED_KEY = 'push_notification_prompt_dismissed';

export function PostLoginNotificationPrompt() {
  const { user } = useAuth();
  const { isRegistered, isLoading, permissionStatus, registerDevice, isNativePlatform } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

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
    
    // Small delay to let the UI settle after login
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [isNativePlatform, isLoading, isRegistered, permissionStatus, user]);

  const handleEnable = async () => {
    setShowPrompt(false);
    await registerDevice();
  };

  const handleDismiss = () => {
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
          <Button onClick={handleEnable} className="w-full">
            Enable Notifications
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
