import { parseDocx } from './docx.parser.js';
import { parsePdf } from './pdf.parser.js';

export type SupportedFileType = 'pdf' | 'docx';

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: SupportedFileType;
}

export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  fileType: SupportedFileType,
): Promise<ParsedDocument> {
  const text =
    fileType === 'pdf' ? await parsePdf(buffer) : await parseDocx(buffer);

  return { text, fileName, fileType };
}

export { parseDocx } from './docx.parser.js';
export { parsePdf } from './pdf.parser.js';
