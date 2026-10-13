import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { processReturn, getReturnHistory } from './return.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const returnItemSchema = z.object({
  lineId: z.string().optional(),
  issueLineId: z.string().optional(),
  quantityReturned: z.number().int().min(1).optional(),
  condition: z.enum(['good', 'damaged', 'lost']).optional(),
  conditionOnReturn: z.enum(['good', 'damaged', 'lost']).optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
});

const returnSchema = z
  .object({
    issueId: z.string().optional(),
    issueLineId: z.string().optional(),
    lineId: z.string().optional(),
    quantityReturned: z.number().int().min(1).optional(),
    condition: z.enum(['good', 'damaged', 'lost']).optional(),
    conditionOnReturn: z.enum(['good', 'damaged', 'lost']).optional(),
    notes: z.string().optional(),
    remarks: z.string().optional(),
    returnDate: z.string().optional(),
    items: z.array(returnItemSchema).optional(),
  })
  .refine(
    (d) =>
      (d.items && d.items.length > 0) ||
      d.issueLineId ||
      d.lineId,
    {
      message: 'Either items array or single line ID must be specified',
    }
  );

router.post('/', authorize('coordinator', 'admin'), validateBody(returnSchema), processReturn);
router.get('/', authorize('coordinator', 'admin'), getReturnHistory);

export default router;
