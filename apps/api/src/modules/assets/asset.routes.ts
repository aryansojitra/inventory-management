import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { assetService } from './asset.service';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

const createAssetSchema = z
  .object({
    assetId: z.string().optional(),
    assetTag: z.string().optional(),
    serialNumber: z.string().optional(),
    inventoryItemId: z.string().optional(),
    itemId: z.string().optional(),
    locationId: z.string().optional(),
    condition: z.enum(['good', 'damaged', 'maintenance', 'lost', 'retired']).optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.assetId || d.assetTag, {
    message: 'Asset ID or Asset Tag is required',
  })
  .refine((d) => d.inventoryItemId || d.itemId, {
    message: 'Parent inventory item is required',
  });

const updateConditionSchema = z.object({
  condition: z.enum(['good', 'damaged', 'maintenance', 'lost', 'retired']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { inventoryItemId, itemId, status, condition, search } = req.query as any;
    const { assets, total } = await assetService.getAll({
      page,
      limit,
      skip,
      inventoryItemId,
      itemId,
      status,
      condition,
      search,
    });
    sendPaginated(res, assets, total, page, limit);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await assetService.getById(req.params.id);
    sendSuccess(res, asset);
  })
);

router.post(
  '/',
  authorize('coordinator', 'admin'),
  validateBody(createAssetSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await assetService.create(req.body, req.user!.userId, req.user!.role);
    sendSuccess(res, asset, 'Asset created successfully', 201);
  })
);

const handleUpdateCondition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const asset = await assetService.updateCondition(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, asset, 'Asset condition updated successfully');
});

router.put('/:id/condition', authorize('coordinator', 'admin'), validateBody(updateConditionSchema), handleUpdateCondition);
router.patch('/:id/condition', authorize('coordinator', 'admin'), validateBody(updateConditionSchema), handleUpdateCondition);

export default router;
