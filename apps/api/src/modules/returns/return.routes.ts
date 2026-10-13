import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { processReturn, getReturnHistory } from './return.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const returnSchema = z.object({
  issueLineId: z.string().min(1),
  quantityReturned: z.number().int().min(1),
  conditionOnReturn: z.enum(['good', 'damaged', 'lost']),
  remarks: z.string().optional(),
  returnDate: z.string().optional(),
});

router.post('/', authorize('coordinator', 'admin'), validateBody(returnSchema), processReturn);
router.get('/', authorize('coordinator', 'admin'), getReturnHistory);

export default router;
