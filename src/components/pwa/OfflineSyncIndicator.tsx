import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OfflineSyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineSyncIndicator({ className, showDetails = false }: OfflineSyncIndicatorProps) {
  const { syncStatus, isSyncing, syncNow, hasPendingChanges } = useOfflineSync();

  if (!showDetails && syncStatus.isOnline && !hasPendingChanges) {
    return null;
  }

  const lastSyncText = syncStatus.lastSync
    ? formatDistanceToNow(syncStatus.lastSync, { addSuffix: true })
    : 'Never';

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      !syncStatus.isOnline && 'bg-destructive/10 text-destructive',
      syncStatus.isOnline && hasPendingChanges && 'bg-warning/10 text-warning-foreground',
      syncStatus.isOnline && !hasPendingChanges && 'bg-muted text-muted-foreground',
      className
    )}>
      {!syncStatus.isOnline ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline</span>
          {hasPendingChanges && (
            <span className="text-xs opacity-75">
              ({syncStatus.pendingCount} pending)
            </span>
          )}
        </>
      ) : hasPendingChanges ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>{syncStatus.pendingCount} pending</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={syncNow}
            disabled={isSyncing}
            className="h-6 px-2 ml-1"
          >
            <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            <span className="ml-1 text-xs">Sync</span>
          </Button>
        </>
      ) : showDetails ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span>Synced {lastSyncText}</span>
        </>
      ) : null}
    </div>
  );
}
