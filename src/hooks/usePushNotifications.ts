import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const ONESIGNAL_APP_ID = 'aca519b5-1d17-4332-bc19-a54978fff31c';

// Type declaration for OneSignal global
declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
    OneSignalDeferred?: any[];
  }
}

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

/**
 * Wait for Cordova deviceready event
 * CRITICAL: Plugins only become available AFTER this event fires
 */
async function waitForDeviceReady(timeoutMs = 10000): Promise<boolean> {
  // If not in Cordova environment, resolve immediately
  if (typeof (window as any).cordova === 'undefined') {
    // Check if plugins already exist (may be pre-loaded)
    if (window.plugins?.OneSignal) {
      console.log('[Push] deviceready: Plugins already available');
      return true;
    }
    console.log('[Push] deviceready: No Cordova detected, checking for plugins...');
    // Wait a bit and check again - Capacitor may load plugins differently
    await new Promise(resolve => setTimeout(resolve, 500));
    return !!window.plugins?.OneSignal;
  }
  
  return new Promise((resolve) => {
    // Check if already fired
    if ((document as any).deviceReadyFired || (window as any).cordova?.platformId) {
      console.log('[Push] deviceready: Already fired or platform initialized');
      resolve(true);
      return;
    }
    
    const timer = setTimeout(() => {
      console.log('[Push] deviceready: Timeout after', timeoutMs, 'ms');
      resolve(false);
    }, timeoutMs);
    
    document.addEventListener('deviceready', () => {
      clearTimeout(timer);
      (document as any).deviceReadyFired = true;
      console.log('[Push] deviceready: Event fired!');
      resolve(true);
    }, { once: true });
  });
}

/**
 * Get OneSignal instance from the global window object
 * Cordova plugins register themselves globally, not as ES modules
 */
function getOneSignalSync(): any | null {
  // Try the standard Cordova plugin location (most common for v5)
  if (window.plugins?.OneSignal) {
    return window.plugins.OneSignal;
  }
  // Try direct window reference (check it has expected methods)
  if ((window as any).OneSignal && typeof (window as any).OneSignal.initialize === 'function') {
    return (window as any).OneSignal;
  }
  // Try cordova.plugins path
  if ((window as any).cordova?.plugins?.OneSignal) {
    return (window as any).cordova.plugins.OneSignal;
  }
  return null;
}

/**
 * Wait for OneSignal to be available on the window object
 * Cordova plugins may take time to initialize after deviceready
 */
