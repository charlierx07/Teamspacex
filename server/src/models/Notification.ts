import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: 'TASK_ASSIGNED' | 'PROJECT_ADDED' | 'FOLDER_ACCESS' | 'PAGE_EDITED' | 'PERMISSION_CHANGED' | 'SYSTEM';
  message: string;
  resourceType?: string;
  resourceId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      enum: ['TASK_ASSIGNED', 'PROJECT_ADDED', 'FOLDER_ACCESS', 'PAGE_EDITED', 'PERMISSION_CHANGED', 'SYSTEM'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      default: ''
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
