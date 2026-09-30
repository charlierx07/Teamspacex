'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Task, Project, Page, Activity as ActivityType } from '../../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    tasksDueToday: 0,
    recentActivity: 0
  });
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, actRes] = await Promise.all([
        api.get('/api/stats/dashboard'),
        api.get('/api/activity?limit=6')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
        setMyTasks(statsRes.data.myTasks || []);
        setRecentProjects(statsRes.data.recentProjects || []);
        setRecentPages(statsRes.data.recentPages || []);
      }

      if (actRes.data.success) {
        setRecentActivities(actRes.data.activities || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      setMyTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus as any } : t))
      );
      await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchDashboardData();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-zinc-400">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Workspace Overview</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 uppercase">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'MEMBER'}
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Here&apos;s your real-time workspace status and task priorities for today.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.activeProjects}</div>
          <div className="text-[10px] text-zinc-400 mt-1">In progress & planning</div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.pendingTasks}</div>
          <div className="text-[10px] text-zinc-400 mt-1">Across assigned boards</div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tasks Due Today</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.tasksDueToday}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Action items scheduled</div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Recent Activity</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.recentActivity}</div>
          <div className="text-[10px] text-zinc-400 mt-1">Actions in last 24 hours</div>
        </div>
      </div>

      {/* Main Content Grid: Left (My Tasks & Recent Projects) + Right (Activity Feed & Documents) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Tasks Section */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">My Tasks</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {myTasks.length}
                </span>
              </div>
              <Link
                href="/tasks"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
              >
                <span>Task Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {myTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  You have no pending tasks. Great job!
                </div>
              ) : (
                myTasks.map((task) => {
                  const isDone = task.status === 'DONE';
                  const projName = typeof task.projectId === 'object' && task.projectId ? task.projectId.name : 'General';
                  return (
                    <div
                      key={task._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/70 hover:bg-zinc-800/60 border border-zinc-800/50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleTaskStatus(task._id, task.status)}
                          className="text-zinc-500 hover:text-cyan-400 transition-colors shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <span
                          className={`text-xs truncate font-medium ${
                            isDone ? 'line-through text-zinc-400' : 'text-zinc-200'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 ml-3 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {projName}
                        </span>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            task.priority === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Projects Section */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Active Projects</h2>
              </div>
              <Link
                href="/projects"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
              >
                <span>All Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentProjects.map((project) => (
                <Link
                  key={project._id}
                  href={`/projects/${project._id}`}
                  className="p-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/60 transition-all hover:border-zinc-700 block group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded ${
                        project.status === 'IN_PROGRESS'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Progress</span>
                      <span className="font-mono text-zinc-300">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Live Activity</h2>
              </div>
              <Link
                href="/activity"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                View Feed
              </Link>
            </div>

            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">No recent activity</div>
              ) : (
                recentActivities.map((act) => {
                  const actorName = act.actor ? act.actor.name : 'Team Member';
                  return (
                    <div key={act._id} className="flex items-start space-x-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-200 uppercase shrink-0 mt-0.5">
                        {actorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300 leading-snug">
                          <span className="font-semibold text-zinc-100">{actorName}</span>{' '}
                          <span className="text-zinc-400">
                            {act.action === 'PAGE_UPDATED' && 'edited'}
                            {act.action === 'PAGE_CREATED' && 'created'}
                            {act.action === 'PROJECT_CREATED' && 'created project'}
                            {act.action === 'TASK_CREATED' && 'added task'}
                            {act.action === 'TASK_UPDATED' && 'updated'}
                            {act.action === 'PERMISSION_CHANGED' && 'updated permissions for'}
                            {!['PAGE_UPDATED', 'PAGE_CREATED', 'PROJECT_CREATED', 'TASK_CREATED', 'TASK_UPDATED', 'PERMISSION_CHANGED'].includes(act.action) && act.action.toLowerCase().replace('_', ' ')}
                          </span>{' '}
                          <span className="text-cyan-400 font-medium truncate inline-block max-w-[150px] align-bottom">
                            {act.resourceTitle}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {formatTimeAgo(act.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Access Documents */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Recent Docs</h2>
              </div>
              <Link href="/pages" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                All Docs
              </Link>
            </div>

            <div className="space-y-1.5">
              {recentPages.map((page) => (
                <Link
                  key={page._id}
                  href={`/pages/${page._id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/70 text-xs transition-colors group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 shrink-0" />
                    <span className="truncate text-zinc-300 group-hover:text-zinc-100">
                      {page.title}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
