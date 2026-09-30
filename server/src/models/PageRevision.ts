import mongoose, { Document, Schema } from 'mongoose';

export interface IPageRevision extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  content: string;
  editedBy: mongoose.Types.ObjectId;
  changeSummary?: string;
  createdAt: Date;
}

const PageRevisionSchema = new Schema<IPageRevision>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    pageId: {
      type: Schema.Types.ObjectId,
      ref: 'Page',
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changeSummary: {
      type: String,
      default: 'Content edit'
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

PageRevisionSchema.index({ pageId: 1, version: -1 });

export const PageRevision = mongoose.model<IPageRevision>('PageRevision', PageRevisionSchema);
