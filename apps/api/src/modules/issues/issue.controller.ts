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
  const { status, studentId } = req.query as any;
  const { records, total } = await issueService.getAll({ page, limit, skip, status, studentId });
  sendPaginated(res, records, total, page, limit);
});

export const getIssueById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await issueService.getById(req.params.id);
  sendSuccess(res, record);
});

export const getMyIssues = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.studentProfileId;
  if (!studentId) return sendSuccess(res, []);
  const records = await issueService.getStudentIssues(studentId);
  sendSuccess(res, records);
});

export const getOverdueItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lines = await issueService.getOverdueLines();
  sendSuccess(res, lines);
});

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await issueService.getDashboardStats();
  sendSuccess(res, stats);
});
