import { registerPlugin } from "@capacitor/core";

export interface DispatchLocationPlugin {
  startTracking(options: {
    endpoint: string;
    token: string;
    routeId?: string | null;
    orderId?: string | null;
    driverId?: string | null;
    driverName?: string | null;
    truck?: string | null;
  }): Promise<{ ok: boolean; message?: string }>;
  stopTracking(): Promise<{ ok: boolean; message?: string }>;
  status(): Promise<{
    active: boolean;
    routeId?: string | null;
    lastPingAt?: string | null;
    message?: string;
  }>;
}

const DispatchLocation = registerPlugin<DispatchLocationPlugin>("DispatchLocation");

export default DispatchLocation;
