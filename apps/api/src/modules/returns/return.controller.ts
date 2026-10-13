import { Response } from 'express';
import { returnService } from './return.service';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const processReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const returnTx = await returnService.processReturn(req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, returnTx, 'Return processed successfully', 201);
});

export const getReturnHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { studentId, issueRecordId } = req.query as any;
  const { returns, total } = await returnService.getReturnHistory({ page, limit, skip, studentId, issueRecordId });
  sendPaginated(res, returns, total, page, limit);
});
