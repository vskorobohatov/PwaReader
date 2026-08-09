import type { Book, ReadingProgress } from './book';
import type { Fb2Content } from './fb2-content';
import type { AppSettings, ReaderSettings } from './settings';

export interface ExportedBook {
  id: string;
  originalFileName: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  content: Fb2Content;
  dateAdded: number;
  lastOpened?: number;
  readingProgress: ReadingProgress;
}

export interface ExportManifest {
  version: number;
  exportedAt: string;
  appVersion: string;
  books: ExportedBook[];
  settings: AppSettings & ReaderSettings;
}

export const EXPORT_VERSION = 1;
export const SUPPORTED_IMPORT_VERSIONS = [1];