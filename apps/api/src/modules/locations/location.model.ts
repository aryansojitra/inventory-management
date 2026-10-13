import mongoose, { Schema, Document } from 'mongoose';

export interface IStorageLocation extends Document {
  locationCode: string;
  department: string;
  building: string;
  room: string;
  cupboard: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StorageLocationSchema = new Schema<IStorageLocation>(
  {
    locationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: { type: String, required: true, trim: true },
    building: { type: String, default: '', trim: true },
    room: { type: String, required: true, trim: true },
    cupboard: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StorageLocation = mongoose.model<IStorageLocation>(
  'StorageLocation',
  StorageLocationSchema
);
