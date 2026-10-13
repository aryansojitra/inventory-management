import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { AuditLog } from './auditLog.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { action, entityType, actorId } = req.query as any;

    const filter: any = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (actorId) filter.actor = actorId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'fullName email role')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const mapped = logs.map((log) => {
      const actorObj: any = log.actor;
      return {
        ...log,
        id: log._id.toString(),
        userId: actorObj
          ? {
              id: actorObj._id?.toString(),
              name: actorObj.fullName,
              fullName: actorObj.fullName,
              email: actorObj.email,
              role: actorObj.role,
            }
          : null,
        oldValues: log.previousValue,
        newValues: log.newValue,
        metadata: { remarks: log.remarks },
      };
    });

    sendPaginated(res, mapped, total, page, limit);
  })
);

export default router;
