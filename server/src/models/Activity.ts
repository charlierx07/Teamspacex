import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  action: string;
  resourceType: 'PROJECT' | 'FOLDER' | 'PAGE' | 'TASK' | 'USER' | 'PERMISSION' | 'WORKSPACE';
  resourceId?: mongoose.Types.ObjectId;
  resourceTitle: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      enum: ['PROJECT', 'FOLDER', 'PAGE', 'TASK', 'USER', 'PERMISSION', 'WORKSPACE'],
      required: true
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    resourceTitle: {
      type: String,
      required: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

ActivitySchema.index({ workspaceId: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
