import mongoose from 'mongoose';
import { Activity, IActivity } from '../models/Activity.js';
import { io } from '../sockets/socketHandler.js';

interface LogActivityParams {
  actor: mongoose.Types.ObjectId | string;
  action: string;
  resourceType: 'PROJECT' | 'FOLDER' | 'PAGE' | 'TASK' | 'USER' | 'PERMISSION' | 'WORKSPACE';
  resourceId?: mongoose.Types.ObjectId | string;
  resourceTitle: string;
  metadata?: Record<string, any>;
  workspaceId?: mongoose.Types.ObjectId | string;
}

export const logActivity = async (params: LogActivityParams): Promise<IActivity> => {
  try {
    const activity = await Activity.create({
      actor: params.actor,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      resourceTitle: params.resourceTitle,
      metadata: params.metadata || {},
      ...(params.workspaceId ? { workspaceId: params.workspaceId } : {})
    });

    const populatedActivity = await Activity.findById(activity._id).populate('actor', 'name email avatar role');

    if (io) {
      if (params.workspaceId) {
        io.to(`workspace:${params.workspaceId.toString()}`).emit('NEW_ACTIVITY', populatedActivity);
      } else {
        io.emit('NEW_ACTIVITY', populatedActivity);
      }
    }

    return activity;
  } catch (err) {
    console.error('Failed to log activity:', err);
    throw err;
  }
};
