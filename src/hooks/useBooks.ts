import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types/book';
import { getBooksSortedByRecency, updateBook as dbUpdateBook, deleteBook as dbDeleteBook } from '../lib/db';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBooksSortedByRecency();
      setBooks(data);
      setError(null);
    } catch {
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const updateBook = useCallback(async (book: Book) => {
    await dbUpdateBook(book);
    setBooks(prev => prev.map(b => b.id === book.id ? book : b));
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    await dbDeleteBook(id);
    setBooks(prev => prev.filter(b => b.id !== id));
  }, []);

  return { books, loading, error, refresh: loadBooks, updateBook, deleteBook };
}