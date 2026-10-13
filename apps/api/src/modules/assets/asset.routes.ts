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

const createAssetSchema = z.object({
  assetId: z.string().min(1),
  serialNumber: z.string().optional(),
  inventoryItemId: z.string().min(1),
  locationId: z.string().min(1),
  condition: z.enum(['good', 'damaged', 'maintenance', 'lost', 'retired']).optional(),
  notes: z.string().optional(),
});

const updateConditionSchema = z.object({
  condition: z.enum(['good', 'damaged', 'maintenance', 'lost', 'retired']),
  reason: z.string().min(1),
});

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { inventoryItemId, status, condition } = req.query as any;
  const { assets, total } = await assetService.getAll({ page, limit, skip, inventoryItemId, status, condition });
  sendPaginated(res, assets, total, page, limit);
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const asset = await assetService.getById(req.params.id);
  sendSuccess(res, asset);
}));

router.post('/', authorize('coordinator', 'admin'), validateBody(createAssetSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const asset = await assetService.create(req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, asset, 'Asset created', 201);
}));

router.put('/:id/condition', authorize('coordinator', 'admin'), validateBody(updateConditionSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const asset = await assetService.updateCondition(req.params.id, req.body, req.user!.userId, req.user!.role);
  sendSuccess(res, asset, 'Asset condition updated');
}));

export default router;
