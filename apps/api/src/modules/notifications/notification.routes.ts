import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../utils/apiUtils';
import { Notification } from './notification.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

// Get my notifications
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await Notification.find({ recipient: req.user!.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  sendSuccess(res, notifications);
}));

// Mark as read
router.put('/:id/read', asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user!.userId },
    { isRead: true }
  );
  sendSuccess(res, null, 'Marked as read');
}));

// Mark all as read
router.put('/read-all', asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ recipient: req.user!.userId, isRead: false }, { isRead: true });
  sendSuccess(res, null, 'All notifications marked as read');
}));

export default router;
