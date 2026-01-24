import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.winterwatch.pro",
  appName: "WinterWatch Pro",
  webDir: "dist",
  server: {
    iosScheme: "winterwatch",
    androidScheme: "https",
    hostname: "localhost",
  },
  // iOS 18+ WKWebView input/gesture stability
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    Keyboard: {
      // Keeps layout stable and improves focus/keyboard behavior in WKWebView
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
