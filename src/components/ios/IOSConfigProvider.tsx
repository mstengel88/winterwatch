import { useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';

interface IOSConfigProviderProps {
  children: ReactNode;
}

/**
 * iOS Configuration Provider
 * Initializes iOS-specific platform settings on app mount
 * Should wrap the app at the root level
 */
export function IOSConfigProvider({ children }: IOSConfigProviderProps) {
  useEffect(() => {
    const initializeIOS = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      const isIOS = Capacitor.getPlatform() === 'ios';
      
      try {
        // Configure status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        if (isIOS) {
          // iOS-specific keyboard configuration
          await Keyboard.setStyle({ style: KeyboardStyle.Dark });
          await Keyboard.setScroll({ isDisabled: true });
          await Keyboard.setAccessoryBarVisible({ isVisible: true });
        }
        
        console.log('[iOS] Platform configured successfully');
      } catch (error) {
        console.warn('[iOS] Platform configuration failed:', error);
      }
    };

    initializeIOS();
  }, []);

  return <>{children}</>;
}
