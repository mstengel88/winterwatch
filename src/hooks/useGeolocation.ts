import { useState, useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

// Cache location for 30 seconds to reduce GPS calls (saves battery on iOS)
const LOCATION_CACHE_MS = 30000;
const PERSISTED_LOCATION_KEY = "winterwatch_last_location";

type LocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

async function getBrowserLocation(timeout: number, maximumAge: number): Promise<LocationCoords> {
  if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    throw new Error("Browser location requires HTTPS. You can still use the app and select accounts manually.");
  }

  if ("permissions" in navigator && "query" in navigator.permissions) {
    let permissionStatus: PermissionStatus | null = null;
    try {
      permissionStatus = await navigator.permissions.query({ name: "geolocation" });
    } catch {
      // Ignore unsupported permissions API behavior and fall back to a direct geolocation attempt.
    }

    if (permissionStatus?.state === "denied") {
      throw new Error("Browser location access is blocked. Enable location permission for this site to auto-detect nearby accounts.");
    }
  }

  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation is not available on this device.");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Browser location access was denied. Allow location for this site to use nearby-account detection."));
            return;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location is temporarily unavailable in this browser. Check device location services and try again."));
            return;
          case error.TIMEOUT:
            reject(new Error("Location lookup timed out. Try again in a spot with better signal."));
            return;
          default:
            reject(new Error("Unable to get browser location right now."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge,
      },
    );
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Cache to prevent excessive GPS calls
  const lastFetchRef = useRef<number>(0);
  const cachedLocationRef = useRef<typeof location>(null);

  const persistLocation = useCallback((value: LocationCoords) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PERSISTED_LOCATION_KEY, JSON.stringify({
        ...value,
        savedAt: Date.now(),
      }));
    } catch {
      // ignore persistence failures
    }
  }, []);

  const readPersistedLocation = useCallback((): LocationCoords | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(PERSISTED_LOCATION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocationCoords & { savedAt?: number };
      if (
        typeof parsed?.latitude !== "number" ||
        typeof parsed?.longitude !== "number" ||
        typeof parsed?.accuracy !== "number"
      ) {
        return null;
      }
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy,
      };
    } catch {
      return null;
    }
  }, []);

  const refreshOnce = useCallback(async (forceRefresh = false) => {
    // Return cached location if still fresh (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && cachedLocationRef.current && (now - lastFetchRef.current) < LOCATION_CACHE_MS) {
      console.log("📍 Using cached location");
      return cachedLocationRef.current;
    }
    
    try {
      setIsLoading(true);
      const maximumAge = forceRefresh ? 0 : LOCATION_CACHE_MS;
      let loc: LocationCoords;

      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.checkPermissions();

        const hasPermission =
          permission.location === "granted" || permission.coarseLocation === "granted";

        if (!hasPermission) {
          const requested = await Geolocation.requestPermissions({
            permissions: ["location"],
          });
          const granted =
            requested.location === "granted" || requested.coarseLocation === "granted";

          if (!granted) {
            throw new Error("Location permission is denied. Enable it in Settings and try again.");
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge,
        });

        loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } else {
        loc = await getBrowserLocation(15000, maximumAge);
      }

      console.log("📍 refreshOnce location:", loc);

      // Update cache
      lastFetchRef.current = now;
      cachedLocationRef.current = loc;
      persistLocation(loc);
      
      setLocation(loc);
      setError(null);
      return loc;
    } catch (err: unknown) {
      console.error("❌ Geolocation error:", err);

      const fallbackLocation = cachedLocationRef.current ?? readPersistedLocation();
      if (fallbackLocation) {
        cachedLocationRef.current = fallbackLocation;
        setLocation(fallbackLocation);
      }

      const message =
        err instanceof Error && err.message
          ? err.message
          : "Unable to get current location right now.";

      setError(message);
      return fallbackLocation; // Return cached on error
    } finally {
      setIsLoading(false);
    }
  }, [persistLocation, readPersistedLocation]);

  // Keep old name for compatibility if anything else uses it
  const getCurrentLocation = refreshOnce;

  return {
    location,
    error,
    isLoading,
    getCurrentLocation,
    refreshOnce,
  };
}
