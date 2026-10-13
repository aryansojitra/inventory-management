import mongoose, { Schema, Document } from 'mongoose';
import { TRACKING_MODES, DEFAULT_MAX_RENEWALS } from '../../constants';

export interface IInventoryItem extends Document {
  itemCode: string;
  name: string;
  category: string;
  description: string;
  make: string;
  modelNumber: string;
  trackingMode: 'individual' | 'quantity';
  // Quantity-based fields
  totalStock: number;
  availableQty: number;
  issuedQty: number;
  damagedQty: number;
  lostQty: number;
  maintenanceQty: number;
  retiredQty: number;
  // Individual-mode tracking
  totalAssets: number;
  availableAssets: number;
  location: mongoose.Types.ObjectId;
  policy: {
    maxRenewals: number;
    borrowingDays: number;
  };
  isRetired: boolean;
  retiredAt: Date | null;
  retiredReason: string | null;
  retiredBy: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    itemCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    make: { type: String, default: '' },
    modelNumber: { type: String, default: '' },
    trackingMode: {
      type: String,
      enum: Object.values(TRACKING_MODES),
      required: true,
    },
    // Quantity-based
    totalStock: { type: Number, default: 0, min: 0 },
    availableQty: { type: Number, default: 0, min: 0 },
    issuedQty: { type: Number, default: 0, min: 0 },
    damagedQty: { type: Number, default: 0, min: 0 },
    lostQty: { type: Number, default: 0, min: 0 },
    maintenanceQty: { type: Number, default: 0, min: 0 },
    retiredQty: { type: Number, default: 0, min: 0 },
    // Individual
    totalAssets: { type: Number, default: 0, min: 0 },
    availableAssets: { type: Number, default: 0, min: 0 },
    location: { type: Schema.Types.ObjectId, ref: 'StorageLocation', required: true },
    policy: {
      maxRenewals: { type: Number, default: DEFAULT_MAX_RENEWALS, min: 0 },
      borrowingDays: { type: Number, default: 15, min: 1 },
    },
    isRetired: { type: Boolean, default: false },
    retiredAt: { type: Date, default: null },
    retiredReason: { type: String, default: null },
    retiredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ trackingMode: 1 });
InventoryItemSchema.index({ category: 1 });
InventoryItemSchema.index({ isRetired: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
