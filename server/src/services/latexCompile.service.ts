import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';

export interface CompileResult {
  pdfPath: string | null;
  pageCount: number;
  logSnippet: string;
  compiled: boolean;
  warning?: string;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 127, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function commandExists(command: string): Promise<boolean> {
  const result = await runCommand(command, ['--version'], process.cwd());
  return result.code === 0;
}

async function readPdfPageCount(pdfPath: string): Promise<number> {
  const pdfinfo = await runCommand('pdfinfo', [pdfPath], path.dirname(pdfPath));
  if (pdfinfo.code === 0) {
    const match = pdfinfo.stdout.match(/Pages:\s+(\d+)/i);
    if (match) {
      return Number(match[1]);
    }
  }

  const buffer = await readFile(pdfPath);
  const asText = buffer.toString('latin1');
  const matches = asText.match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ?? 0;
}

export async function extractPdfText(pdfPath: string): Promise<string | null> {
  const result = await runCommand('pdftotext', ['-layout', pdfPath, '-'], path.dirname(pdfPath));
  if (result.code !== 0) {
    return null;
  }
  return result.stdout;
}

export class LatexCompileService {
  async compileTexFile(
    workDir: string,
    texFileName: string,
    engine: 'pdflatex' | 'lualatex' | 'xelatex' = 'pdflatex',
  ): Promise<CompileResult> {
    await mkdir(workDir, { recursive: true });
    const available = await commandExists(engine);
    if (!available) {
      return {
        pdfPath: null,
        pageCount: 0,
        logSnippet: `${engine} not installed`,
        compiled: false,
        warning: `${engine} is not available. LaTeX sources were saved; PDF compile skipped.`,
      };
    }

    const result = await runCommand(
      engine,
      ['-interaction=nonstopmode', '-halt-on-error', texFileName],
      workDir,
    );
    const base = texFileName.replace(/\.tex$/i, '');
    const pdfPath = path.join(workDir, `${base}.pdf`);
    const logSnippet = `${result.stdout}\n${result.stderr}`.slice(-2500);

    if (result.code !== 0) {
      logger.warn({ workDir, engine, logSnippet }, 'LaTeX compile failed');
      return {
        pdfPath: null,
        pageCount: 0,
        logSnippet,
        compiled: false,
        warning: 'LaTeX compile failed. Check the .tex download.',
      };
    }

    const pageCount = await readPdfPageCount(pdfPath);
    return {
      pdfPath,
      pageCount,
      logSnippet,
      compiled: true,
    };
  }

  async writeAndCompile(
    workDir: string,
    baseName: string,
    texContent: string,
    engine: 'pdflatex' | 'lualatex' | 'xelatex' = 'lualatex',
  ): Promise<CompileResult & { texPath: string }> {
    await mkdir(workDir, { recursive: true });
    const texPath = path.join(workDir, `${baseName}.tex`);
    await writeFile(texPath, texContent, 'utf8');
    const compiled = await this.compileTexFile(workDir, `${baseName}.tex`, engine);
    return { ...compiled, texPath };
  }
}

export async function ensureCleanDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}
