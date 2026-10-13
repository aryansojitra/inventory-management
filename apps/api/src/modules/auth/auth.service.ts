import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../users/user.model';
import { Student } from '../students/student.model';
import { config } from '../../config';
import { createError } from '../../utils/apiUtils';
import { AuditLog } from '../audit-logs/auditLog.model';
import { AUDIT_ACTIONS } from '../../constants';

export class AuthService {
  async login(identifier: string, password: string, ipAddress: string) {
    const trimmed = identifier.trim();

    // 1. Try lookup by email
    let user = await User.findOne({ email: trimmed.toLowerCase() })
      .select('+passwordHash')
      .lean();

    let studentProfileDoc: any = null;

    // 2. If not found, try lookup by student enrolment number
    if (!user) {
      const student = await Student.findOne({
        enrolmentNumber: trimmed.toUpperCase(),
      }).lean();

      if (student && student.user) {
        user = await User.findById(student.user)
          .select('+passwordHash')
          .lean();
        studentProfileDoc = student;
      }
    }

    if (!user) {
      throw createError('Invalid credentials. Check your email or student roll number.', 401);
    }

    if (!user.isActive) {
      throw createError('Your account has been deactivated. Contact coordinator.', 403);
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw createError('Invalid credentials', 401);
    }

    // Update last login timestamp
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Populate student profile if not already fetched
    if (user.role === 'student' && !studentProfileDoc && user.studentProfile) {
      studentProfileDoc = await Student.findById(user.studentProfile).lean();
    }

    const studentProfileId = user.studentProfile ? user.studentProfile.toString() : undefined;
    const studentRollNo = studentProfileDoc?.enrolmentNumber;
    const studentDept = studentProfileDoc?.programme;

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      name: user.fullName,
      ...(studentProfileId ? { studentProfileId } : {}),
      ...(studentRollNo ? { studentId: studentRollNo } : {}),
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    // Write audit log
    await AuditLog.create({
      action: AUDIT_ACTIONS.USER_LOGIN,
      actor: user._id,
      actorRole: user.role,
      entityType: 'User',
      entityId: user._id,
      remarks: `User logged in via ${trimmed.includes('@') ? 'email' : 'roll number'}`,
      ipAddress,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        studentId: studentRollNo,
        studentProfileId,
        department: studentDept || 'Department of Computer Engineering',
        isActive: user.isActive,
      },
    };
  }

  async getMe(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw createError('User not found', 404);

    let studentProfile = null;
    let studentRollNo: string | undefined;
    let studentDept: string | undefined;

    if (user.studentProfile) {
      studentProfile = await Student.findById(user.studentProfile).lean();
      if (studentProfile) {
        studentRollNo = studentProfile.enrolmentNumber;
        studentDept = studentProfile.programme;
      }
    }

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      name: user.fullName,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      studentId: studentRollNo,
      studentProfileId: user.studentProfile ? user.studentProfile.toString() : undefined,
      department: studentDept || 'Department of Computer Engineering',
      studentProfile,
    };
  }
}

export const authService = new AuthService();
