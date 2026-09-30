'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import {
  CheckSquare,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Circle,
  X,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Task, Project, User } from '../../types';

export default function TasksPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { socket } = useSocket();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filter
  const [selectedProject, setSelectedProject] = useState<string>('ALL');

  // New Task Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasksAndMeta = async () => {
    try {
      const [tasksRes, projsRes, usersRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/projects'),
        api.get('/api/users')
      ]);

      if (tasksRes.data.success) setTasks(tasksRes.data.tasks);
      if (projsRes.data.success) {
        setProjects(projsRes.data.projects);
        if (projsRes.data.projects.length > 0 && !projectId) {
          setProjectId(projsRes.data.projects[0]._id);
        }
      }
      if (usersRes.data.success) setTeam(usersRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndMeta();
  }, []);

  // Real-time task events listener
  useEffect(() => {
    if (!socket) return;

    socket.on('TASK_CREATED', (newTask: Task) => {
      setTasks((prev) => [newTask, ...prev.filter((t) => t._id !== newTask._id)]);
    });

    socket.on('TASK_UPDATED', (updatedTask: Task) => {
      setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    });

    socket.on('TASK_DELETED', ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    });

    return () => {
      socket.off('TASK_CREATED');
      socket.off('TASK_UPDATED');
      socket.off('TASK_DELETED');
    };
  }, [socket]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setSubmitting(true);
    try {
      const res = await api.post('/api/tasks', {
        title: title.trim(),
        description,
        projectId,
        assignedTo: assignedTo || null,
        priority,
        status,
        dueDate: dueDate || undefined
      });

      if (res.data.success) {
        success('Task created successfully');
        setShowModal(false);
        setTitle('');
        setDescription('');
        setDueDate('');
        fetchTasksAndMeta();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE') => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update status');
      fetchTasksAndMeta();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedProject === 'ALL') return true;
    const pId = typeof t.projectId === 'object' ? t.projectId?._id : t.projectId;
    return pId === selectedProject;
  });

  const columns: Array<{ key: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'; label: string; color: string }> = [
    { key: 'TODO', label: 'To Do', color: 'border-zinc-700' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-cyan-500' },
    { key: 'REVIEW', label: 'Review', color: 'border-purple-500' },
    { key: 'DONE', label: 'Done', color: 'border-emerald-500' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-zinc-100">Task Management</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Organize, prioritize, and track tasks across all your projects.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center space-x-1.5 transition ${
                viewMode === 'kanban'
                  ? 'bg-zinc-800 text-cyan-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center space-x-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-zinc-800 text-cyan-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-md shadow-cyan-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter by Project */}
      <div className="flex items-center space-x-3">
        <Filter className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs text-zinc-400 font-medium">Filter Project:</span>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          Loading tasks...
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View (Section 13) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      {col.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-zinc-600">No tasks</div>
                  ) : (
                    colTasks.map((t) => {
                      const projName =
                        typeof t.projectId === 'object' && t.projectId ? t.projectId.name : 'Project';
                      return (
                        <div
                          key={t._id}
                          className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition shadow-sm group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-zinc-100 group-hover:text-cyan-400 transition leading-snug">
                              {t.title}
                            </span>
                            <span
                              className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                t.priority === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}

                          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="truncate max-w-[110px] text-zinc-500">{projName}</span>

                            <div className="flex items-center space-x-2">
                              {t.assignedTo ? (
                                <div
                                  title={t.assignedTo.name}
                                  className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center uppercase"
                                >
                                  {t.assignedTo.name.charAt(0)}
                                </div>
                              ) : (
                                <span className="text-zinc-600">Unassigned</span>
                              )}
                            </div>
                          </div>

                          {/* Quick status selector */}
                          <div className="mt-2 pt-2 border-t border-zinc-800/40 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-500">Move to:</span>
                            <select
                              value={t.status}
                              onChange={(e: any) => updateTaskStatus(t._id, e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none text-[10px]"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="REVIEW">Review</option>
                              <option value="DONE">Done</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View (Section 13) */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {filteredTasks.map((t) => {
              const isDone = t.status === 'DONE';
              const projName =
                typeof t.projectId === 'object' && t.projectId ? t.projectId.name : 'General';
              return (
                <div
                  key={t._id}
                  className="p-3.5 hover:bg-zinc-800/40 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <button
                      onClick={() => updateTaskStatus(t._id, isDone ? 'TODO' : 'DONE')}
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
                        className={`text-xs font-semibold truncate ${
                          isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-[11px] text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded">
                      {projName}
                    </span>

                    <select
                      value={t.status}
                      onChange={(e: any) => updateTaskStatus(t._id, e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-300 focus:outline-none text-[10px] font-semibold uppercase"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done</option>
                    </select>

                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        t.priority === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {t.priority}
                    </span>

                    {t.assignedTo && (
                      <div
                        title={t.assignedTo.name}
                        className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center uppercase"
                      >
                        {t.assignedTo.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Create New Task</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design the landing page"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Subtasks or details..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Project *</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Assignee</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {team.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
