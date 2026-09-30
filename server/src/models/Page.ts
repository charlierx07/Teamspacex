import mongoose, { Document, Schema } from 'mongoose';

export interface IPage extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  folderId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  isPinned: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      default: 'Untitled Document'
    },
    content: {
      type: String,
      default: ''
    },
    folderId: {
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
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

PageSchema.index({ title: 'text', content: 'text' });
PageSchema.index({ workspaceId: 1, projectId: 1, folderId: 1 });

export const Page = mongoose.model<IPage>('Page', PageSchema);
