import { Request, Response } from 'express';
import crypto from 'crypto';
import { authService } from './auth.service';
import { asyncHandler, sendSuccess } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AuditLog } from '../audit-logs/auditLog.model';
import { AUDIT_ACTIONS } from '../../constants';
import { config } from '../../config';

const IS_PROD = config.env === 'production';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  const result = await authService.login(email, password, ipAddress);

  // Generate cryptographically random CSRF token for double-submit cookie pattern
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Set secure HttpOnly session cookie
  res.cookie('access_token', result.token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  });

  // Set readable anti-CSRF token cookie (for clients using double-submit cookie)
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  });

  sendSuccess(res, { ...result, csrfToken }, 'Login successful');
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const user = await authService.getMe(userId);
  sendSuccess(res, user, 'User profile');
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ipAddress = req.ip || req.socket.remoteAddress || '';

  // Invalidate and clear browser authentication cookies
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('XSRF-TOKEN', {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
  });

  // Record logout event in security audit log
  if (req.user) {
    try {
      await AuditLog.create({
        action: AUDIT_ACTIONS.USER_LOGOUT,
        actor: req.user.userId,
        actorRole: req.user.role,
        entityType: 'User',
        entityId: req.user.userId,
        remarks: 'User session explicitly terminated via logout',
        ipAddress,
      });
    } catch {
      // audit logging failure should not prevent logout response
    }
  }

  sendSuccess(res, null, 'Logged out successfully');
});
