import { InventoryItem, IInventoryItem } from './inventory.model';
import { IndividualAsset } from '../assets/asset.model';
import { StockTransaction } from '../stock-adjustments/stockTransaction.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { createError } from '../../utils/apiUtils';
import { AUDIT_ACTIONS, STOCK_TRANSACTION_TYPES, TRACKING_MODES } from '../../constants';

export interface CreateInventoryDto {
  itemCode: string;
  name: string;
  category: string;
  description?: string;
  make?: string;
  model?: string;
  trackingMode: 'individual' | 'quantity';
  locationId: string;
  initialQty?: number;
  policy?: { maxRenewals?: number; borrowingDays?: number };
}

export interface StockAdditionDto {
  quantity: number;
  reason: string;
}

export interface StockAdjustmentDto {
  field: 'damagedQty' | 'lostQty' | 'maintenanceQty' | 'retiredQty';
  quantity: number;
  reason: string;
  transactionType: string;
}

export class InventoryService {
  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    category?: string;
    trackingMode?: string;
    isRetired?: string;
  }) {
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { itemCode: { $regex: query.search, $options: 'i' } },
        { category: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.category) filter.category = query.category;
    if (query.trackingMode) filter.trackingMode = query.trackingMode;
    filter.isRetired = query.isRetired === 'true' ? true : false;

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('location', 'locationCode room department')
        .lean(),
      InventoryItem.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const item = await InventoryItem.findById(id)
      .populate('location', 'locationCode room department cupboard')
      .populate('createdBy', 'fullName')
      .lean();
    if (!item) throw createError('Inventory item not found', 404);
    return item;
  }

  async create(dto: CreateInventoryDto, actorId: string, actorRole: string) {
    const existing = await InventoryItem.findOne({
      itemCode: dto.itemCode.toUpperCase(),
    });
    if (existing) throw createError('Item code already exists', 409);

    const itemData: any = {
      itemCode: dto.itemCode.toUpperCase(),
      name: dto.name,
      category: dto.category,
      description: dto.description || '',
      make: dto.make || '',
      model: dto.model || '',
      trackingMode: dto.trackingMode,
      location: dto.locationId,
      createdBy: actorId,
      policy: {
        maxRenewals: dto.policy?.maxRenewals ?? 3,
        borrowingDays: dto.policy?.borrowingDays ?? 15,
      },
    };

    if (dto.trackingMode === TRACKING_MODES.QUANTITY && dto.initialQty) {
      itemData.totalStock = dto.initialQty;
      itemData.availableQty = dto.initialQty;
    }

    const item = await InventoryItem.create(itemData);

    // Record stock transaction for initial addition
    if (dto.trackingMode === TRACKING_MODES.QUANTITY && dto.initialQty) {
      await StockTransaction.create({
        inventoryItem: item._id,
        transactionType: STOCK_TRANSACTION_TYPES.ADDITION,
        quantityChange: dto.initialQty,
        fieldAffected: 'availableQty',
        previousValue: 0,
        newValue: dto.initialQty,
        reason: 'Initial stock addition',
        performedBy: actorId,
      });
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_CREATED,
      actor: actorId,
      actorRole,
      entityType: 'InventoryItem',
      entityId: item._id,
      newValue: itemData,
      remarks: 'Inventory item created',
    });

    return item;
  }

  async addStock(
    itemId: string,
    dto: StockAdditionDto,
    actorId: string,
    actorRole: string
  ) {
    const item = await InventoryItem.findOne({
      _id: itemId,
      trackingMode: TRACKING_MODES.QUANTITY,
      isRetired: false,
    });
    if (!item) throw createError('Quantity-based inventory item not found', 404);

    const prev = { totalStock: item.totalStock, availableQty: item.availableQty };
    item.totalStock += dto.quantity;
    item.availableQty += dto.quantity;
    await item.save();

    await StockTransaction.create({
      inventoryItem: item._id,
      transactionType: STOCK_TRANSACTION_TYPES.ADDITION,
      quantityChange: dto.quantity,
      fieldAffected: 'availableQty',
      previousValue: prev.availableQty,
      newValue: item.availableQty,
      reason: dto.reason,
      performedBy: actorId,
    });

    await AuditLog.create({
      action: AUDIT_ACTIONS.STOCK_ADDED,
      actor: actorId,
      actorRole,
      entityType: 'InventoryItem',
      entityId: item._id,
      previousValue: prev,
      newValue: { totalStock: item.totalStock, availableQty: item.availableQty },
      remarks: dto.reason,
    });

    return item;
  }

  async adjustStock(
    itemId: string,
    dto: StockAdjustmentDto,
    actorId: string,
    actorRole: string
  ) {
    const item = await InventoryItem.findOne({
      _id: itemId,
      trackingMode: TRACKING_MODES.QUANTITY,
      isRetired: false,
    });
    if (!item) throw createError('Item not found', 404);

    // Validate that availableQty will not go negative
    if (dto.field !== 'damagedQty' && dto.field !== 'lostQty' && dto.field !== 'maintenanceQty') {
      if (item.availableQty < dto.quantity) {
        throw createError(`Insufficient available quantity. Available: ${item.availableQty}`, 409);
      }
    }

    const prev: any = {
      availableQty: item.availableQty,
      [dto.field]: (item as any)[dto.field],
    };

    if (dto.transactionType === STOCK_TRANSACTION_TYPES.MAINTENANCE_END ||
        dto.transactionType === STOCK_TRANSACTION_TYPES.DAMAGE_CLEARANCE) {
      // Move from special field back to available
      (item as any)[dto.field] -= dto.quantity;
      item.availableQty += dto.quantity;
    } else {
      // Move from available to special field
      item.availableQty -= dto.quantity;
      (item as any)[dto.field] += dto.quantity;
    }

    await item.save();

    await StockTransaction.create({
      inventoryItem: item._id,
      transactionType: dto.transactionType,
      quantityChange: dto.quantity,
      fieldAffected: dto.field,
      previousValue: prev[dto.field],
      newValue: (item as any)[dto.field],
      reason: dto.reason,
      performedBy: actorId,
    });

    return item;
  }

  async retire(itemId: string, reason: string, actorId: string, actorRole: string) {
    const item = await InventoryItem.findById(itemId);
    if (!item) throw createError('Item not found', 404);
    if (item.isRetired) throw createError('Item already retired', 409);

    item.isRetired = true;
    item.retiredAt = new Date();
    item.retiredReason = reason;
    item.retiredBy = actorId as any;
    await item.save();

    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_RETIRED,
      actor: actorId,
      actorRole,
      entityType: 'InventoryItem',
      entityId: item._id,
      remarks: reason,
    });

    return item;
  }

  async getCategories() {
    return InventoryItem.distinct('category');
  }
}

export const inventoryService = new InventoryService();
