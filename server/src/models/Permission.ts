import mongoose, { Document, Schema } from 'mongoose';
import { ACCESS_LEVELS } from '../config/constants.js';

export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  resourceType: 'PROJECT' | 'FOLDER';
  resourceId: mongoose.Types.ObjectId;
  accessLevel: keyof typeof ACCESS_LEVELS;
  grantedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      enum: ['PROJECT', 'FOLDER'],
      required: true
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    accessLevel: {
      type: String,
      enum: Object.values(ACCESS_LEVELS),
      default: ACCESS_LEVELS.VIEW,
      required: true
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

PermissionSchema.index({ userId: 1, resourceType: 1, resourceId: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
