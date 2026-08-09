import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import { useHeader } from '../components/ui/Layout';
import Button from '../components/ui/Button';

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.25V2m0 4.25a5 5 0 01-5 5 5 5 0 00-5 5v2a3 3 0 003 3h10a3 3 0 003-3v-2a5 5 0 00-5-5 5 5 0 00-5-5zm0 0V2" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No books yet</h2>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Import an FB2 book to get started</p>
      <Button onClick={() => navigate('/library')}>
        Go to Library
      </Button>
    </div>
  );
}

function ContinueReadingCard({ book }: { book: { id: string; title: string; author: string; coverImage?: string; readingProgress: { percentageCompleted: number } } }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex p-4 gap-4">
        <div className="w-20 h-28 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
          {book.coverImage ? (
            <img src={book.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.25V2m0 4.25a5 5 0 01-5 5 5 5 0 00-5 5v2a3 3 0 003 3h10a3 3 0 003-3v-2a5 5 0 00-5-5 5 5 0 00-5-5zm0 0V2" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{book.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{book.author}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{Math.round(book.readingProgress.percentageCompleted)}% complete</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${book.readingProgress.percentageCompleted}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/book/${book.id}`)}
        className="w-full py-1 px-2 text-blue-600 dark:text-blue-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700"
      >
        Continue Reading
      </button>
    </div>
  );
}

function StatsCard({ books }: { books: Array<{ readingProgress: { percentageCompleted: number; isCompleted: boolean } }> }) {
  const total = books.length;
  const completed = books.filter(b => b.readingProgress.isCompleted).length;
  const reading = books.filter(b => b.readingProgress.percentageCompleted > 0 && !b.readingProgress.isCompleted).length;
  const avgProgress = total > 0
    ? Math.round(books.reduce((sum, b) => sum + b.readingProgress.percentageCompleted, 0) / total)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Reading Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{total}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Books</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completed}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reading}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reading</div>
        </div>
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{avgProgress}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg Progress</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { books, loading } = useBooks();
  const header = useHeader();

  useEffect(() => {
    header.setTitle('Local Book Reader');
    header.setRightContent(null);
  }, [header]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const lastBook = books.length > 0 ? books[0] : null;

  return (
    <div className="space-y-6">
        {lastBook ? (
          <>
            <section>
              <ContinueReadingCard book={lastBook} />
            </section>
            <section>
              <StatsCard books={books} />
            </section>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
  );
}