import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiUtils';
import { config } from '../config';

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational
      ? err.message
      : config.env === 'production'
      ? 'Internal server error'
      : err.message;

  if (config.env !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.path} ${statusCode}:`, err.message);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.env === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}
