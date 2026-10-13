import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { StorageLocation } from './location.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';
import { validateBody } from '../../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createLocationSchema = z.object({
  locationCode: z.string().min(1),
  department: z.string().min(1),
  building: z.string().optional(),
  room: z.string().min(1),
  cupboard: z.string().optional(),
  description: z.string().optional(),
});

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter: any = { isActive: true };

  const [locations, total] = await Promise.all([
    StorageLocation.find(filter).sort({ locationCode: 1 }).skip(skip).limit(limit).lean(),
    StorageLocation.countDocuments(filter),
  ]);
  sendPaginated(res, locations, total, page, limit);
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const loc = await StorageLocation.findById(req.params.id).lean();
  if (!loc) return sendSuccess(res, null, 'Location not found');
  sendSuccess(res, loc);
}));

router.post('/', authorize('coordinator', 'admin'), validateBody(createLocationSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await StorageLocation.findOne({ locationCode: req.body.locationCode.toUpperCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Location code already exists' });
  }
  const loc = await StorageLocation.create({ ...req.body, locationCode: req.body.locationCode.toUpperCase() });
  sendSuccess(res, loc, 'Location created', 201);
}));

router.put('/:id', authorize('coordinator', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const loc = await StorageLocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  sendSuccess(res, loc, 'Location updated');
}));

export default router;
