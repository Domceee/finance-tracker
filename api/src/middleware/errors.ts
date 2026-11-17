import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export function ensureJsonBody(req: Request, res: Response, next: NextFunction) {
  if (req.body === undefined || req.body === null) {
    req.body = {};
    return next();
  }

  if (typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  return next();
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

const PRISMA_ERRORS: Record<string, { status: number; error: string }> = {
  P2025: { status: 404, error: 'Resource not found' },
  P2002: { status: 409, error: 'Resource already exists' },
  P2003: { status: 400, error: 'Related resource does not exist' },
};

type BodyParserError = Error & { type?: string; status?: number };

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const bodyError = err as BodyParserError;

  if (bodyError.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  if (bodyError.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  if (typeof bodyError.status === 'number' && bodyError.status >= 400 && bodyError.status < 500) {
    return res.status(bodyError.status).json({ error: bodyError.message });
  }

  const prismaError = err instanceof Prisma.PrismaClientKnownRequestError ? PRISMA_ERRORS[err.code] : undefined;

  if (prismaError) {
    return res.status(prismaError.status).json({ error: prismaError.error });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
};
