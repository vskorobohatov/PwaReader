import JSZip from 'jszip';
import type { Book } from '../../types/book';
import type { ExportManifest, ExportedBook } from '../../types/export';
import { EXPORT_VERSION, SUPPORTED_IMPORT_VERSIONS } from '../../types/export';
import { addBook, getAllBooks } from '../db';

export async function exportLibrary(): Promise<{ blob: Blob; filename: string }> {
  const books = await getAllBooks();
  const zip = new JSZip();

  const manifest: ExportManifest = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '0.0.1',
    books: books.map(b => ({
      id: b.id,
      originalFileName: b.originalFileName,
      title: b.title,
      author: b.author,
      description: b.description,
      coverImage: b.coverImage,
      content: b.content,
      dateAdded: b.dateAdded,
      lastOpened: b.lastOpened,
      readingProgress: b.readingProgress,
    })),
    settings: {
      appTheme: 'light',
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
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().slice(0, 10);
  return { blob, filename: `bookreader-backup-${dateStr}.zip` };
}

export async function importLibrary(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file('manifest.json');

    if (!manifestFile) {
      errors.push('Invalid backup file: missing manifest.json');
      return { imported, skipped, errors };
    }

    const manifestText = await manifestFile.async('string');
    let manifest: ExportManifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      errors.push('Invalid backup file: corrupted manifest');
      return { imported, skipped, errors };
    }

    if (!SUPPORTED_IMPORT_VERSIONS.includes(manifest.version)) {
      errors.push(`Unsupported backup version: ${manifest.version}`);
      return { imported, skipped, errors };
    }

    if (!Array.isArray(manifest.books)) {
      errors.push('Invalid backup file: books data missing');
      return { imported, skipped, errors };
    }

    const existingBooks = await getAllBooks();
    const existingIds = new Set(existingBooks.map(b => b.id));

    for (const book of manifest.books) {
      try {
        validateExportedBook(book);

        if (existingIds.has(book.id)) {
          skipped++;
          continue;
        }

        const bookData: Book = {
          id: book.id,
          originalFileName: book.originalFileName,
          title: book.title,
          author: book.author,
          description: book.description,
          coverImage: book.coverImage,
          content: book.content,
          dateAdded: book.dateAdded || Date.now(),
          lastOpened: book.lastOpened,
          readingProgress: book.readingProgress,
        };

        await addBook(bookData);
        existingIds.add(book.id);
        imported++;
      } catch (err) {
        const title = (book as ExportedBook).title ?? 'unknown';
        errors.push(`Skipped "${title}": ${err instanceof Error ? err.message : 'validation failed'}`);
        skipped++;
      }
    }
  } catch (err) {
    errors.push(`Import failed: ${err instanceof Error ? err.message : 'failed to read file'}`);
  }

  return { imported, skipped, errors };
}

function validateExportedBook(book: unknown): asserts book is ExportedBook {
  if (!book || typeof book !== 'object') {
    throw new Error('Invalid book data');
  }

  const b = book as Record<string, unknown>;

  if (typeof b.id !== 'string' || !b.id) {
    throw new Error('Missing book ID');
  }
  if (typeof b.title !== 'string' || !b.title.trim()) {
    throw new Error('Missing book title');
  }
  if (typeof b.author !== 'string') {
    throw new Error('Missing book author');
  }
  if (!b.content || typeof b.content !== 'object') {
    throw new Error('Missing book content');
  }
  if (!Array.isArray((b.content as Record<string, unknown>).chapters)) {
    throw new Error('Missing book chapters');
  }
  if (typeof b.readingProgress !== 'object' || !b.readingProgress) {
    throw new Error('Missing reading progress');
  }

  const p = b.readingProgress as Record<string, unknown>;
  if (typeof p.currentPosition !== 'number') {
    throw new Error('Invalid reading progress: missing currentPosition');
  }
}