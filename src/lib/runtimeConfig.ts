export type WinterWatchRuntimeConfig = {
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_PUBLIC_WEB_URL?: string;
  VITE_DISPATCH_DRIVER_ROUTE_URL?: string;
  VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT?: string;
  VITE_DISPATCH_DRIVER_TRACKING_TOKEN?: string;
};

declare global {
  interface Window {
    __WINTERWATCH_CONFIG__?: WinterWatchRuntimeConfig;
  }
}

export const winterWatchRuntimeConfig: WinterWatchRuntimeConfig =
  typeof window !== "undefined" ? window.__WINTERWATCH_CONFIG__ ?? {} : {};

export function resolveRuntimeValue(
  runtimeValue: string | undefined,
  buildValue: string | undefined,
  fallback = "",
) {
  return runtimeValue?.trim() || buildValue?.trim() || fallback;
}
