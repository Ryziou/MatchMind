import { PDFParse } from 'pdf-parse';

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text.trim();

    if (!text) {
      throw new Error('PDF contains no extractable text');
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
