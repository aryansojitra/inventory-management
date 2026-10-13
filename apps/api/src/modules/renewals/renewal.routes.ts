import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { requestRenewal, approveRenewal, rejectRenewal, getAllRenewals } from './renewal.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const requestSchema = z
  .object({
    issueLineId: z.string().optional(),
    lineId: z.string().optional(),
    issueId: z.string().optional(),
    reason: z.string().optional(),
    remarks: z.string().optional(),
    daysRequested: z.number().int().min(1).optional(),
  })
  .refine((d) => d.issueLineId || d.lineId, {
    message: 'issueLineId or lineId is required',
  });

const reviewSchema = z.object({
  remarks: z.string().optional(),
  reviewNotes: z.string().optional(),
});

router.post('/request', authorize('student', 'coordinator', 'admin'), validateBody(requestSchema), requestRenewal);
router.post('/', authorize('student', 'coordinator', 'admin'), validateBody(requestSchema), requestRenewal);

router.patch('/:id/approve', authorize('coordinator', 'admin'), validateBody(reviewSchema), approveRenewal);
router.post('/:id/approve', authorize('coordinator', 'admin'), validateBody(reviewSchema), approveRenewal);

router.patch('/:id/reject', authorize('coordinator', 'admin'), validateBody(reviewSchema), rejectRenewal);
router.post('/:id/reject', authorize('coordinator', 'admin'), validateBody(reviewSchema), rejectRenewal);

router.get('/', getAllRenewals);

export default router;
