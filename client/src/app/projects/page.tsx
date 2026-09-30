'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import {
  FolderKanban,
  Plus,
  Clock,
  CheckSquare,
  FileText,
  User as UserIcon,
  X,
  Calendar,
  AlertCircle,
  MoreVertical,
  Trash2,
  Pencil
} from 'lucide-react';
import { Project, User } from '../../types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { success, error } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [status, setStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED' | 'ON_HOLD'>('PLANNING');
  const [deadline, setDeadline] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Rename state
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  // Delete confirm state
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Kebab menu open state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (res.data.success) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await api.get('/api/users');
      if (res.data.success) {
        setTeamMembers(res.data.users);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchTeam();
  }, []);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time socket events for Projects
  useEffect(() => {
    if (!socket) return;

    // Backend now returns all workspace projects so always show new projects
    const handleProjectCreated = (newProject: any) => {
      setProjects((prev) => [newProject, ...prev.filter((p) => p._id !== newProject._id)]);
    };

    const handleProjectUpdated = (updatedProject: any) => {
      setProjects((prev) =>
        prev.map((p) => (p._id === updatedProject._id ? { ...p, ...updatedProject } : p))
      );
    };

    const handleProjectDeleted = ({ projectId }: { projectId: string }) => {
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    };

    socket.on('PROJECT_CREATED', handleProjectCreated);
    socket.on('PROJECT_UPDATED', handleProjectUpdated);
    socket.on('PROJECT_DELETED', handleProjectDeleted);

    return () => {
      socket.off('PROJECT_CREATED', handleProjectCreated);
      socket.off('PROJECT_UPDATED', handleProjectUpdated);
      socket.off('PROJECT_DELETED', handleProjectDeleted);
    };
  }, [socket]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/api/projects', {
        name: name.trim(),
        description,
        priority,
        status,
        deadline: deadline || undefined,
        members: selectedMembers
      });

      if (res.data.success) {
        success(`Project "${name}" created successfully`);
        setShowModal(false);
        setName('');
        setDescription('');
        setSelectedMembers([]);
        setDeadline('');
        fetchProjects();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    setDeleteSubmitting(true);
    try {
      const res = await api.delete(`/api/projects/${deleteProjectId}`);
      if (res.data.success) {
        success('Project deleted');
        setProjects((prev) => prev.filter((p) => p._id !== deleteProjectId));
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleteSubmitting(false);
      setDeleteProjectId(null);
    }
  };

  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameProjectId || !renameName.trim()) return;
    setRenameSubmitting(true);
    try {
      const res = await api.patch(`/api/projects/${renameProjectId}`, { name: renameName.trim() });
      if (res.data.success) {
        success('Project renamed');
        setProjects((prev) =>
          prev.map((p) => (p._id === renameProjectId ? { ...p, name: renameName.trim() } : p))
        );
        setRenameProjectId(null);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to rename project');
    } finally {
      setRenameSubmitting(false);
    }
  };

  const canManageProject = (project: Project) => {
    const uId = user?.id || user?._id;
    const isAdmin = user?.role === 'ADMIN';
    const isOwner = (project as any).owner?._id === uId || (project as any).owner === uId || (project as any).createdBy?._id === uId || (project as any).createdBy === uId;
    return isAdmin || isOwner;
  };

  const filteredProjects = projects.filter((p) => {
    if (filterStatus === 'ALL') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-zinc-100">Projects</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage team projects, track progress, and collaborate across your workspace.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-md shadow-cyan-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'PLANNING', 'IN_PROGRESS', 'TESTING', 'COMPLETED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterStatus === st
                ? 'bg-zinc-800 text-cyan-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-20 text-center text-zinc-400 text-xs bg-zinc-900/30 rounded-xl border border-zinc-800/60 p-8">
          No projects found in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div key={project._id} className="relative group">
              <Link
                href={`/projects/${project._id}`}
                className="bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-5 transition flex flex-col justify-between group hover:border-zinc-700 block"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-1 pr-6">
                      {project.name}
                    </h3>
                    <span
                      className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded shrink-0 ${
                        project.status === 'IN_PROGRESS'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : project.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-4 pt-3 border-t border-zinc-800/60">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Progress</span>
                      <span className="font-mono text-zinc-200">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1" title="Tasks count">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{project.taskCount || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1" title="Documents count">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{project.pageCount || 0}</span>
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        project.priority === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : project.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {project.priority}
                    </span>
                  </div>

                  {/* Members list */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {project.members && project.members.length > 0 ? (
                        project.members.map((m) => (
                          <div
                            key={m._id}
                            title={m.name}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-950 bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center uppercase"
                          >
                            {m.name.charAt(0)}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500">No members</span>
                      )}
                    </div>

                    {project.deadline && (
                      <div className="flex items-center space-x-1 text-[10px] text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {/* Kebab Menu — only for admin/owner */}
              {canManageProject(project) && (
                <div className="absolute top-3 right-3 z-10" ref={openMenuId === project._id ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === project._id ? null : project._id);
                    }}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/70 opacity-0 group-hover:opacity-100 transition"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === project._id && (
                    <div className="absolute right-0 top-7 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRenameName(project.name);
                          setRenameProjectId(project._id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteProjectId(project._id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Project</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Create New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, target deliverables, or scope..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Priority
                  </label>
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
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="TESTING">Testing</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Assign Team Members
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  {teamMembers.map((m) => (
                    <label
                      key={m._id}
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer text-xs ${
                        selectedMembers.includes(m._id!)
                          ? 'bg-cyan-950/40 border border-cyan-800/50 text-cyan-200'
                          : 'hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(m._id!)}
                        onChange={() => toggleMemberSelection(m._id!)}
                        className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Modal */}
      {renameProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Rename Project</h3>
              <button onClick={() => setRenameProjectId(null)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameProject} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Project name"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRenameProjectId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold disabled:opacity-50"
                >
                  {renameSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirm Modal */}
      {deleteProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Delete Project?</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              This will permanently delete the project and all its associated data. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteProjectId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs bg-rose-500 hover:bg-rose-400 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
