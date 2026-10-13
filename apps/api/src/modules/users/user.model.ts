import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, Role } from '../../constants';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  isActive: boolean;
  studentProfile: mongoose.Types.ObjectId | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    studentProfile: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
