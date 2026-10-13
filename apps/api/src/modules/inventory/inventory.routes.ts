import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  getAllInventory, getInventoryById, createInventoryItem,
  addStock, adjustStock, retireInventory, getCategories
} from './inventory.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  itemCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trackingMode: z.enum(['individual', 'quantity']),
  locationId: z.string().min(1),
  initialQty: z.number().int().min(0).optional(),
  policy: z.object({
    maxRenewals: z.number().int().min(0).optional(),
    borrowingDays: z.number().int().min(1).optional(),
  }).optional(),
});

const addStockSchema = z.object({
  quantity: z.number().int().min(1),
  reason: z.string().min(1),
});

const adjustStockSchema = z.object({
  field: z.enum(['damagedQty', 'lostQty', 'maintenanceQty', 'retiredQty']),
  quantity: z.number().int().min(1),
  reason: z.string().min(1),
  transactionType: z.string().min(1),
});

router.get('/categories', getCategories);
router.get('/', getAllInventory);
router.post('/', authorize('coordinator', 'admin'), validateBody(createSchema), createInventoryItem);
router.get('/:id', getInventoryById);
router.post('/:id/stock', authorize('coordinator', 'admin'), validateBody(addStockSchema), addStock);
router.post('/:id/adjust', authorize('coordinator', 'admin'), validateBody(adjustStockSchema), adjustStock);
router.post('/:id/retire', authorize('coordinator', 'admin'), validateBody(z.object({ reason: z.string().min(1) })), retireInventory);

export default router;
