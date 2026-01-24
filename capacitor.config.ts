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
};

export default config;
