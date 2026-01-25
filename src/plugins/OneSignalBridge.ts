import { registerPlugin } from '@capacitor/core';

export interface OneSignalBridgePlugin {
  getSubscriptionId(): Promise<{ subscriptionId: string | null }>;
  getPushToken(): Promise<{ token: string | null }>;
  getPermissionStatus(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ accepted: boolean }>;
  login(options: { externalId: string }): Promise<{ success: boolean }>;
  logout(): Promise<{ success: boolean }>;
}

const OneSignalBridge = registerPlugin<OneSignalBridgePlugin>('OneSignalBridge');

export default OneSignalBridge;
