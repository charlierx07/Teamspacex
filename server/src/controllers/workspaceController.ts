import { Response, NextFunction } from 'express';
import { Workspace } from '../models/Workspace.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';

export const getCurrentWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let workspace = null;
    if (req.user?.workspaceId) {
      workspace = await Workspace.findById(req.user.workspaceId);
    }
    if (!workspace) {
      workspace = await Workspace.findOne();
    }
    if (!workspace && req.user) {
      workspace = await Workspace.create({
        name: 'Demo Workspace',
        description: 'Collaborative team workspace',
        ownerId: req.user._id,
        members: [req.user._id]
      });
      req.user.workspaceId = workspace._id;
      await req.user.save();
    }

    res.status(200).json({ success: true, workspace });
  } catch (err: any) {
    next(err);
  }
};

export const updateCurrentWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      res.status(403).json({ success: false, message: 'Only workspace administrators can update workspace settings.' });
      return;
    }

    let workspace = null;
    if (user.workspaceId) {
      workspace = await Workspace.findById(user.workspaceId);
    }
    if (!workspace) {
      workspace = await Workspace.findOne();
    }

    if (!workspace) {
      res.status(404).json({ success: false, message: 'Workspace not found' });
      return;
    }

    if (name && typeof name === 'string') workspace.name = name.trim().slice(0, 100);
    if (description !== undefined) workspace.description = String(description).slice(0, 500);
    await workspace.save();

    logActivity({
      actor: user._id,
      action: 'WORKSPACE_UPDATED',
      resourceType: 'WORKSPACE',
      resourceId: workspace._id,
      resourceTitle: workspace.name,
      workspaceId: workspace._id.toString()
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Workspace updated successfully', workspace });
  } catch (err: any) {
    next(err);
  }
};

export const createWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;
    const user = req.user!;

    if (!name) {
      res.status(400).json({ success: false, message: 'Workspace name is required' });
      return;
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description || '',
      ownerId: user._id
    });

    logActivity({
      actor: user._id,
      action: 'WORKSPACE_CREATED',
      resourceType: 'WORKSPACE',
      resourceId: workspace._id,
      resourceTitle: workspace.name
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Workspace created', workspace });
  } catch (err: any) {
    next(err);
  }
};
