/**
 * Hook for persisting checkout form state across app closures
 * Stores form data in localStorage keyed by work log ID
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  canUseNativePreviewStore,
  clearCheckoutPhotoPreviews,
  saveCheckoutPhotoPreviews,
} from '@/lib/checkoutPhotoPreviewStore';

const STORAGE_KEY_PREFIX = 'winterwatch_checkout_form_';

// In-memory fallback (helps on native iOS when the WebView temporarily remounts
// and localStorage returns empty during app-switching)
const memoryCache = new Map<string, CheckoutFormData>();

export type CheckoutPersistenceDebugSnapshot = {
  storageKey: string;
  lastLoadSource?: 'localStorage' | 'memoryCache' | 'empty' | 'error';
  localStorageBytes?: number;
  memoryCacheBytes?: number;
  lastWriteError?: string;
};

const debugStateByKey = new Map<string, Omit<CheckoutPersistenceDebugSnapshot, 'storageKey'>>();

function setDebugState(storageKey: string, patch: Partial<Omit<CheckoutPersistenceDebugSnapshot, 'storageKey'>>) {
  const prev = debugStateByKey.get(storageKey) ?? {};
  debugStateByKey.set(storageKey, { ...prev, ...patch });
}

export function getCheckoutPersistenceDebugSnapshot(storageKey: string): CheckoutPersistenceDebugSnapshot {
  const memory = memoryCache.get(storageKey);
  const local = (() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  })();

  const extra = debugStateByKey.get(storageKey) ?? {};
  return {
    storageKey,
    ...extra,
    localStorageBytes: typeof local === 'string' ? local.length : undefined,
    memoryCacheBytes: memory ? JSON.stringify(memory).length : undefined,
  };
}

export interface CheckoutFormData {
  snowDepth?: string;
  saltUsed?: string;
  iceMeltUsed?: string;
  weather?: string;
  notes?: string;
  areasCleared?: string[];
  photoPreviews?: string[]; // Base64 previews for restoration
  photoPreviewRefs?: string[]; // Native-only file refs (keeps localStorage small)
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCheckoutFormPersistenceOptions {
  workLogId: string;
  variant: 'plow' | 'shovel';
}

export function useCheckoutFormPersistence({ workLogId, variant }: UseCheckoutFormPersistenceOptions) {
  const storageKey = `${STORAGE_KEY_PREFIX}${variant}_${workLogId}`;
  const isInitializedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Helper to show "saved" briefly then return to idle
  const flashSaved = useCallback(() => {
    setSaveStatus('saved');
    if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
    saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
  }, []);
  
  // Load initial state from localStorage
  const loadPersistedData = useCallback((): CheckoutFormData => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[Persistence] Loaded data for', storageKey, parsed);
        memoryCache.set(storageKey, parsed);
        setDebugState(storageKey, { lastLoadSource: 'localStorage' });
        return parsed;
      }
    } catch (error) {
      console.error('Error loading persisted checkout form:', error);
      setDebugState(storageKey, { lastLoadSource: 'error' });
    }

    // Fallback: if localStorage is empty/unavailable during a native remount,
    // use the last known in-memory value so fields don't appear to "clear".
    const cached = memoryCache.get(storageKey);
    if (cached && Object.keys(cached).length > 0) {
      console.log('[Persistence] Falling back to memory cache for', storageKey);
      setDebugState(storageKey, { lastLoadSource: 'memoryCache' });
      return cached;
    }

    setDebugState(storageKey, { lastLoadSource: 'empty' });
    return {};
  }, [storageKey]);

  const [formData, setFormData] = useState<CheckoutFormData>(() => loadPersistedData());

  // IMPORTANT: storageKey can change at runtime (e.g., after app resume when activeWorkLog
  // is re-fetched). When it changes, we must reload the corresponding persisted state.
  // Otherwise the UI will show empty values even though data exists under the new key.
  useEffect(() => {
    // Reset initialization guard so we don't immediately overwrite the freshly-loaded value.
    isInitializedRef.current = false;
    setFormData(loadPersistedData());
  }, [storageKey, loadPersistedData]);

  // Re-load from localStorage when component mounts or when visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const freshData = loadPersistedData();
        if (Object.keys(freshData).length > 0) {
          console.log('[Persistence] Reloading data on visibility change');
          setFormData(freshData);
        } else {
          // If localStorage returns empty on resume, keep the last known value.
          const cached = memoryCache.get(storageKey);
          if (cached && Object.keys(cached).length > 0) {
            console.log('[Persistence] Restoring from memory cache on visibility change');
            setFormData(cached);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also reload on focus (for iOS apps that don't trigger visibilitychange)
    const handleFocus = () => {
      const freshData = loadPersistedData();
      if (Object.keys(freshData).length > 0) {
        console.log('[Persistence] Reloading data on focus');
        setFormData(freshData);
      } else {
        const cached = memoryCache.get(storageKey);
        if (cached && Object.keys(cached).length > 0) {
          console.log('[Persistence] Restoring from memory cache on focus');
          setFormData(cached);
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadPersistedData]);

  // Save to localStorage whenever form data changes (but skip the initial empty save)
  useEffect(() => {
    // Skip saving on first render to avoid overwriting with initial empty state
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }
    
    try {
      if (Object.keys(formData).length > 0) {
        console.log('[Persistence] Saving data for', storageKey, formData);
        // Always update memory first, even if localStorage throws (iOS quota / DOMException)
        memoryCache.set(storageKey, formData);
        try {
          localStorage.setItem(storageKey, JSON.stringify(formData));
          setDebugState(storageKey, { lastWriteError: undefined });
        } catch (error) {
          setDebugState(storageKey, { lastWriteError: String(error) });
          throw error;
        }
      }
    } catch (error) {
      console.error('Error persisting checkout form:', error);
    }
  }, [formData, storageKey]);

  // Update a single field
  const updateField = useCallback(<K extends keyof CheckoutFormData>(
    field: K,
    value: CheckoutFormData[K]
  ) => {
    setSaveStatus('saving');
    setFormData(prev => {
      // Don't update if value hasn't changed
      if (prev[field] === value) {
        flashSaved();
        return prev;
      }
      // Don't save empty values unless we're clearing a previously set value
      if (!value && !prev[field]) {
        flashSaved();
        return prev;
      }
      
      const newData = { ...prev, [field]: value };
      // Always update memory first, even if localStorage throws
      memoryCache.set(storageKey, newData);

      // Immediately save to localStorage for reliability
      try {
        localStorage.setItem(storageKey, JSON.stringify(newData));
        setDebugState(storageKey, { lastWriteError: undefined });
        flashSaved();
      } catch (error) {
        console.error('Error persisting field update:', error);
        setDebugState(storageKey, { lastWriteError: String(error) });
        setSaveStatus('error');
      }
      return newData;
    });
  }, [storageKey, flashSaved]);

  // Update photo previews
  const updatePhotoPreviews = useCallback(async (previews: string[]) => {
    setSaveStatus('saving');
    
    // On native, store previews on Filesystem and persist only lightweight refs in localStorage.
    if (canUseNativePreviewStore()) {
      try {
        const refs = await saveCheckoutPhotoPreviews({ storageKey, previews });

        setFormData(prev => {
          // Avoid unnecessary updates
          if (JSON.stringify(prev.photoPreviewRefs) === JSON.stringify(refs)) {
            flashSaved();
            return prev;
          }

          const newData: CheckoutFormData = {
            ...prev,
            photoPreviewRefs: refs,
            // Ensure we don't bloat localStorage with base64.
            photoPreviews: undefined,
          };

          memoryCache.set(storageKey, newData);
          try {
            localStorage.setItem(storageKey, JSON.stringify(newData));
            setDebugState(storageKey, { lastWriteError: undefined });
            console.log('[Persistence] Saved photo preview refs');
            flashSaved();
          } catch (error) {
            console.error('Error persisting photo preview refs:', error);
            setDebugState(storageKey, { lastWriteError: String(error) });
            setSaveStatus('error');
          }
          return newData;
        });
      } catch (error) {
        console.error('Error saving native photo previews:', error);
        setDebugState(storageKey, { lastWriteError: String(error) });
        setSaveStatus('error');
      }
      return;
    }

    // Web fallback: keep existing base64 behavior
    setFormData(prev => {
      if (JSON.stringify(prev.photoPreviews) === JSON.stringify(previews)) {
        flashSaved();
        return prev;
      }

      const newData = { ...prev, photoPreviews: previews };
      memoryCache.set(storageKey, newData);

      try {
        localStorage.setItem(storageKey, JSON.stringify(newData));
        setDebugState(storageKey, { lastWriteError: undefined });
        console.log('[Persistence] Saved photo previews');
        flashSaved();
      } catch (error) {
        console.error('Error persisting photo previews:', error);
        setDebugState(storageKey, { lastWriteError: String(error) });
        setSaveStatus('error');
      }
      return newData;
    });
  }, [storageKey, flashSaved]);

  // Clear persisted data (call on successful checkout)
  const clearPersistedData = useCallback(() => {
    try {
      console.log('[Persistence] Clearing data for', storageKey);
      localStorage.removeItem(storageKey);
      memoryCache.delete(storageKey);
      debugStateByKey.delete(storageKey);
      setFormData({});
      // Best-effort cleanup of native photo preview files
      void clearCheckoutPhotoPreviews(storageKey);
    } catch (error) {
      console.error('Error clearing persisted checkout form:', error);
    }
  }, [storageKey]);

  return {
    formData,
    updateField,
    updatePhotoPreviews,
    clearPersistedData,
    saveStatus,
  };
}

// Clean up old form data for work logs that no longer exist
export function cleanupOldCheckoutForms(activeWorkLogIds: string[]) {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        // Extract the work log ID from the key
        const parts = key.replace(STORAGE_KEY_PREFIX, '').split('_');
        const workLogId = parts.slice(1).join('_'); // Handle IDs with underscores
        
        if (!activeWorkLogIds.includes(workLogId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error cleaning up old checkout forms:', error);
  }
}
