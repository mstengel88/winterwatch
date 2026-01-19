import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback } from 'react';

/**
 * iOS Haptic Feedback Hook
 * Provides native haptic feedback for critical user interactions
 * Falls back gracefully on non-native platforms
 */
export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative) return;
    
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.warn('[Haptics] Impact failed:', error);
    }
  }, [isNative]);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNative) return;
    
    try {
      const notificationType = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      }[type];
      
      await Haptics.notification({ type: notificationType });
    } catch (error) {
      console.warn('[Haptics] Notification failed:', error);
    }
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    if (!isNative) return;
    
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.warn('[Haptics] Selection failed:', error);
    }
  }, [isNative]);

  const selectionStart = useCallback(async () => {
    if (!isNative) return;
    
    try {
      await Haptics.selectionStart();
    } catch (error) {
      console.warn('[Haptics] Selection start failed:', error);
    }
  }, [isNative]);

  const selectionEnd = useCallback(async () => {
    if (!isNative) return;
    
    try {
      await Haptics.selectionEnd();
    } catch (error) {
      console.warn('[Haptics] Selection end failed:', error);
    }
  }, [isNative]);

  // Convenience methods for common actions
  const clockIn = useCallback(() => notification('success'), [notification]);
  const clockOut = useCallback(() => notification('success'), [notification]);
  const checkIn = useCallback(() => impact('heavy'), [impact]);
  const buttonTap = useCallback(() => impact('light'), [impact]);
  const error = useCallback(() => notification('error'), [notification]);
  const warning = useCallback(() => notification('warning'), [notification]);

  return {
    // Core haptic methods
    impact,
    notification,
    selectionChanged,
    selectionStart,
    selectionEnd,
    // Convenience methods
    clockIn,
    clockOut,
    checkIn,
    buttonTap,
    error,
    warning,
    // Platform check
    isNative,
  };
}
