import type { Fb2Content, Chapter, ContentElement, PoemStanza } from '../../types/fb2-content';

const FB2_NS = 'http://www.gribuser.ru/xml/fictionbook/2.0';

export interface Fb2Metadata {
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
}

export interface Fb2ImportResult {
  metadata: Fb2Metadata;
  content: Fb2Content;
}

export class Fb2ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Fb2ParseError';
  }
}

function isValidFb2(doc: XMLDocument): boolean {
  const root = doc.documentElement;
  return root.tagName === 'FictionBook' || root.namespaceURI === FB2_NS;
}

function sanitizeInlineHtml(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

function getElementText(node: Node): string {
  const parts: string[] = [];
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(child.textContent ?? '');
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      parts.push(getElementText(child));
    }
  }
  return parts.join('');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&', '<': '<', '>': '>', '"': '"' };
  return text.replace(/[&<>"']/g, c => map[c] ?? c);
}

function elementToHtml(node: Node): string {
  const parts: string[] = [];

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(escapeHtml(child.textContent ?? ''));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      const childrenHtml = Array.from(el.childNodes).map(c => elementToHtml(c)).join('');

      switch (tag) {
        case 'strong':
        case 'b':
          parts.push(`<strong>${childrenHtml}</strong>`);
          break;
        case 'emphasis':
        case 'i':
          parts.push(`<em>${childrenHtml}</em>`);
          break;
        case 'strikethrough':
        case 's':
          parts.push(`<del>${childrenHtml}</del>`);
          break;
        case 'sub':
          parts.push(`<sub>${childrenHtml}</sub>`);
          break;
        case 'super':
          parts.push(`<sup>${childrenHtml}</sup>`);
          break;
        case 'code':
          parts.push(`<code>${childrenHtml}</code>`);
          break;
        case 'a': {
          const href = el.getAttribute('href');
          parts.push(href ? `<a href="${escapeHtml(href)}">${childrenHtml}</a>` : childrenHtml);
          break;
        }
        case 'image': {
          const ref = el.getAttribute('l:href') ?? el.getAttribute('xlink:href');
          if (ref) {
            parts.push(`<img data-fb2-image="${ref.replace('#', '')}" alt="" />`);
          } else {
            parts.push(childrenHtml);
          }
          break;
        }
        default:
          parts.push(childrenHtml);
      }
    }
  }

  return parts.join('');
}

function extractBinaryData(doc: XMLDocument): Map<string, string> {
  const map = new Map<string, string>();
  const binaryElements = doc.getElementsByTagNameNS(FB2_NS, 'binary') ?? doc.getElementsByTagName('binary');
  for (let i = 0; i < binaryElements.length; i++) {
    const el = binaryElements[i];
    const id = el.getAttribute('id');
    const data = getElementText(el).trim();
    if (id && data) {
      map.set(id, data);
    }
  }
  return map;
}

