import { useState, useCallback } from 'react';
import type { ReaderSettings, AppSettings } from '../types/settings';
import { getReaderSettings as loadReaderSettings, saveReaderSettings as persistReaderSettings } from '../lib/storage/readerSettings';
import { getAppSettings as loadAppSettings, saveAppSettings as persistAppSettings } from '../lib/storage/appSettings';

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(loadReaderSettings);

  const updateSettings = useCallback((updates: Partial<ReaderSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      persistReaderSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      persistAppSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}