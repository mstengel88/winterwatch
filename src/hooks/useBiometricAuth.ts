import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BiometricAuthResult {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'none';
  isEnabled: boolean;
  authenticate: () => Promise<boolean>;
  enableBiometric: (email: string) => void;
  disableBiometric: () => void;
  getSavedEmail: () => string | null;
}

const BIOMETRIC_EMAIL_KEY = 'biometric_auth_email';
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export function useBiometricAuth(): BiometricAuthResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<'faceId' | 'touchId' | 'fingerprint' | 'none'>('none');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // iOS 18.x stability: avoid ALL native bridge calls during early startup.
    // Only check biometric availability after a user interaction or significant delay.
    // For now, we only enable biometric checks on non-iOS or after delay.
    const platform = Capacitor.getPlatform();
    
    // Always check localStorage (not a native call)
    checkIfEnabled();
    
    // Skip native biometric check on iOS during initial mount to prevent WKWebView crash
    if (platform === 'ios') {
      // On iOS, defer the native check significantly to allow WebView to stabilize
      const timer = setTimeout(() => {
        checkBiometricAvailability();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      checkBiometricAvailability();
    }
  }, []);

  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      setBiometryType('none');
      return;
    }

    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const result = await BiometricAuth.checkBiometry();
      
      setIsAvailable(result.isAvailable);
      
      // Determine biometry type
      if (result.biometryType === 1) { // TouchID
        setBiometryType('touchId');
      } else if (result.biometryType === 2) { // FaceID
        setBiometryType('faceId');
      } else if (result.biometryType === 3) { // Fingerprint (Android)
        setBiometryType('fingerprint');
      } else {
        setBiometryType('none');
      }
    } catch (error) {
      console.log('[Biometric] Not available:', error);
      setIsAvailable(false);
      setBiometryType('none');
    }
  };

  const checkIfEnabled = () => {
    const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    const hasEmail = !!localStorage.getItem(BIOMETRIC_EMAIL_KEY);
    setIsEnabled(enabled && hasEmail);
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !isAvailable) {
      return false;
    }

    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      
      await BiometricAuth.authenticate({
        reason: 'Sign in to WinterWatch-Pro',
        cancelTitle: 'Use Password',
        allowDeviceCredential: true,
      });
      
      return true;
    } catch (error) {
      console.log('[Biometric] Authentication failed:', error);
      return false;
    }
  }, [isAvailable]);

  const enableBiometric = useCallback((email: string) => {
    localStorage.setItem(BIOMETRIC_EMAIL_KEY, email);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    setIsEnabled(true);
  }, []);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_EMAIL_KEY);
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    setIsEnabled(false);
  }, []);

  const getSavedEmail = useCallback((): string | null => {
    return localStorage.getItem(BIOMETRIC_EMAIL_KEY);
  }, []);

  return {
    isAvailable,
    biometryType,
    isEnabled,
    authenticate,
    enableBiometric,
    disableBiometric,
    getSavedEmail,
  };
}
