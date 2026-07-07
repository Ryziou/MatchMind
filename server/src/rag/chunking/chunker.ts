import type { ChunkMetadata } from '@matchmind/shared';
import type { ChunkerOptions, TextChunk } from './types.js';

const DEFAULT_MAX_CHARS = 1500;
const DEFAULT_OVERLAP_CHARS = 200;

const SECTION_HEADINGS = [
  'experience',
  'work experience',
  'professional experience',
  'employment history',
  'employment',
  'skills',
  'technical skills',
  'core competencies',
  'education',
  'academic background',
  'qualifications',
  'summary',
  'professional summary',
  'profile',
  'about me',
  'projects',
  'certifications',
  'achievements',
  'key achievements',
  'contact',
  'languages',
  'interests',
  'volunteering',
];

const HEADING_PATTERN = new RegExp(
  `^(${SECTION_HEADINGS.map((heading) => heading.replace(/\s+/g, '\\s+')).join('|')})\\s*:?\\s*$`,
  'i',
);

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/ +/g, ' ').trim();
}

function splitLongText(text: string, maxChars: number, overlapChars: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed ? [trimmed] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + maxChars, trimmed.length);

    if (end < trimmed.length) {
      const paragraphBreak = trimmed.lastIndexOf('\n\n', end);
      const sentenceBreak = trimmed.lastIndexOf('. ', end);
      const softBreak = Math.max(paragraphBreak, sentenceBreak);

      if (softBreak > start + maxChars * 0.5) {
        end = softBreak + (sentenceBreak === softBreak ? 1 : 0);
      }
    }

    const slice = trimmed.slice(start, end).trim();
    if (slice) {
      chunks.push(slice);
    }

    if (end >= trimmed.length) {
      break;
    }

    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

function splitIntoSections(text: string): Array<{ section: string; body: string }> {
  const lines = text.split('\n');
  const sections: Array<{ section: string; body: string }> = [];
  let currentSection = 'General';
  let currentLines: string[] = [];

  const flush = (): void => {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({ section: currentSection, body });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (HEADING_PATTERN.test(trimmedLine)) {
      flush();
      currentSection = trimmedLine.replace(/:$/, '');
      continue;
    }

    currentLines.push(line);
  }

  flush();

  if (sections.length === 0 && text.trim()) {
    sections.push({ section: 'General', body: text.trim() });
  }

  return sections;
}

export function chunkDocument(
  text: string,
  sourceFile: string,
  options: ChunkerOptions = {},
): TextChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const normalized = normalizeText(text);
  const sections = splitIntoSections(normalized);
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const { section, body } of sections) {
    const sectionChunks = splitLongText(body, maxChars, overlapChars);

    for (const sectionText of sectionChunks) {
      const metadata: ChunkMetadata = {
        section,
        sourceFile,
        chunkIndex,
      };

      chunks.push({ text: sectionText, metadata });
      chunkIndex += 1;
    }
  }

  return chunks;
}
