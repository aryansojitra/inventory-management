import mongoose from 'mongoose';
import { IssueRecord, IssueLine } from './issue.model';
import { InventoryItem } from '../inventory/inventory.model';
import { IndividualAsset } from '../assets/asset.model';
import { Student } from '../students/student.model';
import { StockTransaction } from '../stock-adjustments/stockTransaction.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { Notification } from '../notifications/notification.model';
import { createError } from '../../utils/apiUtils';
import {
  calculateDueDate,
  calculateOverdueDays,
  isOverdue,
} from '../../utils/dateUtils';
import {
  AUDIT_ACTIONS,
  STOCK_TRANSACTION_TYPES,
  TRACKING_MODES,
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ISSUE_STATUSES,
  LINE_STATUSES,
  NOTIFICATION_TYPES,
} from '../../constants';

export interface IssueLineInput {
  inventoryItemId?: string;
  itemId?: string;
  individualAssetId?: string;
  assetId?: string;
  quantity?: number;
  dueDate?: string;
}

export interface CreateIssueDto {
  studentId: string;
  purpose?: string;
  notes?: string;
  lines: IssueLineInput[];
  issueDate?: Date | string;
  expectedReturnDate?: Date | string;
}

function normalizeLine(line: any, now: Date) {
  const lineDue = new Date(line.dueDate);
  const overdue = line.outstandingQty > 0 && lineDue < now;
  const overdueDays = overdue ? calculateOverdueDays(lineDue, now) : 0;
  return {
    ...line,
    id: line._id.toString(),
    itemId: line.inventoryItem,
    item: line.inventoryItem,
    assetId: line.individualAsset,
    asset: line.individualAsset,
    quantity: line.issuedQty,
    returnedQuantity: line.returnedQty,
    outstandingQuantity: line.outstandingQty,
    isOverdue: overdue,
    overdueDays,
  };
}

function normalizeRecord(record: any, now: Date) {
  const lines = (record.lines || []).map((l: any) =>
    typeof l === 'object' && l._id ? normalizeLine(l, now) : l
  );
  return {
    ...record,
    id: record._id.toString(),
    issueNumber: record.issueNumber || `ISS-${record._id.toString().slice(-6).toUpperCase()}`,
    studentId: record.student,
    lines,
  };
}

