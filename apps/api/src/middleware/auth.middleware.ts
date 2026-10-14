import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/users/user.model';
import { Student } from '../modules/students/student.model';
import { createError } from '../utils/apiUtils';
import { Role } from '../constants';
import { AuditLog } from '../modules/audit-logs/auditLog.model';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: Role;
    email: string;
    fullName: string;
    studentProfileId?: string;
  };
}

interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
  fullName: string;
  studentProfileId?: string;
}

/**
 * Authenticates requests using either:
 * 1. Authorization: Bearer <token> HTTP header
 * 2. Secure HttpOnly cookie: access_token
 *
 * Verifies token signature with explicit HS256 algorithm and verifies
 * that the user account is active in the database.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Check HttpOnly cookie as fallback
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return next(createError('Authentication required. Please log in.', 401));
  }

  try {
    // Explicitly enforce HS256 algorithm to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    let userRole = decoded.role as Role;
    let studentProfileId = decoded.studentProfileId;

    // Verify user still exists and is active in database when connected
    if (mongoose.connection.readyState === 1) {
      const dbUser = await User.findById(decoded.userId).select('isActive role studentProfile').lean();
      if (!dbUser) {
        return next(createError('User account not found or has been removed', 401));
      }

      if (dbUser.isActive === false) {
        return next(createError('Your account has been deactivated. Please contact coordinator.', 403));
      }

      userRole = dbUser.role as Role;
      if (!studentProfileId && dbUser.studentProfile) {
        studentProfileId = dbUser.studentProfile.toString();
      }
    }

    req.user = {
      userId: decoded.userId,
      role: userRole,
      email: decoded.email,
      fullName: decoded.fullName,
      studentProfileId,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Session expired. Please log in again.', 401));
    }
    return next(createError('Invalid authentication token', 401));
  }
}

/**
 * Enforces role-based authorization.
 * Logs security audit events if an unauthorized access attempt occurs.
 */
export function authorize(...roles: Role[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      // Security Audit logging for unauthorized function level access attempt
      try {
        await AuditLog.create({
          action: 'SECURITY_ALERT',
          actor: req.user.userId,
          actorRole: req.user.role,
          entityType: 'Endpoint',
          entityId: req.user.userId,
          remarks: `Unauthorized access attempt to ${req.method} ${req.originalUrl}. Required: [${roles.join(', ')}], User Role: ${req.user.role}`,
          ipAddress: req.ip || req.socket.remoteAddress || '',
        });
      } catch {
        // do not fail request pipeline if audit log fails
      }

      return next(createError(`Forbidden: Requires ${roles.join(' or ')} permission`, 403));
    }

    next();
  };
}

/**
 * Enforces ownership for student resources (BOLA / IDOR defense).
 */
export function requireOwnership(req: AuthRequest, res: Response, next: NextFunction) {
  const { studentId } = req.params;
  if (!req.user) return next(createError('Authentication required', 401));
  if (req.user.role === 'coordinator' || req.user.role === 'admin') return next();

  if (req.user.studentProfileId !== studentId) {
    return next(createError('Access denied: You can only access your own student data', 403));
  }
  next();
}
