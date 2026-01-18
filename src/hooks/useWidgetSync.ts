/**
 * Hook for syncing shift data with native home screen widgets
 * Automatically updates widgets when shift/work status changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { widgetService, ShiftWidgetData } from '@/plugins/widget';
import { useEmployee } from '@/hooks/useEmployee';
import { differenceInSeconds } from 'date-fns';

interface UseWidgetSyncOptions {
  /** Current temperature */
  temperature?: string;
  /** Weather conditions */
  conditions?: string;
  /** Jobs completed today */
  jobsCompleted?: number;
  /** Whether currently checked in at a location */
  isCheckedIn?: boolean;
  /** Current location name */
  currentLocation?: string;
}

export function useWidgetSync(options: UseWidgetSyncOptions = {}) {
  const { employee, activeShift } = useEmployee();
  const lastUpdateRef = useRef<string>('');

  const {
    temperature = '32',
    conditions = 'Unknown',
    jobsCompleted = 0,
    isCheckedIn = false,
    currentLocation,
  } = options;

  // Calculate hours worked
  const hoursWorked = activeShift
    ? differenceInSeconds(new Date(), new Date(activeShift.clock_in_time)) / 3600
    : 0;

  // Build widget data
  const widgetData: ShiftWidgetData = {
    isActive: !!activeShift,
    shiftStartTime: activeShift?.clock_in_time,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    jobsCompleted,
    temperature: parseInt(temperature) || 32,
    conditions,
    isCheckedIn,
    currentLocation,
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
  };

  // Create a hash of current data for comparison
  const dataHash = JSON.stringify(widgetData);

  // Update widget when data changes
  const updateWidget = useCallback(async () => {
    // Skip if data hasn't changed
    if (dataHash === lastUpdateRef.current) return;
    lastUpdateRef.current = dataHash;

    await widgetService.updateShiftStatus(widgetData);
  }, [dataHash, widgetData]);

  // Auto-update on data changes
  useEffect(() => {
    updateWidget();
  }, [updateWidget]);

  // Set up periodic updates for active shifts (timer updates)
  useEffect(() => {
    if (!activeShift) return;

    // Update every 30 seconds to keep timer accurate on widget
    const interval = setInterval(() => {
      widgetService.updateShiftStatus({
        ...widgetData,
        hoursWorked: differenceInSeconds(new Date(), new Date(activeShift.clock_in_time)) / 3600,
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [activeShift, widgetData]);

  // Handle widget action taps
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    widgetService.onWidgetAction((action) => {
      console.log('[Widget] Action received:', action);
      
      // Handle deep link actions from widget taps
      switch (action) {
        case 'CLOCK_IN':
          // Could dispatch to a global state or navigate
          window.dispatchEvent(new CustomEvent('widget:clockIn'));
          break;
        case 'CLOCK_OUT':
          window.dispatchEvent(new CustomEvent('widget:clockOut'));
          break;
        case 'OPEN_DASHBOARD':
          window.dispatchEvent(new CustomEvent('widget:openDashboard'));
          break;
      }
    }).then((remove) => {
      cleanup = remove;
    });

    return () => cleanup?.();
  }, []);

  return {
    updateWidget,
    widgetData,
    isSupported: widgetService.isNative,
  };
}
