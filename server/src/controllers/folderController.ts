import { Response, NextFunction } from 'express';
import { Folder } from '../models/Folder.js';
import { Page } from '../models/Page.js';
import { DataTable } from '../models/DataTable.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { checkUserFolderPermission, checkUserProjectPermission } from '../middleware/checkPermission.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';

export const getFolders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const workspaceId = await resolveWorkspaceId(req);
    const { projectId, parentId } = req.query;

    const filter: any = {};
    if (workspaceId) filter.workspaceId = workspaceId;
    if (projectId) filter.projectId = projectId;
    if (parentId !== undefined) filter.parentId = parentId === 'null' ? null : parentId;

    const folders = await Folder.find(filter).sort({ name: 1 });

    // Filter by permissions if member
    let allowedFolders = folders;
    if (user.role !== ROLES.ADMIN) {
      const perms = await Permission.find({ userId: user._id, resourceType: 'FOLDER' });
      const permittedFolderIds = new Set(perms.map((p) => p.resourceId.toString()));

      const checkList = await Promise.all(
        folders.map(async (f) => {
          if (f.createdBy.toString() === user._id.toString()) return true;
          if (permittedFolderIds.has(f._id.toString())) return true;
          if (f.projectId) {
            return checkUserProjectPermission(user._id, f.projectId, 'VIEW');
          }
          return false;
        })
      );

      allowedFolders = folders.filter((_, idx) => checkList[idx]);
    }

    // Attach counts of pages & tables
    const result = await Promise.all(
      allowedFolders.map(async (folder) => {
        const [pageCount, tableCount] = await Promise.all([
          Page.countDocuments({ folderId: folder._id }),
          DataTable.countDocuments({ folderId: folder._id })
        ]);
        return {
          ...folder.toObject(),
          pageCount,
          tableCount
        };
      })
    );

    res.status(200).json({ success: true, folders: result });
  } catch (err: any) {
    next(err);
  }
};

export const getFolderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserFolderPermission(user._id, id, 'VIEW');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to access this folder.' });
        return;
      }
    }

    const folder = await Folder.findById(id).populate('createdBy', 'name email avatar');
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    if (folder.workspaceId && user.workspaceId && folder.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Folder belongs to another workspace.' });
      return;
    }

    const [subfolders, pages, tables] = await Promise.all([
      Folder.find({ parentId: id }).sort({ name: 1 }),
      Page.find({ folderId: id }).populate('updatedBy', 'name email avatar').sort({ updatedAt: -1 }),
      DataTable.find({ folderId: id }).populate('updatedBy', 'name email avatar').sort({ updatedAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      folder,
      subfolders,
      pages,
      tables
    });
  } catch (err: any) {
    next(err);
  }
};

export const createFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, projectId, parentId } = req.body;
    const user = req.user!;

    if (!name) {
      res.status(400).json({ success: false, message: 'Folder name is required' });
      return;
    }

    if (projectId && user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, projectId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to create folder in this project.' });
        return;
      }
    }

    const workspaceId = await resolveWorkspaceId(req);

    const folder = await Folder.create({
      name: name.trim(),
      projectId: projectId || null,
      parentId: parentId || null,
      createdBy: user._id,
      workspaceId
    });

    logActivity({
      actor: user._id,
      action: 'FOLDER_CREATED',
      resourceType: 'FOLDER',
      resourceId: folder._id,
      resourceTitle: folder.name,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Folder created successfully', folder });
  } catch (err: any) {
    next(err);
  }
};

export const updateFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const user = req.user!;

    const folder = await Folder.findById(id);
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    if (folder.workspaceId && user.workspaceId && folder.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Folder belongs to another workspace.' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserFolderPermission(user._id, id, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to update this folder.' });
        return;
      }
    }

    if (name) folder.name = name.trim();
    await folder.save();

    res.status(200).json({ success: true, message: 'Folder updated successfully', folder });
  } catch (err: any) {
    next(err);
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const folder = await Folder.findById(id);
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    if (folder.workspaceId && user.workspaceId && folder.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Folder belongs to another workspace.' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      res.status(403).json({ success: false, message: 'Only administrators can delete folders.' });
      return;
    }

    await Folder.findByIdAndDelete(id);
    await Page.deleteMany({ folderId: id });
    await DataTable.deleteMany({ folderId: id });
    await Permission.deleteMany({ resourceType: 'FOLDER', resourceId: id });

    logActivity({
      actor: user._id,
      action: 'FOLDER_DELETED',
      resourceType: 'FOLDER',
      resourceId: id as any,
      resourceTitle: folder.name
    }).catch(() => {});

    res.status(200).json({ success: true, message: `Folder "${folder.name}" deleted.` });
  } catch (err: any) {
    next(err);
  }
};
