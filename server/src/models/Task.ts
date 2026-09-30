import mongoose, { Document, Schema } from 'mongoose';
import { TASK_STATUS, PRIORITY } from '../config/constants.js';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  projectId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  status: keyof typeof TASK_STATUS;
  priority: keyof typeof PRIORITY;
  dueDate?: Date;
  order: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITY),
      default: PRIORITY.MEDIUM
    },
    dueDate: {
      type: Date
    },
    order: {
      type: Number,
      default: 0
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

TaskSchema.index({ title: 'text', description: 'text' });
TaskSchema.index({ workspaceId: 1, projectId: 1, status: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
