import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Validates request origin against configured allowed origins.
 */
function isValidOrigin(originHeader: string | undefined): boolean {
  if (!originHeader) return false;
  try {
    const originUrl = new URL(originHeader);
    const configuredUrl = new URL(config.corsOrigin || 'http://localhost:5173');

    // Match protocol, hostname, and port
    if (originUrl.origin === configuredUrl.origin) return true;
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
      return (
        originUrl.port === '5173' ||
        originUrl.port === '3000' ||
        originUrl.port === configuredUrl.port
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * CSRF Protection Middleware
 * Defends against Cross-Site Request Forgery on state-changing requests
 * when authentication is performed using browser cookies.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe read-only HTTP methods are exempt
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // If request uses Authorization Bearer header, it is immune to standard browser CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If the request is authenticated via Cookie (access_token)
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    const origin = req.headers.origin || req.headers.referer;

    // Check 1: Origin / Referer validation
    if (origin && !isValidOrigin(origin)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection',
        message: 'Forbidden: Request origin does not match authorized application domain.',
      });
    }

    // Check 2: Custom Request Header or Double Submit Cookie Check
    // Browsers prevent third-party cross-site forms from setting custom headers
    const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
    const csrfCookie = req.cookies?.['XSRF-TOKEN'];
    const csrfHeader = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];

    // If double submit cookie exists, verify match
    if (csrfCookie && csrfHeader && csrfCookie !== csrfHeader) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection',
        message: 'Forbidden: Invalid CSRF Token.',
      });
    }

    // Require either valid origin or custom anti-CSRF header
    if (!origin && !customHeader) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection',
        message: 'Forbidden: Missing Origin and anti-CSRF verification header.',
      });
    }
  }

  next();
}
