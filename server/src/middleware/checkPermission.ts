import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from './auth.js';
import { ROLES, ACCESS_LEVELS } from '../config/constants.js';
import { Permission } from '../models/Permission.js';
import { Project } from '../models/Project.js';
import { Folder } from '../models/Folder.js';
import { Page } from '../models/Page.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

type Level = keyof typeof ACCESS_LEVELS;

const levelWeight: Record<Level, number> = {
  VIEW: 1,
  EDIT: 2,
  MANAGE: 3
};

export const hasSufficientLevel = (actual: Level, required: Level): boolean => {
  return levelWeight[actual] >= levelWeight[required];
};

export const checkUserProjectPermission = async (
  userId: string | mongoose.Types.ObjectId,
  projectId: string | mongoose.Types.ObjectId,
  requiredLevel: Level = 'VIEW'
): Promise<boolean> => {
  const [project, user] = await Promise.all([
    Project.findById(projectId),
    User.findById(userId)
  ]);
  if (!project || !user) return false;

  // Workspace isolation: different workspace = inaccessible
  if (user.workspaceId && project.workspaceId && user.workspaceId.toString() !== project.workspaceId.toString()) {
    return false;
  }

  // Admin in same workspace has full access
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Project owner or creator has full manage access
  if (project.owner.toString() === userId.toString() || project.createdBy.toString() === userId.toString()) {
    return true;
  }

  // Check explicit project permission
  const perm = await Permission.findOne({
    userId,
    resourceType: 'PROJECT',
    resourceId: projectId
  });

  if (perm && hasSufficientLevel(perm.accessLevel, requiredLevel)) {
    return true;
  }

  // Check if user is a member of project (grants default VIEW and EDIT)
  const isMember = project.members.some((m) => m.toString() === userId.toString());
  if (isMember && (requiredLevel === 'VIEW' || requiredLevel === 'EDIT')) {
    return true;
  }

  // In the same workspace, all workspace members have VIEW permission on collaborative workspace projects
  if (requiredLevel === 'VIEW') {
    return true;
  }

  return false;
};

export const checkUserFolderPermission = async (
  userId: string | mongoose.Types.ObjectId,
  folderId: string | mongoose.Types.ObjectId,
  requiredLevel: Level = 'VIEW'
): Promise<boolean> => {
  const [folder, user] = await Promise.all([
    Folder.findById(folderId),
    User.findById(userId)
  ]);
  if (!folder || !user) return false;

  // Workspace isolation
  if (user.workspaceId && folder.workspaceId && user.workspaceId.toString() !== folder.workspaceId.toString()) {
    return false;
  }

  // Admin has full access
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  if (folder.createdBy.toString() === userId.toString()) {
    return true;
  }

  // Check direct folder permission
  const perm = await Permission.findOne({
    userId,
    resourceType: 'FOLDER',
    resourceId: folderId
  });

  if (perm && hasSufficientLevel(perm.accessLevel, requiredLevel)) {
    return true;
  }

  // If folder belongs to a project, project permission inherits down
  if (folder.projectId) {
    return checkUserProjectPermission(userId, folder.projectId, requiredLevel);
  }

  // In the same workspace, workspace members have VIEW access to folders
  if (requiredLevel === 'VIEW') {
    return true;
  }

  return false;
};

export const checkUserPagePermission = async (
  userId: string | mongoose.Types.ObjectId,
  pageId: string | mongoose.Types.ObjectId,
  requiredLevel: Level = 'VIEW'
): Promise<boolean> => {
  const [page, user] = await Promise.all([
    Page.findById(pageId),
    User.findById(userId)
  ]);
  if (!page || !user) return false;

  // Workspace isolation: different workspace = strictly inaccessible
  if (user.workspaceId && page.workspaceId && user.workspaceId.toString() !== page.workspaceId.toString()) {
    return false;
  }

  // Admin has full access to all resources in their workspace
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Document creator has full access
  if (page.createdBy.toString() === userId.toString()) {
    return true;
  }

  // Check direct page permission in Permission collection
  const directPerm = await Permission.findOne({
    userId,
    resourceType: 'PAGE',
    resourceId: pageId
  });

  if (directPerm && hasSufficientLevel(directPerm.accessLevel, requiredLevel)) {
    return true;
  }

  // Inherited permission from folder
  if (page.folderId) {
    const hasFolderAccess = await checkUserFolderPermission(userId, page.folderId, requiredLevel);
    if (hasFolderAccess) return true;
  }

  // Inherited permission from project
  if (page.projectId) {
    return checkUserProjectPermission(userId, page.projectId, requiredLevel);
  }

  // In the same workspace, all workspace members have VIEW access to workspace documents
  if (requiredLevel === 'VIEW') {
    return true;
  }

  return false;
};

export const checkUserTaskPermission = async (
  userId: string | mongoose.Types.ObjectId,
  taskId: string | mongoose.Types.ObjectId,
  requiredLevel: Level = 'VIEW'
): Promise<boolean> => {
  const [task, user] = await Promise.all([
    Task.findById(taskId),
    User.findById(userId)
  ]);
  if (!task || !user) return false;

  // Workspace isolation
  if (user.workspaceId && task.workspaceId && user.workspaceId.toString() !== task.workspaceId.toString()) {
    return false;
  }

  if (user.role === ROLES.ADMIN) {
    return true;
  }

  if (task.assignedTo && task.assignedTo.toString() === userId.toString()) {
    return true; // Assigned user can view and edit task status
  }

  if (task.createdBy.toString() === userId.toString()) {
    return true;
  }

  if (task.projectId) {
    return checkUserProjectPermission(userId, task.projectId, requiredLevel);
  }

  return false;
};

// Express middleware generators
export const requireProjectPermission = (requiredLevel: Level = 'VIEW') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const projectId = req.params.id || req.params.projectId || req.body.projectId;
    if (!projectId) {
      res.status(400).json({ success: false, message: 'Project ID is required' });
      return;
    }

    const allowed = await checkUserProjectPermission(req.user._id, projectId, requiredLevel);
    if (!allowed) {
      res.status(403).json({
        success: false,
        message: `Permission denied. Requires ${requiredLevel} permission on this project.`
      });
      return;
    }

    next();
  };
};

export const requireFolderPermission = (requiredLevel: Level = 'VIEW') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const folderId = req.params.id || req.params.folderId || req.body.folderId;
    if (!folderId) {
      res.status(400).json({ success: false, message: 'Folder ID is required' });
      return;
    }

    const allowed = await checkUserFolderPermission(req.user._id, folderId, requiredLevel);
    if (!allowed) {
      res.status(403).json({
        success: false,
        message: `Permission denied. Requires ${requiredLevel} permission on this folder.`
      });
      return;
    }

    next();
  };
};

export const requirePagePermission = (requiredLevel: Level = 'VIEW') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const pageId = req.params.id || req.params.pageId;
    if (!pageId) {
      res.status(400).json({ success: false, message: 'Page ID is required' });
      return;
    }

    const allowed = await checkUserPagePermission(req.user._id, pageId, requiredLevel);
    if (!allowed) {
      res.status(403).json({
        success: false,
        message: `Permission denied. Requires ${requiredLevel} permission on this page.`
      });
      return;
    }

    next();
  };
};
