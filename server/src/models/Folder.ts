import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  name: string;
  parentId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: 120
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

FolderSchema.index({ workspaceId: 1, projectId: 1, parentId: 1 });
FolderSchema.index({ name: 'text' });

export const Folder = mongoose.model<IFolder>('Folder', FolderSchema);
