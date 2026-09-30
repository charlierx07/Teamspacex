import mongoose, { Document, Schema } from 'mongoose';

export interface ITableColumn {
  key: string;
  name: string;
  type: 'text' | 'number' | 'status' | 'date' | 'email' | 'phone';
}

export interface IDataTable extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  name: string;
  folderId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  columns: ITableColumn[];
  rows: Array<Record<string, any>>;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DataTableSchema = new Schema<IDataTable>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    name: {
      type: String,
      required: [true, 'Table name is required'],
      trim: true
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
    columns: [
      {
        key: { type: String, required: true },
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'number', 'status', 'date', 'email', 'phone'],
          default: 'text'
        }
      }
    ],
    rows: [
      {
        type: Schema.Types.Mixed,
        default: {}
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const DataTable = mongoose.model<IDataTable>('DataTable', DataTableSchema);
