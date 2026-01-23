import { useEffect } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

export function LocationBootstrap() {
  useEffect(() => {
    async function requestLocation() {
      try {
        // Only request permissions on native platforms (iOS/Android)
        if (Capacitor.isNativePlatform()) {
          const permission = await Geolocation.requestPermissions({
            permissions: ["location", "coarseLocation"],
          });

          if (permission.location === "granted") {
            console.log("Location permission granted");

            // Get initial location
            await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

            // Start watching position in background
            Geolocation.watchPosition(
              { enableHighAccuracy: true },
              (position, err) => {
                if (position) {
                  console.log("Live location:", position.coords);
                }
                if (err) {
                  console.error("Location error:", err);
                }
              }
            );
          } else {
            console.warn("Location permission denied");
          }
        } else {
          // On web, just log that we're skipping native permission request
          console.log("Web platform detected - skipping native location permission request");
        }
      } catch (error) {
        console.error("Location permission error:", error);
      }
    }

    requestLocation();
  }, []);

  return null; // This component does not render UI
}
