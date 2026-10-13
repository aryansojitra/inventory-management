import mongoose, { Schema, Document } from 'mongoose';
import { ASSET_CONDITIONS, ASSET_STATUSES } from '../../constants';

export interface IAssetConditionHistory {
  condition: string;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason: string;
}

export interface IIndividualAsset extends Document {
  assetId: string;
  serialNumber: string;
  inventoryItem: mongoose.Types.ObjectId;
  location: mongoose.Types.ObjectId;
  condition: 'good' | 'damaged' | 'maintenance' | 'lost' | 'retired';
  status: 'available' | 'issued' | 'maintenance' | 'retired';
  currentIssue: mongoose.Types.ObjectId | null;
  notes: string;
  addedBy: mongoose.Types.ObjectId;
  conditionHistory: IAssetConditionHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const AssetConditionHistorySchema = new Schema<IAssetConditionHistory>(
  {
    condition: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const IndividualAssetSchema = new Schema<IIndividualAsset>(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    serialNumber: { type: String, default: '', trim: true },
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'StorageLocation', required: true },
    condition: {
      type: String,
      enum: Object.values(ASSET_CONDITIONS),
      default: ASSET_CONDITIONS.GOOD,
    },
    status: {
      type: String,
      enum: Object.values(ASSET_STATUSES),
      default: ASSET_STATUSES.AVAILABLE,
    },
    currentIssue: {
      type: Schema.Types.ObjectId,
      ref: 'IssueLine',
      default: null,
    },
    notes: { type: String, default: '' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conditionHistory: [AssetConditionHistorySchema],
  },
  { timestamps: true }
);

IndividualAssetSchema.index({ inventoryItem: 1 });
IndividualAssetSchema.index({ status: 1 });
IndividualAssetSchema.index({ condition: 1 });

export const IndividualAsset = mongoose.model<IIndividualAsset>(
  'IndividualAsset',
  IndividualAssetSchema
);
