import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  enrolmentNumber: string;
  fullName: string;
  programme: string;
  semester: number;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    enrolmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    programme: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

StudentSchema.index({ programme: 1 });
StudentSchema.index({ user: 1 });

export const Student = mongoose.model<IStudent>('Student', StudentSchema);
