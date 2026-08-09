import type { ReaderSettings, PaginationMode } from '../../types/settings';
import { DEFAULT_READER_SETTINGS } from '../../types/settings';

const STORAGE_KEY = 'localbookreader_reader_settings';

export function getReaderSettings(): ReaderSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ReaderSettings;
      const validFonts: ReaderSettings['fontFamily'][] = ['system', 'serif', 'sans-serif', 'monospace'];
      const validThemes: ReaderSettings['theme'][] = ['light', 'dark', 'sepia'];
      const validPaginationModes: PaginationMode[] = ['chapter', 'page'];
      return {
        fontFamily: validFonts.includes(parsed.fontFamily) ? parsed.fontFamily : 'system',
        fontSize: Math.min(32, Math.max(14, Number(parsed.fontSize) || 18)),
        theme: validThemes.includes(parsed.theme) ? parsed.theme : 'light',
        lineHeight: Math.min(2.0, Math.max(1.4, Number(parsed.lineHeight) || 1.6)),
        paragraphSpacing: Math.min(2.0, Math.max(0.8, Number(parsed.paragraphSpacing) || 1.2)),
        paddingTop: Math.min(32, Math.max(8, Number(parsed.paddingTop) || 16)),
        paddingLeft: Math.min(32, Math.max(8, Number(parsed.paddingLeft) || 16)),
        paddingRight: Math.min(32, Math.max(8, Number(parsed.paddingRight) || 16)),
        paddingBottom: Math.min(32, Math.max(8, Number(parsed.paddingBottom) || 16)),
        paginationMode: validPaginationModes.includes(parsed.paginationMode as PaginationMode)
          ? (parsed.paginationMode as PaginationMode)
          : 'chapter',
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_READER_SETTINGS;
}

export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable - silent fail
  }
}