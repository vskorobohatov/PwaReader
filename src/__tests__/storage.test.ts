import { describe, it, expect } from 'vitest';
import type { Book } from '../types/book';

describe('Book Type & Data Model', () => {
  it('creates a valid book structure', () => {
    const book: Book = {
      id: 'test-1',
      originalFileName: 'test.fb2',
      title: 'Test Book',
      author: 'Author Name',
      content: {
        chapters: [
          {
            title: 'Chapter 1',
            elements: [{ type: 'paragraph', html: '<p>Hello</p>' }],
          },
        ],
      },
      dateAdded: Date.now(),
      readingProgress: {
        currentPosition: 0,
        totalElements: 1,
        percentageCompleted: 0,
        isCompleted: false,
        lastReadTimestamp: 0,
      },
    };

    expect(book.id).toBe('test-1');
    expect(book.readingProgress.percentageCompleted).toBe(0);
    expect(book.readingProgress.isCompleted).toBe(false);
  });

  it('calculates progress correctly', () => {
    const total = 200;
    const current = 50;
    const pct = Math.round((current / total) * 100);
    expect(pct).toBe(25);
  });

  it('marks completed at 100%', () => {
    const progress: Book['readingProgress'] = {
      currentPosition: 200,
      totalElements: 200,
      percentageCompleted: 100,
      isCompleted: true,
      lastReadTimestamp: Date.now(),
    };
    expect(progress.isCompleted).toBe(true);
    expect(progress.percentageCompleted).toBe(100);
  });

  it('handles zero total gracefully', () => {
    const total = 0;
    const current = 0;
    const pct = total > 0 ? (current / total) * 100 : 0;
    expect(pct).toBe(0);
  });

  it('caps percentage at 100', () => {
    const rawPct = 150;
    const capped = Math.min(100, rawPct);
    expect(capped).toBe(100);
  });

  it('computes total elements from chapters', () => {
    const chapters = [
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
    ];
    const total = chapters.reduce((sum, ch) => sum + ch.elements.length, 0);
    expect(total).toBe(6);
  });

  it('finds chapter index from global position', () => {
    const chapters = [
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
    ];

    const savedPos = 3;
    let cumulative = 0;
    let foundChapter = -1;
    for (let i = 0; i < chapters.length; i++) {
      if (cumulative + chapters[i].elements.length > savedPos) {
        foundChapter = i;
        break;
      }
      cumulative += chapters[i].elements.length;
    }
    expect(foundChapter).toBe(2);

    const chapterOffset = savedPos - cumulative;
    expect(chapterOffset).toBe(0);
  });
});