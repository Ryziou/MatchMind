import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function formatZodMessage(error: ZodError): string {
  const first = error.issues[0];
  if (!first) {
    return 'Validation failed';
  }

  return first.message;
}

// Express requires four arguments to recognize error-handling middleware.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: formatZodMessage(err) });
    return;
  }

  logger.error({ err }, 'Unhandled server error');
  res.status(500).json({ error: 'Internal server error' });
}
