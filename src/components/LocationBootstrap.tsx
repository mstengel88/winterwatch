import { useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

export function LocationBootstrap() {
  const { startTracking } = useGeolocation();

  useEffect(() => {
    // Small delay helps iOS present the prompt reliably after launch
    const t = setTimeout(() => {
      startTracking();
    }, 600);

    return () => clearTimeout(t);
  }, [startTracking]);

  return null;
}

