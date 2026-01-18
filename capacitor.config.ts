import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.winterwatchapp',
  appName: 'WinterWatch-Pro',
  webDir: 'dist',
  server: {
    url: 'https://winterwatch-pro.info',
    cleartext: true
  }
};

export default config;
