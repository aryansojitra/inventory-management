import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../utils/apiUtils';
import { Notification } from './notification.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

// Get my notifications
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await Notification.find({ recipient: req.user!.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = notifications.map((n) => ({
      ...n,
      id: n._id.toString(),
      userId: n.recipient,
    }));

    sendSuccess(res, mapped);
  })
);

// Mark as read (support both PUT and PATCH)
const handleMarkAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user!.userId },
    { isRead: true }
  );
  sendSuccess(res, null, 'Marked as read');
});

router.put('/:id/read', handleMarkAsRead);
router.patch('/:id/read', handleMarkAsRead);

// Mark all as read (support both PUT and PATCH)
const handleMarkAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ recipient: req.user!.userId, isRead: false }, { isRead: true });
  sendSuccess(res, null, 'All notifications marked as read');
});

router.put('/read-all', handleMarkAllRead);
router.patch('/read-all', handleMarkAllRead);

export default router;
