import type { Fb2Content } from './fb2-content';

export interface ReadingProgress {
  currentPosition: number;
  totalElements: number;
  percentageCompleted: number;
  lastReadTimestamp: number;
  isCompleted: boolean;
  lastChapterIndex?: number;
  currentPage?: number;
}

export interface Book {
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