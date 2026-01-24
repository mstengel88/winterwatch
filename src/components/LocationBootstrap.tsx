import { useEffect } from "react";

/**
 * LocationBootstrap - Deferred location permission handling
 * 
 * IMPORTANT: On iOS 18.2+, requesting permissions (location, push, etc.) during 
 * early app lifecycle can break WKWebView text input interactions.
 * 
 * This component now only CHECKS existing permission status without prompting.
 * Actual permission requests should happen from explicit user actions (e.g., 
 * when starting a work log that requires location).
 */
export function LocationBootstrap() {
  useEffect(() => {
    let watchId: string | null = null;

    async function run() {
      try {
        const { Capacitor } = await import("@capacitor/core");

        if (!Capacitor.isNativePlatform()) {
          console.log("Web platform detected - skipping native location check");
          return;
        }

        const { Geolocation } = await import("@capacitor/geolocation");

        // Only CHECK current permission status - do NOT request
        // Requesting permissions on launch breaks WKWebView input focus on iOS 18.2+
        const status = await Geolocation.checkPermissions();
        console.log("Location permission status:", status);

        // Only start watching if already granted (from a previous session)
        if (status.location === "granted") {
          console.log("Location already granted - starting position watch");

          await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (position, err) => {
              if (position) console.log("Live location:", position.coords);
              if (err) console.error("Location error:", err);
            }
          );
        } else {
          console.log("Location not yet granted - will request when needed");
        }
      } catch (error) {
        console.error("Location check error:", error);
      }
    }

    run();

    return () => {
      // best-effort cleanup
      (async () => {
        try {
          if (!watchId) return;
          const { Capacitor } = await import("@capacitor/core");
          if (!Capacitor.isNativePlatform()) return;
          const { Geolocation } = await import("@capacitor/geolocation");
          await Geolocation.clearWatch({ id: watchId });
        } catch {
          // ignore
        }
      })();
    };
  }, []);

  return null;
}
