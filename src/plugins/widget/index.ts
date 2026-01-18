/**
 * WinterWatch Widget Plugin
 * Cross-platform Capacitor plugin for native widget integration
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import type { WidgetPlugin, ShiftWidgetData } from './definitions';

// Register the native plugin
const WidgetNative = registerPlugin<WidgetPlugin>('Widget', {
  web: () => import('./web').then((m) => new m.WidgetWeb()),
});

/**
 * Widget service for managing home screen widget data
 * Provides a unified API across iOS, Android, and web (fallback)
 */
class WidgetService {
  private plugin: WidgetPlugin;
  private lastData: ShiftWidgetData | null = null;
  private listeners: Map<string, ((event: { action: string }) => void)[]> = new Map();

  constructor() {
    this.plugin = WidgetNative;
  }

  /**
   * Check if running on a native platform with widget support
   */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Update widget with current shift data
   * Automatically handles platform differences
   */
  async updateShiftStatus(data: ShiftWidgetData): Promise<void> {
    this.lastData = data;

    try {
      await this.plugin.updateShiftStatus(data);
      console.log('[Widget] Updated shift status:', data.isActive ? 'Active' : 'Inactive');
    } catch (error) {
      // Silently fail on web - widgets aren't supported
      if (this.isNative) {
        console.error('[Widget] Failed to update:', error);
      }
    }
  }

  /**
   * Get currently stored widget data
   */
  async getWidgetData(): Promise<ShiftWidgetData | null> {
    try {
      return await this.plugin.getWidgetData();
    } catch {
      return this.lastData;
    }
  }

  /**
   * Force refresh all widgets
   */
  async refreshWidgets(): Promise<void> {
    try {
      await this.plugin.refreshWidgets();
    } catch (error) {
      if (this.isNative) {
        console.error('[Widget] Failed to refresh:', error);
      }
    }
  }

  /**
   * Check if widgets are supported
   */
  async isSupported(): Promise<boolean> {
    try {
      const result = await this.plugin.isSupported();
      return result.supported;
    } catch {
      return false;
    }
  }

  /**
   * Listen for widget tap actions
   */
  async onWidgetAction(callback: (action: string) => void): Promise<() => void> {
    const listener = await this.plugin.addListener('widgetAction', (event) => {
      callback(event.action);
    });
    return () => listener.remove();
  }
}

// Export singleton instance
export const widgetService = new WidgetService();

// Export types
export type { WidgetPlugin, ShiftWidgetData } from './definitions';
