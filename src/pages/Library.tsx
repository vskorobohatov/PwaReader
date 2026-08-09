import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import { addBook } from '../lib/db';
import { parseFb2, Fb2ParseError } from '../lib/fb2/parser';
import { useHeader } from '../components/ui/Layout';
import Button from '../components/ui/Button';
import type { Book } from '../types/book';

function BookCard({ book, onDelete }: { book: Book; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button onClick={() => navigate(`/book/${book.id}`)} className="w-full text-left">
        <div className="flex p-4 gap-4">
          <div className="w-16 h-24 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
            {book.coverImage ? (
              <img src={book.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.25V2m0 4.25a5 5 0 01-5 5 5 5 0 00-5 5v2a3 3 0 003 3h10a3 3 0 003-3v-2a5 5 0 00-5-5 5 5 0 00-5-5zm0 0V2" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{book.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{book.author}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{Math.round(book.readingProgress.percentageCompleted)}%</span>
                {book.readingProgress.isCompleted && (
                  <span className="text-green-500 font-medium">✓ Done</span>
                )}
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${book.readingProgress.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${book.readingProgress.percentageCompleted}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </button>
      <div className="px-4 pb-3 flex justify-end gap-2">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2 py-1 rounded transition-colors">
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Delete?</span>
            <button onClick={() => { onDelete(book.id); setShowDeleteConfirm(false); }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors">Yes</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-3 py-1 rounded transition-colors">No</button>
          </div>
        )}
      </div>
    </div>
  );
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };
  return { message, show };
}

export default function Library() {
  const { books, loading, deleteBook } = useBooks();
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { message: toast, show: showToast } = useToast();
  const header = useHeader();

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  useEffect(() => {
    header.setTitle('Library');
    header.setRightContent(<Button onClick={handleImportClick}>Import Book</Button>);
  }, [header, handleImportClick]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = parseFb2(text);

      const totalElements = result.content.chapters.reduce((sum, ch) => sum + ch.elements.length, 0);

      const book: Book = {
        id: crypto.randomUUID(),
        originalFileName: file.name,
        title: result.metadata.title,
        author: result.metadata.author,
        description: result.metadata.description,
        coverImage: result.metadata.coverImage,
        content: result.content,
        dateAdded: Date.now(),
        lastOpened: undefined,
        readingProgress: {
          currentPosition: 0,
          totalElements,
          percentageCompleted: 0,
          isCompleted: false,
          lastReadTimestamp: 0,
        },
      };

      await addBook(book);
      showToast(`Imported "${book.title}"`);
    } catch (err) {
      if (err instanceof Fb2ParseError) {
        showToast(`Import failed: ${err.message}`);
      } else {
        showToast('Failed to import book');
      }
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input ref={importInputRef} type="file" accept=".fb2" onChange={handleFileSelect} className="hidden" />

      {importing && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Importing...</span>
        </div>
      )}

      {!importing && loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && !importing && books.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.25V2m0 4.25a5 5 0 01-5 5 5 5 0 00-5 5v2a3 3 0 003 3h10a3 3 0 003-3v-2a5 5 0 00-5-5 5 5 0 00-5-5zm0 0V2" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Your library is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Import FB2 books or restore from a backup</p>
          <Button onClick={() => importInputRef.current?.click()}>Import First Book</Button>
        </div>
      )}

      {!loading && !importing && books.length > 0 && (
        <div className="space-y-3">
          {books.map(book => (
            <BookCard key={book.id} book={book} onDelete={deleteBook} />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
    </>
  );
}