import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { StockTransaction } from './stockTransaction.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { inventoryItemId, transactionType } = req.query as any;

  const filter: any = {};
  if (inventoryItemId) filter.inventoryItem = inventoryItemId;
  if (transactionType) filter.transactionType = transactionType;

  const [transactions, total] = await Promise.all([
    StockTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('inventoryItem', 'name itemCode')
      .populate('performedBy', 'fullName')
      .lean(),
    StockTransaction.countDocuments(filter),
  ]);

  sendPaginated(res, transactions, total, page, limit);
}));

export default router;
