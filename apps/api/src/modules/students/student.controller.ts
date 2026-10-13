import { Response } from 'express';
import { studentService } from './student.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const getAllStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, programme, department, isActive } = req.query as any;
  const { students, total } = await studentService.getAll({
    page,
    limit,
    skip,
    search,
    programme,
    department,
    isActive,
  });
  sendPaginated(res, students, total, page, limit);
});

export const getStudentById = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role === 'student') {
    const student = await studentService.getById(req.params.id);
    if (student._id.toString() !== req.user.studentProfileId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own profile.' });
    }
    return sendSuccess(res, student);
  }
  const student = await studentService.getById(req.params.id);
  sendSuccess(res, student);
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await studentService.create(req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, student, 'Student registered successfully', 201);
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await studentService.update(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, student, 'Student updated successfully');
});