export class IssueService {
  async createIssue(dto: CreateIssueDto, actorId: string, actorRole: string) {
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const now = new Date();

    // 1. Validate student exists and is active
    const student = await Student.findOne({ _id: dto.studentId, isActive: true });
    if (!student) throw createError('Student not found or inactive', 404);

    // 2. Business Rule: Check for any overdue borrowings
    const studentOverdues = await IssueLine.aggregate([
      {
        $lookup: {
          from: 'issuerecords',
          localField: 'issueRecord',
          foreignField: '_id',
          as: 'rec',
        },
      },
      { $unwind: '$rec' },
      {
        $match: {
          'rec.student': student._id,
          outstandingQty: { $gt: 0 },
          dueDate: { $lt: now },
        },
      },
    ]);

    if (studentOverdues.length > 0) {
      throw createError(
        `Borrowing blocked: Student ${student.fullName} (${student.enrolmentNumber}) has ${studentOverdues.length} overdue item(s). All overdue equipment must be returned before new loans can be issued.`,
        409
      );
    }

    // 3. Calculate requested quantity
    let totalRequestedQty = 0;
    for (const line of dto.lines) {
      const q = line.individualAssetId || line.assetId ? 1 : Number(line.quantity) || 1;
      totalRequestedQty += q;
    }

    // 4. Business Rule: Enforce student borrowing quota (max 5 items)
    const activeLines = await IssueLine.aggregate([
      {
        $lookup: {
          from: 'issuerecords',
          localField: 'issueRecord',
          foreignField: '_id',
          as: 'rec',
        },
      },
      { $unwind: '$rec' },
      {
        $match: {
          'rec.student': student._id,
          outstandingQty: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$outstandingQty' } } },
    ]);

    const currentBorrowedCount = activeLines[0]?.total || 0;
    const maxLimit = 5;
    if (currentBorrowedCount + totalRequestedQty > maxLimit) {
      throw createError(
        `Student borrow limit reached! Student currently has ${currentBorrowedCount} item(s) on loan. Cannot borrow ${totalRequestedQty} more (Maximum allowed allowance: ${maxLimit}).`,
        409
      );
    }

    // 5. Pre-validate stock availability for all lines
    const parsedLines: any[] = [];
    for (const line of dto.lines) {
      const assetTargetId = line.individualAssetId || line.assetId;
      const itemTargetId = line.inventoryItemId || line.itemId;

      if (assetTargetId) {
        const asset = await IndividualAsset.findOne({
          _id: assetTargetId,
          status: ASSET_STATUSES.AVAILABLE,
          condition: ASSET_CONDITIONS.GOOD,
        });
        if (!asset) {
          throw createError(
            `Asset ${assetTargetId} is not available for issue (currently issued, damaged, or undergoing maintenance).`,
            409
          );
        }
        const item = await InventoryItem.findOne({ _id: asset.inventoryItem, isRetired: false });
        if (!item) throw createError('Parent inventory item not found or retired', 404);

        parsedLines.push({ type: 'individual', asset, item, qty: 1 });
      } else if (itemTargetId) {
        const qty = Number(line.quantity) || 1;
        if (qty < 1) throw createError('Quantity must be at least 1', 400);

        const item = await InventoryItem.findOne({
          _id: itemTargetId,
          trackingMode: TRACKING_MODES.QUANTITY,
          isRetired: false,
        });
        if (!item) throw createError('Inventory item not found or retired', 404);

        if (item.availableQty < qty) {
          throw createError(
            `Insufficient stock for ${item.name}. Requested: ${qty}, but only ${item.availableQty} available.`,
            409
          );
        }

        parsedLines.push({ type: 'quantity', item, qty });
      } else {
        throw createError('Each item in the loan cart must specify an item or an individual asset', 400);
      }
    }

    // 6. Create Issue Record
    const issueNumber = `ISS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const issueRecord = await IssueRecord.create({
      student: student._id,
      issuedBy: actorId,
      issueDate,
      purpose: dto.purpose || dto.notes || 'Lab practical work',
      status: ISSUE_STATUSES.ACTIVE,
      lines: [],
    });

    // 7. Atomic deduction of stock
    const createdLineIds: mongoose.Types.ObjectId[] = [];
    const rollbacks: Array<() => Promise<void>> = [];

    try {
      for (const lineDetail of parsedLines) {
        const dueDate = calculateDueDate(issueDate);

        if (lineDetail.type === 'individual') {
          const updatedAsset = await IndividualAsset.findOneAndUpdate(
            { _id: lineDetail.asset._id, status: ASSET_STATUSES.AVAILABLE },
            { $set: { status: ASSET_STATUSES.ISSUED, currentIssue: null } },
            { new: true }
          );

          if (!updatedAsset) {
            throw createError(`Asset ${lineDetail.asset.assetId} was allocated by another concurrent user`, 409);
          }

          rollbacks.push(async () => {
            await IndividualAsset.findByIdAndUpdate(lineDetail.asset._id, {
              status: ASSET_STATUSES.AVAILABLE,
              currentIssue: null,
            });
            await InventoryItem.findByIdAndUpdate(lineDetail.item._id, { $inc: { availableAssets: 1 } });
          });

          const issueLine = await IssueLine.create({
            issueRecord: issueRecord._id,
            inventoryItem: lineDetail.item._id,
            individualAsset: lineDetail.asset._id,
            issuedQty: 1,
            returnedQty: 0,
            outstandingQty: 1,
            issueDate,
            dueDate,
            renewalCount: 0,
            maxRenewals: lineDetail.item.policy?.maxRenewals ?? 3,
            status: LINE_STATUSES.ACTIVE,
          });

          await IndividualAsset.findByIdAndUpdate(lineDetail.asset._id, {
            currentIssue: issueLine._id,
          });
          await InventoryItem.findByIdAndUpdate(lineDetail.item._id, {
            $inc: { availableAssets: -1 },
          });

          createdLineIds.push(issueLine._id as mongoose.Types.ObjectId);
        } else {
          const updatedItem = await InventoryItem.findOneAndUpdate(
            { _id: lineDetail.item._id, availableQty: { $gte: lineDetail.qty } },
            { $inc: { availableQty: -lineDetail.qty, issuedQty: lineDetail.qty } },
            { new: true }
          );

          if (!updatedItem) {
            throw createError(
              `Insufficient stock for ${lineDetail.item.name} during atomic deduction. Please retry.`,
              409
            );
          }

          rollbacks.push(async () => {
            await InventoryItem.findByIdAndUpdate(lineDetail.item._id, {
              $inc: { availableQty: lineDetail.qty, issuedQty: -lineDetail.qty },
            });
          });

          await StockTransaction.create({
            inventoryItem: lineDetail.item._id,
            transactionType: STOCK_TRANSACTION_TYPES.ISSUANCE,
            quantityChange: -lineDetail.qty,
            fieldAffected: 'availableQty',
            previousValue: lineDetail.item.availableQty,
            newValue: updatedItem.availableQty,
            relatedIssue: issueRecord._id,
            reason: `Issued to student ${student.fullName} (${student.enrolmentNumber})`,
            performedBy: actorId,
          });

          const issueLine = await IssueLine.create({
            issueRecord: issueRecord._id,
            inventoryItem: lineDetail.item._id,
            individualAsset: null,
            issuedQty: lineDetail.qty,
            returnedQty: 0,
            outstandingQty: lineDetail.qty,
            issueDate,
            dueDate,
            renewalCount: 0,
            maxRenewals: lineDetail.item.policy?.maxRenewals ?? 3,
            status: LINE_STATUSES.ACTIVE,
          });

          createdLineIds.push(issueLine._id as mongoose.Types.ObjectId);
        }
      }

      // Link lines to issue record
      await IssueRecord.findByIdAndUpdate(issueRecord._id, { lines: createdLineIds });
    } catch (err) {
      // Execute rollbacks
      for (const rb of rollbacks) {
        try {
          await rb();
        } catch {}
      }
      await IssueRecord.findByIdAndDelete(issueRecord._id);
      throw err;
    }

    // 8. Fetch completed record
    const finalRecord = await IssueRecord.findById(issueRecord._id)
      .populate('student', 'fullName enrolmentNumber email programme phone')
      .populate('issuedBy', 'fullName email')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category totalStock availableQty' },
          { path: 'individualAsset', select: 'assetId serialNumber condition status' },
        ],
      })
      .lean();

    // 9. Write audit log
    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_ISSUED,
      actor: actorId,
      actorRole,
      entityType: 'IssueRecord',
      entityId: issueRecord._id,
      newValue: {
        issueNumber,
        studentId: student._id,
        studentName: student.fullName,
        itemsCount: createdLineIds.length,
      },
      remarks: dto.purpose || 'Laboratory issuance',
    });

    // 10. Student notification
    const studentUser = await mongoose.model('User').findOne({ studentProfile: student._id });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.ITEM_ISSUED,
        title: 'Equipment Issued Successfully',
        message: `${createdLineIds.length} item(s) issued. Return or request renewal on or before ${calculateDueDate(issueDate).toDateString()}.`,
        relatedIssue: issueRecord._id,
      });
    }

    return normalizeRecord(finalRecord, now);
  }

  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    status?: string;
    studentId?: string;
    overdueOnly?: boolean | string;
    search?: string;
  }): Promise<{ records: any[]; total: number }> {
    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.studentId) {
      filter.student = query.studentId;
    }

    const now = new Date();
    if (query.overdueOnly === true || query.overdueOnly === 'true') {
      filter.status = { $in: ['active', 'partially_returned', 'overdue'] };
    }

    const [rawRecords, total] = await Promise.all([
      IssueRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber programme phone email')
        .populate('issuedBy', 'fullName email')
        .populate({
          path: 'lines',
          populate: [
            { path: 'inventoryItem', select: 'name itemCode category' },
            { path: 'individualAsset', select: 'assetId serialNumber condition' },
          ],
        })
        .lean(),
      IssueRecord.countDocuments(filter),
    ]);

    let records = rawRecords.map((r) => normalizeRecord(r, now));

    if (query.search) {
      const q = query.search.toLowerCase();
      records = records.filter((r) => {
        const s = r.student;
        return (
          (s?.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s?.enrolmentNumber && s.enrolmentNumber.toLowerCase().includes(q)) ||
          (r.issueNumber && r.issueNumber.toLowerCase().includes(q))
        );
      });
    }

    return { records, total };
  }

  async getById(id: string): Promise<any> {
    const now = new Date();
    const record = await IssueRecord.findById(id)
      .populate('student', 'fullName enrolmentNumber email phone programme semester')
      .populate('issuedBy', 'fullName email')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category make model' },
          { path: 'individualAsset', select: 'assetId serialNumber condition' },
        ],
      })
      .lean();

    if (!record) throw createError('Issue record not found', 404);
    return normalizeRecord(record, now);
  }

  async getStudentIssues(studentId: string): Promise<any[]> {
    const now = new Date();
    const records = await IssueRecord.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('student', 'fullName enrolmentNumber programme')
      .populate('issuedBy', 'fullName')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category' },
          { path: 'individualAsset', select: 'assetId serialNumber' },
        ],
      })
      .lean();

    return records.map((r) => normalizeRecord(r, now));
  }

  async getOverdueIssues(): Promise<any[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Find all issue lines past due date with outstanding quantity
    const overdueLines = await IssueLine.find({
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
      dueDate: { $lt: now },
    }).distinct('issueRecord');

    const records = await IssueRecord.find({ _id: { $in: overdueLines } })
      .sort({ createdAt: -1 })
      .populate('student', 'fullName enrolmentNumber programme phone email')
      .populate('issuedBy', 'fullName')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category' },
          { path: 'individualAsset', select: 'assetId serialNumber' },
        ],
      })
      .lean();

    return records.map((r) => normalizeRecord(r, new Date()));
  }

  async getDashboardStats(): Promise<any> {
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
      mongoose.model('RenewalRequest').countDocuments({ status: 'pending' }),
      InventoryItem.countDocuments({
        trackingMode: TRACKING_MODES.QUANTITY,
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

    const normalizedRecent = recentRecords.map((r) => normalizeRecord(r, new Date()));

    return {
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
  }
}

export const issueService = new IssueService();
