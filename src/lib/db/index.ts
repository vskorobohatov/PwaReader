import { openDB, type IDBPDatabase } from 'idb';
import type { Book } from '../../types/book';

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('LocalBookReaderDB', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('books')) {
          const store = database.createObjectStore('books', { keyPath: 'id' });
          store.createIndex('lastOpened', 'lastOpened');
          store.createIndex('dateAdded', 'dateAdded');
        }
      },
    });
  }
  return dbPromise;
}

export async function addBook(book: Book): Promise<void> {
  const db = await getDb();
  await db.put('books', book);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDb();
  return db.get('books', id);
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDb();
  return db.getAll('books');
}

// Sort by lastOpened descending, fallback to dateAdded for books never opened
export async function getBooksSortedByRecency(): Promise<Book[]> {
  const books = await getAllBooks();
  return books.sort((a, b) => {
    const aTime = a.lastOpened ?? a.dateAdded;
    const bTime = b.lastOpened ?? b.dateAdded;
    return bTime - aTime;
  });
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('books', id);
}

export async function updateBook(book: Book): Promise<void> {
  const db = await getDb();
  await db.put('books', book);
}

export async function clearAllBooks(): Promise<void> {
  const db = await getDb();
  await db.clear('books');
}