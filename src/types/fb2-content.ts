export interface PoemStanza {
  lines: string[];
}

export type ContentElement =
  | { type: 'paragraph'; html: string; style?: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'poem'; stanzas: PoemStanza[]; title?: string }
  | { type: 'epigraph'; html: string }
  | { type: 'subtitle'; html: string }
  | { type: 'emptyLine' };

export interface Chapter {
  id: string;
  title?: string;
  elements: ContentElement[];
}

export interface Fb2Content {
  titlePageHtml?: string;
  chapters: Chapter[];
}