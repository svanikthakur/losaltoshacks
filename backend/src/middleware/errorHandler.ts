/**
 * Global error handler. Logs + returns a safe JSON error shape.
 * Matches the frontend's expected `{ error }` response.
 */
import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[err]', err.stack || err.message)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