async function waitForOneSignal(maxAttempts = 20, delayMs = 500): Promise<any | null> {
  // First wait for deviceready
  const deviceReady = await waitForDeviceReady();
  console.log('[Push] Device ready result:', deviceReady);
  
  // Give plugins extra time to register after deviceready
  await new Promise(resolve => setTimeout(resolve, 500));
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const oneSignal = getOneSignalSync();
    if (oneSignal) {
      console.log(`[Push] OneSignal found on attempt ${attempt}`);
      return oneSignal;
    }
    
    // Log detailed debug info
    const debugInfo = {
      hasWindowPlugins: !!window.plugins,
      windowPluginsKeys: Object.keys(window.plugins || {}),
      hasCordova: !!(window as any).cordova,
      cordovaPlatform: (window as any).cordova?.platformId,
      cordovaPluginsKeys: Object.keys((window as any).cordova?.plugins || {}),
      hasDirectOneSignal: !!(window as any).OneSignal,
    };
    console.log(`[Push] Attempt ${attempt}/${maxAttempts}:`, JSON.stringify(debugInfo));
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const initRef = useRef(false);

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
      console.log('[Push] Skipping registration - not native or no user');
      setIsLoading(false);
      return;
    }

    try {
      // Wait for OneSignal plugin to be available (may take time after app launch)
      const OneSignal = await waitForOneSignal();
      
      if (!OneSignal) {
        const availablePlugins = Object.keys(window.plugins || {});
        const hasCordova = !!(window as any).cordova;
        console.error('[Push] OneSignal not found after retries. Debug info:', {
          hasWindowPlugins: !!window.plugins,
          hasWindowOneSignal: !!(window as any).OneSignal,
          hasCordova,
          availablePlugins,
          cordovaPlugins: hasCordova ? Object.keys((window as any).cordova?.plugins || {}) : []
        });
        toast({
          variant: 'destructive',
          title: 'Push Not Available',
          description: `OneSignal plugin not found. Available: ${availablePlugins.join(', ') || 'none'}. Rebuild with: npx cap sync ios`,
        });
        setIsLoading(false);
        return;
      }

      console.log('[Push] Found OneSignal plugin, initializing...');
      
      // Ensure initialized
      try {
        OneSignal.initialize(ONESIGNAL_APP_ID);
        console.log('[Push] OneSignal initialized with app ID:', ONESIGNAL_APP_ID);
      } catch (e) {
        console.log('[Push] OneSignal already initialized or error:', e);
      }

      // Associate OneSignal user with our Supabase user
      console.log('[Push] Logging in user:', user.id);
      OneSignal.login(user.id);

      const hasPermission = await OneSignal.Notifications.getPermissionAsync();
      console.log('[Push] Current permission status:', hasPermission);
      setPermissionStatus(hasPermission ? 'granted' : 'prompt');

      if (!hasPermission) {
        console.log('[Push] Requesting permission...');
        const accepted = await OneSignal.Notifications.requestPermission(true);
        console.log('[Push] Permission result:', accepted);
        setPermissionStatus(accepted ? 'granted' : 'denied');
        if (!accepted) {
          setIsLoading(false);
          return;
        }
      }

      // Wait for subscription id with retry logic
      let subscriptionId: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        console.log(`[Push] Attempt ${attempt + 1} to get subscription ID...`);
        subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
        if (subscriptionId) {
          console.log('[Push] Got subscription ID:', subscriptionId);
          break;
        }
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
      console.log('[Push] Push token available:', !!pushToken);

      if (!subscriptionId) {
        console.warn('[Push] OneSignal subscription id not available after retries');
        toast({
          variant: 'destructive',
          title: 'Push Setup Incomplete',
          description: 'Notification permission granted, but device is not registered yet. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      const platform = Capacitor.getPlatform();
      console.log('[Push] Upserting to database...', { user_id: user.id, player_id: subscriptionId, platform });
      
      const { data, error } = await supabase
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
        )
        .select();

      if (error) {
        console.error('[Push] Error storing OneSignal subscription id:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to register device for push notifications',
        });
        return;
      }

      console.log('[Push] Successfully registered!', { subscriptionId, data });
      setIsRegistered(true);
      
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive notifications on this device',
      });

    } catch (err) {
      console.error('[Push] Error registering for push:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to set up push notifications: ${err}`,
      });
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

  // Initialize on mount - ONLY check status, do NOT request permissions
  useEffect(() => {
    if (initRef.current) return;
    
    const init = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      initRef.current = true;
      
      // Always load preferences
      await loadPreferences();
      
      // Check if already registered in DB
      try {
        const { data, error } = await supabase
          .from('push_device_tokens')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          setIsRegistered(true);
          console.log('[Push] Already registered in database');
        }
      } catch (err) {
        console.error('[Push] Error checking existing registration:', err);
      }
      
      // On native platforms, check permission status using global OneSignal
      if (Capacitor.isNativePlatform()) {
        try {
          const OneSignal = getOneSignalSync();
          if (OneSignal) {
            const hasPermission = await OneSignal.Notifications.getPermissionAsync();
            setPermissionStatus(hasPermission ? 'granted' : 'prompt');
            console.log('[Push] Permission status checked:', hasPermission);
          } else {
            console.log('[Push] OneSignal not available for permission check');
          }
        } catch (e) {
          console.log('[Push] Could not check permission:', e);
        }
      }
      
      setIsLoading(false);
    };
    
    init();
  }, [user, loadPreferences]);

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
