import { Response, NextFunction } from 'express';
import { DataTable, IDataTable } from '../models/DataTable.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { checkUserFolderPermission, checkUserProjectPermission } from '../middleware/checkPermission.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';

// Helper to verify workspace isolation and permission levels
const checkTableAccess = async (
  table: IDataTable,
  user: any,
  requiredLevel: 'VIEW' | 'EDIT' | 'MANAGE'
): Promise<boolean> => {
  // 1. Workspace isolation guard: cross-workspace = strictly forbidden
  if (table.workspaceId && user.workspaceId && table.workspaceId.toString() !== user.workspaceId.toString()) {
    return false;
  }

  // 2. Workspace Admin has full access within own workspace
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // 3. Creator has full access
  if (table.createdBy && table.createdBy.toString() === user._id.toString()) {
    return true;
  }

  // 4. If table is in a folder, check folder permissions
  if (table.folderId) {
    return checkUserFolderPermission(user._id, table.folderId, requiredLevel);
  }

  // 5. If table is in a project, check project permissions
  if (table.projectId) {
    return checkUserProjectPermission(user._id, table.projectId, requiredLevel);
  }

  // 6. Standalone table in workspace: members get VIEW; only creator/Admin gets EDIT/MANAGE
  return requiredLevel === 'VIEW';
};

export const getTableById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const table = await DataTable.findById(id)
      .populate('createdBy', 'name email avatar')
      .populate('updatedBy', 'name email avatar');

    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const hasAccess = await checkTableAccess(table, user, 'VIEW');
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Permission denied to access this table.' });
      return;
    }

    res.status(200).json({ success: true, table });
  } catch (err: any) {
    next(err);
  }
};

export const createTable = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, folderId, projectId, columns } = req.body;
    const user = req.user!;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Valid table name is required' });
      return;
    }

    if (folderId && user.role !== ROLES.ADMIN) {
      const allowed = await checkUserFolderPermission(user._id, folderId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to create table in this folder.' });
        return;
      }
    } else if (projectId && user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, projectId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to create table in this project.' });
        return;
      }
    }

    const defaultColumns = columns && Array.isArray(columns) && columns.length > 0 ? columns : [
      { key: 'name', name: 'Name', type: 'text' },
      { key: 'status', name: 'Status', type: 'status' },
      { key: 'assignedTo', name: 'Assigned To', type: 'text' },
      { key: 'date', name: 'Date', type: 'date' }
    ];

    const workspaceId = await resolveWorkspaceId(req);

    const table = await DataTable.create({
      name: name.trim().slice(0, 100),
      folderId: folderId || null,
      projectId: projectId || null,
      columns: defaultColumns,
      rows: [],
      createdBy: user._id,
      updatedBy: user._id,
      workspaceId
    });

    logActivity({
      actor: user._id,
      action: 'TABLE_CREATED',
      resourceType: 'FOLDER',
      resourceId: table._id,
      resourceTitle: table.name,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Table created successfully', table });
  } catch (err: any) {
    next(err);
  }
};

export const addRow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { rowData } = req.body;
    const user = req.user!;

    const table = await DataTable.findById(id);
    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const hasAccess = await checkTableAccess(table, user, 'EDIT');
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Permission denied to edit this table.' });
      return;
    }

    const newRow = {
      _rowId: new Date().getTime().toString() + Math.random().toString(36).substring(2, 7),
      ...(typeof rowData === 'object' && rowData !== null ? rowData : {})
    };

    table.rows.push(newRow);
    table.updatedBy = user._id;
    table.markModified('rows');
    await table.save();

    res.status(200).json({ success: true, message: 'Row added', table });
  } catch (err: any) {
    next(err);
  }
};

export const updateRow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, rowId } = req.params;
    const { rowData } = req.body;
    const user = req.user!;

    const table = await DataTable.findById(id);
    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const hasAccess = await checkTableAccess(table, user, 'EDIT');
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Permission denied to edit this table.' });
      return;
    }

    const index = table.rows.findIndex((r: any) => r._rowId === rowId);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Row not found' });
      return;
    }

    table.rows[index] = { ...table.rows[index], ...(typeof rowData === 'object' && rowData !== null ? rowData : {}) };
    table.updatedBy = user._id;
    table.markModified('rows');
    await table.save();

    res.status(200).json({ success: true, message: 'Row updated', table });
  } catch (err: any) {
    next(err);
  }
};

export const deleteRow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, rowId } = req.params;
    const user = req.user!;

    const table = await DataTable.findById(id);
    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const hasAccess = await checkTableAccess(table, user, 'EDIT');
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Permission denied to modify this table.' });
      return;
    }

    table.rows = table.rows.filter((r: any) => r._rowId !== rowId);
    table.updatedBy = user._id;
    table.markModified('rows');
    await table.save();

    res.status(200).json({ success: true, message: 'Row removed', table });
  } catch (err: any) {
    next(err);
  }
};

export const deleteTable = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const table = await DataTable.findById(id);
    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const hasAccess = await checkTableAccess(table, user, 'MANAGE');
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Permission denied. Only Administrators or table creators can delete tables.' });
      return;
    }

    await DataTable.findByIdAndDelete(id);

    logActivity({
      actor: user._id,
      action: 'TABLE_DELETED',
      resourceType: 'FOLDER',
      resourceId: table._id,
      resourceTitle: table.name,
      workspaceId: table.workspaceId?.toString()
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Table deleted successfully' });
  } catch (err: any) {
    next(err);
  }
};
