import { Response, NextFunction } from 'express';
import { Page } from '../models/Page.js';
import { PageRevision } from '../models/PageRevision.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { io } from '../sockets/socketHandler.js';
import { checkUserPagePermission, checkUserFolderPermission, checkUserProjectPermission } from '../middleware/checkPermission.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';

export const getPages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const workspaceId = await resolveWorkspaceId(req);
    const { folderId, projectId, isPinned } = req.query;

    const filter: any = {};
    if (workspaceId) filter.workspaceId = workspaceId;
    if (folderId) filter.folderId = folderId === 'null' ? null : folderId;
    if (projectId) filter.projectId = projectId;
    if (isPinned !== undefined) filter.isPinned = isPinned === 'true';

    const pages = await Page.find(filter)
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar')
      .populate('projectId', 'name')
      .populate('folderId', 'name')
      .sort({ updatedAt: -1 });

    if (user.role === ROLES.ADMIN) {
      res.status(200).json({ success: true, pages });
      return;
    }

    // Filter pages based on permissions
    const accessible = await Promise.all(
      pages.map(async (page) => {
        return checkUserPagePermission(user._id, page._id, 'VIEW');
      })
    );

    const filteredPages = pages.filter((_, idx) => accessible[idx]);
    res.status(200).json({ success: true, pages: filteredPages });
  } catch (err: any) {
    next(err);
  }
};

export const getPageById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserPagePermission(user._id, id, 'VIEW');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to view this document.' });
        return;
      }
    }

    const page = await Page.findById(id)
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar')
      .populate('projectId', 'name')
      .populate('folderId', 'name');

    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found' });
      return;
    }

    if (page.workspaceId && user.workspaceId && page.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Document belongs to another workspace.' });
      return;
    }

    res.status(200).json({ success: true, page });
  } catch (err: any) {
    next(err);
  }
};

export const createPage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, content, folderId, projectId } = req.body;
    const user = req.user!;

    if (folderId && user.role !== ROLES.ADMIN) {
      const allowed = await checkUserFolderPermission(user._id, folderId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to create page in this folder.' });
        return;
      }
    } else if (projectId && user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, projectId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to create page in this project.' });
        return;
      }
    }

    const workspaceId = await resolveWorkspaceId(req);

    const page = await Page.create({
      title: title?.trim() || 'Untitled Document',
      content: content || '',
      folderId: folderId || null,
      projectId: projectId || null,
      createdBy: user._id,
      updatedBy: user._id,
      workspaceId,
      version: 1
    });

    // Create initial revision
    await PageRevision.create({
      pageId: page._id,
      version: 1,
      title: page.title,
      content: page.content,
      editedBy: user._id,
      workspaceId,
      changeSummary: 'Document created'
    });

    logActivity({
      actor: user._id,
      action: 'PAGE_CREATED',
      resourceType: 'PAGE',
      resourceId: page._id,
      resourceTitle: page.title,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    const populated = await Page.findById(page._id)
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar')
      .populate('projectId', 'name')
      .populate('folderId', 'name');

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('PAGE_CREATED', populated);
    }

    res.status(201).json({ success: true, message: 'Page created successfully', page: populated });
  } catch (err: any) {
    next(err);
  }
};

export const updatePage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, isPinned, changeSummary } = req.body;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserPagePermission(user._id, id, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied. You have view-only access to this document.' });
        return;
      }
    }

    const page = await Page.findById(id);
    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found' });
      return;
    }

    if (page.workspaceId && user.workspaceId && page.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Document belongs to another workspace.' });
      return;
    }

    const hasChanged =
      (title !== undefined && title !== page.title) ||
      (content !== undefined && content !== page.content);

    if (title !== undefined) page.title = title.trim();
    if (content !== undefined) page.content = content;
    if (isPinned !== undefined) page.isPinned = isPinned;

    if (hasChanged) {
      page.version += 1;
      page.updatedBy = user._id;

      // Save version audit record
      await PageRevision.create({
        pageId: page._id,
        version: page.version,
        title: page.title,
        content: page.content,
        editedBy: user._id,
        changeSummary: changeSummary || 'Auto-saved content update'
      });
    }

    await page.save();

    const populated = await Page.findById(page._id)
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    // Real-time broadcast: PAGE_UPDATED
    if (io) {
      io.to(`page:${page._id.toString()}`).emit('PAGE_UPDATED', {
        page: populated,
        updatedBy: {
          id: user._id,
          name: user.name,
          avatar: user.avatar
        },
        timestamp: new Date()
      });

      if (page.workspaceId) {
        io.to(`workspace:${page.workspaceId.toString()}`).emit('PAGE_UPDATED_WORKSPACE', {
          pageId: page._id,
          title: page.title,
          updatedByName: user.name,
          timestamp: new Date()
        });
      }
    }

    logActivity({
      actor: user._id,
      action: 'PAGE_UPDATED',
      resourceType: 'PAGE',
      resourceId: page._id,
      resourceTitle: page.title,
      workspaceId: page.workspaceId?.toString()
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Page updated successfully', page: populated });
  } catch (err: any) {
    next(err);
  }
};

export const deletePage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const page = await Page.findById(id);
    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found' });
      return;
    }

    if (page.workspaceId && user.workspaceId && page.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Document belongs to another workspace.' });
      return;
    }

    if (
      user.role !== ROLES.ADMIN &&
      page.createdBy.toString() !== user._id.toString()
    ) {
      const allowed = await checkUserPagePermission(user._id, id, 'MANAGE');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied. Only Admins or document creators can delete this document.' });
        return;
      }
    }

    const workspaceId = page.workspaceId;

    await Page.findByIdAndDelete(id);
    await PageRevision.deleteMany({ pageId: id });

    logActivity({
      actor: user._id,
      action: 'PAGE_DELETED',
      resourceType: 'PAGE',
      resourceId: id as any,
      resourceTitle: page.title,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('PAGE_DELETED', { pageId: id });
    }

    res.status(200).json({ success: true, message: `Document "${page.title}" deleted.` });
  } catch (err: any) {
    next(err);
  }
};

export const getPageRevisions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const page = await Page.findById(id);
    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found' });
      return;
    }

    if (page.workspaceId && user.workspaceId && page.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Document belongs to another workspace.' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserPagePermission(user._id, id, 'VIEW');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied' });
        return;
      }
    }

    const revisions = await PageRevision.find({ pageId: id })
      .populate('editedBy', 'name email avatar')
      .sort({ version: -1 });

    res.status(200).json({ success: true, revisions });
  } catch (err: any) {
    next(err);
  }
};

export const restorePageRevision = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, versionId } = req.params;
    const user = req.user!;

    const page = await Page.findById(id);
    const revision = await PageRevision.findById(versionId);

    if (!page || !revision) {
      res.status(404).json({ success: false, message: 'Page or Revision not found' });
      return;
    }

    if (page.workspaceId && user.workspaceId && page.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Document belongs to another workspace.' });
      return;
    }

    page.title = revision.title;
    page.content = revision.content;
    page.version += 1;
    page.updatedBy = user._id;
    await page.save();

    await PageRevision.create({
      pageId: page._id,
      version: page.version,
      title: page.title,
      content: page.content,
      editedBy: user._id,
      changeSummary: `Restored from version ${revision.version}`
    });

    res.status(200).json({ success: true, message: `Restored to version ${revision.version}`, page });
  } catch (err: any) {
    next(err);
  }
};
