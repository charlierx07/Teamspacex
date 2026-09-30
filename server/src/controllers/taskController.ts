import { Response, NextFunction } from 'express';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { sendNotification } from '../services/notificationService.js';
import { io } from '../sockets/socketHandler.js';
import { checkUserProjectPermission } from '../middleware/checkPermission.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const workspaceId = await resolveWorkspaceId(req);
    const { projectId, assignedTo, status } = req.query;

    const filter: any = {};
    if (workspaceId) filter.workspaceId = workspaceId;
    if (projectId) filter.projectId = projectId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    if (user.role !== ROLES.ADMIN) {
      // Find permitted projects
      const userPerms = await Permission.find({ userId: user._id, resourceType: 'PROJECT' });
      const permittedProjectIds = userPerms.map((p) => p.resourceId);
      const userProjects = await Project.find({
        ...(workspaceId ? { workspaceId } : {}),
        $or: [{ owner: user._id }, { members: user._id }, { _id: { $in: permittedProjectIds } }]
      }).select('_id');
      const allowedIds = userProjects.map((p) => p._id);

      // User can see tasks in their projects OR tasks explicitly assigned to them
      filter.$or = [{ projectId: { $in: allowedIds } }, { assignedTo: user._id }];
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name')
      .sort({ order: 1, updatedAt: -1 });

    res.status(200).json({ success: true, tasks });
  } catch (err: any) {
    next(err);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, projectId, assignedTo, priority, status, dueDate } = req.body;
    const user = req.user!;

    if (!title || !projectId) {
      res.status(400).json({ success: false, message: 'Title and Project ID are required' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, projectId, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied to add tasks to this project' });
        return;
      }
    }

    const count = await Task.countDocuments({ projectId, status: status || 'TODO' });
    const workspaceId = await resolveWorkspaceId(req);

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      projectId,
      assignedTo: assignedTo || null,
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      order: count,
      createdBy: user._id,
      workspaceId
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name');

    logActivity({
      actor: user._id,
      action: 'TASK_CREATED',
      resourceType: 'TASK',
      resourceId: task._id,
      resourceTitle: task.title,
      workspaceId: workspaceId?.toString(),
      metadata: { status: task.status, priority: task.priority }
    }).catch(() => {});

    if (assignedTo && assignedTo.toString() !== user._id.toString()) {
      sendNotification({
        recipient: assignedTo,
        sender: user._id,
        type: 'TASK_ASSIGNED',
        message: `You were assigned task "${task.title}"`,
        resourceType: 'TASK',
        resourceId: task._id
      }).catch(() => {});
    }

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('TASK_CREATED', populated);
    }

    res.status(201).json({ success: true, message: 'Task created successfully', task: populated });
  } catch (err: any) {
    next(err);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (task.workspaceId && user.workspaceId && task.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Task belongs to another workspace.' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      const isAssignee = task.assignedTo && task.assignedTo.toString() === user._id.toString();
      const isCreator = task.createdBy.toString() === user._id.toString();
      const hasProjEdit = await checkUserProjectPermission(user._id, task.projectId, 'EDIT');

      if (!isAssignee && !isCreator && !hasProjEdit) {
        res.status(403).json({ success: false, message: 'Permission denied to modify this task.' });
        return;
      }
    }

    const { title, description, assignedTo, status, priority, dueDate, order } = req.body;
    const oldAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    const oldStatus = task.status;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (order !== undefined) task.order = order;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name');

    // Notify new assignee if changed
    if (assignedTo && assignedTo.toString() !== oldAssignee && assignedTo.toString() !== user._id.toString()) {
      sendNotification({
        recipient: assignedTo,
        sender: user._id,
        type: 'TASK_ASSIGNED',
        message: `You were assigned task "${task.title}"`,
        resourceType: 'TASK',
        resourceId: task._id
      }).catch(() => {});
    }

    // Notify assignee if status changed by someone else
    if (status && status !== oldStatus && task.assignedTo && task.assignedTo.toString() !== user._id.toString()) {
      sendNotification({
        recipient: task.assignedTo,
        sender: user._id,
        type: 'SYSTEM',
        message: `Task "${task.title}" status changed to ${task.status}`,
        resourceType: 'TASK',
        resourceId: task._id
      }).catch(() => {});
    }

    logActivity({
      actor: user._id,
      action: 'TASK_UPDATED',
      resourceType: 'TASK',
      resourceId: task._id,
      resourceTitle: task.title,
      workspaceId: task.workspaceId?.toString(),
      metadata: { status: task.status, priority: task.priority }
    }).catch(() => {});

    if (io && task.workspaceId) {
      io.to(`workspace:${task.workspaceId.toString()}`).emit('TASK_UPDATED', populated);
    }

    res.status(200).json({ success: true, message: 'Task updated successfully', task: populated });
  } catch (err: any) {
    next(err);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (task.workspaceId && user.workspaceId && task.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Task belongs to another workspace.' });
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, task.projectId, 'EDIT');
      if (!allowed && task.createdBy.toString() !== user._id.toString()) {
        res.status(403).json({ success: false, message: 'Permission denied to delete this task' });
        return;
      }
    }

    const workspaceId = task.workspaceId;

    await Task.findByIdAndDelete(id);

    logActivity({
      actor: user._id,
      action: 'TASK_DELETED',
      resourceType: 'TASK',
      resourceId: id as any,
      resourceTitle: task.title,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('TASK_DELETED', { taskId: id });
    }

    res.status(200).json({ success: true, message: `Task "${task.title}" deleted.` });
  } catch (err: any) {
    next(err);
  }
};
