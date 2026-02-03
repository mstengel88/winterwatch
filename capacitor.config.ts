import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.winterwatch.pro",
  appName: "WinterWatch Pro",
  webDir: "dist",
  // IMPORTANT:
  // - The WebView should load the built app (file://) or an https dev server.
  // - The custom `winterwatch://` scheme is for deep links (OAuth callbacks),
  //   NOT for the WebView origin.
  // Setting hostname=localhost here can cause iOS to try loading winterwatch://localhost
  // which results in a blank/white screen.
  server: {
    // DEV ONLY: Remove url + cleartext before App Store submission
    url: "https://1a2b04be-8fe3-4bb1-abd6-59ca66ba99f4.lovableproject.com?forceHideBadge=true&debugPersistence=1",
    cleartext: true,
    iosScheme: "https",
    androidScheme: "https",
  },
  // iOS 18+ WKWebView input/gesture stability and performance
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Performance optimizations
    backgroundColor: "#0f172a", // Match app background for faster perceived load
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    Keyboard: {
      // Keeps layout stable and improves focus/keyboard behavior in WKWebView
      resize: "body",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Optimize splash screen for faster perceived startup
      launchShowDuration: 0, // Auto-hide immediately when app is ready
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
