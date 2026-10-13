import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendSuccess(
  res: Response,
  data: any,
  message = 'Success',
  statusCode = 200
) {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendPaginated(
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
