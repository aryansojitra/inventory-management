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
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

// 1. Dashboard / Executive Summary Report (called by DashboardPage via /reports/summary)
router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalItems,
      activeIssues,
      overdueLines,
      pendingRenewals,
      lowStockItems,
      damagedCount,
      lostCount,
      categoryAgg,
    ] = await Promise.all([
      InventoryItem.countDocuments({ isRetired: false }),
      IssueRecord.countDocuments({
        status: { $in: ['active', 'partially_returned', 'overdue'] },
      }),
      IssueLine.countDocuments({
        status: { $in: ['active', 'overdue'] },
        outstandingQty: { $gt: 0 },
        dueDate: { $lt: today },
      }),
      RenewalRequest.countDocuments({ status: 'pending' }),
      InventoryItem.countDocuments({
        trackingMode: 'quantity',
        isRetired: false,
        availableQty: { $lte: 5 },
      }),
      InventoryItem.aggregate([{ $group: { _id: null, total: { $sum: '$damagedQty' } } }]),
      InventoryItem.aggregate([{ $group: { _id: null, total: { $sum: '$lostQty' } } }]),
      InventoryItem.aggregate([
        { $match: { isRetired: false } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalQty: { $sum: '$totalStock' },
          },
        },
      ]),
    ]);

    const recentRecords = await IssueRecord.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'fullName enrolmentNumber programme')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category' },
          { path: 'individualAsset', select: 'assetId' },
        ],
      })
      .lean();

    const normalizedRecent = recentRecords.map((r: any) => ({
      ...r,
      id: r._id.toString(),
      issueNumber: r.issueNumber || `ISS-${r._id.toString().slice(-6).toUpperCase()}`,
      studentId: r.student,
    }));

    const summary = {
      totalItems,
      totalAssets: totalItems,
      activeIssues,
      overdueLines,
      lowStockItems,
      pendingRenewals,
      damagedItems: damagedCount[0]?.total || 0,
      lostItems: lostCount[0]?.total || 0,
      categoryBreakdown: categoryAgg,
      conditionBreakdown: [],
      recentIssues: normalizedRecent,
      overdueIssues: normalizedRecent.filter((i) => i.status === 'overdue'),
    };

    sendSuccess(res, summary, 'Dashboard summary report');
  })
);

// 2. Inventory Health & Summary Report
const handleInventorySummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = await InventoryItem.find({ isRetired: false })
    .populate('location', 'locationCode room building department')
    .lean();

  const summary = items.map((item) => ({
    ...item,
    id: item._id.toString(),
    sku: item.itemCode,
    totalStock: item.trackingMode === 'quantity' ? item.totalStock : item.totalAssets,
    availableQty: item.trackingMode === 'quantity' ? item.availableQty : item.availableAssets,
    totalQuantity: item.trackingMode === 'quantity' ? item.totalStock : item.totalAssets,
    availableQuantity: item.trackingMode === 'quantity' ? item.availableQty : item.availableAssets,
    issuedQuantity: item.issuedQty,
    damagedQuantity: item.damagedQty,
    lostQuantity: item.lostQty,
    maintenanceQuantity: item.maintenanceQty,
  }));

  sendSuccess(res, summary, 'Inventory summary report');
});

router.get('/inventory-summary', handleInventorySummary);
router.get('/inventory-health', handleInventorySummary);

// 3. Overdue Report
router.get(
  '/overdue',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLines = await IssueLine.find({
      status: { $in: ['active', 'overdue'] },
      outstandingQty: { $gt: 0 },
      dueDate: { $lt: today },
    })
      .populate({
        path: 'issueRecord',
        populate: {
          path: 'student',
          select: 'fullName enrolmentNumber email phone programme',
        },
      })
      .populate('inventoryItem', 'name itemCode category')
      .populate('individualAsset', 'assetId serialNumber')
      .lean();

    const result = overdueLines.map((line) => ({
      ...line,
      id: line._id.toString(),
      overdueDays: calculateOverdueDays(line.dueDate, today),
      studentId: (line.issueRecord as any)?.student,
      itemId: line.inventoryItem,
      assetId: line.individualAsset,
    }));

    sendSuccess(res, result, 'Overdue report');
  })
);

// 4. Student Borrowing Report
router.get(
  '/student-borrowing',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { studentId } = req.query as any;
    const filter: any = {};
    if (studentId) filter.student = studentId;

    const records = await IssueRecord.find(filter)
      .populate('student', 'fullName enrolmentNumber programme semester')
      .populate('issuedBy', 'fullName email')
      .populate({
        path: 'lines',
        populate: {
          path: 'inventoryItem individualAsset',
          select: 'name itemCode assetId',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = records.map((r: any) => ({
      ...r,
      id: r._id.toString(),
      issueNumber: r.issueNumber || `ISS-${r._id.toString().slice(-6).toUpperCase()}`,
      studentId: r.student,
    }));

    sendSuccess(res, mapped, 'Student borrowing report');
  })
);

// 5. Item Issue History
router.get(
  '/item-history/:itemId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lines = await IssueLine.find({ inventoryItem: req.params.itemId })
      .populate({
        path: 'issueRecord',
        populate: { path: 'student', select: 'fullName enrolmentNumber' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const returns = await ReturnTransaction.find({ inventoryItem: req.params.itemId })
      .populate('student', 'fullName enrolmentNumber')
      .populate('receivedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { lines, returns }, 'Item issue history');
  })
);

// 6. Stock Adjustment History
router.get(
  '/stock-adjustments',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { inventoryItemId } = req.query as any;
    const filter: any = {};
    if (inventoryItemId) filter.inventoryItem = inventoryItemId;

    const txns = await StockTransaction.find(filter)
      .populate('inventoryItem', 'name itemCode')
      .populate('performedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    sendSuccess(res, txns, 'Stock adjustment history');
  })
);

// 7. Renewals History
router.get(
  '/renewals',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const renewals = await RenewalRequest.find()
      .populate('student', 'fullName enrolmentNumber programme')
      .populate('decidedBy', 'fullName email')
      .populate({
        path: 'issueLine',
        populate: { path: 'inventoryItem', select: 'name itemCode' },
      })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, renewals, 'Renewal history');
  })
);

// 8. Condition Items (Damaged, Lost, and Maintenance) - Fixed to include damaged assets
router.get(
  '/condition-items',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [qtyItems, individualAssets] = await Promise.all([
      InventoryItem.find({
        isRetired: false,
        $or: [
          { damagedQty: { $gt: 0 } },
          { lostQty: { $gt: 0 } },
          { maintenanceQty: { $gt: 0 } },
        ],
      }).lean(),
      IndividualAsset.find({
        $or: [
          { condition: { $in: ['damaged', 'lost', 'maintenance'] } },
          { status: { $in: ['maintenance', 'retired'] } },
        ],
      })
        .populate('inventoryItem', 'name itemCode category')
        .populate('location', 'locationCode room')
        .lean(),
    ]);

    sendSuccess(
      res,
      { quantityBased: qtyItems, individualAssets },
      'Condition-based items'
    );
  })
);

// 9. Retired Items
router.get(
  '/retired',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await InventoryItem.find({ isRetired: true })
      .populate('retiredBy', 'fullName')
      .lean();

    sendSuccess(res, items, 'Retired items');
  })
);

// 10. Programme-wise activity
router.get(
  '/programme-activity',
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
              $cond: [
                { $in: ['$status', ['active', 'partially_returned', 'overdue']] },
                1,
                0,
              ],
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
  })
);

export default router;
