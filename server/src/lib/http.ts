import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

/** An error that is safe to show to the visitor. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Parse a request body with zod; throws a 400 with field errors on failure. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'Please check the highlighted fields.', z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}

/**
 * Honeypot: forms include a hidden "website" field that people never see.
 * Bots fill it in. We pretend to succeed so they don't adapt.
 */
export const isBot = (body: unknown) =>
  typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).website === 'string' &&
  ((body as Record<string, unknown>).website as string).length > 0;

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // Errors from middleware such as express.static carry their own 4xx status.
  const status = (err as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 404 ? 'Not found' : 'Bad request' });
    return;
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
