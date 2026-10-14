import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, sendPaginated, parsePagination } from '../../utils/apiUtils';
import { StockTransaction } from './stockTransaction.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { inventoryItemId, itemId, transactionType } = req.query as any;

    const filter: any = {};
    const targetItem = inventoryItemId || itemId;
    if (targetItem) filter.inventoryItem = targetItem;
    if (transactionType) filter.transactionType = transactionType;

    const [transactions, total] = await Promise.all([
      StockTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('inventoryItem', 'name itemCode category')
        .populate('performedBy', 'fullName email')
        .lean(),
      StockTransaction.countDocuments(filter),
    ]);

    const mapped = transactions.map((tx: any) => ({
      ...tx,
      id: tx._id.toString(),
      transactionNumber: `TXN-${tx._id.toString().slice(-6).toUpperCase()}`,
      itemId: tx.inventoryItem,
      type: tx.transactionType,
      quantityDelta: tx.quantityChange,
      previousQuantity: tx.previousValue || 0,
      newQuantity: tx.newValue || 0,
      previousBucket: tx.fieldAffected || 'availableQty',
      newBucket: `${tx.previousValue || 0} → ${tx.newValue || 0} (${tx.fieldAffected || 'availableQty'})`,
      fieldAffected: tx.fieldAffected,
    }));

    sendPaginated(res, mapped, total, page, limit);
  })
);

export default router;
