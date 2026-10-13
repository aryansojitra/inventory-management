import mongoose, { Schema, Document } from 'mongoose';
import { STOCK_TRANSACTION_TYPES } from '../../constants';

export interface IStockTransaction extends Document {
  inventoryItem: mongoose.Types.ObjectId;
  transactionType: string;
  quantityChange: number;
  fieldAffected: string;
  previousValue: number;
  newValue: number;
  relatedIssue: mongoose.Types.ObjectId | null;
  relatedReturn: mongoose.Types.ObjectId | null;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    transactionType: {
      type: String,
      enum: Object.values(STOCK_TRANSACTION_TYPES),
      required: true,
    },
    quantityChange: { type: Number, required: true },
    fieldAffected: { type: String, required: true },
    previousValue: { type: Number, required: true },
    newValue: { type: Number, required: true },
    relatedIssue: { type: Schema.Types.ObjectId, ref: 'IssueRecord', default: null },
    relatedReturn: { type: Schema.Types.ObjectId, ref: 'ReturnTransaction', default: null },
    reason: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StockTransactionSchema.index({ inventoryItem: 1 });
StockTransactionSchema.index({ transactionType: 1 });
StockTransactionSchema.index({ createdAt: -1 });

export const StockTransaction = mongoose.model<IStockTransaction>(
  'StockTransaction',
  StockTransactionSchema
);
