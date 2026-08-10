import type { ContentElement, Chapter } from '../../types/fb2-content';
import type { ReaderSettings } from '../../types/settings';
import { getFontFamily } from '../../App';

/**
 * Represents a single page of content in page mode.
 * Each page contains a slice of elements from a specific chapter.
 */
export interface PageInfo {
  chapterIndex: number;
  chapterTitle?: string;
  elements: ContentElement[];
}

/**
 * Options for computePages
 */
interface ComputePagesOptions {
  chapters: Chapter[];
  settings: ReaderSettings;
  container: HTMLDivElement;
  onPagesReady: (pages: PageInfo[], totalPages: number) => void;
}

function getMeasureContainer(settings: ReaderSettings): HTMLDivElement {
  const fontFamily = getFontFamily(settings.fontFamily);
  let measContainer = document.getElementById('__reader-measure-container__') as HTMLDivElement | null;

  if (!measContainer) {
    measContainer = document.createElement('div');
    measContainer.id = '__reader-measure-container__';
    // Add reader-content class so CSS selectors like .reader-content .reader-paragraph match during measurement
    measContainer.className = 'reader-content';
    measContainer.setAttribute('data-theme', settings.theme || 'light');
    measContainer.style.cssText = `
      position: fixed;
      visibility: hidden;
      pointer-events: none;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      padding-left: ${settings.paddingLeft}px;
      padding-right: ${settings.paddingRight}px;
      font-family: ${fontFamily};
      width: min(100vw, 42rem);
      overflow: hidden;
      height: 0;
    `;
    document.body.appendChild(measContainer);
  } else {
    measContainer.style.fontSize = `${settings.fontSize}px`;
    measContainer.style.lineHeight = `${settings.lineHeight}`;
    measContainer.style.fontFamily = fontFamily;
  }

  return measContainer;
}

function measureElement(
  el: ContentElement,
  measContainer: HTMLDivElement,
  settings: ReaderSettings,
  paragraphMargin: number
): number {
  const div = document.createElement('div');
  measContainer.appendChild(div);

  if (el.type === 'paragraph') {
    div.className = 'reader-paragraph';
    div.style.marginBottom = `${paragraphMargin}px`;
    div.innerHTML = el.html;
  } else if (el.type === 'emptyLine') {
    div.innerHTML = '<br />';
  } else if (el.type === 'poem') {
    div.className = 'reader-poem';
    let poemHtml = '';
    if (el.title) {
      poemHtml += `<div class="reader-poem-title">${el.title}</div>`;
    }
    el.stanzas.forEach((stanza) => {
      poemHtml += '<div style="margin-bottom:1rem;">';
      stanza.lines.forEach((line) => {
        poemHtml += `<div>${line}</div>`;
      });
      poemHtml += '</div>';
    });
    div.innerHTML = poemHtml;
  } else if (el.type === 'epigraph') {
    div.className = 'reader-epigraph';
    div.innerHTML = el.html;
    div.style.marginBottom = `${paragraphMargin * 1.5}px`;
  } else if (el.type === 'image') {
    const img = document.createElement('img');
    img.src = el.src;
    img.alt = el.alt || '';
    img.style.maxWidth = '100%';
    img.style.display = 'block';
    img.style.margin = '1em auto';
    div.appendChild(img);
    return settings.fontSize * 3;
  } else if (el.type === 'subtitle') {
    div.className = 'reader-subtitle';
    div.innerHTML = el.html;
  }

  const h = div.offsetHeight;
  if (div.parentNode) div.parentNode.removeChild(div);
  return h;
}

/**
 * Measures the height of a paragraph with given HTML content using the measurement container.
 */
function measureParagraphHeight(
  html: string,
  measContainer: HTMLDivElement,
  paragraphMargin: number
): number {
  const div = document.createElement('div');
  div.className = 'reader-paragraph';
  div.style.marginBottom = `${paragraphMargin}px`;
  div.innerHTML = html;
  measContainer.appendChild(div);
  const h = div.offsetHeight;
  if (div.parentNode) div.parentNode.removeChild(div);
  return h;
}

/**
 * Tokenizes paragraph HTML into a sequence of text words and inline tag strings.
 * This preserves inline formatting like <b>, <i>, <t>, etc.
 * 
 * Returns an array of tokens where each token is either:
 * - { type: 'text', value: string } — a single word (no whitespace)
 * - { type: 'tag', value: string } — an HTML tag (opening, closing, or self-closing)
 * - { type: 'space', value: string } — whitespace between words
 */
interface Token {
  type: 'text' | 'tag' | 'space';
  value: string;
}

