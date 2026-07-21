import type { NextFunction, Request, Response } from 'express';
import {
  applyNeedsCompanyEventSchema,
  applyProgressEventSchema,
  applyRequestSchema,
} from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { NeedsCompanyError } from '../services/jobPosting.service.js';
import { createZipBuffer } from '../utils/zipStore.js';
import { initSseResponse, writeSseEvent } from '../utils/sse.js';
import { AppError } from '../middleware/errorHandler.js';
import { normalizeApplyRequest } from '../utils/normalizeApplyRequest.js';
import { readFile } from 'node:fs/promises';

export function createApplyController(container: AppContainer) {
  return {
    applySession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const parsed = normalizeApplyRequest(applyRequestSchema.parse(req.body));

        initSseResponse(res);

        try {
          const result = await container.applyService.applySession(
            sessionId,
            parsed,
            (progress) => {
              writeSseEvent(res, 'progress', progress);
            },
          );

          writeSseEvent(res, 'complete', result);
          res.end();
        } catch (error) {
          if (error instanceof NeedsCompanyError) {
            writeSseEvent(
              res,
              'needs_company',
              applyNeedsCompanyEventSchema.parse({
                stage: 'needs_company',
                sessionId,
                message: error.message,
                suggestedCompanyName: error.suggestedCompanyName,
                suggestedCompanyUrl: error.suggestedCompanyUrl,
                jobDescription: error.jobDescription,
              }),
            );
            res.end();
            return;
          }

          throw error;
        }
      } catch (error) {
        if (res.headersSent) {
          const message = error instanceof Error ? error.message : 'Apply pipeline failed';
          writeSseEvent(
            res,
            'error',
            applyProgressEventSchema.parse({ stage: 'error', message }),
          );
          res.end();
          return;
        }

        next(error);
      }
    },

    downloadCvPdf: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const artifacts = container.applyService.getArtifacts(sessionId);
        if (!artifacts?.cvPdfPath) {
          throw new AppError(404, 'CV PDF not available for this session');
        }
        res.download(artifacts.cvPdfPath, 'cv.pdf');
      } catch (error) {
        next(error);
      }
    },

    downloadCoverPdf: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const artifacts = container.applyService.getArtifacts(sessionId);
        if (!artifacts?.coverPdfPath) {
          throw new AppError(404, 'Cover letter PDF not available for this session');
        }
        res.download(artifacts.coverPdfPath, 'cover-letter.pdf');
      } catch (error) {
        next(error);
      }
    },

    downloadSourcesZip: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const artifacts = container.applyService.getArtifacts(sessionId);
        if (!artifacts) {
          throw new AppError(404, 'Apply artifacts not found for this session');
        }

        const files: Array<{ name: string; data: Buffer }> = [
          { name: 'cv.tex', data: Buffer.from(artifacts.cvTex, 'utf8') },
          { name: 'cover_letter.tex', data: Buffer.from(artifacts.coverLetterTex, 'utf8') },
        ];

        if (artifacts.cvPdfPath) {
          files.push({ name: 'cv.pdf', data: await readFile(artifacts.cvPdfPath) });
        }
        if (artifacts.coverPdfPath) {
          files.push({
            name: 'cover_letter.pdf',
            data: await readFile(artifacts.coverPdfPath),
          });
        }

        const zip = createZipBuffer(files);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="matchmind-apply-sources.zip"');
        res.send(zip);
      } catch (error) {
        next(error);
      }
    },
  };
}
