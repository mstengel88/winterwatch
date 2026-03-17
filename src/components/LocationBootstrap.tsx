import { useEffect } from "react";

/**
 * LocationBootstrap - Location initialization for immediate proximity display
 * 
 * This component fetches the user's location on app startup so that the 
 * dashboard can immediately show the closest accounts with accurate distances.
 */
export function LocationBootstrap() {
  useEffect(() => {
    let watchId: string | null = null;

    async function run() {
      try {
        const { Capacitor } = await import("@capacitor/core");

        if (!Capacitor.isNativePlatform()) {
          console.log("[LocationBootstrap] Web platform - using browser geolocation");
          // On web, try to get position using browser API
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => console.log("[LocationBootstrap] Web position:", pos.coords),
              (err) => console.log("[LocationBootstrap] Web geolocation error:", err.message),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          return;
        }

        const { Geolocation } = await import("@capacitor/geolocation");

        // Check current permission status
        const status = await Geolocation.checkPermissions();
        console.log("[LocationBootstrap] Permission status:", status);

        if (status.location === "granted") {
          // Already have permission - get position immediately
          console.log("[LocationBootstrap] Permission granted - fetching position");
          
          const position = await Geolocation.getCurrentPosition({ 
            enableHighAccuracy: true,
            timeout: 10000 
          });
          console.log("[LocationBootstrap] Got position:", position.coords);

          // Start watching for updates
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (position, err) => {
              if (position) {
                console.log("[LocationBootstrap] Position update:", position.coords);
              }
              if (err) {
                console.error("[LocationBootstrap] Watch error:", err);
              }
            }
          );
        } else if (status.location === "prompt" || status.location === "prompt-with-rationale") {
          // Request permission - this is safe after the app has loaded
          console.log("[LocationBootstrap] Requesting location permission");
          const newStatus = await Geolocation.requestPermissions();
          
          if (newStatus.location === "granted") {
            const position = await Geolocation.getCurrentPosition({ 
              enableHighAccuracy: true,
              timeout: 10000 
            });
            console.log("[LocationBootstrap] Got position after permission:", position.coords);
          }
        } else {
          console.log("[LocationBootstrap] Location permission denied");
        }
      } catch (error) {
        console.error("[LocationBootstrap] Error:", error);
      }
    }

    // Delay slightly to ensure app is fully loaded
    const timer = setTimeout(run, 1000);

    return () => {
      clearTimeout(timer);
      // Cleanup watch
      (async () => {
        try {
          if (!watchId) return;
          const { Capacitor } = await import("@capacitor/core");
          if (!Capacitor.isNativePlatform()) return;
          const { Geolocation } = await import("@capacitor/geolocation");
          await Geolocation.clearWatch({ id: watchId });
        } catch {
          // ignore cleanup errors
        }
      })();
    };
  }, []);

  return null;
}