function tokenizeParagraph(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = html.length;

  while (i < len) {
    // Match HTML tags (opening, closing, self-closing)
    if (html[i] === '<') {
      const j = html.indexOf('>', i);
      if (j === -1) {
        // Malformed — treat rest as text
        tokens.push({ type: 'text', value: html.substring(i) });
        break;
      } else {
        tokens.push({ type: 'tag', value: html.substring(i, j + 1) });
        i = j + 1;
      }
    } else {
      // Collect text/whitespace
      let start = i;
      while (i < len && html[i] !== '<') {
        i++;
      }
      const textSegment = html.substring(start, i);
      
      // Split text segment into words and spaces
      let wordStart = 0;
      for (let k = 0; k < textSegment.length; k++) {
        const ch = textSegment[k];
        if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\u00A0') {
          // Push any accumulated word first
          if (k > wordStart) {
            tokens.push({ type: 'text', value: textSegment.substring(wordStart, k) });
          }
          tokens.push({ type: 'space', value: ch });
          wordStart = k + 1;
        }
      }
      // Push remaining word
      if (wordStart < textSegment.length) {
        tokens.push({ type: 'text', value: textSegment.substring(wordStart) });
      }
    }
  }

  return tokens;
}

/**
 * Rebuilds HTML from a subset of tokens (from index `start` to `end`).
 */
function rebuildHtmlFromTokens(tokens: Token[], start: number, end: number): string {
  let html = '';
  for (let i = start; i < end && i < tokens.length; i++) {
    html += tokens[i].value;
  }
  return html;
}

/**
 * Counts the number of text words in a token array.
 */
function countTextTokens(tokens: Token[]): number {
  let count = 0;
  for (const t of tokens) {
    if (t.type === 'text') count++;
  }
  return count;
}

/**
 * Splits paragraph HTML at a word boundary so that the first part fits in `maxHeight`.
 * Uses binary search on text-word count to find the best split point.
 * 
 * Returns { firstHtml, remainderHtml } or null if even a single word doesn't fit.
 */
function splitParagraphByHeight(
  html: string,
  maxHeight: number,
  measContainer: HTMLDivElement,
  paragraphMargin: number
): { firstHtml: string; remainderHtml: string } | null {
  const tokens = tokenizeParagraph(html);
  const textWordCount = countTextTokens(tokens);

  if (textWordCount === 0) return null;

  // First check: does the full paragraph already fit?
  const fullHeight = measureParagraphHeight(html, measContainer, paragraphMargin);
  if (fullHeight <= maxHeight) return null;

  // Binary search: find how many text words fit in maxHeight
  let lo = 1;
  let hi = textWordCount;
  let bestFitWords = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    // Rebuild HTML with exactly `mid` text words (preserving tags and spaces around them)
    let textWordIndex = 0;
    let truncatedHtml = '';
    for (const token of tokens) {
      if (token.type === 'text') {
        if (textWordIndex < mid) {
          truncatedHtml += token.value;
          textWordIndex++;
        } else {
          // Stop here
          break;
        }
      } else {
        // Include tags and spaces up to this point
        truncatedHtml += token.value;
      }
    }

    // Trim trailing whitespace for cleaner breaks
    truncatedHtml = truncatedHtml.replace(/[\s\u00A0]+$/, '');

    const h = measureParagraphHeight(truncatedHtml, measContainer, paragraphMargin);

    if (h <= maxHeight) {
      bestFitWords = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (bestFitWords === 0) return null;

  // Now rebuild first and remainder HTML using bestFitWords
  let textWordIndex = 0;
  const splitTokenIndex: number = (() => {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'text') {
        if (textWordIndex < bestFitWords) {
          textWordIndex++;
        } else {
          return i;
        }
      }
    }
    return tokens.length;
  })();

  const firstHtml = rebuildHtmlFromTokens(tokens, 0, splitTokenIndex).replace(/[\s\u00A0]+$/, '');
  const remainderHtml = rebuildHtmlFromTokens(tokens, splitTokenIndex, tokens.length).replace(/^[\s\u00A0]+/, '');

  if (firstHtml.trim().length === 0 || remainderHtml.trim().length === 0) return null;

  return { firstHtml, remainderHtml };
}

