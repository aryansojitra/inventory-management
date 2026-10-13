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

export interface ReturnItemInput {
  lineId?: string;
  issueLineId?: string;
  quantityReturned?: number;
  condition?: 'good' | 'damaged' | 'lost';
  conditionOnReturn?: 'good' | 'damaged' | 'lost';
  notes?: string;
  remarks?: string;
}

export interface ProcessReturnDto {
  issueId?: string;
  issueLineId?: string;
  quantityReturned?: number;
  conditionOnReturn?: 'good' | 'damaged' | 'lost';
  condition?: 'good' | 'damaged' | 'lost';
  remarks?: string;
  notes?: string;
  returnDate?: Date | string;
  items?: ReturnItemInput[];
}

export class ReturnService {
  async processReturn(dto: ProcessReturnDto, actorId: string, actorRole: string) {
    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    // Prepare list of items to process
    let itemsToProcess: ReturnItemInput[] = [];
    if (Array.isArray(dto.items) && dto.items.length > 0) {
      itemsToProcess = dto.items;
    } else if (dto.issueLineId || (dto as any).lineId) {
      itemsToProcess = [
        {
          lineId: dto.issueLineId || (dto as any).lineId,
          quantityReturned: dto.quantityReturned || 1,
          condition: dto.conditionOnReturn || dto.condition || 'good',
          remarks: dto.remarks || dto.notes,
        },
      ];
    } else {
      throw createError('No return items specified in request', 400);
    }

    const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const createdTransactions: any[] = [];
    let parentIssueId: string | null = dto.issueId || null;

    for (const itemInput of itemsToProcess) {
      const lineId = itemInput.lineId || itemInput.issueLineId;
      if (!lineId) throw createError('Each returned item must have a lineId', 400);

      const qtyReturned = Number(itemInput.quantityReturned) || 1;
      const condition = itemInput.condition || itemInput.conditionOnReturn || 'good';
      const itemRemarks = itemInput.remarks || itemInput.notes || dto.notes || '';

      const issueLine = await IssueLine.findById(lineId);
      if (!issueLine) throw createError(`Issue line ${lineId} not found`, 404);

      if (issueLine.status === LINE_STATUSES.RETURNED || issueLine.outstandingQty <= 0) {
        throw createError(`Item on line ${lineId} has already been returned in full`, 400);
      }

      if (qtyReturned < 1) {
        throw createError('Return quantity must be at least 1', 400);
      }

      if (qtyReturned > issueLine.outstandingQty) {
        throw createError(
          `Return quantity (${qtyReturned}) exceeds outstanding borrowed quantity (${issueLine.outstandingQty})`,
          400
        );
      }

      const issueRecord = await IssueRecord.findById(issueLine.issueRecord);
      if (!issueRecord) throw createError('Parent issue record not found', 404);
      parentIssueId = issueRecord._id.toString();

      let restoredToAvailable = 0;
      let markedDamaged = 0;
      let markedLost = 0;

      if (issueLine.individualAsset) {
        // Individual Asset Return
        const newCondition =
          condition === 'good'
            ? ASSET_CONDITIONS.GOOD
            : condition === 'damaged'
            ? ASSET_CONDITIONS.DAMAGED
            : ASSET_CONDITIONS.LOST;

        const newStatus =
          condition === 'good'
            ? ASSET_STATUSES.AVAILABLE
            : condition === 'damaged'
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
              reason: `Returned: condition inspected as ${condition}. ${itemRemarks}`.trim(),
            },
          },
        });

        if (condition === 'good') {
          await InventoryItem.findByIdAndUpdate(issueLine.inventoryItem, {
            $inc: { availableAssets: 1 },
          });
          restoredToAvailable = 1;
        } else if (condition === 'damaged') {
          markedDamaged = 1;
        } else {
          markedLost = 1;
        }

        // Record stock transaction for asset audit trail
        await StockTransaction.create({
          inventoryItem: issueLine.inventoryItem,
          transactionType:
            condition === 'good'
              ? STOCK_TRANSACTION_TYPES.RETURN_GOOD
              : condition === 'damaged'
              ? STOCK_TRANSACTION_TYPES.RETURN_DAMAGED
              : STOCK_TRANSACTION_TYPES.RETURN_LOST,
          quantityChange: 1,
          fieldAffected: condition === 'good' ? 'availableAssets' : condition === 'damaged' ? 'damagedAssets' : 'lostAssets',
          relatedIssue: issueRecord._id,
          reason: `Asset return: condition inspected as ${condition}. ${itemRemarks}`,
          performedBy: actorId,
        });
      } else {
        // Quantity-Based Return
        const item = await InventoryItem.findById(issueLine.inventoryItem);
        if (!item) throw createError('Inventory item not found', 404);

        if (condition === 'good') {
          await InventoryItem.findByIdAndUpdate(item._id, {
            $inc: { issuedQty: -qtyReturned, availableQty: qtyReturned },
          });
          restoredToAvailable = qtyReturned;

          await StockTransaction.create({
            inventoryItem: item._id,
            transactionType: STOCK_TRANSACTION_TYPES.RETURN_GOOD,
            quantityChange: qtyReturned,
            fieldAffected: 'availableQty',
            previousValue: item.availableQty,
            newValue: item.availableQty + qtyReturned,
            relatedIssue: issueRecord._id,
            reason: itemRemarks || 'Returned in good condition',
            performedBy: actorId,
          });
        } else if (condition === 'damaged') {
          await InventoryItem.findByIdAndUpdate(item._id, {
            $inc: { issuedQty: -qtyReturned, damagedQty: qtyReturned },
          });
          markedDamaged = qtyReturned;

          await StockTransaction.create({
            inventoryItem: item._id,
            transactionType: STOCK_TRANSACTION_TYPES.RETURN_DAMAGED,
            quantityChange: qtyReturned,
            fieldAffected: 'damagedQty',
            previousValue: item.damagedQty,
            newValue: item.damagedQty + qtyReturned,
            relatedIssue: issueRecord._id,
            reason: itemRemarks || 'Returned in damaged condition (routed to repair)',
            performedBy: actorId,
          });
        } else if (condition === 'lost') {
          await InventoryItem.findByIdAndUpdate(item._id, {
            $inc: { issuedQty: -qtyReturned, lostQty: qtyReturned },
          });
          markedLost = qtyReturned;

          await StockTransaction.create({
            inventoryItem: item._id,
            transactionType: STOCK_TRANSACTION_TYPES.RETURN_LOST,
            quantityChange: qtyReturned,
            fieldAffected: 'lostQty',
            previousValue: item.lostQty,
            newValue: item.lostQty + qtyReturned,
            relatedIssue: issueRecord._id,
            reason: itemRemarks || 'Declared lost on return',
            performedBy: actorId,
          });
        }
      }

      // Record Return Transaction document
      const returnTx = await ReturnTransaction.create({
        issueLine: issueLine._id,
        issueRecord: issueRecord._id,
        student: issueRecord.student,
        inventoryItem: issueLine.inventoryItem,
        individualAsset: issueLine.individualAsset,
        returnDate,
        quantityReturned: qtyReturned,
        conditionOnReturn: condition,
        receivedBy: actorId,
        remarks: itemRemarks,
        restoredToAvailable,
        markedDamaged,
        markedLost,
      });

      // Update issue line outstanding and returned counts
      const newReturnedQty = issueLine.returnedQty + qtyReturned;
      const newOutstandingQty = issueLine.outstandingQty - qtyReturned;
      const newLineStatus =
        newOutstandingQty === 0 ? LINE_STATUSES.RETURNED : LINE_STATUSES.ACTIVE;

      await IssueLine.findByIdAndUpdate(issueLine._id, {
        $set: {
          returnedQty: newReturnedQty,
          outstandingQty: newOutstandingQty,
          status: newLineStatus,
        },
      });

      createdTransactions.push(returnTx);

      await AuditLog.create({
        action: AUDIT_ACTIONS.ITEM_RETURNED,
        actor: actorId,
        actorRole,
        entityType: 'ReturnTransaction',
        entityId: returnTx._id,
        newValue: {
          returnNumber,
          quantityReturned: qtyReturned,
          condition,
          outstandingRemaining: newOutstandingQty,
        },
        remarks: itemRemarks || 'Item returned and inspected',
      });
    }

    // Update parent issue record status
    if (parentIssueId) {
      const allLines = await IssueLine.find({ issueRecord: parentIssueId });
      const allReturned = allLines.every((l) => l.outstandingQty === 0);
      const anyReturned = allLines.some((l) => l.returnedQty > 0);

      let newRecordStatus: string = ISSUE_STATUSES.ACTIVE;
      if (allReturned) {
        newRecordStatus = ISSUE_STATUSES.RETURNED;
      } else if (anyReturned) {
        newRecordStatus = ISSUE_STATUSES.PARTIALLY_RETURNED;
      }

      await IssueRecord.findByIdAndUpdate(parentIssueId, { status: newRecordStatus });
    }

    return {
      returnNumber,
      success: true,
      processedCount: createdTransactions.length,
      transactions: createdTransactions,
      data: createdTransactions[0] || null,
    };
  }

  async getReturnHistory(query: {
    page: number;
    limit: number;
    skip: number;
    studentId?: string;
    issueRecordId?: string;
  }): Promise<{ returns: any[]; total: number }> {
    const filter: any = {};
    if (query.studentId) filter.student = query.studentId;
    if (query.issueRecordId) filter.issueRecord = query.issueRecordId;

    const [rawReturns, total] = await Promise.all([
      ReturnTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber programme')
        .populate('inventoryItem', 'name itemCode category')
        .populate('individualAsset', 'assetId serialNumber')
        .populate('receivedBy', 'fullName email')
        .lean(),
      ReturnTransaction.countDocuments(filter),
    ]);

    const returns = rawReturns.map((r) => ({
      ...r,
      id: r._id.toString(),
      returnNumber: `RET-${r._id.toString().slice(-6).toUpperCase()}`,
      studentId: r.student,
      itemId: r.inventoryItem,
      assetId: r.individualAsset,
    }));

    return { returns, total };
  }
}

export const returnService = new ReturnService();
