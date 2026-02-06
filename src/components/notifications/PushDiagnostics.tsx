import { useCallback, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import OneSignalBridge from '@/plugins/OneSignalBridge';

type Snapshot = {
  timestamp: string;
  isNativePlatform: boolean;
  platform: string;
  capacitorPluginsKeys: string[];
  capacitorBridgeStatus: 'checking' | 'available' | 'unavailable';
  subscriptionId: string | null;
  pushToken: string | null;
  permissionGranted: boolean | null;
  lastError: string | null;
  // Legacy Cordova diagnostics (for reference)
  hasCordova: boolean;
  hasWindowPlugins: boolean;
  windowPluginsKeys: string[];
  notes: string[];
};

async function takeSnapshot(): Promise<Snapshot> {
  const w = window as any;

  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const hasCordova = !!w.cordova;
  const windowPlugins = w.plugins;
  const hasWindowPlugins = !!windowPlugins;
  const windowPluginsKeys = Object.keys(windowPlugins || {});

  const capacitorPluginsKeys = Object.keys((w.Capacitor?.Plugins as Record<string, unknown>) || {});

  const notes: string[] = [];
  
  let capacitorBridgeStatus: 'checking' | 'available' | 'unavailable' = 'checking';
  let subscriptionId: string | null = null;
  let pushToken: string | null = null;
  let permissionGranted: boolean | null = null;
  let lastError: string | null = null;

  if (!isNativePlatform) {
    notes.push('Not running as a native Capacitor app.');
    capacitorBridgeStatus = 'unavailable';
  } else {
    // Try to use the native Capacitor plugin
    try {
      const permResult = await OneSignalBridge.getPermissionStatus();
      permissionGranted = permResult.granted;
      
      const subResult = await OneSignalBridge.getSubscriptionId();
      subscriptionId = subResult.subscriptionId;
      
      const tokenResult = await OneSignalBridge.getPushToken();
      pushToken = tokenResult.token;
      
      capacitorBridgeStatus = 'available';
      notes.push('Capacitor OneSignalBridge plugin is working!');
      
      if (permissionGranted) {
        notes.push('Push permission: Granted');
      } else {
        notes.push('Push permission: Not granted (user needs to enable in Settings)');
      }
      
      if (subscriptionId) {
        notes.push(`Subscription ID: ${subscriptionId.substring(0, 8)}...`);
      } else {
        notes.push('Subscription ID not yet available (may need permission first)');
      }
    } catch (err) {
      capacitorBridgeStatus = 'unavailable';
      lastError = String(err);
      notes.push(`Capacitor plugin error: ${lastError}`);
      notes.push('The OneSignalBridgePlugin.swift may not be compiled into the app. Rebuild in Xcode.');
    }
  }

  return {
    timestamp: new Date().toISOString(),
    isNativePlatform,
    platform,
    capacitorPluginsKeys,
    capacitorBridgeStatus,
    subscriptionId,
    pushToken,
    permissionGranted,
    lastError,
    hasCordova,
    hasWindowPlugins,
    windowPluginsKeys,
    notes,
  };
}

export function PushDiagnostics() {
  const { isAdminOrManager } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isVisible = isAdminOrManager();

  const status = useMemo(() => {
    if (!snapshot) return { label: 'Not Loaded', variant: 'secondary' as const };
    if (!snapshot.isNativePlatform) return { label: 'Web', variant: 'secondary' as const };
    if (snapshot.capacitorBridgeStatus === 'available') {
      return { label: 'Plugin Ready', variant: 'default' as const };
    }
    return { label: 'Plugin Missing', variant: 'destructive' as const };
  }, [snapshot]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await takeSnapshot();
      setSnapshot(next);
      console.log('[PushDiagnostics] snapshot', next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load on first render
  useState(() => {
    handleRefresh();
  });

  if (!isVisible) return null;

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Push Diagnostics</div>
            <div className="text-xs text-muted-foreground">Admin-only Capacitor plugin status</div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Refresh'}
          </Button>
          {snapshot && <span className="text-xs text-muted-foreground">{snapshot.timestamp}</span>}
        </div>

        {snapshot?.notes && snapshot.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {snapshot.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}

        {snapshot && (
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-foreground">
{JSON.stringify(
  {
    isNativePlatform: snapshot.isNativePlatform,
    platform: snapshot.platform,
    capacitorBridgeStatus: snapshot.capacitorBridgeStatus,
    capacitorPluginsKeys: snapshot.capacitorPluginsKeys,
    permissionGranted: snapshot.permissionGranted,
    subscriptionId: snapshot.subscriptionId,
    pushToken: snapshot.pushToken ? '(present)' : null,
    lastError: snapshot.lastError,
    // Legacy
    hasCordova: snapshot.hasCordova,
    hasWindowPlugins: snapshot.hasWindowPlugins,
    windowPluginsKeys: snapshot.windowPluginsKeys,
  },
  null,
  2
)}
          </pre>
        )}
      </div>
    </details>
  );
}
