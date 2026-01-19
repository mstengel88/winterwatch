import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { App } from "@capacitor/app";
import type { GeoLocation } from "@/types/database";

interface UseGeolocationReturn {
  location: GeoLocation | null;
  error: string | null;
  isLoading: boolean;
  permission: "prompt" | "granted" | "denied" | "unknown";
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  refreshOnce: () => Promise<GeoLocation | null>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<UseGeolocationReturn["permission"]>("unknown");

  const watchIdRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const appSubRef = useRef<{ remove: () => void } | null>(null);

  const setFromPosition = (pos: GeolocationPosition) => {
    const loc: GeoLocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    setLocation(loc);
    return loc;
  };

  const ensurePermission = useCallback(async () => {
    const check = await Geolocation.checkPermissions();
    const current = check.location;

    if (current === "granted") {
      setPermission("granted");
      return true;
    }
    if (current === "denied") {
      setPermission("denied");
      setError("Location permission denied. Enable it in Settings → Privacy & Security → Location Services.");
      return false;
    }

    const req = await Geolocation.requestPermissions();
    if (req.location === "granted") {
      setPermission("granted");
      return true;
    }

    setPermission(req.location === "denied" ? "denied" : "prompt");
    setError("Location permission not granted.");
    return false;
  }, []);

  const refreshOnce = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const ok = await ensurePermission();
      if (!ok) return null;

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });

      return setFromPosition(pos);
    } catch (e: any) {
      setError(e?.message ?? "Failed to get location");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [ensurePermission]);

  const startForegroundWatch = useCallback(async () => {
    if (watchIdRef.current) return;

    watchIdRef.current = await Geolocation.watchPosition(
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
      (pos, err) => {
        if (err) {
          setError(err.message || "Location watch error");
          return;
        }
        if (pos) {
          setError(null);
          setFromPosition(pos as any);
        }
      }
    );
  }, []);

  const stopForegroundWatch = useCallback(async () => {
    if (!watchIdRef.current) return;
    await Geolocation.clearWatch({ id: watchIdRef.current });
    watchIdRef.current = null;
  }, []);

  const startTracking = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Prompt immediately on open
    await refreshOnce();

    // Foreground continuous watch
    await startForegroundWatch();

    // Auto refresh heartbeat
    if (refreshIntervalRef.current) window.clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = window.setInterval(() => {
      refreshOnce();
    }, 30000);

    // Refresh when app becomes active again
    appSubRef.current = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) refreshOnce();
    });

    // NOTE: true background updates require a dedicated native background location plugin + iOS capabilities.
    // This hook avoids importing a native-only package in the web build so Vite doesn't break.
    if (Capacitor.getPlatform() === "ios") {
      // Best-effort: iOS may pause updates in background unless you add native background tracking.
    }
  }, [refreshOnce, startForegroundWatch]);

  const stopTracking = useCallback(async () => {
    startedRef.current = false;

    await stopForegroundWatch();

    if (refreshIntervalRef.current) {
      window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (appSubRef.current) {
      appSubRef.current.remove();
      appSubRef.current = null;
    }
  }, [stopForegroundWatch]);

  // Auto-start on mount (immediate prompt)
  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location,
    error,
    isLoading,
    permission,
    startTracking,
    stopTracking,
    refreshOnce,
  };
}
