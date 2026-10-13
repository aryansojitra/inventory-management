import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { requestRenewal, approveRenewal, rejectRenewal, getAllRenewals } from './renewal.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', authorize('coordinator', 'admin'), getAllRenewals);
router.post('/', authorize('student'), validateBody(z.object({ issueLineId: z.string().min(1) })), requestRenewal);
router.put('/:id/approve', authorize('coordinator', 'admin'), validateBody(z.object({ remarks: z.string().optional() })), approveRenewal);
router.put('/:id/reject', authorize('coordinator', 'admin'), validateBody(z.object({ remarks: z.string().min(1) })), rejectRenewal);

export default router;
