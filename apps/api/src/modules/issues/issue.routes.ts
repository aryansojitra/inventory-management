import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  getMyIssues,
  getOverdueItems,
  getDashboardStats,
} from './issue.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const issueLineSchema = z
  .object({
    inventoryItemId: z.string().optional(),
    itemId: z.string().optional(),
    individualAssetId: z.string().optional(),
    assetId: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (d) =>
      d.inventoryItemId || d.itemId || d.individualAssetId || d.assetId,
    {
      message: 'Each line must specify an item or asset ID',
    }
  );

const createIssueSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(issueLineSchema).min(1, 'At least one line item is required'),
  issueDate: z.string().optional(),
  expectedReturnDate: z.string().optional(),
});

router.get('/dashboard', authorize('coordinator', 'admin'), getDashboardStats);
router.get('/overdue', authorize('coordinator', 'admin'), getOverdueItems);
router.get('/my', authorize('student'), getMyIssues);
router.get('/', authorize('coordinator', 'admin'), getAllIssues);
router.post('/', authorize('coordinator', 'admin'), validateBody(createIssueSchema), createIssue);
router.get('/:id', getIssueById);

export default router;
