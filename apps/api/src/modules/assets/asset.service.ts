import { IndividualAsset } from './asset.model';
import { InventoryItem } from '../inventory/inventory.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { createError } from '../../utils/apiUtils';
import { AUDIT_ACTIONS, ASSET_CONDITIONS, ASSET_STATUSES } from '../../constants';

function normalizeAsset(asset: any) {
  return {
    ...asset,
    id: asset._id.toString(),
    assetTag: asset.assetId,
    itemId: asset.inventoryItem,
  };
}

export class AssetService {
  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    inventoryItemId?: string;
    itemId?: string;
    status?: string;
    condition?: string;
    search?: string;
  }): Promise<{ assets: any[]; total: number }> {
    const filter: any = {};
    const parentId = query.inventoryItemId || query.itemId;
    if (parentId && parentId !== 'all') {
      filter.inventoryItem = parentId;
    }
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.condition && query.condition !== 'all') {
      filter.condition = query.condition;
    }
    if (query.search) {
      const q = query.search;
      filter.$or = [
        { assetId: { $regex: q, $options: 'i' } },
        { serialNumber: { $regex: q, $options: 'i' } },
      ];
    }

    const [assets, total] = await Promise.all([
      IndividualAsset.find(filter)
        .sort({ assetId: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('inventoryItem', 'name itemCode category')
        .populate('location', 'locationCode room building')
        .populate('addedBy', 'fullName')
        .lean(),
      IndividualAsset.countDocuments(filter),
    ]);

    return { assets: assets.map(normalizeAsset), total };
  }

  async getById(id: string): Promise<any> {
    const asset = await IndividualAsset.findById(id)
      .populate('inventoryItem', 'name itemCode category policy')
      .populate('location', 'locationCode room department building')
      .populate('addedBy', 'fullName')
      .lean();
    if (!asset) throw createError('Asset not found', 404);
    return normalizeAsset(asset);
  }

  async create(
    dto: {
      assetId?: string;
      assetTag?: string;
      serialNumber?: string;
      inventoryItemId?: string;
      itemId?: string;
      locationId?: string;
      condition?: string;
      notes?: string;
    },
    actorId: string,
    actorRole: string
  ) {
    const assetId = (dto.assetId || dto.assetTag || '').toUpperCase().trim();
    if (!assetId) throw createError('Asset ID / Asset Tag is required', 400);

    const existing = await IndividualAsset.findOne({ assetId });
    if (existing) throw createError(`Asset ID ${assetId} already exists`, 409);

    const inventoryItemId = dto.inventoryItemId || dto.itemId;
    if (!inventoryItemId) throw createError('Parent inventory item is required', 400);

    const item = await InventoryItem.findOne({
      _id: inventoryItemId,
      trackingMode: 'individual',
      isRetired: false,
    });
    if (!item) throw createError('Individual-mode inventory item not found or is retired', 404);

    const locationId = dto.locationId || item.location;

    const condition = dto.condition || ASSET_CONDITIONS.GOOD;
    const isGood = condition === ASSET_CONDITIONS.GOOD;
    const status = isGood ? ASSET_STATUSES.AVAILABLE : ASSET_STATUSES.MAINTENANCE;

    const asset = await IndividualAsset.create({
      assetId,
      serialNumber: dto.serialNumber || '',
      inventoryItem: item._id,
      location: locationId,
      condition,
      status,
      addedBy: actorId,
      notes: dto.notes || '',
      conditionHistory: [
        {
          condition,
          changedBy: actorId,
          changedAt: new Date(),
          reason: 'Initial asset registration',
        },
      ],
    });

    // Update parent item counts
    await InventoryItem.findByIdAndUpdate(item._id, {
      $inc: {
        totalAssets: 1,
        availableAssets: isGood ? 1 : 0,
      },
    });

    await AuditLog.create({
      action: AUDIT_ACTIONS.ASSET_CREATED,
      actor: actorId,
      actorRole,
      entityType: 'IndividualAsset',
      entityId: asset._id,
      newValue: { assetId, inventoryItemId: item._id, condition, status },
      remarks: 'Individual asset registered',
    });

    return normalizeAsset(asset.toObject());
  }

  async updateCondition(
    assetId: string,
    dto: { condition: string; reason?: string; notes?: string },
    actorId: string,
    actorRole: string
  ) {
    const asset = await IndividualAsset.findById(assetId);
    if (!asset) throw createError('Asset not found', 404);

    const prevCondition = asset.condition;
    const prevStatus = asset.status;
    const newCondition = dto.condition as any;

    asset.condition = newCondition;

    // Derive status based on condition
    if (newCondition === ASSET_CONDITIONS.GOOD) {
      asset.status = asset.currentIssue ? ASSET_STATUSES.ISSUED : ASSET_STATUSES.AVAILABLE;
    } else if (newCondition === ASSET_CONDITIONS.DAMAGED || newCondition === ASSET_CONDITIONS.MAINTENANCE) {
      asset.status = ASSET_STATUSES.MAINTENANCE;
    } else if (newCondition === ASSET_CONDITIONS.LOST) {
      asset.status = 'lost' as any;
    } else if (newCondition === ASSET_CONDITIONS.RETIRED) {
      asset.status = ASSET_STATUSES.RETIRED;
    }

    const reason = dto.reason || dto.notes || `Condition updated to ${newCondition}`;

    asset.conditionHistory.push({
      condition: newCondition,
      changedBy: actorId as any,
      changedAt: new Date(),
      reason,
    });

    await asset.save();

    // Adjust parent inventory item available count
    if (prevStatus !== ASSET_STATUSES.AVAILABLE && asset.status === ASSET_STATUSES.AVAILABLE) {
      await InventoryItem.findByIdAndUpdate(asset.inventoryItem, {
        $inc: { availableAssets: 1 },
      });
    } else if (prevStatus === ASSET_STATUSES.AVAILABLE && asset.status !== ASSET_STATUSES.AVAILABLE) {
      await InventoryItem.findByIdAndUpdate(asset.inventoryItem, {
        $inc: { availableAssets: -1 },
      });
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.ASSET_CONDITION_CHANGED,
      actor: actorId,
      actorRole,
      entityType: 'IndividualAsset',
      entityId: asset._id,
      previousValue: { condition: prevCondition, status: prevStatus },
      newValue: { condition: newCondition, status: asset.status },
      remarks: reason,
    });

    return normalizeAsset(asset.toObject());
  }
}

export const assetService = new AssetService();
