import multer from 'multer';
import type { Request } from 'express';
import type { Env } from '../config/env.js';
import { AppError } from './errorHandler.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function createUploadMiddleware(env: Env) {
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, callback) => {
      const extension = file.originalname.toLowerCase();
      const isAllowedExtension = extension.endsWith('.pdf') || extension.endsWith('.docx');

      if (!isAllowedExtension || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new AppError(400, 'Only PDF and DOCX files are supported'));
        return;
      }

      callback(null, true);
    },
  });

  return upload.single('cv');
}

export function getUploadedCv(req: Request): Express.Multer.File {
  const file = req.file;

  if (!file) {
    throw new AppError(400, 'CV file is required (field name: cv)');
  }

  return file;
}
