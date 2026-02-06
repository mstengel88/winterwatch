import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCheckoutPersistenceDebugSnapshot,
  type CheckoutPersistenceDebugSnapshot,
} from "@/hooks/useCheckoutFormPersistence";

interface PersistenceDebugPanelProps {
  storageKey: string;
}

function isEnabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debugPersistence") === "1";
  } catch {
    return false;
  }
}

export function PersistenceDebugPanel({ storageKey }: PersistenceDebugPanelProps) {
  const enabled = useMemo(() => isEnabled(), []);
  const [snapshot, setSnapshot] = useState<CheckoutPersistenceDebugSnapshot>(() =>
    getCheckoutPersistenceDebugSnapshot(storageKey),
  );

  useEffect(() => {
    if (!enabled) return;

    const tick = () => setSnapshot(getCheckoutPersistenceDebugSnapshot(storageKey));
    tick();
    const id = window.setInterval(tick, 750);
    return () => window.clearInterval(id);
  }, [enabled, storageKey]);

  if (!enabled) return null;
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <Card className="mt-3">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Persistence Debug</CardTitle>
      </CardHeader>
      <CardContent className="pb-3 text-xs space-y-2">
        <div className="grid gap-1">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">storageKey</span>
            <span className="font-mono truncate max-w-[60%]">{storageKey}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">lastLoad</span>
            <span className="font-mono">{snapshot.lastLoadSource ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">localStorage.bytes</span>
            <span className="font-mono">{snapshot.localStorageBytes ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">memoryCache.bytes</span>
            <span className="font-mono">{snapshot.memoryCacheBytes ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">lastWriteError</span>
            <span className="font-mono truncate max-w-[60%]">
              {snapshot.lastWriteError ?? "-"}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground">
          Tip: reproduce (fill → switch apps → return). If <span className="font-mono">lastWriteError</span> shows
          Quota/DOMException, we need to move photo previews off localStorage.
        </p>
      </CardContent>
    </Card>
  );
}
