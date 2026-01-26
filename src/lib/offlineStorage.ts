/**
 * Offline Storage & Sync Module
 * Provides local storage fallback for work logs when network is unavailable
 */

const STORAGE_KEYS = {
  PENDING_WORK_LOGS: 'winterwatch_pending_work_logs',
  PENDING_SHOVEL_LOGS: 'winterwatch_pending_shovel_logs',
  CACHED_ACCOUNTS: 'winterwatch_cached_accounts',
  CACHED_EQUIPMENT: 'winterwatch_cached_equipment',
  CACHED_EMPLOYEES: 'winterwatch_cached_employees',
  SYNC_QUEUE: 'winterwatch_sync_queue',
  LAST_SYNC: 'winterwatch_last_sync',
} as const;

export interface PendingWorkLog {
  id: string;
  tempId: string;
  action: 'check_in' | 'check_out' | 'update';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  pendingCount: number;
  lastSync: number | null;
  isOnline: boolean;
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Generate a temporary ID for offline records
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get pending work logs from local storage
export function getPendingWorkLogs(): PendingWorkLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING_WORK_LOGS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading pending work logs:', error);
    return [];
  }
}

// Get pending shovel logs from local storage
export function getPendingShovelLogs(): PendingWorkLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING_SHOVEL_LOGS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading pending shovel logs:', error);
    return [];
  }
}

// Add a pending work log
export function addPendingWorkLog(log: Omit<PendingWorkLog, 'retryCount'>): void {
  try {
    const pending = getPendingWorkLogs();
    pending.push({ ...log, retryCount: 0 });
    localStorage.setItem(STORAGE_KEYS.PENDING_WORK_LOGS, JSON.stringify(pending));
  } catch (error) {
    console.error('Error saving pending work log:', error);
  }
}

// Add a pending shovel log
export function addPendingShovelLog(log: Omit<PendingWorkLog, 'retryCount'>): void {
  try {
    const pending = getPendingShovelLogs();
    pending.push({ ...log, retryCount: 0 });
    localStorage.setItem(STORAGE_KEYS.PENDING_SHOVEL_LOGS, JSON.stringify(pending));
  } catch (error) {
    console.error('Error saving pending shovel log:', error);
  }
}

// Remove a pending work log after successful sync
export function removePendingWorkLog(tempId: string): void {
  try {
    const pending = getPendingWorkLogs().filter(log => log.tempId !== tempId);
    localStorage.setItem(STORAGE_KEYS.PENDING_WORK_LOGS, JSON.stringify(pending));
  } catch (error) {
    console.error('Error removing pending work log:', error);
  }
}

// Remove a pending shovel log after successful sync
export function removePendingShovelLog(tempId: string): void {
  try {
    const pending = getPendingShovelLogs().filter(log => log.tempId !== tempId);
    localStorage.setItem(STORAGE_KEYS.PENDING_SHOVEL_LOGS, JSON.stringify(pending));
  } catch (error) {
    console.error('Error removing pending shovel log:', error);
  }
}

// Update retry count for a pending log
export function incrementRetryCount(tempId: string, type: 'work' | 'shovel'): void {
  try {
    const key = type === 'work' ? STORAGE_KEYS.PENDING_WORK_LOGS : STORAGE_KEYS.PENDING_SHOVEL_LOGS;
    const pending = type === 'work' ? getPendingWorkLogs() : getPendingShovelLogs();
    const updated = pending.map(log => 
      log.tempId === tempId ? { ...log, retryCount: log.retryCount + 1 } : log
    );
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating retry count:', error);
  }
}

// Cache accounts for offline access
export function cacheAccounts(accounts: unknown[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error caching accounts:', error);
  }
}

// Get cached accounts
export function getCachedAccounts<T>(): T[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CACHED_ACCOUNTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading cached accounts:', error);
    return [];
  }
}

// Cache equipment for offline access
export function cacheEquipment(equipment: unknown[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_EQUIPMENT, JSON.stringify(equipment));
  } catch (error) {
    console.error('Error caching equipment:', error);
  }
}

// Get cached equipment
export function getCachedEquipment<T>(): T[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CACHED_EQUIPMENT);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading cached equipment:', error);
    return [];
  }
}

// Cache employees for offline access
export function cacheEmployees(employees: unknown[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_EMPLOYEES, JSON.stringify(employees));
  } catch (error) {
    console.error('Error caching employees:', error);
  }
}

// Get cached employees
export function getCachedEmployees<T>(): T[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CACHED_EMPLOYEES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading cached employees:', error);
    return [];
  }
}

// Update last sync timestamp
export function updateLastSync(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}

// Get sync status
export function getSyncStatus(): SyncStatus {
  const pendingWorkLogs = getPendingWorkLogs();
  const pendingShovelLogs = getPendingShovelLogs();
  const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  
  return {
    pendingCount: pendingWorkLogs.length + pendingShovelLogs.length,
    lastSync: lastSyncStr ? parseInt(lastSyncStr, 10) : null,
    isOnline: isOnline(),
  };
}

// Clear all pending data (use after successful full sync)
export function clearPendingData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_WORK_LOGS);
    localStorage.removeItem(STORAGE_KEYS.PENDING_SHOVEL_LOGS);
  } catch (error) {
    console.error('Error clearing pending data:', error);
  }
}

// Clear all cached data
export function clearAllCache(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
