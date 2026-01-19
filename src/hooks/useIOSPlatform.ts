import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';

/**
 * iOS Platform Hook
 * Manages iOS-specific platform features like status bar, keyboard, and safe areas
 */
export function useIOSPlatform() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isNative = Capacitor.isNativePlatform();
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Configure status bar for iOS
  const configureStatusBar = useCallback(async () => {
    if (!isNative) return;
    
    try {
      // Use dark style (light text) for our dark theme
      await StatusBar.setStyle({ style: Style.Dark });
      
      // Make status bar overlay the webview (for transparent nav)
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (error) {
      console.warn('[iOS] Status bar configuration failed:', error);
    }
  }, [isNative]);

  // Configure keyboard behavior
  const configureKeyboard = useCallback(async () => {
    if (!isNative || !isIOS) return;
    
    try {
      // Use dark keyboard to match app theme
      await Keyboard.setStyle({ style: KeyboardStyle.Dark });
      
      // Disable scroll on keyboard show (we handle it manually)
      await Keyboard.setScroll({ isDisabled: true });
      
      // Enable accessory bar (toolbar above keyboard)
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch (error) {
      console.warn('[iOS] Keyboard configuration failed:', error);
    }
  }, [isNative, isIOS]);

  // Show/hide keyboard programmatically
  const showKeyboard = useCallback(async () => {
    if (!isNative) return;
    try {
      await Keyboard.show();
    } catch (error) {
      console.warn('[iOS] Show keyboard failed:', error);
    }
  }, [isNative]);

  const hideKeyboard = useCallback(async () => {
    if (!isNative) return;
    try {
      await Keyboard.hide();
    } catch (error) {
      console.warn('[iOS] Hide keyboard failed:', error);
    }
  }, [isNative]);

  // Status bar visibility control
  const hideStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.hide();
    } catch (error) {
      console.warn('[iOS] Hide status bar failed:', error);
    }
  }, [isNative]);

  const showStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.show();
    } catch (error) {
      console.warn('[iOS] Show status bar failed:', error);
    }
  }, [isNative]);

  // Initialize on mount
  useEffect(() => {
    configureStatusBar();
    configureKeyboard();
  }, [configureStatusBar, configureKeyboard]);

  // Listen for keyboard events
  useEffect(() => {
    if (!isNative) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardVisible(true);
      setKeyboardHeight(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, [isNative]);

  return {
    // Platform info
    isNative,
    isIOS,
    // Keyboard state
    keyboardVisible,
    keyboardHeight,
    // Keyboard controls
    showKeyboard,
    hideKeyboard,
    // Status bar controls
    hideStatusBar,
    showStatusBar,
    // Configuration
    configureStatusBar,
    configureKeyboard,
  };
}
