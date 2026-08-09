import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { getBook, updateBook } from '../lib/db';
import { useReaderSettings } from '../hooks/useSettings';
import type { ContentElement, Chapter } from '../types/fb2-content';
import type { PaginationMode } from '../types/settings';
import { getFontFamily } from '../App';

function ReaderContent({ elements }: { elements: ContentElement[] }) {
  return (
    <>
      {elements.map((el, i) => {
        if (el.type === 'paragraph') {
          return <div key={i} className="reader-paragraph" dangerouslySetInnerHTML={{ __html: el.html }} />;
        }
        if (el.type === 'emptyLine') {
          return <br key={i} />;
        }
        if (el.type === 'poem') {
          return (
            <div key={i} className="reader-poem">
              {el.title && <div className="reader-poem-title">{el.title}</div>}
              {el.stanzas.map((stanza, si) => (
                <div key={si} className="mb-4">
                  {stanza.lines.map((line, li) => (
                    <div key={li} dangerouslySetInnerHTML={{ __html: line }} />
                  ))}
                </div>
              ))}
            </div>
          );
        }
        if (el.type === 'epigraph') {
          return <div key={i} className="reader-epigraph" dangerouslySetInnerHTML={{ __html: el.html }} />;
        }
        if (el.type === 'image') {
          return <img key={i} src={el.src} alt={el.alt || ''} className="reader-image" />;
        }
        return null;
      })}
    </>
  );
}

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { settings: rs, updateSettings } = useReaderSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Pagination state
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      try {
        setLoading(true);
        const book = await getBook(bookId);
        if (!book) { setError('Book not found'); return; }
        setBookTitle(book.title);
        setChapters(book.content.chapters);
        // Restore last chapter index if available
        if (book.readingProgress?.lastChapterIndex !== undefined) {
          setCurrentChapterIndex(book.readingProgress.lastChapterIndex);
        }
        await updateBook({ ...book, lastOpened: Date.now() });
      } catch { setError('Failed to load book'); }
      finally { setLoading(false); }
    })();
  }, [bookId]);

  // Calculate total pages when content or container changes (page mode only)
  const calculateTotalPages = useCallback(() => {
    const container = contentRef.current;
    if (!container || rs.paginationMode !== 'page') return;

    const viewportHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    const pages = Math.ceil(scrollHeight / viewportHeight);
    setTotalPages(Math.max(1, pages));
  }, [rs.paginationMode, chapters]);

  // Recalculate pages on resize
  useEffect(() => {
    if (rs.paginationMode !== 'page') return;
    calculateTotalPages();

    const handleResize = () => {
      calculateTotalPages();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rs.paginationMode, chapters, calculateTotalPages]);

  // Reset page when chapter changes in page mode
  useEffect(() => {
    if (rs.paginationMode === 'page') {
      setCurrentPage(0);
    }
  }, [currentChapterIndex, rs.paginationMode]);

  const saveProgress = useCallback(async (position: number, percent: number, chapterIdx?: number) => {
    if (!bookId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const book = await getBook(bookId!);
        if (!book) return;
        await updateBook({
          ...book,
          readingProgress: {
            ...book.readingProgress,
            currentPosition: position,
            percentageCompleted: Math.min(100, percent),
            isCompleted: percent >= 100,
            lastReadTimestamp: Date.now(),
            lastChapterIndex: chapterIdx !== undefined ? chapterIdx : book.readingProgress?.lastChapterIndex,
          },
        });
      } catch { /* silent */ }
    }, 1000);
  }, [bookId]);

  const totalElements = useMemo(() => chapters.reduce((s, ch) => s + ch.elements.length, 0), [chapters]);

  // Scroll to current page when page changes (page mode)
  useEffect(() => {
    if (rs.paginationMode !== 'page') return;
    const container = contentRef.current;
    if (!container) return;

    const targetScroll = currentPage * container.clientHeight;
    container.scrollTop = targetScroll;
  }, [currentPage, rs.paginationMode]);

  // Save progress on page change (page mode)
  useEffect(() => {
    if (rs.paginationMode !== 'page') return;
    if (totalPages === 0) return;
    const percent = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 100;
    saveProgress(currentPage, Math.min(100, percent), currentChapterIndex);
  }, [currentPage, totalPages, rs.paginationMode, saveProgress, currentChapterIndex]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rs.paginationMode !== 'page') return;
    if (totalPages === 0) return;

    const el = e.currentTarget;
    const viewportHeight = el.clientHeight;
    const currentPageNum = Math.round(el.scrollTop / viewportHeight);

    if (currentPageNum !== currentPage && currentPageNum >= 0 && currentPageNum < totalPages) {
      setCurrentPage(currentPageNum);
    }

    const scrollPercent = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    saveProgress(Math.floor(scrollPercent * totalElements), scrollPercent * 100, currentChapterIndex);
  }, [totalElements, saveProgress, rs.paginationMode, currentPage, totalPages, currentChapterIndex]);

  // Toggle UI visibility on center click
  const handleCenterClick = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  // Handle tap zones for page navigation
  const handleTapLeft = useCallback(() => {
    if (rs.paginationMode === 'page' && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [rs.paginationMode, currentPage]);

  const handleTapRight = useCallback(() => {
    if (rs.paginationMode === 'page' && currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  }, [rs.paginationMode, currentPage, totalPages]);

  // Handle click on content area to determine tap zone
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    const leftZone = width * 0.25;
    const rightZone = width * 0.75;

    if (x < leftZone) {
      handleTapLeft();
    } else if (x > rightZone) {
      handleTapRight();
    } else {
      handleCenterClick();
    }
  }, [handleTapLeft, handleTapRight, handleCenterClick]);

  // Chapter navigation
  const goToPreviousChapter = useCallback(() => {
    setCurrentChapterIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextChapter = useCallback(() => {
    setCurrentChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));
  }, [chapters.length]);

  if (loading) {
    return <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  if (error || chapters.length === 0) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'No content'}</p>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </div>
    );
  }

  const themeNames: Record<string, string> = { light: '☀️ Light', dark: '🌙 Dark', sepia: '📜 Sepia' };
  const fontNames: Record<string, string> = { system: 'System', serif: 'Serif', 'sans-serif': 'Sans-serif', monospace: 'Mono' };

  const NumberInput = ({ label, value, min, max, step, onChange, unit = '' }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
    unit?: string;
  }) => (
    <div>
      <label className="text-xs font-medium mb-1.5 block opacity-70">{label}: {value}{unit}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const val = Number(e.target.value);
          if (!isNaN(val)) onChange(Math.min(max, Math.max(min, val)));
        }}
        className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );

  const currentChapter = chapters[currentChapterIndex];

  // Compute dynamic padding for content area based on visible UI overlays
  const headerHeight = showSettings ? 120 : 56;
  const bottomBarHeight = rs.paginationMode === 'chapter' && uiVisible ? 72 : (rs.paginationMode === 'page' && uiVisible ? 48 : 4);

  return (
    <div className="h-screen relative reader-content overflow-hidden" data-theme={rs.theme}>
      {/* Header - absolute overlay */}
      <header
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 border-b transition-all duration-300 ${
          uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        style={{ borderColor: 'var(--reader-border)', backgroundColor: 'var(--reader-bg)' }}
      >
        <button onClick={() => navigate(-1)} className="py-1 px-2 hover:opacity-70" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-sm font-medium flex-1 mx-4 truncate text-center">{bookTitle}</h1>
        <div className="flex gap-1">
          <button onClick={() => setShowToc(true)} className="py-1 px-2 hover:opacity-70" aria-label="TOC">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="py-1 px-2 hover:opacity-70" aria-label="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </header>

      {/* Settings Panel - absolute overlay below header */}
      {showSettings && (
        <div className="absolute top-[56px] left-0 right-0 z-20 px-4 py-3 border-b space-y-3 transition-all duration-300" style={{ borderColor: 'var(--reader-border)', backgroundColor: 'var(--reader-bg)' }}>
          {/* Theme */}
          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as const).map(t => (
                <button key={t} onClick={() => updateSettings({ theme: t })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${rs.theme === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{themeNames[t]}</button>
              ))}
            </div>
          </div>
          {/* Font */}
          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Font</label>
            <div className="flex gap-2">
              {(['system', 'serif', 'sans-serif', 'monospace'] as const).map(f => (
                <button key={f} onClick={() => updateSettings({ fontFamily: f })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${rs.fontFamily === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{fontNames[f]}</button>
              ))}
            </div>
          </div>
          {/* Pagination Mode */}
          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Pagination</label>
            <div className="flex gap-2">
              {(['chapter', 'page'] as PaginationMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => updateSettings({ paginationMode: m })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    rs.paginationMode === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {m === 'chapter' ? '📖 Chapter' : '📄 Page'}
                </button>
              ))}
            </div>
          </div>
          {/* Font Size */}
          <NumberInput label="Size" value={rs.fontSize} min={14} max={32} step={1} unit="px" onChange={v => updateSettings({ fontSize: v })} />
          {/* Line Height */}
          <NumberInput label="Line Height" value={rs.lineHeight} min={1.4} max={2} step={0.1} onChange={v => updateSettings({ lineHeight: v })} />
          {/* Padding Top */}
          <NumberInput label="Padding Top" value={rs.paddingTop} min={8} max={32} step={2} unit="px" onChange={v => updateSettings({ paddingTop: v })} />
          {/* Padding Left */}
          <NumberInput label="Padding Left" value={rs.paddingLeft} min={8} max={32} step={2} unit="px" onChange={v => updateSettings({ paddingLeft: v })} />
          {/* Padding Right */}
          <NumberInput label="Padding Right" value={rs.paddingRight} min={8} max={32} step={2} unit="px" onChange={v => updateSettings({ paddingRight: v })} />
          {/* Padding Bottom */}
          <NumberInput label="Padding Bottom" value={rs.paddingBottom} min={8} max={32} step={2} unit="px" onChange={v => updateSettings({ paddingBottom: v })} />
        </div>
      )}

      {/* Table of Contents Modal */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowToc(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Table of Contents</h2>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-4rem)] p-2">
              {chapters.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentChapterIndex(i); setShowToc(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${
                    i === currentChapterIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {ch.title || `Chapter ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reader Content - fills full viewport with dynamic padding */}
      <div
        ref={contentRef}
        onScroll={onScroll}
        onClick={handleContentClick}
        className={`absolute inset-0 overflow-y-auto ${rs.paginationMode === 'page' ? 'cursor-pointer' : ''}`}
        style={{
          fontFamily: getFontFamily(rs.fontFamily),
          fontSize: `${rs.fontSize}px`,
          lineHeight: rs.lineHeight,
        }}
      >
        <div className="max-w-2xl mx-auto" style={{
          paddingLeft: `${rs.paddingLeft}px`,
          paddingRight: `${rs.paddingRight}px`,
          paddingTop: `${Math.max(rs.paddingTop, headerHeight)}px`,
          paddingBottom: `${Math.max(rs.paddingBottom, bottomBarHeight)}px`,
        }}>
          {rs.paginationMode === 'chapter' ? (
            /* Chapter Mode - render single chapter */
            <>
              {currentChapter && (
                <div>
                  {currentChapter.title && (
                    <h2 className="text-xl font-bold mb-4 mt-6">{currentChapter.title}</h2>
                  )}
                  <ReaderContent elements={currentChapter.elements} />
                </div>
              )}
            </>
          ) : (
            /* Page Mode - render all chapters for pagination calculation */
            <>
              {chapters.map((chapter, ci) => (
                <div key={ci} className="mb-8">
                  {chapter.title && <h2 className="text-xl font-bold mb-4 mt-6">{chapter.title}</h2>}
                  <ReaderContent elements={chapter.elements} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chapter Navigation Buttons (Chapter Mode) - absolute overlay */}
      {rs.paginationMode === 'chapter' && (
        <div
          className={`absolute bottom-[4px] left-0 right-0 z-20 flex items-center justify-between px-4 py-3 border-t transition-all duration-300 ${
            uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
          }`}
          style={{ borderColor: 'var(--reader-border)', backgroundColor: 'var(--reader-bg)' }}
          onClick={e => e.stopPropagation()}
        >
          <Button
            onClick={goToPreviousChapter}
            disabled={currentChapterIndex === 0}
            variant="outline"
          >
            ← Prev
          </Button>
          <span className="text-xs opacity-60">
            {currentChapterIndex + 1} / {chapters.length}
          </span>
          <Button
            onClick={goToNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            variant="outline"
          >
            Next →
          </Button>
        </div>
      )}

      {/* Page Indicator (Page Mode) - absolute overlay */}
      {rs.paginationMode === 'page' && (
        <div
          className={`absolute bottom-[4px] left-0 right-0 z-20 flex items-center justify-center py-2 border-t transition-all duration-300 ${
            uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
          }`}
          style={{ borderColor: 'var(--reader-border)', backgroundColor: 'var(--reader-bg)' }}
        >
          <span className="text-xs opacity-60">
            Page {currentPage + 1} / {totalPages}
          </span>
        </div>
      )}

      {/* Progress Bar - absolute overlay at bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 h-1 transition-opacity duration-300 ${
          uiVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {rs.paginationMode === 'chapter' ? (
          <div className="h-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${currentChapter ? (currentChapterIndex / Math.max(1, chapters.length - 1)) * 100 : 0}%`
              }}
            />
          </div>
        ) : (
          <div className="h-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { ReaderContent };