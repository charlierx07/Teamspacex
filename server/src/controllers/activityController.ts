import { Response, NextFunction } from 'express';
import { Activity } from '../models/Activity.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';

export const getActivities = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = 30 } = req.query;
    const user = req.user!;
    const workspaceId = await resolveWorkspaceId(req);

    // For Admin: view all activities in workspace
    // For Member: view non-private activities in workspace
    const query: any = {};
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }
    if (user.role !== ROLES.ADMIN) {
      query.resourceType = { $ne: 'PERMISSION' };
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const activities = await Activity.find(query)
      .populate('actor', 'name email avatar role')
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    res.status(200).json({ success: true, activities });
  } catch (err: any) {
    next(err);
  }
};
