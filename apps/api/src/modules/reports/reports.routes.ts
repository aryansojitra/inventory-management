import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../utils/apiUtils';
import { InventoryItem } from '../inventory/inventory.model';
import { IssueRecord, IssueLine } from '../issues/issue.model';
import { Student } from '../students/student.model';
import { StockTransaction } from '../stock-adjustments/stockTransaction.model';
import { ReturnTransaction } from '../returns/return.model';
import { RenewalRequest } from '../renewals/renewal.model';
import { IndividualAsset } from '../assets/asset.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Response } from 'express';
import { calculateOverdueDays } from '../../utils/dateUtils';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

// Inventory Summary Report
router.get('/inventory-summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = await InventoryItem.find({ isRetired: false })
    .populate('location', 'locationCode room')
    .lean();

  const summary = items.map((item) => ({
    itemCode: item.itemCode,
    name: item.name,
    category: item.category,
    trackingMode: item.trackingMode,
    totalStock: item.trackingMode === 'quantity' ? item.totalStock : item.totalAssets,
    availableQty: item.trackingMode === 'quantity' ? item.availableQty : item.availableAssets,
    issuedQty: item.issuedQty,
    damagedQty: item.damagedQty,
    lostQty: item.lostQty,
    maintenanceQty: item.maintenanceQty,
    location: item.location,
  }));

  sendSuccess(res, summary, 'Inventory summary report');
}));

// Overdue Report
router.get('/overdue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueLines = await IssueLine.find({
    status: { $in: ['active', 'overdue'] },
    outstandingQty: { $gt: 0 },
    dueDate: { $lt: today },
  })
    .populate({ path: 'issueRecord', populate: { path: 'student', select: 'fullName enrolmentNumber email phone programme' } })
    .populate('inventoryItem', 'name itemCode category')
    .populate('individualAsset', 'assetId serialNumber')
    .lean();

  const result = overdueLines.map((line) => ({
    ...line,
    overdueDays: calculateOverdueDays(line.dueDate, today),
  }));

  sendSuccess(res, result, 'Overdue report');
}));

// Student borrowing report
router.get('/student-borrowing', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.query as any;
  const filter: any = {};
  if (studentId) filter.student = studentId;

  const records = await IssueRecord.find(filter)
    .populate('student', 'fullName enrolmentNumber programme semester')
    .populate('issuedBy', 'fullName')
    .populate({ path: 'lines', populate: { path: 'inventoryItem individualAsset', select: 'name itemCode assetId' } })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, records, 'Student borrowing report');
}));

// Item issue history
router.get('/item-history/:itemId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const lines = await IssueLine.find({ inventoryItem: req.params.itemId })
    .populate({ path: 'issueRecord', populate: { path: 'student', select: 'fullName enrolmentNumber' } })
    .sort({ createdAt: -1 })
    .lean();

  const returns = await ReturnTransaction.find({ inventoryItem: req.params.itemId })
    .populate('student', 'fullName enrolmentNumber')
    .populate('receivedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { lines, returns }, 'Item issue history');
}));

// Stock adjustment history
router.get('/stock-adjustments', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { inventoryItemId } = req.query as any;
  const filter: any = {};
  if (inventoryItemId) filter.inventoryItem = inventoryItemId;

  const txns = await StockTransaction.find(filter)
    .populate('inventoryItem', 'name itemCode')
    .populate('performedBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  sendSuccess(res, txns, 'Stock adjustment history');
}));

// Renewal history
router.get('/renewals', asyncHandler(async (req: AuthRequest, res: Response) => {
  const renewals = await RenewalRequest.find()
    .populate('student', 'fullName enrolmentNumber')
    .populate('decidedBy', 'fullName')
    .populate({ path: 'issueLine', populate: { path: 'inventoryItem', select: 'name itemCode' } })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, renewals, 'Renewal history');
}));

// Damaged / maintenance / lost items
router.get('/condition-items', asyncHandler(async (req: AuthRequest, res: Response) => {
  const [qtyItems, individualAssets] = await Promise.all([
    InventoryItem.find({
      isRetired: false,
      $or: [{ damagedQty: { $gt: 0 } }, { lostQty: { $gt: 0 } }, { maintenanceQty: { $gt: 0 } }],
    }).lean(),
    IndividualAsset.find({ status: { $in: ['maintenance', 'retired'] } })
      .populate('inventoryItem', 'name itemCode')
      .lean(),
  ]);

  sendSuccess(res, { quantityBased: qtyItems, individualAssets }, 'Condition-based items');
}));

// Retirement history
router.get('/retired', asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = await InventoryItem.find({ isRetired: true })
    .populate('retiredBy', 'fullName')
    .lean();

  sendSuccess(res, items, 'Retired items');
}));

// Programme-wise activity
router.get('/programme-activity', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await IssueRecord.aggregate([
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentData',
      },
    },
    { $unwind: '$studentData' },
    {
      $group: {
        _id: '$studentData.programme',
        totalIssues: { $sum: 1 },
        activeIssues: {
          $sum: {
            $cond: [{ $in: ['$status', ['active', 'partially_returned', 'overdue']] }, 1, 0],
          },
        },
        students: { $addToSet: '$student' },
      },
    },
    {
      $project: {
        programme: '$_id',
        totalIssues: 1,
        activeIssues: 1,
        uniqueStudents: { $size: '$students' },
      },
    },
  ]);

  sendSuccess(res, result, 'Programme-wise activity');
}));

export default router;
