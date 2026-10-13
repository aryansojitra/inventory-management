import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../users/user.model';
import { Student } from '../students/student.model';
import { config } from '../../config';
import { createError } from '../../utils/apiUtils';
import { AuditLog } from '../audit-logs/auditLog.model';
import { AUDIT_ACTIONS } from '../../constants';

export class AuthService {
  async login(email: string, password: string, ipAddress: string) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .lean();

    if (!user) {
      throw createError('Invalid credentials', 401);
    }
    if (!user.isActive) {
      throw createError('Account is deactivated', 403);
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw createError('Invalid credentials', 401);
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Get student profile ID if applicable
    let studentProfileId: string | undefined;
    if (user.role === 'student' && user.studentProfile) {
      studentProfileId = user.studentProfile.toString();
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      ...(studentProfileId ? { studentProfileId } : {}),
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    // Audit log
    await AuditLog.create({
      action: AUDIT_ACTIONS.USER_LOGIN,
      actor: user._id,
      actorRole: user.role,
      entityType: 'User',
      entityId: user._id,
      remarks: 'User logged in',
      ipAddress,
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentProfileId,
      },
    };
  }

  async getMe(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw createError('User not found', 404);

    let studentProfile = null;
    if (user.studentProfile) {
      studentProfile = await Student.findById(user.studentProfile).lean();
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      studentProfile,
    };
  }
}

export const authService = new AuthService();
