export type PaginationMode = 'chapter' | 'page';

export interface ReaderSettings {
  fontFamily: 'system' | 'serif' | 'sans-serif' | 'monospace';
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  lineHeight: number;
  paragraphSpacing: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  paddingBottom: number;
  paginationMode: PaginationMode;
}

export interface AppSettings {
  appTheme: 'light' | 'dark';
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontFamily: 'system',
  fontSize: 18,
  theme: 'light',
  lineHeight: 1.6,
  paragraphSpacing: 1.2,
  paddingTop: 16,
  paddingLeft: 16,
  paddingRight: 16,
  paddingBottom: 16,
  paginationMode: 'chapter',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appTheme: 'light',
};
