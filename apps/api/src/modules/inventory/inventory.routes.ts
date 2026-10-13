import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  getAllInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  addStock,
  adjustStock,
  retireInventory,
  getCategories,
} from './inventory.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  itemCode: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trackingMode: z.enum(['individual', 'quantity']),
  locationId: z.string().optional(),
  location: z.string().optional(),
  initialQty: z.number().int().min(0).optional(),
  totalQuantity: z.number().int().min(0).optional(),
  policy: z
    .object({
      maxRenewals: z.number().int().min(0).optional(),
      borrowingDays: z.number().int().min(1).optional(),
    })
    .optional(),
}).refine((d) => d.itemCode || d.sku, {
  message: 'Item code or SKU is required',
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  locationId: z.string().optional(),
  location: z.string().optional(),
  policy: z
    .object({
      maxRenewals: z.number().int().min(0).optional(),
      borrowingDays: z.number().int().min(1).optional(),
    })
    .optional(),
});

const addStockSchema = z.object({
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
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
router.put('/:id', authorize('coordinator', 'admin'), validateBody(updateSchema), updateInventoryItem);
router.post('/:id/stock', authorize('coordinator', 'admin'), validateBody(addStockSchema), addStock);
router.post('/:id/adjust', authorize('coordinator', 'admin'), validateBody(adjustStockSchema), adjustStock);
router.post('/:id/retire', authorize('coordinator', 'admin'), validateBody(z.object({ reason: z.string().min(1) })), retireInventory);

export default router;
