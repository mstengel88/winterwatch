import { useState, useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

// Cache location for 30 seconds to reduce GPS calls (saves battery on iOS)
const LOCATION_CACHE_MS = 30000;

export function useGeolocation() {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Cache to prevent excessive GPS calls
  const lastFetchRef = useRef<number>(0);
  const cachedLocationRef = useRef<typeof location>(null);

  const refreshOnce = useCallback(async (forceRefresh = false) => {
    // Return cached location if still fresh (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && cachedLocationRef.current && (now - lastFetchRef.current) < LOCATION_CACHE_MS) {
      console.log("📍 Using cached location");
      return cachedLocationRef.current;
    }
    
    try {
      setIsLoading(true);

      // Only request permissions on native platforms (iOS/Android)
      if (Capacitor.isNativePlatform()) {
        await Geolocation.requestPermissions();
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000, // 10 second timeout for faster feedback
        maximumAge: forceRefresh ? 0 : LOCATION_CACHE_MS, // Allow cached position
      });

      const loc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      console.log("📍 refreshOnce location:", loc);

      // Update cache
      lastFetchRef.current = now;
      cachedLocationRef.current = loc;
      
      setLocation(loc);
      setError(null);
      return loc;
    } catch (err: any) {
      console.error("❌ Geolocation error:", err);
      setError("Failed to get location");
      return cachedLocationRef.current; // Return cached on error
    } finally {
      setIsLoading(false);
    }
  }, []);

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
