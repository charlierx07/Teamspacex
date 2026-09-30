import mongoose from 'mongoose';
import { Workspace } from '../models/Workspace.js';
import { AuthRequest } from '../middleware/auth.js';

export const resolveWorkspaceId = async (
  req?: AuthRequest | null,
  explicitId?: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | undefined> => {
  if (explicitId) {
    return new mongoose.Types.ObjectId(explicitId);
  }

  if (req?.headers && req.headers['x-workspace-id']) {
    return new mongoose.Types.ObjectId(req.headers['x-workspace-id'] as string);
  }

  if (req?.user?.workspaceId) {
    return new mongoose.Types.ObjectId(req.user.workspaceId);
  }

  const workspace = await Workspace.findOne();
  return workspace ? workspace._id : undefined;
};
