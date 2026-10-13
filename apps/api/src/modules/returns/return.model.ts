import mongoose, { Schema, Document } from 'mongoose';
import { RETURN_CONDITIONS } from '../../constants';

export interface IReturnTransaction extends Document {
  issueLine: mongoose.Types.ObjectId;
  issueRecord: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  inventoryItem: mongoose.Types.ObjectId;
  individualAsset: mongoose.Types.ObjectId | null;
  returnDate: Date;
  quantityReturned: number;
  conditionOnReturn: 'good' | 'damaged' | 'lost';
  receivedBy: mongoose.Types.ObjectId;
  remarks: string;
  restoredToAvailable: number;
  markedDamaged: number;
  markedLost: number;
  createdAt: Date;
}

const ReturnTransactionSchema = new Schema<IReturnTransaction>(
  {
    issueLine: { type: Schema.Types.ObjectId, ref: 'IssueLine', required: true },
    issueRecord: { type: Schema.Types.ObjectId, ref: 'IssueRecord', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    individualAsset: { type: Schema.Types.ObjectId, ref: 'IndividualAsset', default: null },
    returnDate: { type: Date, required: true },
    quantityReturned: { type: Number, required: true, min: 1 },
    conditionOnReturn: {
      type: String,
      enum: Object.values(RETURN_CONDITIONS),
      required: true,
    },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String, default: '' },
    restoredToAvailable: { type: Number, default: 0, min: 0 },
    markedDamaged: { type: Number, default: 0, min: 0 },
    markedLost: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ReturnTransactionSchema.index({ issueLine: 1 });
ReturnTransactionSchema.index({ issueRecord: 1 });
ReturnTransactionSchema.index({ student: 1 });
ReturnTransactionSchema.index({ returnDate: -1 });

export const ReturnTransaction = mongoose.model<IReturnTransaction>(
  'ReturnTransaction',
  ReturnTransactionSchema
);
