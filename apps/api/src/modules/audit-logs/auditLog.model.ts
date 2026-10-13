import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  previousValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  remarks: string;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    remarks: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  {
    timestamps: true,
    // Audit logs are never updated
  }
);

AuditLogSchema.index({ actor: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
