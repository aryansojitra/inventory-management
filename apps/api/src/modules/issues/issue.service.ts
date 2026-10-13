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
  individualAssetId?: string;
  quantity?: number;
}

export interface CreateIssueDto {
  studentId: string;
  purpose: string;
  lines: IssueLineInput[];
  issueDate?: Date;
}

export class IssueService {
  async createIssue(dto: CreateIssueDto, actorId: string, actorRole: string) {
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();

    // 1. Validate student
    const student = await Student.findOne({ _id: dto.studentId, isActive: true });
    if (!student) throw createError('Student not found or inactive', 404);

    const issueLineIds: mongoose.Types.ObjectId[] = [];
    const issueLineDetails: any[] = [];

    // 2. Pre-validate all lines
    for (const line of dto.lines) {
      if (line.individualAssetId) {
        // Individual asset tracking
        const asset = await IndividualAsset.findOne({
          _id: line.individualAssetId,
          status: ASSET_STATUSES.AVAILABLE,
          condition: ASSET_CONDITIONS.GOOD,
        });
        if (!asset) {
          throw createError(
            `Asset is not available for issuance (may be issued, damaged, or lost)`,
            409
          );
        }
        const item = await InventoryItem.findOne({
          _id: asset.inventoryItem,
          isRetired: false,
        });
        if (!item) throw createError('Parent inventory item not found or retired', 404);

        issueLineDetails.push({ type: 'individual', asset, item, qty: 1 });
      } else if (line.inventoryItemId) {
        // Quantity-based tracking
        const qty = line.quantity || 1;
        if (qty < 1) throw createError('Quantity must be at least 1', 400);

        const item = await InventoryItem.findOne({
          _id: line.inventoryItemId,
          trackingMode: TRACKING_MODES.QUANTITY,
          isRetired: false,
        });
        if (!item) throw createError('Inventory item not found or retired', 404);
        if (item.availableQty < qty) {
          throw createError(
            `Insufficient stock. Available: ${item.availableQty}, Requested: ${qty}`,
            409
          );
        }

        issueLineDetails.push({ type: 'quantity', item, qty });
      } else {
        throw createError('Each line must specify either an asset or an inventory item', 400);
      }
    }

    // 3. Create the Issue Record
    const issueRecord = await IssueRecord.create({
      student: student._id,
      issuedBy: actorId,
      issueDate,
      purpose: dto.purpose,
      status: ISSUE_STATUSES.ACTIVE,
      lines: [],
    });

    // 4. Process each line atomically
    for (const detail of issueLineDetails) {
      const dueDate = calculateDueDate(issueDate);

      if (detail.type === 'individual') {
        // Atomic: only update if still available (prevents concurrent allocation)
        const updated = await IndividualAsset.findOneAndUpdate(
          {
            _id: detail.asset._id,
            status: ASSET_STATUSES.AVAILABLE, // conditional check
          },
          {
            $set: {
              status: ASSET_STATUSES.ISSUED,
              currentIssue: null, // will update after line creation
            },
          },
          { new: true }
        );

        if (!updated) {
          // Rollback: mark issue record as failed
          await IssueRecord.findByIdAndDelete(issueRecord._id);
          throw createError(
            `Asset ${detail.asset.assetId} was allocated by another transaction. Please retry.`,
            409
          );
        }

        const issueLine = await IssueLine.create({
          issueRecord: issueRecord._id,
          inventoryItem: detail.item._id,
          individualAsset: detail.asset._id,
          issuedQty: 1,
          returnedQty: 0,
          outstandingQty: 1,
          issueDate,
          dueDate,
          renewalCount: 0,
          maxRenewals: detail.item.policy.maxRenewals,
          status: LINE_STATUSES.ACTIVE,
        });

        // Set currentIssue on asset
        await IndividualAsset.findByIdAndUpdate(detail.asset._id, {
          currentIssue: issueLine._id,
        });

        // Update parent item's available asset count
        await InventoryItem.findByIdAndUpdate(detail.item._id, {
          $inc: { availableAssets: -1 },
        });

        issueLineIds.push(issueLine._id as mongoose.Types.ObjectId);
      } else {
        // Quantity-based: atomic conditional update
        const updatedItem = await InventoryItem.findOneAndUpdate(
          {
            _id: detail.item._id,
            availableQty: { $gte: detail.qty }, // conditional check prevents over-issuance
          },
          {
            $inc: {
              availableQty: -detail.qty,
              issuedQty: detail.qty,
            },
          },
          { new: true }
        );

        if (!updatedItem) {
          await IssueRecord.findByIdAndDelete(issueRecord._id);
          throw createError(
            `Stock for ${detail.item.name} insufficient (concurrent update). Please retry.`,
            409
          );
        }

        await StockTransaction.create({
          inventoryItem: detail.item._id,
          transactionType: STOCK_TRANSACTION_TYPES.ISSUANCE,
          quantityChange: -detail.qty,
          fieldAffected: 'availableQty',
          previousValue: detail.item.availableQty,
          newValue: updatedItem.availableQty,
          relatedIssue: issueRecord._id,
          reason: `Issued to student ${student.enrolmentNumber}`,
          performedBy: actorId,
        });

        const issueLine = await IssueLine.create({
          issueRecord: issueRecord._id,
          inventoryItem: detail.item._id,
          individualAsset: null,
          issuedQty: detail.qty,
          returnedQty: 0,
          outstandingQty: detail.qty,
          issueDate,
          dueDate,
          renewalCount: 0,
          maxRenewals: detail.item.policy.maxRenewals,
          status: LINE_STATUSES.ACTIVE,
        });

        issueLineIds.push(issueLine._id as mongoose.Types.ObjectId);
      }
    }

    // 5. Link lines to issue record
    const finalRecord = await IssueRecord.findByIdAndUpdate(
      issueRecord._id,
      { lines: issueLineIds },
      { new: true }
    )
      .populate('student', 'fullName enrolmentNumber email')
      .populate('issuedBy', 'fullName')
      .populate({ path: 'lines', populate: { path: 'inventoryItem individualAsset' } });

    // 6. Audit log
    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_ISSUED,
      actor: actorId,
      actorRole,
      entityType: 'IssueRecord',
      entityId: issueRecord._id,
      newValue: { studentId: dto.studentId, linesCount: issueLineIds.length },
      remarks: dto.purpose,
    });

    // 7. Notification
    const studentUser = await mongoose.model('User').findOne({ studentProfile: student._id });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.ITEM_ISSUED,
        title: 'Items Issued',
        message: `${issueLineIds.length} item(s) issued to you. Due by ${
          calculateDueDate(issueDate).toDateString()
        }.`,
        relatedIssue: issueRecord._id,
      });
    }

    return finalRecord;
  }

  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    status?: string;
    studentId?: string;
    overdue?: string;
  }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.studentId) filter.student = query.studentId;

    const [records, total] = await Promise.all([
      IssueRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber programme')
        .populate('issuedBy', 'fullName')
        .populate({
          path: 'lines',
          populate: {
            path: 'inventoryItem individualAsset',
            select: 'name itemCode assetId serialNumber',
          },
        })
        .lean(),
      IssueRecord.countDocuments(filter),
    ]);

    return { records, total };
  }

  async getById(id: string) {
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
    return record;
  }

  async getStudentIssues(studentId: string) {
    const records = await IssueRecord.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('issuedBy', 'fullName')
      .populate({
        path: 'lines',
        populate: [
          { path: 'inventoryItem', select: 'name itemCode category' },
          { path: 'individualAsset', select: 'assetId serialNumber' },
        ],
      })
      .lean();

    return records;
  }

  async getOverdueLines(now?: Date) {
    const today = now || new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLines = await IssueLine.find({
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
      dueDate: { $lt: today },
    })
      .populate({
        path: 'issueRecord',
        populate: { path: 'student', select: 'fullName enrolmentNumber email phone' },
      })
      .populate('inventoryItem', 'name itemCode category')
      .populate('individualAsset', 'assetId serialNumber')
      .lean();

    return overdueLines.map((line) => ({
      ...line,
      overdueDays: calculateOverdueDays(line.dueDate, today),
    }));
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    const [
      totalItems,
      activeIssues,
      overdueLines,
      pendingRenewals,
      damagedCount,
      lostCount,
    ] = await Promise.all([
      InventoryItem.countDocuments({ isRetired: false }),
      IssueRecord.countDocuments({ status: { $in: ['active', 'partially_returned', 'overdue'] } }),
      IssueLine.countDocuments({
        status: { $in: ['active', 'overdue'] },
        outstandingQty: { $gt: 0 },
        dueDate: { $lt: today },
      }),
      mongoose.model('RenewalRequest').countDocuments({ status: 'pending' }),
      InventoryItem.aggregate([
        { $group: { _id: null, total: { $sum: '$damagedQty' } } },
      ]),
      InventoryItem.aggregate([
        { $group: { _id: null, total: { $sum: '$lostQty' } } },
      ]),
    ]);

    return {
      totalInventoryItems: totalItems,
      activeIssues,
      overdueItems: overdueLines,
      pendingRenewals,
      damagedItems: damagedCount[0]?.total || 0,
      lostItems: lostCount[0]?.total || 0,
    };
  }
}

export const issueService = new IssueService();
