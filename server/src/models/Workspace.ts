import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      default: 'Demo Workspace',
      trim: true
    },
    description: {
      type: String,
      default: 'Collaborative team workspace'
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
