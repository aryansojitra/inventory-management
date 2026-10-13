import { IndividualAsset } from './asset.model';
import { InventoryItem } from '../inventory/inventory.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { createError } from '../../utils/apiUtils';
import { AUDIT_ACTIONS, ASSET_CONDITIONS, ASSET_STATUSES } from '../../constants';

export class AssetService {
  async getAll(query: {
    page: number; limit: number; skip: number;
    inventoryItemId?: string; status?: string; condition?: string;
  }) {
    const filter: any = {};
    if (query.inventoryItemId) filter.inventoryItem = query.inventoryItemId;
    if (query.status) filter.status = query.status;
    if (query.condition) filter.condition = query.condition;

    const [assets, total] = await Promise.all([
      IndividualAsset.find(filter)
        .sort({ assetId: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('inventoryItem', 'name itemCode')
        .populate('location', 'locationCode room')
        .populate('addedBy', 'fullName')
        .lean(),
      IndividualAsset.countDocuments(filter),
    ]);

    return { assets, total };
  }

  async getById(id: string) {
    const asset = await IndividualAsset.findById(id)
      .populate('inventoryItem', 'name itemCode category')
      .populate('location', 'locationCode room department')
      .populate('addedBy', 'fullName')
      .lean();
    if (!asset) throw createError('Asset not found', 404);
    return asset;
  }

  async create(dto: {
    assetId: string;
    serialNumber?: string;
    inventoryItemId: string;
    locationId: string;
    condition?: string;
    notes?: string;
  }, actorId: string, actorRole: string) {
    const existing = await IndividualAsset.findOne({ assetId: dto.assetId.toUpperCase() });
    if (existing) throw createError('Asset ID already exists', 409);

    const item = await InventoryItem.findOne({ _id: dto.inventoryItemId, trackingMode: 'individual', isRetired: false });
    if (!item) throw createError('Individual-mode inventory item not found', 404);

    const asset = await IndividualAsset.create({
      assetId: dto.assetId.toUpperCase(),
      serialNumber: dto.serialNumber || '',
      inventoryItem: dto.inventoryItemId,
      location: dto.locationId,
      condition: dto.condition || ASSET_CONDITIONS.GOOD,
      status: ASSET_STATUSES.AVAILABLE,
      addedBy: actorId,
      notes: dto.notes || '',
    });

    // Update parent item's asset counts
    await InventoryItem.findByIdAndUpdate(dto.inventoryItemId, {
      $inc: { totalAssets: 1, availableAssets: 1 },
    });

    await AuditLog.create({
      action: AUDIT_ACTIONS.ASSET_CREATED,
      actor: actorId,
      actorRole,
      entityType: 'IndividualAsset',
      entityId: asset._id,
      newValue: { assetId: asset.assetId, inventoryItemId: dto.inventoryItemId },
      remarks: 'Asset registered',
    });

    return asset;
  }

  async updateCondition(assetId: string, dto: {
    condition: string;
    reason: string;
  }, actorId: string, actorRole: string) {
    const asset = await IndividualAsset.findById(assetId);
    if (!asset) throw createError('Asset not found', 404);

    const prevCondition = asset.condition;
    const prevStatus = asset.status;

    asset.condition = dto.condition as any;

    // Derive status from condition
    if (dto.condition === ASSET_CONDITIONS.GOOD) {
      if (asset.currentIssue) {
        asset.status = ASSET_STATUSES.ISSUED;
      } else {
        asset.status = ASSET_STATUSES.AVAILABLE;
      }
    } else if (dto.condition === ASSET_CONDITIONS.MAINTENANCE) {
      asset.status = ASSET_STATUSES.MAINTENANCE;
    } else if (dto.condition === ASSET_CONDITIONS.RETIRED) {
      asset.status = ASSET_STATUSES.RETIRED;
    }

    asset.conditionHistory.push({
      condition: dto.condition,
      changedBy: actorId as any,
      changedAt: new Date(),
      reason: dto.reason,
    });

    await asset.save();

    // If restoring to available, update parent item counts
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
      newValue: { condition: dto.condition, status: asset.status },
      remarks: dto.reason,
    });

    return asset;
  }
}

export const assetService = new AssetService();