function splitElementsIntoPages(
  elements: ContentElement[],
  measContainer: HTMLDivElement,
  settings: ReaderSettings,
  paragraphMargin: number,
  availHeight: number,
  startChapterIdx: number,
  chapterTitle?: string
): PageInfo[] {
  const result: PageInfo[] = [];
  let current: ContentElement[] = [];
  let height = 0;

  // Use indexed loop so we can re-process the same element after flushing a full page
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const h = measureElement(element, measContainer, settings, paragraphMargin);

    // If current page is already full (height >= availHeight), flush it and re-process this element
    if (current.length > 0 && height >= availHeight) {
      result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });
      current = [];
      height = 0;
    }

    if (current.length > 0 && height + h > availHeight) {
      // Current page is full. Try to split a paragraph if the element is too tall.
      if (
        element.type === 'paragraph' &&
        h > availHeight &&
        current.length === 1 &&
        current[0].type !== 'paragraph'
      ) {
        // The overflowing element is taller than a full page, but current page has a non-paragraph.
        // Flush current page and handle the paragraph on its own.
        result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });
        current = [];
        height = 0;

        // Now split this tall paragraph across pages
        const remainingParagraphs: string[] = [element.html];
        let idx = 0;
        while (idx < remainingParagraphs.length) {
          const htmlStr = remainingParagraphs[idx++];

          const elH = measureParagraphHeight(htmlStr, measContainer, paragraphMargin);
          if (elH <= availHeight) {
            // Fits on a full empty page
            result.push({
              chapterIndex: startChapterIdx,
              chapterTitle,
              elements: [{ type: 'paragraph', html: htmlStr }] as ContentElement[],
            });
            continue;
          }

          const remainingHeight = availHeight; // page is empty
          const split = splitParagraphByHeight(htmlStr, remainingHeight, measContainer, paragraphMargin);

          if (split) {
            // Push first part as a new page
            result.push({
              chapterIndex: startChapterIdx,
              chapterTitle,
              elements: [{ type: 'paragraph', html: split.firstHtml }],
            });
            // Prepend remainder for further processing
            remainingParagraphs.splice(0, 0, split.remainderHtml);
          } else {
            // Even one word doesn't fit — force it onto a page anyway to avoid infinite loop
            result.push({
              chapterIndex: startChapterIdx,
              chapterTitle,
              elements: [{ type: 'paragraph', html: htmlStr }],
            });
          }
        }

        current = [];
        height = 0;
        continue;
      }

      // Standard case: element doesn't fit, flush current page
      // But if it's a paragraph, try to split it
      if (element.type === 'paragraph') {
        const remainingHeight = availHeight - height;
        const split = splitParagraphByHeight(element.html, remainingHeight, measContainer, paragraphMargin);

        if (split) {
          // Push what fits onto current page
          const firstPart: ContentElement = { type: 'paragraph', html: split.firstHtml };
          current.push(firstPart);
          height += measureParagraphHeight(split.firstHtml, measContainer, paragraphMargin);

          // Flush the page
          result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });

          // Start new page with remainder
          const remainderPart: ContentElement = { type: 'paragraph', html: split.remainderHtml };
          current = [remainderPart];
          height = measureParagraphHeight(split.remainderHtml, measContainer, paragraphMargin);
        } else {
          // Nothing fits from this paragraph on current page — flush and start fresh
          result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });
          current = [element];
          height = h;
        }
      } else {
        // Non-paragraph (image, poem, etc.) — cannot split, move to next page
        result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });
        current = [element];
        height = h;
      }
    } else {
      current.push(element);
      height += h;
    }
  }

  if (current.length > 0) {
    result.push({ chapterIndex: startChapterIdx, chapterTitle, elements: current });
  }

  return result;
}

/**
 * Computes pagination for a book by measuring each content element's height
 * and splitting chapters into pages that fit the viewport.
 * Paragraphs that don't fit are split at word boundaries using binary search.
 */
export function computePages({ chapters, settings, container, onPagesReady }: ComputePagesOptions) {
  if (settings.paginationMode !== 'page') return;

  const headerHeight = 56;
  const bottomBarHeight = 48 + 4; // page indicator + progress bar
  const paddingTopVal = Math.max(settings.paddingTop, headerHeight);
  const paddingBottomVal = Math.max(settings.paddingBottom, bottomBarHeight);

  const viewportHeight = container.clientHeight - paddingTopVal - paddingBottomVal;

  const allPages: PageInfo[] = [];
  // Paragraph margin-bottom is now fixed at 4px (matches CSS)
  const paragraphMargin = 4;

  const measContainer = getMeasureContainer(settings);

  // Process each chapter
  for (let ci = 0; ci < chapters.length; ci++) {
    const chapter = chapters[ci];
    const pagesForChapter = splitElementsIntoPages(
      chapter.elements,
      measContainer,
      settings,
      paragraphMargin,
      viewportHeight,
      ci,
      chapter.title || `Chapter ${ci + 1}`
    );

    allPages.push(...pagesForChapter);
  }

  onPagesReady(allPages, allPages.length);
}
