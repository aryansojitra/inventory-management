import mongoose, { Schema, Document } from 'mongoose';
import { RENEWAL_STATUSES } from '../../constants';

export interface IRenewalRequest extends Document {
  issueLine: mongoose.Types.ObjectId;
  issueRecord: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  requestDate: Date;
  previousDueDate: Date;
  proposedDueDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decidedBy: mongoose.Types.ObjectId | null;
  decidedAt: Date | null;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

const RenewalRequestSchema = new Schema<IRenewalRequest>(
  {
    issueLine: { type: Schema.Types.ObjectId, ref: 'IssueLine', required: true },
    issueRecord: { type: Schema.Types.ObjectId, ref: 'IssueRecord', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, required: true },
    previousDueDate: { type: Date, required: true },
    proposedDueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(RENEWAL_STATUSES),
      default: RENEWAL_STATUSES.PENDING,
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

RenewalRequestSchema.index({ issueLine: 1 });
RenewalRequestSchema.index({ student: 1 });
RenewalRequestSchema.index({ status: 1 });
RenewalRequestSchema.index({ requestDate: -1 });

export const RenewalRequest = mongoose.model<IRenewalRequest>(
  'RenewalRequest',
  RenewalRequestSchema
);
