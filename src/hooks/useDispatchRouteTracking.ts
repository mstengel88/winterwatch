import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation, type PermissionStatus } from "@capacitor/geolocation";
import DispatchLocation from "@/plugins/DispatchLocation";
import {
  DISPATCH_DRIVER_LOCATION_ENDPOINT,
  DISPATCH_DRIVER_TRACKING_TOKEN,
} from "@/lib/dispatchRouteConfig";

const TRACKING_PING_MS = 10_000;
const HEARTBEAT_PING_MS = 30_000;

type DispatchRouteTrackingInput = {
  enabled: boolean;
  routeId?: string | null;
  orderId?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  truck?: string | null;
};

type DispatchTrackingStatus = "idle" | "requesting" | "active" | "error";

function permissionGranted(permission?: PermissionStatus) {
  return permission?.location === "granted" || permission?.coarseLocation === "granted";
}

export function useDispatchRouteTracking({
  enabled,
  routeId,
  orderId,
  driverId,
  driverName,
  truck,
}: DispatchRouteTrackingInput) {
  const [status, setStatus] = useState<DispatchTrackingStatus>("idle");
  const [message, setMessage] = useState("Live dispatch GPS is off.");
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const lastSentAtRef = useRef(0);
  const watchIdRef = useRef<string | null>(null);
  const latestCoordsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  } | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      const granted = permissionGranted(permission);
      setHasPermission(granted);
      return granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setStatus("requesting");
    setMessage("Requesting location access...");

    try {
      const current = await Geolocation.checkPermissions();
      if (permissionGranted(current)) {
        setHasPermission(true);
        return true;
      }

      const requested = await Geolocation.requestPermissions({
        permissions: ["location"],
      });
      const granted = permissionGranted(requested);
      setHasPermission(granted);
      if (!granted) {
        setStatus("error");
        setMessage("Location access is needed for dispatch map tracking.");
      }
      return granted;
    } catch (error) {
      setHasPermission(false);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to request location access.");
      return false;
    }
  }, []);

  const sendPing = useCallback(
    async (
      coords: {
        latitude: number;
        longitude: number;
        accuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
      },
      force = false,
    ) => {
      const now = Date.now();
      if (!force && now - lastSentAtRef.current < TRACKING_PING_MS) return;
      lastSentAtRef.current = now;

      if (!DISPATCH_DRIVER_TRACKING_TOKEN) {
        setStatus("error");
        setMessage("Dispatch tracking token is missing in WinterWatch.");
        return;
      }

      const response = await fetch(DISPATCH_DRIVER_LOCATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dispatch-Tracking-Token": DISPATCH_DRIVER_TRACKING_TOKEN,
        },
        body: JSON.stringify({
          routeId: routeId || null,
          orderId: orderId || null,
          driverId: driverId || null,
          driverName: driverName || "WinterWatch Driver",
          truck: truck || "",
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
          heading: coords.heading ?? null,
          speed: coords.speed ?? null,
          capturedAt: new Date().toISOString(),
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.message || "Dispatch app rejected GPS update.");
      }

      setStatus("active");
      setMessage("Live dispatch GPS is active.");
      setLastPingAt(new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }));
    },
    [driverId, driverName, orderId, routeId, truck],
  );

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    let cancelled = false;
    let heartbeatId: ReturnType<typeof window.setInterval> | null = null;

    async function startTracking() {
      if (!enabled) {
        setStatus("idle");
        setMessage("Live dispatch GPS is off.");
        return;
      }

      const allowed = await requestPermission();
      if (!allowed || cancelled) return;

      setStatus("active");
      setMessage("Starting live dispatch GPS...");

      if (Capacitor.isNativePlatform()) {
        try {
          const result = await DispatchLocation.startTracking({
            endpoint: DISPATCH_DRIVER_LOCATION_ENDPOINT,
            token: DISPATCH_DRIVER_TRACKING_TOKEN,
            routeId: routeId || null,
            orderId: orderId || null,
            driverId: driverId || null,
            driverName: driverName || "WinterWatch Driver",
            truck: truck || "",
          });
          if (!cancelled) {
            setStatus("active");
            setMessage(result.message || "Native dispatch GPS tracking active.");
          }
          return;
        } catch (error) {
          if (!cancelled) {
            setStatus("error");
            setMessage(
              error instanceof Error
                ? error.message
                : "Native dispatch GPS failed; trying foreground GPS.",
            );
          }
        }
      }

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };
        latestCoordsRef.current = coords;
        await sendPing(coords, true);
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to get current GPS location.");
        }
      }

      try {
        watchIdRef.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 20_000,
            maximumAge: 5_000,
          },
          (position, error) => {
            if (cancelled) return;
            if (error) {
              setStatus("error");
              setMessage(error.message || "Unable to watch dispatch GPS.");
              return;
            }
            if (!position) return;
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            };
            latestCoordsRef.current = coords;
            void sendPing(coords).catch((sendError) => {
              if (!cancelled) {
                setStatus("error");
                setMessage(
                  sendError instanceof Error
                    ? sendError.message
                    : "Unable to send dispatch GPS update.",
                );
              }
            });
          },
        );
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to start GPS tracking.");
        }
      }

      heartbeatId = window.setInterval(() => {
        if (!latestCoordsRef.current) return;
        void sendPing(latestCoordsRef.current, true).catch((error) => {
          if (!cancelled) {
            setStatus("error");
            setMessage(error instanceof Error ? error.message : "Unable to refresh dispatch GPS.");
          }
        });
      }, HEARTBEAT_PING_MS);
    }

    void startTracking();

    return () => {
      cancelled = true;
      if (heartbeatId) window.clearInterval(heartbeatId);
      if (watchIdRef.current) {
        void Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
      if (Capacitor.isNativePlatform()) {
        void DispatchLocation.stopTracking().catch(() => undefined);
      }
    };
  }, [driverId, driverName, enabled, orderId, requestPermission, routeId, sendPing, truck]);

  return {
    isNative: Capacitor.isNativePlatform(),
    status,
    message,
    lastPingAt,
    hasPermission,
    requestPermission,
  };
}
