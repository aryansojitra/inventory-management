import mongoose from 'mongoose';
import { InventoryItem, IInventoryItem } from './inventory.model';
import { IndividualAsset } from '../assets/asset.model';
import { StockTransaction } from '../stock-adjustments/stockTransaction.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { createError } from '../../utils/apiUtils';
import { escapeRegex } from '../../middleware/sanitize.middleware';
import { AUDIT_ACTIONS, STOCK_TRANSACTION_TYPES, TRACKING_MODES } from '../../constants';

export interface CreateInventoryDto {
  itemCode?: string;
  sku?: string;
  name: string;
  category: string;
  description?: string;
  make?: string;
  model?: string;
  trackingMode: 'individual' | 'quantity';
  locationId?: string;
  location?: string;
  initialQty?: number;
  totalQuantity?: number;
  policy?: { maxRenewals?: number; borrowingDays?: number };
}

export interface StockAdditionDto {
  quantity: number;
  reason?: string;
}

export interface StockAdjustmentDto {
  field: 'damagedQty' | 'lostQty' | 'maintenanceQty' | 'retiredQty';
  quantity: number;
  reason: string;
  transactionType: string;
}

function normalizeItem(item: any) {
  const isQty = item.trackingMode === TRACKING_MODES.QUANTITY;
  return {
    ...item,
    id: item._id.toString(),
    sku: item.itemCode,
    totalQuantity: isQty ? item.totalStock : (item.totalAssets || 0),
    availableQuantity: isQty ? item.availableQty : (item.availableAssets || 0),
    issuedQuantity: item.issuedQty || 0,
    damagedQuantity: item.damagedQty || 0,
    lostQuantity: item.lostQty || 0,
    maintenanceQuantity: item.maintenanceQty || 0,
    lowStockThreshold: 5,
    locationId: item.location,
    isActive: !item.isRetired,
  };
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
    lowStock?: boolean;
  }): Promise<{ items: any[]; total: number }> {
    const filter: any = {};
    if (query.search && typeof query.search === 'string') {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { itemCode: { $regex: sanitized, $options: 'i' } },
        { category: { $regex: sanitized, $options: 'i' } },
      ];
    }
    if (query.category && query.category !== 'all') {
      filter.category = query.category;
    }
    if (query.trackingMode && query.trackingMode !== 'all') {
      filter.trackingMode = query.trackingMode;
    }
    if (query.isRetired !== undefined) {
      filter.isRetired = query.isRetired === 'true';
    } else {
      filter.isRetired = false;
    }

    if (query.lowStock) {
      filter.trackingMode = TRACKING_MODES.QUANTITY;
      filter.availableQty = { $lte: 5 };
    }

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('location', 'locationCode room department cupboard building')
        .lean(),
      InventoryItem.countDocuments(filter),
    ]);

    return { items: items.map(normalizeItem), total };
  }

  async getById(id: string): Promise<any> {
    const item = await InventoryItem.findById(id)
      .populate('location', 'locationCode room department cupboard building')
      .populate('createdBy', 'fullName')
      .lean();
    if (!item) throw createError('Inventory item not found', 404);
    return normalizeItem(item);
  }

  async create(dto: CreateInventoryDto, actorId: string, actorRole: string) {
    const itemCode = (dto.itemCode || dto.sku || '').toUpperCase().trim();
    if (!itemCode) throw createError('Item Code / SKU is required', 400);

    const existing = await InventoryItem.findOne({ itemCode });
    if (existing) throw createError(`Item code ${itemCode} already exists`, 409);

    const locationId = dto.locationId || dto.location;
    if (!locationId) throw createError('Storage location is required', 400);

    const initialQty = Number(dto.initialQty || dto.totalQuantity) || 0;

    const itemData: any = {
      itemCode,
      name: dto.name,
      category: dto.category,
      description: dto.description || '',
      make: dto.make || '',
      model: dto.model || '',
      trackingMode: dto.trackingMode,
      location: locationId,
      createdBy: actorId,
      totalStock: dto.trackingMode === TRACKING_MODES.QUANTITY ? initialQty : 0,
      availableQty: dto.trackingMode === TRACKING_MODES.QUANTITY ? initialQty : 0,
      totalAssets: 0,
      availableAssets: 0,
      issuedQty: 0,
      damagedQty: 0,
      lostQty: 0,
      maintenanceQty: 0,
      policy: {
        maxRenewals: dto.policy?.maxRenewals ?? 3,
        borrowingDays: dto.policy?.borrowingDays ?? 15,
      },
      isRetired: false,
    };

    const item = await InventoryItem.create(itemData);

    if (dto.trackingMode === TRACKING_MODES.QUANTITY && initialQty > 0) {
      await StockTransaction.create({
        inventoryItem: item._id,
        transactionType: STOCK_TRANSACTION_TYPES.ADDITION,
        quantityChange: initialQty,
        fieldAffected: 'availableQty',
        previousValue: 0,
        newValue: initialQty,
        reason: 'Initial stock intake',
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
      remarks: 'Inventory item registered',
    });

    return normalizeItem(item.toObject());
  }

  async update(itemId: string, updates: Partial<CreateInventoryDto>, actorId: string, actorRole: string) {
    const item = await InventoryItem.findById(itemId);
    if (!item) throw createError('Item not found', 404);

    const prev = item.toObject();
    if (updates.name) item.name = updates.name.trim();
    if (updates.category) item.category = updates.category.trim();
    if (updates.description !== undefined) item.description = updates.description;
    if (updates.model !== undefined) item.modelNumber = updates.model;
    if (updates.locationId || updates.location) {
      item.location = new mongoose.Types.ObjectId(updates.locationId || updates.location);
    }
    if (updates.policy) {
      if (updates.policy.maxRenewals !== undefined) item.policy.maxRenewals = updates.policy.maxRenewals;
      if (updates.policy.borrowingDays !== undefined) item.policy.borrowingDays = updates.policy.borrowingDays;
    }

    await item.save();

    await AuditLog.create({
      action: AUDIT_ACTIONS.ITEM_UPDATED,
      actor: actorId,
      actorRole,
      entityType: 'InventoryItem',
      entityId: item._id,
      previousValue: prev,
      newValue: updates,
      remarks: 'Inventory item metadata updated',
    });

    return normalizeItem(item.toObject());
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
    const quantity = Number(dto.quantity) || 1;
    const reason = dto.reason || 'Restock batch received';

    item.totalStock += quantity;
    item.availableQty += quantity;
    await item.save();

    await StockTransaction.create({
      inventoryItem: item._id,
      transactionType: STOCK_TRANSACTION_TYPES.ADDITION,
      quantityChange: quantity,
      fieldAffected: 'availableQty',
      previousValue: prev.availableQty,
      newValue: item.availableQty,
      reason,
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
      remarks: reason,
    });

    return normalizeItem(item.toObject());
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

    const quantity = Number(dto.quantity) || 1;

    // Validate quantities to prevent negative balances
    const isRestoring =
      dto.transactionType === STOCK_TRANSACTION_TYPES.MAINTENANCE_END ||
      dto.transactionType === STOCK_TRANSACTION_TYPES.DAMAGE_CLEARANCE;

    if (isRestoring) {
      const currentSpecial = (item as any)[dto.field] || 0;
      if (currentSpecial < quantity) {
        throw createError(
          `Cannot restore ${quantity} units: current ${dto.field} is only ${currentSpecial}`,
          409
        );
      }
      (item as any)[dto.field] -= quantity;
      item.availableQty += quantity;
    } else {
      if (item.availableQty < quantity) {
        throw createError(
          `Insufficient available quantity. Available: ${item.availableQty}, Requested to move: ${quantity}`,
          409
        );
      }
      item.availableQty -= quantity;
      (item as any)[dto.field] = ((item as any)[dto.field] || 0) + quantity;
    }

    await item.save();

    await StockTransaction.create({
      inventoryItem: item._id,
      transactionType: dto.transactionType,
      quantityChange: quantity,
      fieldAffected: dto.field,
      newValue: (item as any)[dto.field],
      reason: dto.reason,
      performedBy: actorId,
    });

    return normalizeItem(item.toObject());
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

    return normalizeItem(item.toObject());
  }

  async getCategories() {
    return InventoryItem.distinct('category', { isRetired: false });
  }
}

export const inventoryService = new InventoryService();
