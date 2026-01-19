/**
 * React hook for iOS haptic feedback
 * Provides haptic feedback utilities that can be used throughout the app
 */

import { useCallback } from 'react';
import { haptics, isNative } from '@/lib/native-ios';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export const useHapticFeedback = () => {
  const trigger = useCallback((style: HapticStyle = 'light') => {
    haptics[style]();
  }, []);
  
  // Pre-bound handlers for common patterns
  const onPress = useCallback(() => haptics.light(), []);
  const onConfirm = useCallback(() => haptics.medium(), []);
  const onSuccess = useCallback(() => haptics.success(), []);
  const onError = useCallback(() => haptics.error(), []);
  const onWarning = useCallback(() => haptics.warning(), []);
  const onSelect = useCallback(() => haptics.selection(), []);
  const onHeavy = useCallback(() => haptics.heavy(), []);
  
  return {
    trigger,
    onPress,
    onConfirm,
    onSuccess,
    onError,
    onWarning,
    onSelect,
    onHeavy,
    isSupported: isNative
  };
};
