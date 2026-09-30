import { Response, NextFunction } from 'express';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { sendNotification } from '../services/notificationService.js';

export const getUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    // IDOR Protection: Members can only view their own permissions. Admins can view any user in their workspace.
    if (req.user!.role !== ROLES.ADMIN && req.user!._id.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Access denied. You can only view your own permissions.' });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (targetUser.workspaceId && req.user!.workspaceId && targetUser.workspaceId.toString() !== req.user!.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. User belongs to another workspace.' });
      return;
    }

    const permissions = await Permission.find({ userId });
    res.status(200).json({ success: true, permissions });
  } catch (err: any) {
    next(err);
  }
};

export const updateUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Array of { resourceType, resourceId, accessLevel }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (targetUser.workspaceId && req.user!.workspaceId && targetUser.workspaceId.toString() !== req.user!.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. User belongs to another workspace.' });
      return;
    }

    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, message: 'Permissions array required' });
      return;
    }

    // Delete existing permissions for this user
    await Permission.deleteMany({ userId });

    // Insert new permissions if any
    const docsToInsert = permissions.map((p: any) => ({
      userId,
      resourceType: p.resourceType,
      resourceId: p.resourceId,
      accessLevel: p.accessLevel || 'VIEW',
      grantedBy: req.user!._id
    }));

    if (docsToInsert.length > 0) {
      await Permission.insertMany(docsToInsert);
    }

    logActivity({
      actor: req.user!._id,
      action: 'PERMISSION_CHANGED',
      resourceType: 'PERMISSION',
      resourceId: targetUser._id,
      resourceTitle: targetUser.name,
      metadata: { count: docsToInsert.length }
    }).catch(() => {});

    sendNotification({
      recipient: targetUser._id,
      sender: req.user!._id,
      type: 'PERMISSION_CHANGED',
      message: 'Your access permissions have been updated by an administrator.'
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Permissions successfully updated for ${targetUser.name}`,
      count: docsToInsert.length
    });
  } catch (err: any) {
    next(err);
  }
};
