/**
 * iOS Native Optimizations Module
 * Provides haptic feedback, status bar control, and keyboard handling for native iOS
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

// Check if running on native iOS
export const isNativeIOS = Capacitor.getPlatform() === 'ios';
export const isNative = Capacitor.isNativePlatform();

/**
 * Haptic Feedback Utilities
 * Provides native iOS haptic feedback for different interaction types
 */
export const haptics = {
  // Light tap - for selection changes, toggles
  light: async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  },
  
  // Medium impact - for button presses, confirmations
  medium: async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  },
  
  // Heavy impact - for significant actions like clock in/out
  heavy: async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  },
  
  // Success notification - for completed actions
  success: async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  },
  
  // Warning notification - for alerts
  warning: async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  },
  
  // Error notification - for failures
  error: async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  },
  
  // Selection changed - for picker/list selections
  selection: async () => {
    if (isNative) {
      await Haptics.selectionChanged();
    }
  }
};

/**
 * Status Bar Control
 * Manages iOS status bar appearance
 */
export const statusBar = {
  // Set dark content (for light backgrounds)
  setLight: async () => {
    if (isNativeIOS) {
      await StatusBar.setStyle({ style: Style.Light });
    }
  },
  
  // Set light content (for dark backgrounds)
  setDark: async () => {
    if (isNativeIOS) {
      await StatusBar.setStyle({ style: Style.Dark });
    }
  },
  
  // Hide status bar (for immersive content)
  hide: async () => {
    if (isNativeIOS) {
      await StatusBar.hide();
    }
  },
  
  // Show status bar
  show: async () => {
    if (isNativeIOS) {
      await StatusBar.show();
    }
  },
  
  // Set background color (iOS 13+)
  setBackgroundColor: async (color: string) => {
    if (isNativeIOS) {
      await StatusBar.setBackgroundColor({ color });
    }
  }
};

/**
 * Keyboard Handling
 * Manages iOS keyboard behavior for better UX
 */
export const keyboard = {
  // Initialize keyboard settings for iOS
  init: async () => {
    if (isNativeIOS) {
      // Resize body to avoid keyboard overlap
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      
      // Enable accessory bar (Done button on keyboard)
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
      
      // Scroll to input when keyboard shows
      await Keyboard.setScroll({ isDisabled: false });
    }
  },
  
  // Hide keyboard programmatically
  hide: async () => {
    if (isNative) {
      await Keyboard.hide();
    }
  },
  
  // Show keyboard
  show: async () => {
    if (isNative) {
      await Keyboard.show();
    }
  },
  
  // Add keyboard show/hide listeners
  addListeners: (onShow?: () => void, onHide?: () => void) => {
    if (!isNative) return { remove: () => {} };
    
    const showHandle = onShow ? Keyboard.addListener('keyboardWillShow', onShow) : null;
    const hideHandle = onHide ? Keyboard.addListener('keyboardWillHide', onHide) : null;
    
    return {
      remove: () => {
        showHandle?.then(h => h.remove());
        hideHandle?.then(h => h.remove());
      }
    };
  }
};

/**
 * Initialize all iOS native features
 * Call this in your app's entry point (main.tsx or App.tsx)
 */
export const initializeIOSNative = async () => {
  if (!isNativeIOS) return;
  
  try {
    // Set status bar for dark theme
    await statusBar.setDark();
    
    // Initialize keyboard handling
    await keyboard.init();
    
    console.log('[iOS] Native features initialized');
  } catch (error) {
    console.warn('[iOS] Failed to initialize some native features:', error);
  }
};

/**
 * Hook wrapper for haptic feedback on button clicks
 * Use: onClick={withHaptic(handleClick, 'medium')}
 */
export const withHaptic = <T extends (...args: any[]) => any>(
  handler: T,
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light'
): T => {
  return ((...args: Parameters<T>) => {
    haptics[style]();
    return handler(...args);
  }) as T;
};
