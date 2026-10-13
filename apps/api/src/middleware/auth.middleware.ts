import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../modules/users/user.model';
import { createError } from '../utils/apiUtils';
import { Role } from '../constants';

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

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(createError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}

export function requireOwnership(req: AuthRequest, res: Response, next: NextFunction) {
  // Used to verify student can only access their own data
  // The route passes :studentId param; must match req.user.studentProfileId
  const { studentId } = req.params;
  if (!req.user) return next(createError('Authentication required', 401));
  if (req.user.role === 'coordinator' || req.user.role === 'admin') return next();
  if (req.user.studentProfileId !== studentId) {
    return next(createError('Access denied', 403));
  }
  next();
}
