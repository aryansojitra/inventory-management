import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination, createError } from '../../utils/apiUtils';
import { StorageLocation } from './location.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';
import { validateBody } from '../../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createLocationSchema = z
  .object({
    locationCode: z.string().optional(),
    code: z.string().optional(),
    department: z.string().optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    name: z.string().optional(),
    shelf: z.string().optional(),
    cupboard: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => d.locationCode || d.code, {
    message: 'Location code is required',
  });

function normalizeLocation(loc: any) {
  return {
    ...loc,
    id: loc._id.toString(),
    code: loc.locationCode,
    name: loc.room ? `${loc.room} (${loc.department})` : loc.locationCode,
    shelf: loc.cupboard,
  };
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter: any = { isActive: true };

    const [locations, total] = await Promise.all([
      StorageLocation.find(filter).sort({ locationCode: 1 }).skip(skip).limit(limit).lean(),
      StorageLocation.countDocuments(filter),
    ]);
    sendPaginated(res, locations.map(normalizeLocation), total, page, limit);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const loc = await StorageLocation.findById(req.params.id).lean();
    if (!loc) throw createError('Location not found', 404);
    sendSuccess(res, normalizeLocation(loc));
  })
);

router.post(
  '/',
  authorize('coordinator', 'admin'),
  validateBody(createLocationSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const code = (req.body.locationCode || req.body.code || '').toUpperCase().trim();
    const existing = await StorageLocation.findOne({ locationCode: code });
    if (existing) {
      return res.status(409).json({ success: false, message: `Location code ${code} already exists` });
    }
    const loc = await StorageLocation.create({
      locationCode: code,
      department: req.body.department || 'Computer Science & Engineering',
      building: req.body.building || 'A Block',
      room: req.body.room || req.body.name || 'Lab 101',
      cupboard: req.body.cupboard || req.body.shelf || '',
      description: req.body.description || '',
      isActive: true,
    });
    sendSuccess(res, normalizeLocation(loc.toObject()), 'Location created successfully', 201);
  })
);

router.put(
  '/:id',
  authorize('coordinator', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const loc = await StorageLocation.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!loc) throw createError('Location not found', 404);
    sendSuccess(res, normalizeLocation(loc), 'Location updated successfully');
  })
);

export default router;
