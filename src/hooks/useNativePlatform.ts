import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to detect if the app is running as a native Capacitor app (iOS/Android)
 * Returns true ONLY when running in the native shell, not in web browsers
 */
export function useNativePlatform() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    const currentPlatform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    
    setIsNative(native);
    setPlatform(currentPlatform);
  }, []);

  return {
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    platform,
  };
}

/**
 * Synchronous check for native platform - use in components that need immediate value
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
