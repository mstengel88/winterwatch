/**
 * iOS Performance Optimization Utilities
 * Provides debouncing, memoization, and render optimization helpers
 */

import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function for rate-limiting frequent operations
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Hook for debounced values - useful for search inputs
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Check if we're on a native iOS platform
 */
export function isIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Request idle callback polyfill for Safari/iOS
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

/**
 * Defer non-critical work until idle
 */
export function deferToIdle<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    requestIdleCallback(() => {
      resolve(fn());
    });
  });
}

/**
 * Batch multiple state updates into a single render cycle
 * React 18+ handles this automatically, but useful for older patterns
 */
export function batchUpdates(fn: () => void): void {
  // React 18 auto-batches, but for explicit batching:
  queueMicrotask(fn);
}

/**
 * Preload critical resources for faster navigation
 */
export function preloadResource(url: string, as: 'script' | 'style' | 'image' | 'font'): void {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  if (as === 'font') link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * Hook to detect if the app is in the background (iOS)
 * Useful for pausing expensive operations
 */
export function useAppVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

/**
 * Memory-efficient list virtualization helper
 * Returns start/end indices for visible items
 */
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems - 1, start + visibleCount + overscan * 2);
  return { start, end };
}

/**
 * Hook for stable object references to prevent unnecessary re-renders
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  const prevRef = useRef<T | undefined>();
  
  if (JSON.stringify(prevRef.current) !== JSON.stringify(value)) {
    ref.current = value;
    prevRef.current = value;
  }
  
  return ref.current;
}
