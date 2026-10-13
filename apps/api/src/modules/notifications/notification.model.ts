import mongoose, { Schema, Document } from 'mongoose';
import { NOTIFICATION_TYPES } from '../../constants';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  relatedIssue: mongoose.Types.ObjectId | null;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedIssue: { type: Schema.Types.ObjectId, ref: 'IssueRecord', default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
