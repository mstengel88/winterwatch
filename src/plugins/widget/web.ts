/**
 * Web fallback for Widget Plugin
 * Stores data in localStorage for debugging/testing
 */

import { WebPlugin } from '@capacitor/core';
import type { WidgetPlugin, ShiftWidgetData } from './definitions';

const STORAGE_KEY = 'winterwatch_widget_data';

export class WidgetWeb extends WebPlugin implements WidgetPlugin {
  private data: ShiftWidgetData | null = null;

  async updateShiftStatus(data: ShiftWidgetData): Promise<void> {
    this.data = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[Widget Web] Stored data:', data);
  }

  async getWidgetData(): Promise<ShiftWidgetData | null> {
    if (this.data) return this.data;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.data = JSON.parse(stored);
        return this.data;
      } catch {
        return null;
      }
    }
    return null;
  }

  async refreshWidgets(): Promise<void> {
    console.log('[Widget Web] Refresh requested (no-op on web)');
  }

  async isSupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }
}
