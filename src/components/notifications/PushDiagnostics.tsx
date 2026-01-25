import { useCallback, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

type Snapshot = {
  timestamp: string;
  isNativePlatform: boolean;
  platform: string;
  hasCordova: boolean;
  cordovaPlatformId?: string;
  hasWindowPlugins: boolean;
  windowPluginsKeys: string[];
  hasWindowPluginsOneSignal: boolean;
  hasWindowOneSignal: boolean;
  hasCordovaPluginsOneSignal: boolean;
  notes: string[];
};

function takeSnapshot(): Snapshot {
  const w = window as any;

  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const hasCordova = !!w.cordova;
  const cordovaPlatformId = w.cordova?.platformId;

  const windowPlugins = (window as any).plugins;
  const hasWindowPlugins = !!windowPlugins;
  const windowPluginsKeys = Object.keys(windowPlugins || {});

  const hasWindowPluginsOneSignal = !!windowPlugins?.OneSignal;
  const hasWindowOneSignal = !!w.OneSignal;
  const hasCordovaPluginsOneSignal = !!w.cordova?.plugins?.OneSignal;

  const notes: string[] = [];
  if (!isNativePlatform) notes.push('Not running as a native Capacitor app. OneSignal will not be available.');
  if (isNativePlatform && !hasCordova) notes.push('Cordova bridge not detected (window.cordova missing).');
  if (hasWindowPlugins && windowPluginsKeys.length === 0) notes.push('window.plugins exists but is empty.');
  if (hasWindowPluginsOneSignal) notes.push('Found OneSignal at window.plugins.OneSignal (expected for onesignal-cordova-plugin).');
  if (!hasWindowPluginsOneSignal && (hasWindowOneSignal || hasCordovaPluginsOneSignal)) {
    notes.push('OneSignal found, but not at window.plugins.OneSignal (non-standard path).');
  }

  return {
    timestamp: new Date().toISOString(),
    isNativePlatform,
    platform,
    hasCordova,
    cordovaPlatformId,
    hasWindowPlugins,
    windowPluginsKeys,
    hasWindowPluginsOneSignal,
    hasWindowOneSignal,
    hasCordovaPluginsOneSignal,
    notes,
  };
}

export function PushDiagnostics() {
  const { isAdminOrManager } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot>(() => takeSnapshot());

  const isVisible = isAdminOrManager();

  const status = useMemo(() => {
    if (!snapshot.isNativePlatform) return { label: 'Web', variant: 'secondary' as const };
    if (snapshot.hasWindowPluginsOneSignal) return { label: 'OneSignal Found', variant: 'default' as const };
    return { label: 'OneSignal Missing', variant: 'destructive' as const };
  }, [snapshot]);

  const handleRefresh = useCallback(() => {
    const next = takeSnapshot();
    setSnapshot(next);
    // Also log to console to help when attached to Safari/Xcode
    console.log('[PushDiagnostics] snapshot', next);
  }, []);

  if (!isVisible) return null;

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Push Diagnostics</div>
            <div className="text-xs text-muted-foreground">Admin-only device/plugin visibility</div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground">{snapshot.timestamp}</span>
        </div>

        {snapshot.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {snapshot.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <pre className="overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-foreground">
{JSON.stringify(
  {
    isNativePlatform: snapshot.isNativePlatform,
    platform: snapshot.platform,
    hasCordova: snapshot.hasCordova,
    cordovaPlatformId: snapshot.cordovaPlatformId,
    hasWindowPlugins: snapshot.hasWindowPlugins,
    windowPluginsKeys: snapshot.windowPluginsKeys,
    hasWindowPluginsOneSignal: snapshot.hasWindowPluginsOneSignal,
    hasWindowOneSignal: snapshot.hasWindowOneSignal,
    hasCordovaPluginsOneSignal: snapshot.hasCordovaPluginsOneSignal,
  },
  null,
  2
)}
        </pre>
      </div>
    </details>
  );
}
