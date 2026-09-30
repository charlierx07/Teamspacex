import mongoose, { Document, Schema } from 'mongoose';
import { PROJECT_STATUS, PRIORITY } from '../config/constants.js';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: keyof typeof PROJECT_STATUS;
  priority: keyof typeof PRIORITY;
  deadline?: Date;
  progress: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PLANNING,
      required: true
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITY),
      default: PRIORITY.MEDIUM,
      required: true
    },
    deadline: {
      type: Date
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
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
    }
  },
  {
    timestamps: true
  }
);

ProjectSchema.index({ name: 'text', description: 'text' });
ProjectSchema.index({ workspaceId: 1, status: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
