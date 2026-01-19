import { useEffect } from "react";
import { Geolocation } from "@capacitor/geolocation";

export function LocationBootstrap() {
  useEffect(() => {
    async function requestLocation() {
      try {
        // Ask for permission immediately on app launch
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
      } catch (error) {
        console.error("Location permission error:", error);
      }
    }

    requestLocation();
  }, []);

  return null; // This component does not render UI
}
