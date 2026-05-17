type WinterWatchRuntimeConfig = {
  VITE_DISPATCH_DRIVER_ROUTE_URL?: string;
  VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT?: string;
};

declare global {
  interface Window {
    __WINTERWATCH_CONFIG__?: WinterWatchRuntimeConfig;
  }
}

const runtimeConfig =
  typeof window !== "undefined" ? window.__WINTERWATCH_CONFIG__ : undefined;

export const DISPATCH_DRIVER_ROUTE_URL =
  runtimeConfig?.VITE_DISPATCH_DRIVER_ROUTE_URL ||
  import.meta.env.VITE_DISPATCH_DRIVER_ROUTE_URL ||
  "https://contractor.ghstickets.com/dispatch/driver";

export const DISPATCH_DRIVER_LOCATION_ENDPOINT =
  runtimeConfig?.VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT ||
  import.meta.env.VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT ||
  "https://contractor.ghstickets.com/api/dispatch-driver-location";

export const DISPATCH_DRIVER_TRACKING_TOKEN =
  import.meta.env.VITE_DISPATCH_DRIVER_TRACKING_TOKEN || "";
