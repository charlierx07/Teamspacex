import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES, USER_STATUS } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { sendNotification } from '../services/notificationService.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';
import { io } from '../sockets/socketHandler.js';

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const query: any = {};
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    const users = await User.find(query)
      .select('_id name email role status title avatar workspaceId createdAt')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, users });
  } catch (err: any) {
    next(err);
  }
};

export const addMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, title } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      res.status(409).json({ success: false, message: `Email ${cleanEmail} is already registered.` });
      return;
    }

    const workspaceId = await resolveWorkspaceId(req);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
      title: title || 'Team Member',
      workspaceId
    });

    if (workspaceId) {
      await Workspace.findByIdAndUpdate(workspaceId, {
        $addToSet: { members: user._id }
      });
    }

    logActivity({
      actor: req.user!._id,
      action: 'MEMBER_ADDED',
      resourceType: 'USER',
      resourceId: user._id,
      resourceTitle: user.name,
      workspaceId: workspaceId?.toString(),
      metadata: { role: user.role }
    }).catch(() => {});

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('MEMBER_ADDED', {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        title: user.title,
        createdAt: user.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        title: user.title,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    next(err);
  }
};

export const updateMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, status, title } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Workspace boundary check: prevent Admin in Workspace A from modifying Workspace B users
    const adminWorkspaceId = req.user?.workspaceId?.toString();
    if (adminWorkspaceId && user.workspaceId && user.workspaceId.toString() !== adminWorkspaceId) {
      res.status(403).json({ success: false, message: 'Access denied. Target user belongs to a different workspace.' });
      return;
    }

    // Prevent Admin from disabling or demoting themselves
    if (req.user!._id.toString() === user._id.toString()) {
      if (status === USER_STATUS.DISABLED) {
        res.status(400).json({ success: false, message: 'You cannot disable your own admin account.' });
        return;
      }
      if (role && role !== ROLES.ADMIN) {
        res.status(400).json({ success: false, message: 'You cannot revoke your own admin privileges.' });
        return;
      }
    }

    // Prevent demoting the sole active admin in the workspace
    if (role && role !== ROLES.ADMIN && user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({
        workspaceId: user.workspaceId,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE
      });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: 'Cannot demote the sole Administrator in this workspace. Promote another Admin first.'
        });
        return;
      }
    }

    if (name) user.name = name.trim();
    if (role && Object.values(ROLES).includes(role)) user.role = role;
    if (status && Object.values(USER_STATUS).includes(status)) user.status = status;
    if (title !== undefined) user.title = title.trim();

    await user.save();

    logActivity({
      actor: req.user!._id,
      action: 'MEMBER_UPDATED',
      resourceType: 'USER',
      resourceId: user._id,
      resourceTitle: user.name,
      metadata: { role: user.role, status: user.status }
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        title: user.title
      }
    });
  } catch (err: any) {
    next(err);
  }
};

export const resetMemberPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Workspace boundary check
    const adminWorkspaceId = req.user?.workspaceId?.toString();
    if (adminWorkspaceId && user.workspaceId && user.workspaceId.toString() !== adminWorkspaceId) {
      res.status(403).json({ success: false, message: 'Access denied. Target user belongs to a different workspace.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Invalidate all active user sessions upon admin password reset
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    sendNotification({
      recipient: user._id,
      sender: req.user!._id,
      type: 'SYSTEM',
      message: 'Your account password has been reset by an administrator.'
    }).catch(() => {});

    res.status(200).json({ success: true, message: `Password reset successfully for ${user.name}` });
  } catch (err: any) {
    next(err);
  }
};

export const deleteMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user!._id.toString() === id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Workspace boundary check
    const adminWorkspaceId = req.user?.workspaceId?.toString();
    if (adminWorkspaceId && user.workspaceId && user.workspaceId.toString() !== adminWorkspaceId) {
      res.status(403).json({ success: false, message: 'Access denied. Target user belongs to a different workspace.' });
      return;
    }

    // Prevent deleting the sole admin of the workspace
    if (user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({
        workspaceId: user.workspaceId,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE
      });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete the sole Administrator account in this workspace. Promote another Admin first.'
        });
        return;
      }
    }

    await User.findByIdAndDelete(id);
    await Permission.deleteMany({ userId: id });

    if (user.workspaceId) {
      await Workspace.findByIdAndUpdate(user.workspaceId, {
        $pull: { members: id }
      });
    }

    logActivity({
      actor: req.user!._id,
      action: 'MEMBER_REMOVED',
      resourceType: 'USER',
      resourceId: id as any,
      resourceTitle: user.name
    }).catch(() => {});

    res.status(200).json({ success: true, message: `Member ${user.name} removed successfully.` });
  } catch (err: any) {
    next(err);
  }
};
