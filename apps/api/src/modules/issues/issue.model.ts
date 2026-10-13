import mongoose, { Schema, Document } from 'mongoose';
import { ISSUE_STATUSES, LINE_STATUSES } from '../../constants';

export interface IIssueRecord extends Document {
  student: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;
  issueDate: Date;
  purpose: string;
  status: 'active' | 'partially_returned' | 'returned' | 'overdue';
  lines: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssueLine extends Document {
  issueRecord: mongoose.Types.ObjectId;
  inventoryItem: mongoose.Types.ObjectId | null;
  individualAsset: mongoose.Types.ObjectId | null;
  issuedQty: number;
  returnedQty: number;
  outstandingQty: number;
  issueDate: Date;
  dueDate: Date;
  renewalCount: number;
  maxRenewals: number;
  status: 'active' | 'returned' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

const IssueRecordSchema = new Schema<IIssueRecord>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issueDate: { type: Date, required: true },
    purpose: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(ISSUE_STATUSES),
      default: ISSUE_STATUSES.ACTIVE,
    },
    lines: [{ type: Schema.Types.ObjectId, ref: 'IssueLine' }],
  },
  { timestamps: true }
);

IssueRecordSchema.index({ student: 1 });
IssueRecordSchema.index({ status: 1 });
IssueRecordSchema.index({ issueDate: -1 });

const IssueLineSchema = new Schema<IIssueLine>(
  {
    issueRecord: { type: Schema.Types.ObjectId, ref: 'IssueRecord', required: true },
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    individualAsset: { type: Schema.Types.ObjectId, ref: 'IndividualAsset', default: null },
    issuedQty: { type: Number, required: true, min: 1 },
    returnedQty: { type: Number, default: 0, min: 0 },
    outstandingQty: { type: Number, required: true, min: 0 },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    renewalCount: { type: Number, default: 0, min: 0 },
    maxRenewals: { type: Number, default: 3 },
    status: {
      type: String,
      enum: Object.values(LINE_STATUSES),
      default: LINE_STATUSES.ACTIVE,
    },
  },
  { timestamps: true }
);

IssueLineSchema.index({ issueRecord: 1 });
IssueLineSchema.index({ dueDate: 1, outstandingQty: 1 });
IssueLineSchema.index({ status: 1 });
IssueLineSchema.index({ inventoryItem: 1 });
IssueLineSchema.index({ individualAsset: 1 });

export const IssueRecord = mongoose.model<IIssueRecord>('IssueRecord', IssueRecordSchema);
export const IssueLine = mongoose.model<IIssueLine>('IssueLine', IssueLineSchema);
