import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  isOnline,
  getPendingWorkLogs,
  getPendingShovelLogs,
  removePendingWorkLog,
  removePendingShovelLog,
  incrementRetryCount,
  updateLastSync,
  getSyncStatus,
  PendingWorkLog,
  SyncStatus,
} from '@/lib/offlineStorage';
import { toast } from 'sonner';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

interface UseOfflineSyncReturn {
  syncStatus: SyncStatus;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  hasPendingChanges: boolean;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const updateSyncStatus = useCallback(() => {
    setSyncStatus(getSyncStatus());
  }, []);

  const syncWorkLog = async (log: PendingWorkLog): Promise<boolean> => {
    try {
      if (log.action === 'check_in') {
        const { error } = await supabase
          .from('work_logs')
          .insert(log.data as never);
        
        if (error) throw error;
      } else if (log.action === 'check_out') {
        const { error } = await supabase
          .from('work_logs')
          .update(log.data as Record<string, unknown>)
          .eq('id', log.id);
        
        if (error) throw error;
      } else if (log.action === 'update') {
        const { error } = await supabase
          .from('work_logs')
          .update(log.data as Record<string, unknown>)
          .eq('id', log.id);
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing work log:', error);
      return false;
    }
  };

  const syncShovelLog = async (log: PendingWorkLog): Promise<boolean> => {
    try {
      if (log.action === 'check_in') {
        const { error } = await supabase
          .from('shovel_work_logs')
          .insert(log.data as never);
        
        if (error) throw error;
      } else if (log.action === 'check_out') {
        const { error } = await supabase
          .from('shovel_work_logs')
          .update(log.data as Record<string, unknown>)
          .eq('id', log.id);
        
        if (error) throw error;
      } else if (log.action === 'update') {
        const { error } = await supabase
          .from('shovel_work_logs')
          .update(log.data as Record<string, unknown>)
          .eq('id', log.id);
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing shovel log:', error);
      return false;
    }
  };

  const syncNow = useCallback(async () => {
    if (!isOnline() || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsSyncing(true);

    try {
      const pendingWorkLogs = getPendingWorkLogs();
      const pendingShovelLogs = getPendingShovelLogs();

      let successCount = 0;
      let failCount = 0;

      // Sync work logs
      for (const log of pendingWorkLogs) {
        if (log.retryCount >= MAX_RETRY_COUNT) {
          console.warn(`Work log ${log.tempId} exceeded max retries, skipping`);
          continue;
        }

        const success = await syncWorkLog(log);
        if (success) {
          removePendingWorkLog(log.tempId);
          successCount++;
        } else {
          incrementRetryCount(log.tempId, 'work');
          failCount++;
        }
      }

      // Sync shovel logs
      for (const log of pendingShovelLogs) {
        if (log.retryCount >= MAX_RETRY_COUNT) {
          console.warn(`Shovel log ${log.tempId} exceeded max retries, skipping`);
          continue;
        }

        const success = await syncShovelLog(log);
        if (success) {
          removePendingShovelLog(log.tempId);
          successCount++;
        } else {
          incrementRetryCount(log.tempId, 'shovel');
          failCount++;
        }
      }

      if (successCount > 0) {
        updateLastSync();
        toast.success(`Synced ${successCount} offline change${successCount > 1 ? 's' : ''}`);
      }

      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} change${failCount > 1 ? 's' : ''}`);
      }

      updateSyncStatus();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      isProcessingRef.current = false;
    }
  }, [updateSyncStatus]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      updateSyncStatus();
      // Sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      updateSyncStatus();
      toast.warning('You are offline. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, updateSyncStatus]);

  // Periodic sync check
  useEffect(() => {
    syncIntervalRef.current = window.setInterval(() => {
      if (isOnline() && getSyncStatus().pendingCount > 0) {
        syncNow();
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncNow]);

  // Initial status check
  useEffect(() => {
    updateSyncStatus();
  }, [updateSyncStatus]);

  return {
    syncStatus,
    isSyncing,
    syncNow,
    hasPendingChanges: syncStatus.pendingCount > 0,
  };
}
