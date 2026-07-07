import mammoth from 'mammoth';

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();

  if (!text) {
    throw new Error('DOCX contains no extractable text');
  }

  return text;
}
