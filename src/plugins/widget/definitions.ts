/**
 * WinterWatch Widget Plugin Definitions
 * Capacitor plugin for syncing shift data with native home screen widgets
 */

export interface ShiftWidgetData {
  /** Whether a shift is currently active */
  isActive: boolean;
  /** ISO timestamp when shift started */
  shiftStartTime?: string;
  /** Hours worked in current shift */
  hoursWorked: number;
  /** Number of jobs completed today */
  jobsCompleted: number;
  /** Current temperature in Fahrenheit */
  temperature: number;
  /** Weather conditions description */
  conditions: string;
  /** Whether currently checked in at a location */
  isCheckedIn?: boolean;
  /** Current location name if checked in */
  currentLocation?: string;
  /** Employee name */
  employeeName?: string;
}

export interface WidgetPlugin {
  /**
   * Update the home screen widget with current shift data
   * Call this whenever shift status changes
   */
  updateShiftStatus(data: ShiftWidgetData): Promise<void>;

  /**
   * Get the current widget data (useful for debugging)
   */
  getWidgetData(): Promise<ShiftWidgetData | null>;

  /**
   * Force refresh all widgets
   */
  refreshWidgets(): Promise<void>;

  /**
   * Check if widgets are supported on this platform
   */
  isSupported(): Promise<{ supported: boolean }>;

  /**
   * Register for widget tap events
   * Returns the action that was tapped (e.g., 'CLOCK_IN', 'CLOCK_OUT', 'OPEN_DASHBOARD')
   */
  addListener(
    eventName: 'widgetAction',
    listenerFunc: (event: { action: string }) => void
  ): Promise<{ remove: () => void }>;
}
