import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const ONESIGNAL_APP_ID = 'aca519b5-1d17-4332-bc19-a54978fff31c';

interface NotificationPreferences {
  shift_status_enabled: boolean;
  geofence_alerts_enabled: boolean;
  admin_announcements_enabled: boolean;
  notification_sound: 'default' | 'chime' | 'bell' | 'alert' | 'none';
  mandatory_shift_status: boolean;
  mandatory_geofence_alerts: boolean;
  mandatory_admin_announcements: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  shift_status_enabled: true,
  geofence_alerts_enabled: true,
  admin_announcements_enabled: true,
  notification_sound: 'default',
  mandatory_shift_status: false,
  mandatory_geofence_alerts: false,
  mandatory_admin_announcements: false,
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
          mandatory_shift_status: data.mandatory_shift_status || false,
          mandatory_geofence_alerts: data.mandatory_geofence_alerts || false,
          mandatory_admin_announcements: data.mandatory_admin_announcements || false,
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
      // Use OneSignal SDK for subscription id (player_id). This is what our edge functions target.
      // Dynamic import for native only
      const OneSignalMod = await import('onesignal-cordova-plugin');
      const OneSignal = OneSignalMod.default;

      // Ensure initialized (native side also initializes, but JS init is safe and ensures the JS bridge is ready)
      try {
        OneSignal.initialize(ONESIGNAL_APP_ID);
      } catch (e) {
        // ignore if already initialized
      }

      // Associate OneSignal user with our Supabase user
      OneSignal.login(user.id);

      const hasPermission = await OneSignal.Notifications.getPermissionAsync();
      setPermissionStatus(hasPermission ? 'granted' : 'prompt');

      if (!hasPermission) {
        const accepted = await OneSignal.Notifications.requestPermission(true);
        setPermissionStatus(accepted ? 'granted' : 'denied');
        if (!accepted) {
          setIsLoading(false);
          return;
        }
      }

      // Wait for subscription id to be available
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
      const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();

      if (!subscriptionId) {
        console.warn('OneSignal subscription id not available yet');
        toast({
          variant: 'destructive',
          title: 'Push Setup Incomplete',
          description: 'Notification permission granted, but device is not registered yet. Try again in a moment.',
        });
        setIsLoading(false);
        return;
      }

      const platform = Capacitor.getPlatform();
      const { error } = await supabase
        .from('push_device_tokens')
        .upsert(
          {
            user_id: user.id,
            player_id: subscriptionId,
            platform,
            device_name: navigator.userAgent,
            is_active: true,
          },
          {
            onConflict: 'user_id,player_id',
          }
        );

      if (error) {
        console.error('Error storing OneSignal subscription id:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to register device for push notifications',
        });
        return;
      }

      console.log('OneSignal registered', { subscriptionId, hasPushToken: !!pushToken, platform });
      setIsRegistered(true);

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
