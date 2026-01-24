import { useEffect } from "react";

export function LocationBootstrap() {
  useEffect(() => {
    let watchId: string | null = null;

    async function run() {
      try {
        const { Capacitor } = await import("@capacitor/core");

        if (!Capacitor.isNativePlatform()) {
          console.log("Web platform detected - skipping native location permission request");
          return;
        }

        const { Geolocation } = await import("@capacitor/geolocation");

        const permission = await Geolocation.requestPermissions({
          permissions: ["location", "coarseLocation"],
        });

        if (permission.location === "granted") {
          console.log("Location permission granted");

          await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (position, err) => {
              if (position) console.log("Live location:", position.coords);
              if (err) console.error("Location error:", err);
            }
          );
        } else {
          console.warn("Location permission denied");
        }
      } catch (error) {
        console.error("Location permission error:", error);
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
