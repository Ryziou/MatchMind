import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type RequestTarget = 'body' | 'params' | 'query';

function validate(schema: ZodSchema, target: RequestTarget) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);

      // Express 5 exposes req.query as a getter-only property.
      if (target !== 'query') {
        Object.assign(req[target] as object, parsed);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}

export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}