function getImageDataUrl(imageEl: Element, binaryMap: Map<string, string>): string | undefined {
  const ref = imageEl.getAttribute('l:href') ?? imageEl.getAttribute('xlink:href');
  if (!ref) return undefined;
  const id = ref.replace('#', '');
  const binaryData = binaryMap.get(id);
  if (!binaryData) return undefined;
  const contentType = imageEl.getAttribute('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${binaryData}`;
}

function extractMetadata(doc: XMLDocument): Fb2Metadata {
  const description = doc.getElementsByTagNameNS(FB2_NS, 'description')?.[0]
    ?? doc.getElementsByTagName('description')[0];

  if (!description) {
    throw new Fb2ParseError('Invalid FB2: missing description element');
  }

  const titleElem = description.getElementsByTagNameNS(FB2_NS, 'book-title')?.[0]
    ?? description.getElementsByTagName('book-title')[0];
  let title = titleElem ? getElementText(titleElem).trim() : '';

  if (!title) {
    const titleInfo = description.getElementsByTagNameNS(FB2_NS, 'title-info')?.[0]
      ?? description.getElementsByTagName('title-info')[0];
    if (titleInfo) {
      const firstChild = Array.from(titleInfo.childNodes).find(
        n => n.nodeType === Node.ELEMENT_NODE,
      ) as Element | undefined;
      if (firstChild) {
        const text = getElementText(firstChild).trim();
        if (text) title = text;
      }
    }
  }

  const authorElems = description.getElementsByTagNameNS(FB2_NS, 'author') ?? description.getElementsByTagName('author');
  const authors: string[] = [];
  for (let i = 0; i < authorElems.length; i++) {
    const author = authorElems[i];
    const firstName = getElementText(
      author.getElementsByTagNameNS(FB2_NS, 'first-name')[0] ?? author.getElementsByTagName('first-name')[0],
    ).trim();
    const lastName = getElementText(
      author.getElementsByTagNameNS(FB2_NS, 'last-name')[0] ?? author.getElementsByTagName('last-name')[0],
    ).trim();
    const name = [firstName, lastName].filter(Boolean).join(' ');
    if (name) authors.push(name);
  }
  const author = authors.length ? authors.join(', ') : 'Unknown Author';

  let descriptionText: string | undefined;
  const annotation = description.getElementsByTagNameNS(FB2_NS, 'annotation')?.[0]
    ?? description.getElementsByTagName('annotation')[0];
  if (annotation) {
    const abstract = annotation.getElementsByTagNameNS(FB2_NS, 'abstract')?.[0]
      ?? annotation.getElementsByTagName('abstract')[0];
    if (abstract) {
      const para = abstract.getElementsByTagNameNS(FB2_NS, 'p')?.[0] ?? abstract.getElementsByTagName('p')[0];
      if (para) descriptionText = getElementText(para).trim() || undefined;
    }
  }

  // Cover image extraction
  let coverImage: string | undefined;
  const binaryMap = extractBinaryData(doc);
  const titleInfo = description.getElementsByTagNameNS(FB2_NS, 'title-info')?.[0]
    ?? description.getElementsByTagName('title-info')[0];
  if (titleInfo) {
    const imageGallery = titleInfo.getElementsByTagNameNS(FB2_NS, 'image-gallery')?.[0]
      ?? titleInfo.getElementsByTagName('image-gallery')[0];
    if (imageGallery) {
      const coverImageEl = imageGallery.getElementsByTagNameNS(FB2_NS, 'cover-image')?.[0]
        ?? imageGallery.getElementsByTagName('cover-image')[0];
      if (coverImageEl) {
        const ref = coverImageEl.getAttribute('l:href') ?? coverImageEl.getAttribute('xlink:href');
        if (ref) {
          const id = ref.replace('#', '');
          // Find the image element with matching href to get content-type
          const allImages = doc.getElementsByTagNameNS(FB2_NS, 'image') ?? doc.getElementsByTagName('image');
          for (let i = 0; i < allImages.length; i++) {
            const imgEl = allImages[i];
            const imgHref = imgEl.getAttribute('l:href') ?? imgEl.getAttribute('xlink:href');
            if (imgHref?.includes(id)) {
              const ct = imgEl.getAttribute('content-type') || 'image/jpeg';
              const binData = binaryMap.get(id);
              if (binData) {
                coverImage = `data:${ct};base64,${binData}`;
                break;
              }
            }
          }
        }
      }
    }
  }

  return {
    title: title || 'Untitled',
    author,
    description: descriptionText,
    coverImage,
  };
}

function parseParagraph(pElem: Element): ContentElement[] {
  const html = sanitizeInlineHtml(elementToHtml(pElem));
  const styleClass = pElem.getAttribute('style') || pElem.getAttribute('class') || '';

  if (styleClass.includes('epigraph')) {
    return [{ type: 'epigraph', html }];
  }

  return [{ type: 'paragraph', html, style: styleClass || undefined }];
}

function parseVerse(verseElem: Element): ContentElement {
  const stanzas: PoemStanza[] = [];
  const titleElems = verseElem.getElementsByTagNameNS(FB2_NS, 'subtitle') ?? verseElem.getElementsByTagName('subtitle');
  let title: string | undefined;

  if (titleElems.length > 0) {
    const parts: string[] = [];
    for (let i = 0; i < titleElems.length; i++) {
      const text = getElementText(titleElems[i]).trim();
      if (text) parts.push(text);
    }
    title = parts.join(' ') || undefined;
  }

  const stanzaElems = verseElem.getElementsByTagNameNS(FB2_NS, 'stanza') ?? verseElem.getElementsByTagName('stanza');
  for (let i = 0; i < stanzaElems.length; i++) {
    const lines: string[] = [];
    const pElems = stanzaElems[i].getElementsByTagNameNS(FB2_NS, 'p') ?? stanzaElems[i].getElementsByTagName('p');
    for (let j = 0; j < pElems.length; j++) {
      const lineHtml = sanitizeInlineHtml(elementToHtml(pElems[j]));
      if (lineHtml.trim()) lines.push(lineHtml);
    }
    if (lines.length) stanzas.push({ lines });
  }

  return { type: 'poem', stanzas, title };
}

function parseSection(
  section: Element,
  binaryMap: Map<string, string>,
  chapterIndex: [number],
): Chapter[] {
  const chapters: Chapter[] = [];

  // Get direct-child subtitles for this section title
  const subtitleParts: string[] = [];
  for (const child of section.childNodes) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    if (el.tagName.toLowerCase() === 'subtitle') {
      const text = getElementText(el).trim();
      if (text) subtitleParts.push(text);
    }
  }
  const sectionTitle = subtitleParts.join(' ') || undefined;

  // Process direct children in document order: interleave content and nested sections
  const resultElements: ContentElement[] = [];

  for (const child of section.childNodes) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'section') {
      // Push any accumulated content as a chapter before nested chapters
      if (resultElements.length > 0) {
        chapterIndex[0]++;
        chapters.push({
          id: `chapter-${chapterIndex[0]}`,
          title: chapters.length === 0 ? sectionTitle : undefined,
          elements: resultElements,
        });
        resultElements.length = 0;
      }
      const nestedChapters = parseSection(el, binaryMap, chapterIndex);
      chapters.push(...nestedChapters);
    } else if (tag === 'p') {
      resultElements.push(...parseParagraph(el));
    } else if (tag === 'empty-line') {
      resultElements.push({ type: 'emptyLine' });
    } else if (tag === 'verse') {
      resultElements.push(parseVerse(el));
    } else if (tag === 'image') {
      const ref = el.getAttribute('l:href') ?? el.getAttribute('xlink:href');
      if (ref) {
        const id = ref.replace('#', '');
        const alt = getElementText(el).trim() || undefined;
        const binData = binaryMap.get(id);
        if (binData) {
          let ct = 'image/jpeg';
          const allImages = docForSection(section, el).getElementsByTagNameNS(FB2_NS, 'image') ?? docForSection(section, el).getElementsByTagName('image');
          for (let i = 0; i < allImages.length; i++) {
            const imgHref = allImages[i].getAttribute('l:href') ?? allImages[i].getAttribute('xlink:href');
            if (imgHref?.includes(id)) {
              ct = allImages[i].getAttribute('content-type') || 'image/jpeg';
              break;
            }
          }
          resultElements.push({ type: 'image', src: `data:${ct};base64,${binData}`, alt });
        }
      }
    } else if (tag === 'epigraph') {
      const pElems = el.getElementsByTagNameNS(FB2_NS, 'p') ?? el.getElementsByTagName('p');
      for (let i = 0; i < pElems.length; i++) {
        const html = sanitizeInlineHtml(elementToHtml(pElems[i]));
        if (html.trim()) resultElements.push({ type: 'epigraph', html });
      }
    }
  }

  // Remaining content becomes the last chapter of this section
  if (resultElements.length > 0) {
    chapterIndex[0]++;
    chapters.push({
      id: `chapter-${chapterIndex[0]}`,
      title: chapters.length === 0 ? sectionTitle : undefined,
      elements: resultElements,
    });
  } else if (sectionTitle && chapters.length === 0) {
    // Section with only a title and no content - still create it if it has nested chapters already pushed
    if (chapters.length > 0 && !chapters[0].title) {
      chapters[0].title = sectionTitle;
    }
  }

  return chapters;
}

