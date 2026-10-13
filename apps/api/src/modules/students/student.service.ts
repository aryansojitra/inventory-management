import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Student, IStudent } from './student.model';
import { User } from '../users/user.model';
import { IssueLine } from '../issues/issue.model';
import { createError } from '../../utils/apiUtils';
import { ROLES } from '../../constants';
import { AuditLog } from '../audit-logs/auditLog.model';
import { AUDIT_ACTIONS } from '../../constants';

export interface CreateStudentDto {
  enrolmentNumber?: string;
  studentId?: string;
  fullName?: string;
  name?: string;
  programme?: string;
  department?: string;
  semester?: number;
  email: string;
  phone?: string;
  address?: string;
  password?: string;
  maxBorrowLimit?: number;
}

export interface UpdateStudentDto {
  fullName?: string;
  name?: string;
  programme?: string;
  department?: string;
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
    department?: string;
    isActive?: string;
  }): Promise<{ students: any[]; total: number }> {
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { enrolmentNumber: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    const prog = query.programme || query.department;
    if (prog && prog !== 'all') {
      filter.programme = prog;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    const [rawStudents, total] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('user', 'email lastLogin isActive')
        .lean(),
      Student.countDocuments(filter),
    ]);

    // Calculate active borrowed items count for each student
    const studentIds = rawStudents.map((s) => s._id);
    const activeBorrowings = await IssueLine.aggregate([
      {
        $lookup: {
          from: 'issuerecords',
          localField: 'issueRecord',
          foreignField: '_id',
          as: 'record',
        },
      },
      { $unwind: '$record' },
      {
        $match: {
          'record.student': { $in: studentIds },
          outstandingQty: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$record.student',
          totalBorrowed: { $sum: '$outstandingQty' },
        },
      },
    ]);

    const borrowMap = new Map<string, number>();
    for (const b of activeBorrowings) {
      borrowMap.set(b._id.toString(), b.totalBorrowed);
    }

    const students = rawStudents.map((s) => {
      const borrowedCount = borrowMap.get(s._id.toString()) || 0;
      return {
        ...s,
        id: s._id.toString(),
        studentId: s.enrolmentNumber,
        name: s.fullName,
        department: s.programme,
        currentBorrowedCount: borrowedCount,
        maxBorrowLimit: 5,
      };
    });

    return { students, total };
  }

  async getById(studentId: string): Promise<any> {
    const student = await Student.findById(studentId)
      .populate('user', 'email lastLogin isActive')
      .lean();
    if (!student) throw createError('Student not found', 404);

    const activeLines = await IssueLine.aggregate([
      {
        $lookup: {
          from: 'issuerecords',
          localField: 'issueRecord',
          foreignField: '_id',
          as: 'record',
        },
      },
      { $unwind: '$record' },
      {
        $match: {
          'record.student': student._id,
          outstandingQty: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$outstandingQty' },
        },
      },
    ]);

    const currentBorrowedCount = activeLines[0]?.total || 0;

    return {
      ...student,
      id: student._id.toString(),
      studentId: student.enrolmentNumber,
      name: student.fullName,
      department: student.programme,
      currentBorrowedCount,
      maxBorrowLimit: 5,
    };
  }

  async create(dto: CreateStudentDto, actorId: string, actorRole: string) {
    const enrolmentNumber = (dto.enrolmentNumber || dto.studentId || '').toUpperCase().trim();
    const fullName = (dto.fullName || dto.name || '').trim();
    const programme = (dto.programme || dto.department || 'Computer Engineering').trim();
    const email = dto.email.toLowerCase().trim();
    const password = dto.password || 'demo1234';

    if (!enrolmentNumber) throw createError('Enrolment / Student ID is required', 400);
    if (!fullName) throw createError('Full name is required', 400);

    // Check enrolment number uniqueness
    const existing = await Student.findOne({ enrolmentNumber });
    if (existing) throw createError(`Enrolment number ${enrolmentNumber} is already registered`, 409);

    const emailExists = await User.findOne({ email });
    if (emailExists) throw createError(`Email ${email} is already registered`, 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      role: ROLES.STUDENT,
      fullName,
    });

    const student = await Student.create({
      enrolmentNumber,
      fullName,
      programme,
      semester: dto.semester || 1,
      email,
      phone: dto.phone || '',
      address: dto.address || '',
      user: user._id,
      isActive: true,
    });

    // Link back to user
    await User.findByIdAndUpdate(user._id, { studentProfile: student._id });

    await AuditLog.create({
      action: AUDIT_ACTIONS.STUDENT_REGISTERED,
      actor: actorId,
      actorRole,
      entityType: 'Student',
      entityId: student._id,
      newValue: { enrolmentNumber, fullName, programme, email },
      remarks: 'Student registered successfully',
    });

    return {
      ...student.toObject(),
      id: student._id.toString(),
      studentId: student.enrolmentNumber,
      name: student.fullName,
      department: student.programme,
      currentBorrowedCount: 0,
      maxBorrowLimit: 5,
    };
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

    if (dto.fullName || dto.name) {
      student.fullName = (dto.fullName || dto.name)!.trim();
    }
    if (dto.programme || dto.department) {
      student.programme = (dto.programme || dto.department)!.trim();
    }
    if (dto.semester !== undefined) {
      student.semester = dto.semester;
    }
    if (dto.phone !== undefined) {
      student.phone = dto.phone;
    }
    if (dto.address !== undefined) {
      student.address = dto.address;
    }
    if (dto.isActive !== undefined) {
      student.isActive = dto.isActive;
    }

    if (dto.email && dto.email.toLowerCase() !== student.email) {
      const emailLower = dto.email.toLowerCase().trim();
      const existingEmail = await User.findOne({ email: emailLower, _id: { $ne: student.user } });
      if (existingEmail) throw createError(`Email ${emailLower} is already taken`, 409);
      student.email = emailLower;
    }

    await student.save();

    // Synchronize changes to User model
    const userUpdates: any = {};
    if (dto.fullName || dto.name) userUpdates.fullName = student.fullName;
    if (dto.email) userUpdates.email = student.email;
    if (dto.isActive !== undefined) userUpdates.isActive = student.isActive;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(student.user, userUpdates);
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.STUDENT_UPDATED,
      actor: actorId,
      actorRole,
      entityType: 'Student',
      entityId: student._id,
      previousValue: previous,
      newValue: dto,
      remarks: 'Student profile updated',
    });

    return {
      ...student.toObject(),
      id: student._id.toString(),
      studentId: student.enrolmentNumber,
      name: student.fullName,
      department: student.programme,
      maxBorrowLimit: 5,
    };
  }
}

export const studentService = new StudentService();
