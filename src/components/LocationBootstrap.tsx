import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export function LocationBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let watchId: string | null = null;
    let cancelled = false;

    const withTimeout = async <T,>(p: Promise<T>, ms: number) => {
      return await Promise.race([
        p,
        new Promise<T>((_, rej) =>
          setTimeout(() => rej(new Error(`Location timeout after ${ms}ms`)), ms)
        ),
      ]);
    };

    const run = async () => {
      try {
        // 1) Check permission
        const current = await Geolocation.checkPermissions();

        // 2) Request if needed
        const perm =
          current.location === "granted"
            ? current
            : await Geolocation.requestPermissions();

        if (perm.location !== "granted") {
          console.warn("Location permission not granted:", perm);

          // Let your UI know why it’s stuck
          window.dispatchEvent(
            new CustomEvent("location:error", {
              detail: { message: "Location permission not granted", perm },
            })
          );
          return;
        }

        // 3) Get an initial fix (timeout so it doesn't hang forever)
        const pos = await withTimeout(
          Geolocation.getCurrentPosition({ enableHighAccuracy: true }),
          12000
        );

        if (cancelled) return;

        window.dispatchEvent(
          new CustomEvent("location:ready", { detail: pos.coords })
        );

        // 4) Watch updates
        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (cancelled) return;

            if (err) {
              window.dispatchEvent(
                new CustomEvent("location:error", {
                  detail: { message: err.message ?? "watch error", err },
                })
              );
              return;
            }

            if (position) {
              window.dispatchEvent(
                new CustomEvent("location:update", { detail: position.coords })
              );
            }
          }
        );
      } catch (e: any) {
        console.error("Location bootstrap failed:", e);
        window.dispatchEvent(
          new CustomEvent("location:error", {
            detail: { message: e?.message ?? String(e) },
          })
        );
      }
    };

    run();

    return () => {
      cancelled = true;
      if (watchId) Geolocation.clearWatch({ id: watchId });
    };
  }, []);

  return null;
}
