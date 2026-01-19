import { useState, useCallback } from "react";
import { Geolocation } from "@capacitor/geolocation";

export function useGeolocation() {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshOnce = useCallback(async () => {
    try {
      setIsLoading(true);

      // Make sure permissions are requested (important for iOS/TestFlight)
      await Geolocation.requestPermissions();

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      const loc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      console.log("📍 refreshOnce location:", loc);

      setLocation(loc);
      setError(null);
      return loc;
    } catch (err: any) {
      console.error("❌ Geolocation error:", err);
      setError("Failed to get location");
      return null;
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
