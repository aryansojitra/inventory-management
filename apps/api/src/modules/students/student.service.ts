import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Student, IStudent } from './student.model';
import { User } from '../users/user.model';
import { createError } from '../../utils/apiUtils';
import { ROLES } from '../../constants';
import { AuditLog } from '../audit-logs/auditLog.model';
import { AUDIT_ACTIONS } from '../../constants';

export interface CreateStudentDto {
  enrolmentNumber: string;
  fullName: string;
  programme: string;
  semester: number;
  email: string;
  phone?: string;
  address?: string;
  password: string;
}

export interface UpdateStudentDto {
  fullName?: string;
  programme?: string;
  semester?: number;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export class StudentService {
  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    programme?: string;
    isActive?: string;
  }) {
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { enrolmentNumber: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.programme) filter.programme = query.programme;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('user', 'email lastLogin')
        .lean(),
      Student.countDocuments(filter),
    ]);

    return { students, total };
  }

  async getById(studentId: string) {
    const student = await Student.findById(studentId)
      .populate('user', 'email lastLogin isActive')
      .lean();
    if (!student) throw createError('Student not found', 404);
    return student;
  }

  async create(dto: CreateStudentDto, actorId: string, actorRole: string) {
    // Check enrolment number uniqueness
    const existing = await Student.findOne({
      enrolmentNumber: dto.enrolmentNumber.toUpperCase(),
    });
    if (existing) throw createError('Enrolment number already registered', 409);

    const emailExists = await User.findOne({ email: dto.email.toLowerCase() });
    if (emailExists) throw createError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create User + Student in sequence (no multi-doc transaction required — idempotent design)
    const user = await User.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: ROLES.STUDENT,
      fullName: dto.fullName,
    });

    const student = await Student.create({
      enrolmentNumber: dto.enrolmentNumber.toUpperCase(),
      fullName: dto.fullName,
      programme: dto.programme,
      semester: dto.semester,
      email: dto.email.toLowerCase(),
      phone: dto.phone || '',
      address: dto.address || '',
      user: user._id,
    });

    // Link student profile back to user
    await User.findByIdAndUpdate(user._id, { studentProfile: student._id });

    await AuditLog.create({
      action: AUDIT_ACTIONS.STUDENT_REGISTERED,
      actor: actorId,
      actorRole,
      entityType: 'Student',
      entityId: student._id,
      newValue: { enrolmentNumber: student.enrolmentNumber, fullName: student.fullName },
      remarks: 'Student registered',
    });

    return student;
  }

  async update(
    studentId: string,
    dto: UpdateStudentDto,
    actorId: string,
    actorRole: string
  ) {
    const student = await Student.findById(studentId);
    if (!student) throw createError('Student not found', 404);

    const previous = student.toObject();
    Object.assign(student, dto);
    await student.save();

    await AuditLog.create({
      action: AUDIT_ACTIONS.STUDENT_UPDATED,
      actor: actorId,
      actorRole,
      entityType: 'Student',
      entityId: student._id,
      previousValue: previous,
      newValue: dto,
      remarks: 'Student updated',
    });

    return student;
  }
}

export const studentService = new StudentService();