// Get the owner document from any element in the tree
function docForSection(_section: Element, el: Element): XMLDocument {
  return el.ownerDocument as XMLDocument;
}

export function parseFb2(xmlText: string): Fb2ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Fb2ParseError('Failed to parse FB2: invalid XML structure');
  }

  if (!isValidFb2(doc)) {
    throw new Fb2ParseError('File is not a valid FB2 (FictionBook 2.0) document');
  }

  const metadata = extractMetadata(doc);
  const binaryMap = extractBinaryData(doc);

  const body = doc.getElementsByTagNameNS(FB2_NS, 'body')?.[0] ?? doc.getElementsByTagName('body')[0];
  if (!body) {
    throw new Fb2ParseError('FB2 document has no body content');
  }

  // Parse title-page
  let titlePageHtml: string | undefined;
  const titlePage = doc.getElementsByTagNameNS(FB2_NS, 'title-page')?.[0] ?? doc.getElementsByTagName('title-page')[0];
  if (titlePage) {
    const htmlParts: string[] = [];
    const pElems = titlePage.getElementsByTagNameNS(FB2_NS, 'p') ?? titlePage.getElementsByTagName('p');
    for (let i = 0; i < pElems.length; i++) {
      const html = sanitizeInlineHtml(elementToHtml(pElems[i]));
      if (html.trim()) htmlParts.push(`<p>${html}</p>`);
    }
    titlePageHtml = htmlParts.length ? htmlParts.join('') : undefined;
  }

  // Parse body sections into chapters
  const sections = body.getElementsByTagNameNS(FB2_NS, 'section') ?? body.getElementsByTagName('section');
  let chapters: Chapter[] = [];
  const chapterIndex: [number] = [0];

  for (let i = 0; i < sections.length; i++) {
    chapters.push(...parseSection(sections[i], binaryMap, chapterIndex));
  }

  // Fallback: no sections found, treat body direct paragraphs as one chapter
  if (chapters.length === 0) {
    const elements: ContentElement[] = [];
    for (const child of body.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'p') {
        elements.push(...parseParagraph(el));
      } else if (tag === 'empty-line') {
        elements.push({ type: 'emptyLine' });
      } else if (tag === 'verse') {
        elements.push(parseVerse(el));
      }
    }
    if (elements.length) {
      chapters = [{ id: 'chapter-1', title: undefined, elements }];
    }
  }

  if (chapters.length === 0) {
    throw new Fb2ParseError('FB2 document has no readable content');
  }

  return {
    metadata,
    content: { titlePageHtml, chapters },
  };
}
