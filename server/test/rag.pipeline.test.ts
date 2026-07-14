import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import { MockAIProvider } from './helpers/mockAi.js';

async function createSampleDocx(): Promise<Buffer> {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { mkdir, mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const execFileAsync = promisify(execFile);

  const dir = await mkdtemp(path.join(tmpdir(), 'matchmind-docx-'));
  const docxPath = path.join(dir, 'sample-cv.docx');

  await mkdir(path.join(dir, 'word'), { recursive: true });
  await mkdir(path.join(dir, '_rels'), { recursive: true });

  await writeFile(
    path.join(dir, '[Content_Types].xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  await writeFile(
    path.join(dir, '_rels', '.rels'),
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  await writeFile(
    path.join(dir, 'word', 'document.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Experience</w:t></w:r></w:p>
    <w:p><w:r><w:t>Built RAG pipelines with TypeScript, Node.js, and vector databases.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Skills</w:t></w:r></w:p>
    <w:p><w:r><w:t>React, Express, Docker, ChromaDB, Gemini embeddings.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );

  await execFileAsync('zip', ['-qr', docxPath, '[Content_Types].xml', '_rels', 'word'], {
    cwd: dir,
  });
  const buffer = await readFile(docxPath);
  await rm(dir, { recursive: true, force: true });
  return buffer;
}

describe('RAG API integration', () => {
  const previousEnv = { ...process.env };
  let app: ReturnType<typeof createApp>;
  let chromaReady = false;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
    process.env.CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
    process.env.CHROMA_PORT = process.env.CHROMA_PORT || '8000';
    process.env.AI_PROVIDER = 'gemini';

    const env = loadEnv();
    const container = createContainer(env, { ai: new MockAIProvider() });
    chromaReady = await container.chroma.isReachable();
    app = createApp(container);
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('lists configured AI providers', async () => {
    const response = await request(app).get('/api/providers');

    expect(response.status).toBe(200);
    expect(response.body.defaultProvider).toBeTruthy();
    expect(Array.isArray(response.body.providers)).toBe(true);
    expect(response.body.providers.length).toBeGreaterThan(0);
  });

  it('returns 400 for empty analysis job description', async () => {
    const response = await request(app)
      .post('/api/sessions/00000000-0000-4000-8000-000000000000/analyze')
      .send({ jobDescription: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it('returns 400 for invalid session id', async () => {
    const response = await request(app)
      .post('/api/sessions/not-a-uuid/chat')
      .send({ message: 'Hello', history: [] });

    expect(response.status).toBe(400);
    expect(String(response.body.error)).toMatch(/uuid/i);
  });

  it('returns 404 for unknown session chat', async () => {
    const response = await request(app)
      .post('/api/sessions/00000000-0000-4000-8000-000000000000/chat')
      .send({ message: 'Which skills match?', history: [] });

    expect(response.status).toBe(404);
  });

  it('runs upload, query, analyze, chat, and delete when Chroma is reachable', async () => {
    if (!chromaReady) {
      return;
    }

    const docx = await createSampleDocx();

    const createResponse = await request(app)
      .post('/api/sessions')
      .attach('cv', docx, {
        filename: 'sample-cv.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.sessionId).toBeTruthy();
    expect(createResponse.body.chunkCount).toBeGreaterThan(0);
    expect(createResponse.body.provider).toBe('gemini');

    const sessionId = createResponse.body.sessionId as string;

    const queryResponse = await request(app)
      .get(`/api/sessions/${sessionId}/debug/query`)
      .query({ q: 'TypeScript RAG' });

    expect(queryResponse.status).toBe(200);
    expect(queryResponse.body.results.length).toBeGreaterThan(0);

    const analyzeResponse = await request(app)
      .post(`/api/sessions/${sessionId}/analyze`)
      .send({
        jobDescription: 'Looking for a TypeScript developer with React and RAG experience.',
      });

    expect(analyzeResponse.status).toBe(200);
    expect(analyzeResponse.text).toContain('event: complete');

    const chatResponse = await request(app)
      .post(`/api/sessions/${sessionId}/chat`)
      .send({
        message: 'Which skills support this role?',
        history: [],
        jobDescription: 'Looking for a TypeScript developer with React and RAG experience.',
      });

    expect(chatResponse.status).toBe(200);
    expect(chatResponse.body.answer).toBeTruthy();
    expect(Array.isArray(chatResponse.body.retrievedChunkIds)).toBe(true);

    const deleteResponse = await request(app).delete(`/api/sessions/${sessionId}`);
    expect(deleteResponse.status).toBe(204);
  });
});
