import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "./useGeolocation";

const TRACKING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Sends periodic GPS pings to employee_locations while the user has an active shift.
 * Only runs when employeeId and timeClockId are provided (i.e., user is clocked in).
 */
export function useLocationTracking(
  employeeId: string | null | undefined,
  timeClockId: string | null | undefined
) {
  const { refreshOnce } = useGeolocation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!employeeId || !timeClockId) {
      // Not on shift — clear any running interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendPing = async () => {
      try {
        const loc = await refreshOnce(true); // force fresh GPS
        if (!loc) {
          console.log("[LocationTracking] No location available");
          return;
        }

        const { error } = await supabase.from("employee_locations").insert({
          employee_id: employeeId,
          time_clock_id: timeClockId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy ?? null,
        });

        if (error) {
          console.error("[LocationTracking] Insert error:", error);
        } else {
          console.log("[LocationTracking] Ping sent:", loc.latitude, loc.longitude);
        }
      } catch (err) {
        console.error("[LocationTracking] Error:", err);
      }
    };

    // Send immediately, then every interval
    sendPing();
    intervalRef.current = setInterval(sendPing, TRACKING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [employeeId, timeClockId, refreshOnce]);
}
