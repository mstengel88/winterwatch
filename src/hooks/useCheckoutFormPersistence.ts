/**
 * Hook for persisting checkout form state across app closures
 * Stores form data in localStorage keyed by work log ID
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'winterwatch_checkout_form_';

export interface CheckoutFormData {
  snowDepth?: string;
  saltUsed?: string;
  iceMeltUsed?: string;
  weather?: string;
  notes?: string;
  areasCleared?: string[];
  photoPreviews?: string[]; // Base64 previews for restoration
}

interface UseCheckoutFormPersistenceOptions {
  workLogId: string;
  variant: 'plow' | 'shovel';
}

export function useCheckoutFormPersistence({ workLogId, variant }: UseCheckoutFormPersistenceOptions) {
  const storageKey = `${STORAGE_KEY_PREFIX}${variant}_${workLogId}`;
  
  // Load initial state from localStorage
  const loadPersistedData = useCallback((): CheckoutFormData => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading persisted checkout form:', error);
    }
    return {};
  }, [storageKey]);

  const [formData, setFormData] = useState<CheckoutFormData>(loadPersistedData);

  // Save to localStorage whenever form data changes
  useEffect(() => {
    try {
      if (Object.keys(formData).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
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
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update photo previews
  const updatePhotoPreviews = useCallback((previews: string[]) => {
    setFormData(prev => ({ ...prev, photoPreviews: previews }));
  }, []);

  // Clear persisted data (call on successful checkout)
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setFormData({});
    } catch (error) {
      console.error('Error clearing persisted checkout form:', error);
    }
  }, [storageKey]);

  return {
    formData,
    updateField,
    updatePhotoPreviews,
    clearPersistedData,
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
