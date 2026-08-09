import type { AppSettings } from '../../types/settings';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';

const STORAGE_KEY = 'localbookreader_app_settings';

export function getAppSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppSettings;
      return {
        openLastBook: Boolean(parsed.openLastBook),
        appTheme: parsed.appTheme === 'dark' ? 'dark' : 'light',
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_APP_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable - silent fail
  }
}