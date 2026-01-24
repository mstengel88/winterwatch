import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  shift_status_enabled: boolean;
  geofence_alerts_enabled: boolean;
  admin_announcements_enabled: boolean;
  notification_sound: 'default' | 'chime' | 'bell' | 'alert' | 'none';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  shift_status_enabled: true,
  geofence_alerts_enabled: true,
  admin_announcements_enabled: true,
  notification_sound: 'default',
};

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          shift_status_enabled: data.shift_status_enabled,
          geofence_alerts_enabled: data.geofence_alerts_enabled,
          admin_announcements_enabled: data.admin_announcements_enabled,
          notification_sound: data.notification_sound as NotificationPreferences['notification_sound'],
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  }, [user]);

  // Save preferences to database
  const savePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    if (!user) return;

    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPrefs,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save notification preferences',
        });
        return;
      }

      toast({
        title: 'Saved',
        description: 'Notification preferences updated',
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }, [user, preferences, toast]);

  // Register device with OneSignal
  const registerDevice = useCallback(async () => {
    if (!user || !Capacitor.isNativePlatform()) {
      setIsLoading(false);
      return;
    }

    try {
      // Dynamic import for native only
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Check permission status
      const permResult = await PushNotifications.checkPermissions();
      setPermissionStatus(permResult.receive as 'granted' | 'denied' | 'prompt');

      if (permResult.receive === 'prompt') {
        const requestResult = await PushNotifications.requestPermissions();
        setPermissionStatus(requestResult.receive as 'granted' | 'denied' | 'prompt');
        
        if (requestResult.receive !== 'granted') {
          console.log('Push notification permission denied');
          setIsLoading(false);
          return;
        }
      } else if (permResult.receive !== 'granted') {
        setIsLoading(false);
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value);
        
        // Store token in database
        const platform = Capacitor.getPlatform();
        const { error } = await supabase
          .from('push_device_tokens')
          .upsert({
            user_id: user.id,
            player_id: token.value,
            platform,
            device_name: navigator.userAgent,
            is_active: true,
          }, {
            onConflict: 'user_id,player_id',
          });

        if (error) {
          console.error('Error storing device token:', error);
        } else {
          setIsRegistered(true);
        }
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        toast({
          title: notification.title || 'Notification',
          description: notification.body,
        });
      });

      // Listen for action performed on notification
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action:', action);
        // Handle navigation based on notification data
        const notificationData = action.notification.data;
        if (notificationData?.navigation_path) {
          window.location.href = notificationData.navigation_path;
        }
      });

    } catch (err) {
      console.error('Error registering for push:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Unregister device
  const unregisterDevice = useCallback(async () => {
    if (!user) return;

    try {
      // Mark all user's tokens as inactive
      const { error } = await supabase
        .from('push_device_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unregistering device:', error);
        return;
      }

      setIsRegistered(false);
      toast({
        title: 'Unregistered',
        description: 'Push notifications disabled',
      });
    } catch (err) {
      console.error('Failed to unregister:', err);
    }
  }, [user, toast]);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      loadPreferences();
      registerDevice();
    }
  }, [user, loadPreferences, registerDevice]);

  return {
    isRegistered,
    isLoading,
    preferences,
    permissionStatus,
    savePreferences,
    registerDevice,
    unregisterDevice,
    isNativePlatform: Capacitor.isNativePlatform(),
  };
}
