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
  ios: {
    // Fix for iOS 18.2+ WKWebView gesture/tap issues
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: "always",
  },
  plugins: {
    Keyboard: {
      // Helps with input focus issues on iOS
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
