import { NextFunction, Request, Response } from 'express';

/** An error that already knows which HTTP status it should be reported with. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, message);
export const notFound = (message: string): HttpError => new HttpError(404, message);

/**
 * Express error handler shared by all routers: an HttpError is reported with
 * its own status; any other error is reported as a 400 with its message.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  res.status(400).json({ error: (error as Error).message });
}
