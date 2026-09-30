import { Response, NextFunction } from 'express';
import { Project } from '../models/Project.js';
import { Folder } from '../models/Folder.js';
import { Page } from '../models/Page.js';
import { Task } from '../models/Task.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

// Helper to escape special regular expression characters to prevent ReDoS attacks
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const globalSearch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    const user = req.user!;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.status(200).json({
        success: true,
        results: { projects: [], folders: [], pages: [], tasks: [] }
      });
      return;
    }

    // Limit query length to prevent excessive regex processing
    const cleanQ = escapeRegex(q.trim().slice(0, 60));
    const regex = new RegExp(cleanQ, 'i');
    const wsId = user.workspaceId;

    let permittedProjectIds: any[] = [];
    let permittedFolderIds: any[] = [];

    if (user.role !== ROLES.ADMIN) {
      const perms = await Permission.find({ userId: user._id });
      permittedProjectIds = perms.filter((p) => p.resourceType === 'PROJECT').map((p) => p.resourceId);
      permittedFolderIds = perms.filter((p) => p.resourceType === 'FOLDER').map((p) => p.resourceId);
    }

    // 1. Projects search query (strictly scoped by workspace)
    const projectQuery: any = {
      ...(wsId ? { workspaceId: wsId } : {}),
      $or: [{ name: regex }, { description: regex }]
    };
    if (user.role !== ROLES.ADMIN) {
      projectQuery.$and = [
        {
          $or: [
            { owner: user._id },
            { members: user._id },
            { _id: { $in: permittedProjectIds } }
          ]
        }
      ];
    }

    // 2. Folders search query (strictly scoped by workspace)
    const folderQuery: any = {
      ...(wsId ? { workspaceId: wsId } : {}),
      name: regex
    };
    if (user.role !== ROLES.ADMIN) {
      folderQuery.$and = [
        {
          $or: [
            { createdBy: user._id },
            { _id: { $in: permittedFolderIds } },
            { projectId: { $in: permittedProjectIds } }
          ]
        }
      ];
    }

    // 3. Pages search query (strictly scoped by workspace)
    const pageQuery: any = {
      ...(wsId ? { workspaceId: wsId } : {}),
      $or: [{ title: regex }, { content: regex }]
    };
    if (user.role !== ROLES.ADMIN) {
      pageQuery.$and = [
        {
          $or: [
            { createdBy: user._id },
            { projectId: { $in: permittedProjectIds } },
            { folderId: { $in: permittedFolderIds } }
          ]
        }
      ];
    }

    // 4. Tasks search query (strictly scoped by workspace)
    const taskQuery: any = {
      ...(wsId ? { workspaceId: wsId } : {}),
      $or: [{ title: regex }, { description: regex }]
    };
    if (user.role !== ROLES.ADMIN) {
      taskQuery.$and = [
        {
          $or: [
            { assignedTo: user._id },
            { createdBy: user._id },
            { projectId: { $in: permittedProjectIds } }
          ]
        }
      ];
    }

    const [projects, folders, pages, tasks] = await Promise.all([
      Project.find(projectQuery).select('name description status priority').limit(5),
      Folder.find(folderQuery).select('name projectId parentId').limit(5),
      Page.find(pageQuery).select('title projectId folderId updatedAt').limit(8),
      Task.find(taskQuery).select('title status priority projectId dueDate').limit(8)
    ]);

    res.status(200).json({
      success: true,
      results: {
        projects,
        folders,
        pages,
        tasks
      }
    });
  } catch (err: any) {
    next(err);
  }
};
