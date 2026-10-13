import { Response } from 'express';
import { renewalService } from './renewal.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const requestRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  let studentProfileId = req.user!.studentProfileId;
  if (!studentProfileId && req.user!.role === 'student') {
    const student = await (await import('../students/student.model')).Student.findOne({ user: req.user!.userId });
    if (student) studentProfileId = student._id.toString();
  }
  const renewal = await renewalService.requestRenewal(
    req.body,
    req.user!.userId,
    studentProfileId
  );
  sendSuccess(res, renewal, 'Renewal request submitted successfully', 201);
});

export const approveRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = req.body.reviewNotes || req.body.remarks || '';
  const renewal = await renewalService.approveRenewal(
    req.params.id,
    remarks,
    req.user!.userId,
    req.user!.role
  );
  sendSuccess(res, renewal, 'Renewal approved successfully');
});

export const rejectRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = req.body.reviewNotes || req.body.remarks || '';
  const renewal = await renewalService.rejectRenewal(
    req.params.id,
    remarks,
    req.user!.userId,
    req.user!.role
  );
  sendSuccess(res, renewal, 'Renewal rejected');
});

export const getAllRenewals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, studentId } = req.query as any;
  const { renewals, total } = await renewalService.getAll({ page, limit, skip, status, studentId });
  sendPaginated(res, renewals, total, page, limit);
});
