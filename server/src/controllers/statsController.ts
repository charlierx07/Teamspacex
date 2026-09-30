import { Response, NextFunction } from 'express';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Page } from '../models/Page.js';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { Permission } from '../models/Permission.js';
import { AuthRequest } from '../middleware/auth.js';
import { ROLES, TASK_STATUS, USER_STATUS } from '../config/constants.js';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const wsId = user.workspaceId;
    const wsFilter = wsId ? { workspaceId: wsId } : {};

    let permittedProjectIds: any[] = [];
    if (user.role !== ROLES.ADMIN) {
      const perms = await Permission.find({ userId: user._id, resourceType: 'PROJECT' });
      permittedProjectIds = perms.map((p) => p.resourceId);
    }

    const projectQuery: any = { ...wsFilter, status: { $ne: 'COMPLETED' } };
    if (user.role !== ROLES.ADMIN) {
      projectQuery.$or = [
        { owner: user._id },
        { members: user._id },
        { _id: { $in: permittedProjectIds } }
      ];
    }

    const taskQuery: any = {
      ...wsFilter,
      status: { $ne: TASK_STATUS.DONE }
    };
    if (user.role !== ROLES.ADMIN) {
      taskQuery.assignedTo = user._id;
    }

    const dueTodayQuery: any = {
      ...taskQuery,
      dueDate: { $gte: todayStart, $lte: todayEnd }
    };

    const [
      activeProjectsCount,
      pendingTasksCount,
      tasksDueTodayCount,
      recentActivityCount,
      myTasks,
      recentProjects,
      recentPages
    ] = await Promise.all([
      Project.countDocuments(projectQuery),
      Task.countDocuments(taskQuery),
      Task.countDocuments(dueTodayQuery),
      Activity.countDocuments({
        ...wsFilter,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Task.find({ ...wsFilter, assignedTo: user._id, status: { $ne: TASK_STATUS.DONE } })
        .populate('projectId', 'name')
        .sort({ dueDate: 1, priority: -1 })
        .limit(6),
      Project.find(user.role === ROLES.ADMIN ? wsFilter : projectQuery)
        .populate('owner', 'name avatar')
        .sort({ updatedAt: -1 })
        .limit(5),
      Page.find(
        user.role === ROLES.ADMIN
          ? wsFilter
          : {
              ...wsFilter,
              $or: [
                { createdBy: user._id },
                { projectId: { $in: permittedProjectIds } }
              ]
            }
      )
        .populate('updatedBy', 'name avatar')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        activeProjects: activeProjectsCount,
        pendingTasks: pendingTasksCount,
        tasksDueToday: tasksDueTodayCount,
        recentActivity: recentActivityCount
      },
      myTasks,
      recentProjects,
      recentPages
    });
  } catch (err: any) {
    next(err);
  }
};

export const getAdminStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const wsId = user.workspaceId;
    const wsFilter = wsId ? { workspaceId: wsId } : {};

    const [
      totalMembers,
      activeMembers,
      totalProjects,
      openTasks,
      totalPages,
      recentActivities
    ] = await Promise.all([
      User.countDocuments(wsFilter),
      User.countDocuments({ ...wsFilter, status: USER_STATUS.ACTIVE }),
      Project.countDocuments(wsFilter),
      Task.countDocuments({ ...wsFilter, status: { $ne: TASK_STATUS.DONE } }),
      Page.countDocuments(wsFilter),
      Activity.find(wsFilter).populate('actor', 'name avatar').sort({ createdAt: -1 }).limit(10)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        totalProjects,
        openTasks,
        totalPages
      },
      recentActivities
    });
  } catch (err: any) {
    next(err);
  }
};
