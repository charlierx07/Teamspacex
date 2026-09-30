import { Response, NextFunction } from 'express';
import { Project } from '../models/Project.js';
import { Folder } from '../models/Folder.js';
import { Page } from '../models/Page.js';
import { Task } from '../models/Task.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';
import { sendNotification } from '../services/notificationService.js';
import { checkUserProjectPermission } from '../middleware/checkPermission.js';
import { resolveWorkspaceId } from '../utils/workspaceHelper.js';
import { io } from '../sockets/socketHandler.js';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const workspaceId = await resolveWorkspaceId(req);
    let query: any = {};
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Attach counts
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const [taskCount, doneTaskCount, pageCount] = await Promise.all([
          Task.countDocuments({ projectId: project._id }),
          Task.countDocuments({ projectId: project._id, status: 'DONE' }),
          Page.countDocuments({ projectId: project._id })
        ]);

        const calcProgress = taskCount > 0 ? Math.round((doneTaskCount / taskCount) * 100) : project.progress;

        return {
          ...project.toObject(),
          taskCount,
          doneTaskCount,
          pageCount,
          progress: calcProgress
        };
      })
    );

    res.status(200).json({ success: true, projects: projectsWithCounts });
  } catch (err: any) {
    next(err);
  }
};

export const getProjectById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, id, 'VIEW');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to access this project.' });
        return;
      }
    }

    const project = await Project.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (project.workspaceId && user.workspaceId && project.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Project belongs to another workspace.' });
      return;
    }

    const [folders, pages, tasks] = await Promise.all([
      Folder.find({ projectId: id }).sort({ name: 1 }),
      Page.find({ projectId: id }).populate('updatedBy', 'name email avatar').sort({ updatedAt: -1 }),
      Task.find({ projectId: id }).populate('assignedTo', 'name email avatar').sort({ order: 1, createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      project,
      folders,
      pages,
      tasks
    });
  } catch (err: any) {
    next(err);
  }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, priority, deadline, status, members } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Project name is required' });
      return;
    }

    const workspaceId = await resolveWorkspaceId(req, req.body.workspaceId);

    const memberList = Array.isArray(members) ? [...members] : [];
    if (!memberList.some((m) => m.toString() === req.user!._id.toString())) {
      memberList.push(req.user!._id);
    }

    const project = await Project.create({
      workspaceId,
      name: name.trim(),
      description: description || '',
      owner: req.user!._id,
      members: memberList,
      priority: priority || 'MEDIUM',
      status: status || 'PLANNING',
      deadline: deadline ? new Date(deadline) : undefined,
      progress: 0,
      createdBy: req.user!._id,
      updatedBy: req.user!._id
    });

    logActivity({
      actor: req.user!._id,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: project._id,
      resourceTitle: project.name,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    // Notify added members
    if (Array.isArray(members)) {
      members.forEach((memberId: string) => {
        if (memberId.toString() !== req.user!._id.toString()) {
          sendNotification({
            recipient: memberId,
            sender: req.user!._id,
            type: 'PROJECT_ADDED',
            message: `You were added to project "${project.name}"`,
            resourceType: 'PROJECT',
            resourceId: project._id
          }).catch(() => {});
        }
      });
    }

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    const projectObj = {
      ...populated!.toObject(),
      taskCount: 0,
      doneTaskCount: 0,
      pageCount: 0,
      progress: 0
    };

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('PROJECT_CREATED', projectObj);
    }

    res.status(201).json({ success: true, message: 'Project created successfully', project: projectObj });
  } catch (err: any) {
    next(err);
  }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== ROLES.ADMIN) {
      const allowed = await checkUserProjectPermission(user._id, id, 'EDIT');
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Permission denied. Cannot edit project.' });
        return;
      }
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (project.workspaceId && user.workspaceId && project.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Project belongs to another workspace.' });
      return;
    }

    const { name, description, priority, deadline, status, progress, members } = req.body;

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (priority) project.priority = priority;
    if (status) project.status = status;
    if (progress !== undefined) project.progress = progress;
    if (deadline !== undefined) project.deadline = deadline ? new Date(deadline) : undefined;
    if (Array.isArray(members)) project.members = members;

    project.updatedBy = user._id;
    await project.save();

    logActivity({
      actor: user._id,
      action: 'PROJECT_UPDATED',
      resourceType: 'PROJECT',
      resourceId: project._id,
      resourceTitle: project.name,
      workspaceId: project.workspaceId?.toString()
    }).catch(() => {});

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (io && project.workspaceId) {
      io.to(`workspace:${project.workspaceId.toString()}`).emit('PROJECT_UPDATED', populated);
    }

    res.status(200).json({ success: true, message: 'Project updated', project: populated });
  } catch (err: any) {
    next(err);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    if (project.workspaceId && user.workspaceId && project.workspaceId.toString() !== user.workspaceId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied. Project belongs to another workspace.' });
      return;
    }

    if (
      user.role !== ROLES.ADMIN &&
      project.owner.toString() !== user._id.toString() &&
      project.createdBy.toString() !== user._id.toString()
    ) {
      res.status(403).json({ success: false, message: 'Permission denied. Only Administrators or Project Owners can delete projects.' });
      return;
    }

    const workspaceId = project.workspaceId;

    await Project.findByIdAndDelete(id);
    await Folder.deleteMany({ projectId: id });
    await Page.deleteMany({ projectId: id });
    await Task.deleteMany({ projectId: id });
    await Permission.deleteMany({ resourceType: 'PROJECT', resourceId: id });

    logActivity({
      actor: user._id,
      action: 'PROJECT_DELETED',
      resourceType: 'PROJECT',
      resourceId: id as any,
      resourceTitle: project.name,
      workspaceId: workspaceId?.toString()
    }).catch(() => {});

    if (io && workspaceId) {
      io.to(`workspace:${workspaceId.toString()}`).emit('PROJECT_DELETED', { projectId: id });
    }

    res.status(200).json({ success: true, message: `Project ${project.name} and related resources deleted.` });
  } catch (err: any) {
    next(err);
  }
};
