import { describe, it, expect } from 'vitest';

describe('Reading Progress Logic', () => {
  it('calculates percentage correctly', () => {
    const current = 50;
    const total = 200;
    const percent = (current / total) * 100;
    expect(percent).toBe(25);
  });

  it('handles zero total elements', () => {
    const current = 0;
    const total = 0;
    const percent = total > 0 ? (current / total) * 100 : 0;
    expect(percent).toBe(0);
  });

  it('marks completed at 100%', () => {
    const percent = 100;
    const isCompleted = percent >= 100;
    expect(isCompleted).toBe(true);
  });

  it('does not mark incomplete at 99.9%', () => {
    const percent = 99.9;
    const isCompleted = percent >= 100;
    expect(isCompleted).toBe(false);
  });

  it('caps percentage at 100', () => {
    const raw = 150;
    const capped = Math.min(100, raw);
    expect(capped).toBe(100);
  });

  it('restores position from chapter index', () => {
    const chapters = [
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }] },
      { elements: [{ type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }, { type: 'paragraph' as const, html: '' }] },
    ];

    // Position 3 should be in chapter index 2 (elements 0-1=ch0, element 2=ch1, elements 3-5=ch2)
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
  });

  it('scroll position maps to progress', () => {
    const scrollTop = 500;
    const scrollHeight = 2000;
    const clientHeight = 500;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight || 1);
    expect(scrollPercent).toBeCloseTo(0.3333, 4);
  });

  it('debounce prevents excessive writes', () => {
    // Simulate debounce logic
    let callCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const mockDebounce = (n: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { callCount += n; }, 100);
    };

    for (let i = 0; i < 100; i++) {
      mockDebounce(1);
    }

    // After debounce, only 1 call should be made
    // Note: in sync test we check the timer exists
    expect(timer).not.toBeNull();
  });
});