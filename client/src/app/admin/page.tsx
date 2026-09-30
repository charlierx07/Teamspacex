'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  UserPlus,
  KeyRound,
  Trash2,
  Lock,
  X,
  Sliders,
  AlertTriangle,
  Folder,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { User, Project, Folder as FolderType, Permission, Task } from '../../types';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'tasks'>('members');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskProjectFilter, setTaskProjectFilter] = useState('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalProjects: 0,
    openTasks: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  // Add Member form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [title, setTitle] = useState('Team Member');

  // Reset Password state
  const [newPassword, setNewPassword] = useState('');

  // Permission Matrix state
  const [selectedProjects, setSelectedProjects] = useState<Record<string, 'VIEW' | 'EDIT' | 'MANAGE'>>({});
  const [selectedFolders, setSelectedFolders] = useState<Record<string, 'VIEW' | 'EDIT' | 'MANAGE'>>({});
  const [submittingPerms, setSubmittingPerms] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, projsRes, foldersRes, tasksRes] = await Promise.all([
        api.get('/api/stats/admin'),
        api.get('/api/users'),
        api.get('/api/projects'),
        api.get('/api/folders'),
        api.get('/api/tasks')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) setMembers(usersRes.data.users);
      if (projsRes.data.success) setProjects(projsRes.data.projects);
      if (foldersRes.data.success) setFolders(foldersRes.data.folders);
      if (tasksRes.data.success) setTasks(tasksRes.data.tasks);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        title
      });

      if (res.data.success) {
        success(`Member "${name}" added successfully`);
        setShowAddModal(false);
        setName('');
        setEmail('');
        setPassword('');
        fetchData();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleToggleStatus = async (m: User) => {
    const nextStatus = m.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await api.patch(`/api/users/${m._id || m.id}`, { status: nextStatus });
      if (res.data.success) {
        success(`Member status updated to ${nextStatus}`);
        fetchData();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Cannot update status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      const res = await api.post(`/api/users/${selectedMember._id || selectedMember.id}/reset-password`, {
        newPassword
      });
      if (res.data.success) {
        success(`Password reset for ${selectedMember.name}`);
        setShowResetModal(false);
        setNewPassword('');
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteMember = async (m: User) => {
    if (!confirm(`Are you sure you want to permanently remove ${m.name}? They will immediately lose access.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/users/${m._id || m.id}`);
      if (res.data.success) {
        success(`Member removed`);
        fetchData();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete member');
    }
  };

  const handleDeleteTask = async (t: Task) => {
    if (!confirm(`Are you sure you want to permanently delete task "${t.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/tasks/${t._id}`);
      if (res.data.success) {
        success(`Task "${t.title}" permanently deleted`);
        setTasks((prev) => prev.filter((task) => task._id !== t._id));
        setStats((prev) => ({
          ...prev,
          openTasks: Math.max(0, prev.openTasks - (t.status !== 'DONE' ? 1 : 0))
        }));
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Open Permission Manager for a specific member
  const openPermissionManager = async (m: User) => {
    setSelectedMember(m);
    try {
      const res = await api.get(`/api/permissions/user/${m._id || m.id}`);
      if (res.data.success) {
        const perms: Permission[] = res.data.permissions;
        const pMap: Record<string, 'VIEW' | 'EDIT' | 'MANAGE'> = {};
        const fMap: Record<string, 'VIEW' | 'EDIT' | 'MANAGE'> = {};

        perms.forEach((p) => {
          if (p.resourceType === 'PROJECT') {
            pMap[p.resourceId] = p.accessLevel;
          } else if (p.resourceType === 'FOLDER') {
            fMap[p.resourceId] = p.accessLevel;
          }
        });

        setSelectedProjects(pMap);
        setSelectedFolders(fMap);
        setShowPermsModal(true);
      }
    } catch (err: any) {
      error('Failed to load permissions');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setSubmittingPerms(true);

    const payload: Array<{ resourceType: 'PROJECT' | 'FOLDER'; resourceId: string; accessLevel: string }> = [];

    Object.entries(selectedProjects).forEach(([resourceId, accessLevel]) => {
      payload.push({ resourceType: 'PROJECT', resourceId, accessLevel });
    });

    Object.entries(selectedFolders).forEach(([resourceId, accessLevel]) => {
      payload.push({ resourceType: 'FOLDER', resourceId, accessLevel });
    });

    try {
      const res = await api.post(`/api/permissions/user/${selectedMember._id || selectedMember.id}`, {
        permissions: payload
      });

      if (res.data.success) {
        success(`Permissions saved for ${selectedMember.name}`);
        setShowPermsModal(false);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSubmittingPerms(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-zinc-400">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      taskSearch.trim() === '' ||
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()));

    const projId = typeof t.projectId === 'object' ? t.projectId?._id : t.projectId;
    const matchesProject = taskProjectFilter === 'ALL' || projId === taskProjectFilter;
    const matchesStatus = taskStatusFilter === 'ALL' || t.status === taskStatusFilter;

    return matchesSearch && matchesProject && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-zinc-100">Founder & Admin Control Center</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-trust user administration, workspace task oversight, and account lifecycles.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-md shadow-cyan-500/10"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Member</span>
        </button>
      </div>

      {/* Admin KPI Overview Cards (Section 17) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('members')}
          className={`border rounded-xl p-4 cursor-pointer transition ${
            activeTab === 'members'
              ? 'bg-zinc-850 border-cyan-500/50 shadow-md shadow-cyan-500/5'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">
            Total Team Members
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.totalMembers}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{stats.activeMembers} active accounts</div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">
            Projects
          </div>
          <div className="text-2xl font-bold text-cyan-400">{stats.totalProjects}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Total workspace projects</div>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className={`border rounded-xl p-4 cursor-pointer transition ${
            activeTab === 'tasks'
              ? 'bg-zinc-850 border-purple-500/50 shadow-md shadow-purple-500/5'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">
            Open Tasks
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.openTasks}</div>
          <div className="text-[10px] text-purple-300/80 mt-1">Click to manage & delete tasks</div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">
            Documents & SOPs
          </div>
          <div className="text-2xl font-bold text-zinc-100">{stats.totalPages}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Versioned knowledge base</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition border ${
            activeTab === 'members'
              ? 'bg-zinc-800/90 text-zinc-100 border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/60'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Team Members & Access Control ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition border ${
            activeTab === 'tasks'
              ? 'bg-zinc-800/90 text-zinc-100 border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/60'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-purple-400" />
          <span>Workspace Task Oversight & Deletion ({tasks.length})</span>
        </button>
      </div>

      {/* TAB 1: Team Members Management Table */}
      {activeTab === 'members' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Team Members & Access Control ({members.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400">
                  <th className="py-3 px-5 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Title / Specialty</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-5 text-right font-semibold">Administration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {members.map((m) => {
                  const isSelf = (m._id || m.id) === (user?.id || user?._id);
                  return (
                    <tr key={m._id || m.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-400">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400">{m.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {m.title || 'Team Member'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded ${
                            m.role === 'ADMIN'
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => !isSelf && handleToggleStatus(m)}
                          disabled={isSelf}
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded transition ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          } ${isSelf ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                        >
                          {m.status}
                        </button>
                      </td>

                      <td className="py-3 px-5 text-right space-x-1.5">
                        {/* Permission matrix manager button */}
                        {m.role !== 'ADMIN' && (
                          <button
                            onClick={() => openPermissionManager(m)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs font-medium inline-flex items-center space-x-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Permissions</span>
                          </button>
                        )}

                        {/* Reset password */}
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setShowResetModal(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove member */}
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteMember(m)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: All Workspace Tasks Management & Deletion Table */}
      {activeTab === 'tasks' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                All Workspace Tasks ({filteredTasks.length} of {tasks.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search task title or description..."
                  className="bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 w-56"
                />
                {taskSearch && (
                  <button
                    onClick={() => setTaskSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Project filter */}
              <select
                value={taskProjectFilter}
                onChange={(e) => setTaskProjectFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 -mb-5 border-t border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400">
                  <th className="py-3 px-5 font-semibold">Task Title</th>
                  <th className="py-3 px-4 font-semibold">Project</th>
                  <th className="py-3 px-4 font-semibold">Assignee</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const projName =
                      typeof t.projectId === 'object' && (t.projectId as any)?.name
                        ? (t.projectId as any).name
                        : projects.find((p) => p._id === t.projectId)?.name || 'General';

                    return (
                      <tr key={t._id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-5 max-w-xs">
                          <div className="font-semibold text-zinc-100 truncate">{t.title}</div>
                          {t.description && (
                            <div className="text-[11px] text-zinc-500 truncate">{t.description}</div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-zinc-400">
                          <span className="inline-flex items-center space-x-1 bg-zinc-950 px-2 py-0.5 rounded text-[11px] border border-zinc-800/80">
                            <FolderKanban className="w-3 h-3 text-cyan-400" />
                            <span>{projName}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {t.assignedTo ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                                {t.assignedTo.name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-zinc-300 text-[11px] truncate max-w-[120px]">
                                {t.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded ${
                              t.priority === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : t.priority === 'MEDIUM'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded ${
                              t.status === 'DONE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : t.status === 'REVIEW'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-500 text-[11px]">
                          {t.dueDate ? (
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>{new Date(t.dueDate).toLocaleDateString()}</span>
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>

                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => handleDeleteTask(t)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition border border-transparent hover:border-rose-500/20 text-xs"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500/80" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Modal (Section 4) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Add Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AI Engineer"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Reset Password for {selectedMember.name}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Enter a new secure password for this user.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg text-xs"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Granular Permission Matrix Modal (Section 5) */}
      {showPermsModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Granular Permissions: {selectedMember.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure project and folder access with View, Edit, or Manage capabilities.
                </p>
              </div>
              <button onClick={() => setShowPermsModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Projects Permission Checklist */}
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                  <FolderKanban className="w-4 h-4 text-cyan-400" />
                  <span>Projects Access</span>
                </div>

                <div className="space-y-2">
                  {projects.map((proj) => {
                    const isSelected = !!selectedProjects[proj._id];
                    const currentLevel = selectedProjects[proj._id] || 'VIEW';

                    return (
                      <div
                        key={proj._id}
                        className={`p-3 rounded-lg border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-zinc-950 border-cyan-800/60'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <label className="flex items-center space-x-3 cursor-pointer select-none min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const updated = { ...selectedProjects };
                              if (e.target.checked) {
                                updated[proj._id] = 'VIEW';
                              } else {
                                delete updated[proj._id];
                              }
                              setSelectedProjects(updated);
                            }}
                            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
                          />
                          <span className="text-xs font-medium text-zinc-200 truncate">
                            {proj.name}
                          </span>
                        </label>

                        {isSelected && (
                          <select
                            value={currentLevel}
                            onChange={(e: any) =>
                              setSelectedProjects({
                                ...selectedProjects,
                                [proj._id]: e.target.value
                              })
                            }
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-cyan-300 focus:outline-none"
                          >
                            <option value="VIEW">VIEW</option>
                            <option value="EDIT">EDIT</option>
                            <option value="MANAGE">MANAGE</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Folders Permission Checklist */}
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  <span>Folders Access</span>
                </div>

                <div className="space-y-2">
                  {folders.map((f) => {
                    const isSelected = !!selectedFolders[f._id];
                    const currentLevel = selectedFolders[f._id] || 'VIEW';

                    return (
                      <div
                        key={f._id}
                        className={`p-3 rounded-lg border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-zinc-950 border-indigo-800/60'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <label className="flex items-center space-x-3 cursor-pointer select-none min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const updated = { ...selectedFolders };
                              if (e.target.checked) {
                                updated[f._id] = 'VIEW';
                              } else {
                                delete updated[f._id];
                              }
                              setSelectedFolders(updated);
                            }}
                            className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-0"
                          />
                          <span className="text-xs font-medium text-zinc-200 truncate">
                            {f.name}
                          </span>
                        </label>

                        {isSelected && (
                          <select
                            value={currentLevel}
                            onChange={(e: any) =>
                              setSelectedFolders({
                                ...selectedFolders,
                                [f._id]: e.target.value
                              })
                            }
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-indigo-300 focus:outline-none"
                          >
                            <option value="VIEW">VIEW</option>
                            <option value="EDIT">EDIT</option>
                            <option value="MANAGE">MANAGE</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Server-side security immediately invalidates unauthorized queries.
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPermsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={submittingPerms}
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-50"
                >
                  {submittingPerms ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
