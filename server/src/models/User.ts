import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, USER_STATUS } from '../config/constants.js';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: keyof typeof ROLES;
  status: keyof typeof USER_STATUS;
  avatar?: string;
  title?: string;
  workspaceId?: mongoose.Types.ObjectId;
  lastLoginAt?: Date;
  tokenVersion: number;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      required: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    avatar: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: 'Team Member'
    },
    lastLoginAt: {
      type: Date
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
