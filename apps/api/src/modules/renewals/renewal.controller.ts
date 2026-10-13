import { Response } from 'express';
import { renewalService } from './renewal.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const requestRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { issueLineId } = req.body;
  const renewal = await renewalService.requestRenewal(
    issueLineId,
    req.user!.userId,
    req.user!.studentProfileId!
  );
  sendSuccess(res, renewal, 'Renewal request submitted', 201);
});

export const approveRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const renewal = await renewalService.approveRenewal(
    req.params.id,
    req.body.remarks || '',
    req.user!.userId,
    req.user!.role
  );
  sendSuccess(res, renewal, 'Renewal approved');
});

export const rejectRenewal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const renewal = await renewalService.rejectRenewal(
    req.params.id,
    req.body.remarks || '',
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
