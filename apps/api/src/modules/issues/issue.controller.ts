import { Response } from 'express';
import { issueService } from './issue.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const createIssue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const issue = await issueService.createIssue(req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, issue, 'Items issued successfully', 201);
});

export const getAllIssues = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, studentId, overdueOnly, search } = req.query as any;
  const { records, total } = await issueService.getAll({
    page,
    limit,
    skip,
    status,
    studentId,
    overdueOnly,
    search,
  });
  sendPaginated(res, records, total, page, limit);
});

export const getIssueById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await issueService.getById(req.params.id);

  // BOLA/IDOR protection: Students can only view their own issue records
  if (req.user!.role === 'student') {
    const studentOwnerId =
      record.student && typeof record.student === 'object'
        ? (record.student._id || record.student.id)?.toString()
        : record.student?.toString();

    let studentProfileId = req.user!.studentProfileId;
    if (!studentProfileId) {
      const student = await (await import('../students/student.model')).Student.findOne({ user: req.user!.userId });
      if (student) studentProfileId = student._id.toString();
    }

    if (!studentOwnerId || studentOwnerId !== studentProfileId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: You can only view your own borrowing records.',
      });
    }
  }

  sendSuccess(res, record);
});

export const getMyIssues = asyncHandler(async (req: AuthRequest, res: Response) => {
  let studentId = req.user!.studentProfileId;
  if (!studentId && req.user!.role === 'student') {
    // Lookup student by user
    const student = await (await import('../students/student.model')).Student.findOne({ user: req.user!.userId });
    if (student) studentId = student._id.toString();
  }
  if (!studentId) return sendSuccess(res, []);
  const records = await issueService.getStudentIssues(studentId);
  sendSuccess(res, records);
});

export const getOverdueItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const records = await issueService.getOverdueIssues();
  sendSuccess(res, records);
});

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await issueService.getDashboardStats();
  sendSuccess(res, stats);
});
