import { IssueLine, IssueRecord } from '../issues/issue.model';
import { ReturnTransaction } from './return.model';
import { InventoryItem } from '../inventory/inventory.model';
import { IndividualAsset } from '../assets/asset.model';
import { StockTransaction } from '../stock-adjustments/stockTransaction.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { createError } from '../../utils/apiUtils';
import {
  AUDIT_ACTIONS,
  STOCK_TRANSACTION_TYPES,
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ISSUE_STATUSES,
  LINE_STATUSES,
  RETURN_CONDITIONS,
} from '../../constants';

export interface ProcessReturnDto {
  issueLineId: string;
  quantityReturned: number;
  conditionOnReturn: 'good' | 'damaged' | 'lost';
  remarks?: string;
  returnDate?: Date;
}

export class ReturnService {
  async processReturn(dto: ProcessReturnDto, actorId: string, actorRole: string) {
    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    // 1. Find the issue line and validate
    const issueLine = await IssueLine.findOne({
      _id: dto.issueLineId,
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
    });
    if (!issueLine) throw createError('Issue line not found or already returned', 404);

    if (dto.quantityReturned < 1) {
      throw createError('Return quantity must be at least 1', 400);
    }
    if (dto.quantityReturned > issueLine.outstandingQty) {
      throw createError(
        `Return quantity (${dto.quantityReturned}) exceeds outstanding quantity (${issueLine.outstandingQty})`,
        400
      );
    }

    const issueRecord = await IssueRecord.findById(issueLine.issueRecord);
    if (!issueRecord) throw createError('Issue record not found', 404);

    let restoredToAvailable = 0;
    let markedDamaged = 0;
    let markedLost = 0;

    // 2. Update stock based on condition
    if (issueLine.individualAsset) {
      // Individual asset return
      const newCondition =
        dto.conditionOnReturn === RETURN_CONDITIONS.GOOD
          ? ASSET_CONDITIONS.GOOD
          : dto.conditionOnReturn === RETURN_CONDITIONS.DAMAGED
          ? ASSET_CONDITIONS.DAMAGED
          : ASSET_CONDITIONS.LOST;

      const newStatus =
        dto.conditionOnReturn === RETURN_CONDITIONS.GOOD
          ? ASSET_STATUSES.AVAILABLE
          : dto.conditionOnReturn === RETURN_CONDITIONS.DAMAGED
          ? ASSET_STATUSES.MAINTENANCE
          : ASSET_STATUSES.RETIRED;

      await IndividualAsset.findByIdAndUpdate(issueLine.individualAsset, {
        $set: {
          condition: newCondition,
          status: newStatus,
          currentIssue: null,
        },
        $push: {
          conditionHistory: {
            condition: newCondition,
            changedBy: actorId,
            changedAt: returnDate,
            reason: `Return: ${dto.conditionOnReturn}. ${dto.remarks || ''}`,
          },
        },
      });

      // Update parent item's available asset count if returned good
      if (dto.conditionOnReturn === RETURN_CONDITIONS.GOOD) {
        await InventoryItem.findByIdAndUpdate(issueLine.inventoryItem, {
          $inc: { availableAssets: 1 },
        });
        restoredToAvailable = 1;
      }
    } else {
      // Quantity-based return
      const item = await InventoryItem.findById(issueLine.inventoryItem);
      if (!item) throw createError('Inventory item not found', 404);

      const qty = dto.quantityReturned;

      if (dto.conditionOnReturn === RETURN_CONDITIONS.GOOD) {
        await InventoryItem.findByIdAndUpdate(item._id, {
          $inc: {
            issuedQty: -qty,
            availableQty: qty,
          },
        });
        restoredToAvailable = qty;

        await StockTransaction.create({
          inventoryItem: item._id,
          transactionType: STOCK_TRANSACTION_TYPES.RETURN_GOOD,
          quantityChange: qty,
          fieldAffected: 'availableQty',
          previousValue: item.availableQty,
          newValue: item.availableQty + qty,
          relatedIssue: issueRecord._id,
          reason: dto.remarks || 'Returned in good condition',
          performedBy: actorId,
        });
      } else if (dto.conditionOnReturn === RETURN_CONDITIONS.DAMAGED) {
        await InventoryItem.findByIdAndUpdate(item._id, {
          $inc: {
            issuedQty: -qty,
            damagedQty: qty,
          },
        });
        markedDamaged = qty;

        await StockTransaction.create({
          inventoryItem: item._id,
          transactionType: STOCK_TRANSACTION_TYPES.RETURN_DAMAGED,
          quantityChange: qty,
          fieldAffected: 'damagedQty',
          previousValue: item.damagedQty,
          newValue: item.damagedQty + qty,
          relatedIssue: issueRecord._id,
          reason: dto.remarks || 'Returned damaged',
          performedBy: actorId,
        });
      } else if (dto.conditionOnReturn === RETURN_CONDITIONS.LOST) {
        await InventoryItem.findByIdAndUpdate(item._id, {
          $inc: {
            issuedQty: -qty,
            lostQty: qty,
          },
        });
        markedLost = qty;

        await StockTransaction.create({
          inventoryItem: item._id,
          transactionType: STOCK_TRANSACTION_TYPES.RETURN_LOST,
          quantityChange: qty,
          fieldAffected: 'lostQty',
          previousValue: item.lostQty,
          newValue: item.lostQty + qty,
          relatedIssue: issueRecord._id,
          reason: dto.remarks || 'Declared lost on return',
          performedBy: actorId,
        });
      }
    }

    // 3. Record return transaction
    const returnTx = await ReturnTransaction.create({
      issueLine: issueLine._id,
      issueRecord: issueRecord._id,
      student: issueRecord.student,
      inventoryItem: issueLine.inventoryItem,
      individualAsset: issueLine.individualAsset,
      returnDate,
      quantityReturned: dto.quantityReturned,
      conditionOnReturn: dto.conditionOnReturn,
      receivedBy: actorId,
      remarks: dto.remarks || '',
      restoredToAvailable,
      markedDamaged,
      markedLost,
    });

    // 4. Update issue line
    const newReturnedQty = issueLine.returnedQty + dto.quantityReturned;
    const newOutstandingQty = issueLine.outstandingQty - dto.quantityReturned;
    const newLineStatus =
      newOutstandingQty === 0 ? LINE_STATUSES.RETURNED : LINE_STATUSES.ACTIVE;

    await IssueLine.findByIdAndUpdate(issueLine._id, {
      $set: {
        returnedQty: newReturnedQty,
        outstandingQty: newOutstandingQty,
        status: newLineStatus,
      },
    });

    // 5. Update issue record status
    const allLines = await IssueLine.find({ issueRecord: issueRecord._id });
    const allReturned = allLines.every((l) => l._id.equals(issueLine._id)
      ? newOutstandingQty === 0
      : l.outstandingQty === 0
    );
    const anyOutstanding = allLines.some((l) => l._id.equals(issueLine._id)
      ? newOutstandingQty > 0
      : l.outstandingQty > 0
    );

    let newRecordStatus = issueRecord.status;
    if (allReturned) {
      newRecordStatus = ISSUE_STATUSES.RETURNED;
    } else if (anyOutstanding) {
      newRecordStatus = ISSUE_STATUSES.PARTIALLY_RETURNED;
    }

    await IssueRecord.findByIdAndUpdate(issueRecord._id, { status: newRecordStatus });

    // 6. Audit log
    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_RETURNED,
      actor: actorId,
      actorRole,
      entityType: 'ReturnTransaction',
      entityId: returnTx._id,
      newValue: {
        quantityReturned: dto.quantityReturned,
        conditionOnReturn: dto.conditionOnReturn,
        outstandingRemaining: newOutstandingQty,
      },
      remarks: dto.remarks || '',
    });

    return returnTx;
  }

  async getReturnHistory(query: {
    page: number;
    limit: number;
    skip: number;
    studentId?: string;
    issueRecordId?: string;
  }) {
    const filter: any = {};
    if (query.studentId) filter.student = query.studentId;
    if (query.issueRecordId) filter.issueRecord = query.issueRecordId;

    const [returns, total] = await Promise.all([
      ReturnTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber')
        .populate('inventoryItem', 'name itemCode')
        .populate('individualAsset', 'assetId')
        .populate('receivedBy', 'fullName')
        .lean(),
      ReturnTransaction.countDocuments(filter),
    ]);

    return { returns, total };
  }
}

export const returnService = new ReturnService();
