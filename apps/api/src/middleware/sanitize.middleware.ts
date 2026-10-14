import { Request, Response, NextFunction } from 'express';

/**
 * Utility to escape special characters for regular expressions.
 * Prevents Regular Expression Denial of Service (ReDoS).
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Recursively sanitizes an object by removing or stripping any keys
 * that begin with '$' (MongoDB query operators) or contain '.' (prototype/nested paths).
 * Prevents NoSQL Operator Injection attacks.
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // Drop keys that start with $ or contain .
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 * against MongoDB operator injection.
 */
export function mongoSanitize(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}
