import { describe, it, expect } from 'vitest';
import { parseFb2, Fb2ParseError } from '../lib/fb2/parser';

const VALID_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:xlink="http://www.w3.org/1999/xlink">
  <description>
    <author><first_name>John</first_name><middle_name>Ivanovich</middle_name><last_name>Doe</last_name></author>
    <title_info><title>The Test Book</title></title_info>
    <abstract><p>This is a test description.</p></abstract>
  </description>
  <body>
    <section>
      <title><p>New Beginning</p></title>
      <p>This is the first paragraph of the story.</p>
      <p>This is the second paragraph with <strong>bold</strong> and <emphasis>italic</emphasis>.</p>
    </section>
    <section>
      <title><p>Chapter Two</p></title>
      <p>The story continues here.</p>
    </section>
  </body>
</FictionBook>`;

const MINIMAL_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title_info><title>Minimal</title></title_info></description>
  <body><section><p>Hello world.</p></section></body>
</FictionBook>`;

const POEM_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title_info><title>Poems</title></title_info></description>
  <body>
    <section>
      <poem>
        <epigraph><p>Inspiration</p></epigraph>
        <stanza>
          <v>Rose is red</v>
          <v>Violet is blue</v>
        </stanza>
        <stanza>
          <v>Sugar is sweet</v>
          <v>And so are you</v>
        </stanza>
      </poem>
    </section>
  </body>
</FictionBook>`;

const NO_TITLE_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description></description>
  <body><section><p>No title here.</p></section></body>
</FictionBook>`;

const MULTI_AUTHOR_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <author><first_name>A</first_name><last_name>First</last_name></author>
    <author><first_name>B</first_name><last_name>Second</last_name></author>
    <title_info><title>Co-authored</title></title_info>
  </description>
  <body><section><p>Content.</p></section></body>
</FictionBook>`;

describe('FB2 Parser', () => {
  it('parses valid FB2 with metadata and chapters', () => {
    const result = parseFb2(VALID_FB2);
    expect(result.metadata.title).toBe('The Test Book');
    expect(result.metadata.author).toContain('John Doe');
    expect(result.metadata.description).toBe('This is a test description.');
    expect(result.content.chapters.length).toBe(2);
    expect(result.content.chapters[0].title).toBe('New Beginning');
    expect(result.content.chapters[1].title).toBe('Chapter Two');
    expect(result.content.chapters[0].elements.length).toBeGreaterThanOrEqual(3);
  });

  it('parses minimal FB2', () => {
    const result = parseFb2(MINIMAL_FB2);
    expect(result.metadata.title).toBe('Minimal');
    expect(result.metadata.author).toBeTruthy();
    expect(result.content.chapters.length).toBeGreaterThan(0);
  });

  it('parses poems correctly', () => {
    const result = parseFb2(POEM_FB2);
    expect(result.metadata.title).toBe('Poems');
    const elements = result.content.chapters[0].elements;
    const poemEl = elements.find(e => e.type === 'poem');
    expect(poemEl).toBeDefined();
    if (poemEl && poemEl.type === 'poem') {
      expect(poemEl.stanzas.length).toBe(2);
      expect(poemEl.stanzas[0].lines.length).toBe(2);
    }
  });

  it('handles missing title', () => {
    const result = parseFb2(NO_TITLE_FB2);
    expect(result.metadata.title).toBeTruthy();
    expect(result.metadata.title).not.toBe('');
  });

  it('handles multiple authors', () => {
    const result = parseFb2(MULTI_AUTHOR_FB2);
    expect(result.metadata.author).toContain('First');
    expect(result.metadata.author).toContain('Second');
  });

  it('rejects non-XML input with Fb2ParseError', () => {
    expect(() => parseFb2('not xml at all')).toThrow();
    expect(() => parseFb2('<div>Hello</div>')).toThrow(Fb2ParseError);
  });

  it('rejects empty string', () => {
    expect(() => parseFb2('')).toThrow();
  });

  it('paragraphs contain HTML content', () => {
    const result = parseFb2(VALID_FB2);
    const paras = result.content.chapters[0].elements.filter(e => e.type === 'paragraph');
    expect(paras.length).toBeGreaterThanOrEqual(2);
    if (paras[0] && paras[0].type === 'paragraph') {
      expect(paras[0].html).toContain('first paragraph');
    }
  });

  it('handles FB2 with empty body', () => {
    const emptyBody = `<?xml version="1.0"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title_info><title>Empty</title></title_info></description>
  <body/>
</FictionBook>`;
    expect(() => parseFb2(emptyBody)).toThrow();
  });

  it('handles malformed XML gracefully', () => {
    expect(() => parseFb2('<xml>broken')).toThrow();
  });
});