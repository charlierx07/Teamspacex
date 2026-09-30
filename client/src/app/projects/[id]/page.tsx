'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  FolderKanban,
  FileText,
  CheckSquare,
  Folder as FolderIcon,
  Plus,
  Calendar,
  User as UserIcon,
  Table as TableIcon,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
  X,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Project, Page, Task, Folder, DataTable } from '../../../types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { user } = useAuth();
  const { success, error } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tables, setTables] = useState<DataTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  // New Page form
  const [newPageTitle, setNewPageTitle] = useState('');
  // New Task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  // New Folder form
  const [newFolderName, setNewFolderName] = useState('');

  const fetchProjectDetails = async () => {
    try {
      const [projRes, tablesRes] = await Promise.all([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/tables?projectId=${projectId}`).catch(() => ({ data: { tables: [] } }))
      ]);

      if (projRes.data.success) {
        setProject(projRes.data.project);
        setFolders(projRes.data.folders || []);
        setPages(projRes.data.pages || []);
        setTasks(projRes.data.tasks || []);
      }

      if (tablesRes.data?.tables) {
        setTables(tablesRes.data.tables);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    try {
      const res = await api.post('/api/pages', {
        title: newPageTitle.trim(),
        projectId,
        content: `# ${newPageTitle.trim()}\n\nStart documenting this automation workflow...`
      });

      if (res.data.success) {
        success('Document created');
        setShowNewPageModal(false);
        setNewPageTitle('');
        router.push(`/pages/${res.data.page._id}`);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create page');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await api.post('/api/tasks', {
        title: newTaskTitle.trim(),
        projectId,
        priority: newTaskPriority,
        assignedTo: newTaskAssignee || null,
        status: 'TODO'
      });

      if (res.data.success) {
        success('Task added');
        setShowNewTaskModal(false);
        setNewTaskTitle('');
        fetchProjectDetails();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to add task');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await api.post('/api/folders', {
        name: newFolderName.trim(),
        projectId
      });

      if (res.data.success) {
        success('Folder created');
        setShowNewFolderModal(false);
        setNewFolderName('');
        fetchProjectDetails();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus as any } : t))
      );
      await api.patch(`/api/tasks/${taskId}`, { status: nextStatus });
      fetchProjectDetails();
    } catch (e) {
      fetchProjectDetails();
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-zinc-400">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading project view...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">
        Project not found or you do not have permission to view it.
      </div>
    );
  }

  const completedTasksCount = tasks.filter((t) => t.status === 'DONE').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : project.progress;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Project Overview Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">
                {project.name}
              </h1>
              <span
                className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded ${
                  project.status === 'IN_PROGRESS'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-3xl leading-relaxed">
              {project.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setShowNewPageModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-semibold flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
          </div>
        </div>

        {/* Project Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500">Progress</div>
            <div className="text-base font-bold text-zinc-100 mt-0.5">{progressPercent}%</div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500">Owner</div>
            <div className="text-xs font-medium text-zinc-200 mt-1 flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center uppercase">
                {project.owner?.name?.charAt(0) || 'O'}
              </div>
              <span className="truncate">{project.owner?.name || 'Founder'}</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500">Assigned Team</div>
            <div className="flex -space-x-1.5 mt-1 overflow-hidden">
              {project.members && project.members.length > 0 ? (
                project.members.map((m) => (
                  <div
                    key={m._id}
                    title={m.name}
                    className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-zinc-900 uppercase"
                  >
                    {m.name.charAt(0)}
                  </div>
                ))
              ) : (
                <span className="text-xs text-zinc-500">None</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500">Target Deadline</div>
            <div className="text-xs font-medium text-zinc-200 mt-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Flexible'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Documents & Folders (Left) + Tasks (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Documents & Folders */}
        <div className="space-y-6">
          {/* Documents Section */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Documents & SOPs ({pages.length})
                </h2>
              </div>
              <button
                onClick={() => setShowNewPageModal(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Doc</span>
              </button>
            </div>

            <div className="space-y-2">
              {pages.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No documents in this project yet. Click &quot;New Doc&quot; to create one.
                </div>
              ) : (
                pages.map((page) => (
                  <Link
                    key={page._id}
                    href={`/pages/${page._id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/60 transition group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 shrink-0" />
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                        {page.title}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 ml-2 shrink-0">
                      v{page.version} · {new Date(page.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Project Folders & Assets */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderIcon className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Folders & Assets ({folders.length})
                </h2>
              </div>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>

            <div className="space-y-2">
              {folders.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No custom asset folders created for this project.
                </div>
              ) : (
                folders.map((f) => (
                  <Link
                    key={f._id}
                    href={`/folders/${f._id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/60 transition group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FolderIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                        {f.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Open folder</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Project Tasks */}
        <div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Project Tasks ({tasks.length})
                </h2>
              </div>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No tasks assigned to this project yet.
                </div>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'DONE';
                  const isInProgress = task.status === 'IN_PROGRESS';
                  return (
                    <div
                      key={task._id}
                      className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800/60 border border-zinc-800/60 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleTaskStatus(task._id, task.status)}
                          className="text-zinc-500 hover:text-cyan-400 transition shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-medium truncate ${
                              isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded ${
                            task.status === 'DONE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/10 text-cyan-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>

                        {task.assignedTo && (
                          <div
                            title={task.assignedTo.name}
                            className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-300 flex items-center justify-center uppercase"
                          >
                            {task.assignedTo.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Document Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Create Document</h3>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="e.g. Architecture Blueprint"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewPageModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Add Project Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement webhook signature verification"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {project.members?.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Create Asset Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Schemas & Payloads"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-indigo-500 hover:bg-indigo-400 text-white font-semibold"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
