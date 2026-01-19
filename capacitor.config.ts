import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1a2b04be8fe34bb1abd659ca66ba99f4',
  appName: 'WinterWatch-Pro',
  webDir: 'dist',
  
  // Development server - REMOVE FOR PRODUCTION BUILDS
  server: {
    url: 'https://1a2b04be-8fe3-4bb1-abd6-59ca66ba99f4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  
  // iOS-specific configuration
  ios: {
    // Enable background modes
    backgroundColor: '#0f172a',
    
    // Web view preferences for native-like feel
    preferredContentMode: 'mobile',
    
    // Allow inline media playback
    allowsLinkPreview: false,
    
    // Scroll behavior
    scrollEnabled: true,
    
    // Keyboard settings
    limitsNavigationsToAppBoundDomains: true
  },
  
  // Plugin configurations
  plugins: {
    // Status bar settings
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
      overlaysWebView: true
    },
    
    // Keyboard behavior
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    
    // Haptics - enabled by default
    Haptics: {
      // No additional config needed
    },
    
    // Splash screen (if using)
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
