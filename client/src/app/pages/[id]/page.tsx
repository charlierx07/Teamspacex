'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../context/ToastContext';
import {
  ArrowLeft,
  Save,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Link as LinkIcon,
  RotateCcw,
  Sparkles,
  Users,
  Eye,
  Trash2
} from 'lucide-react';
import { Page, PageRevision } from '../../../types';

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params?.id as string;
  const { user } = useAuth();
  const { socket, joinPage, leavePage, sendEditingIndicator } = useSocket();
  const { success, error, info } = useToast();

  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [pagePresence, setPagePresence] = useState<{ userId: string; name: string }[]>([]);
  const [activeEditorUser, setActiveEditorUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ title: string; content: string }>({ title: '', content: '' });

  // Load initial page data
  const fetchPage = async () => {
    try {
      const res = await api.get(`/api/pages/${pageId}`);
      if (res.data.success) {
        const p = res.data.page;
        setPage(p);
        setTitle(p.title);
        setContent(p.content);
        lastSavedContentRef.current = { title: p.title, content: p.content };
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to open document. Permission denied.');
      router.push('/pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    try {
      const res = await api.get(`/api/pages/${pageId}/revisions`);
      if (res.data.success) {
        setRevisions(res.data.revisions);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (pageId) {
      fetchPage();
      fetchRevisions();
      joinPage(pageId);
    }
    return () => {
      if (pageId) {
        leavePage(pageId);
      }
    };
  }, [pageId]);

  // Real-time socket event handlers for this page
  useEffect(() => {
    if (!socket || !pageId) return;

    // Listen to live page presence
    socket.on('PAGE_PRESENCE_UPDATED', (data: { pageId: string; activeUsers: any[] }) => {
      if (data.pageId === pageId) {
        setPagePresence(data.activeUsers);
      }
    });

    // Listen to typing indicator
    socket.on('PAGE_USER_EDITING', (data: { pageId: string; userId: string; name: string; isEditing: boolean }) => {
      if (data.pageId === pageId && data.userId !== user?.id && data.userId !== user?._id) {
        if (data.isEditing) {
          setActiveEditorUser(data.name);
        } else {
          setActiveEditorUser(null);
        }
      }
    });

    // Listen to broadcast save by another user
    socket.on('PAGE_UPDATED', (data: { page: Page; updatedBy: any }) => {
      if (data.page._id === pageId && data.updatedBy.id !== user?.id && data.updatedBy.id !== user?._id) {
        setPage(data.page);
        setTitle(data.page.title);
        setContent(data.page.content);
        lastSavedContentRef.current = { title: data.page.title, content: data.page.content };
        info(`Document updated by ${data.updatedBy.name}`);
        fetchRevisions();
      }
    });

    return () => {
      socket.off('PAGE_PRESENCE_UPDATED');
      socket.off('PAGE_USER_EDITING');
      socket.off('PAGE_UPDATED');
    };
  }, [socket, pageId, user, info]);

  // Auto-save logic (debounced after user stops typing)
  const saveDocument = useCallback(
    async (newTitle: string, newContent: string) => {
      if (
        newTitle === lastSavedContentRef.current.title &&
        newContent === lastSavedContentRef.current.content
      ) {
        return;
      }

      setSaving(true);
      setSaveStatus('saving');
      try {
        const res = await api.patch(`/api/pages/${pageId}`, {
          title: newTitle,
          content: newContent
        });

        if (res.data.success) {
          setPage(res.data.page);
          lastSavedContentRef.current = { title: newTitle, content: newContent };
          setSaveStatus('saved');
          sendEditingIndicator(pageId, false);
          fetchRevisions();
        }
      } catch (err: any) {
        setSaveStatus('unsaved');
        error(err.response?.data?.message || 'Failed to auto-save document');
      } finally {
        setSaving(false);
      }
    },
    [pageId, sendEditingIndicator, error]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSaveStatus('unsaved');
    sendEditingIndicator(pageId, true);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument(val, content);
    }, 1200);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setSaveStatus('unsaved');
    sendEditingIndicator(pageId, true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendEditingIndicator(pageId, false);
    }, 2500);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument(title, val);
    }, 1500);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setSaveStatus('unsaved');

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument(title, newContent);
    }, 1500);
  };

  const restoreRevision = async (revId: string, verNum: number) => {
    if (!confirm(`Restore document to version ${verNum}?`)) return;
    try {
      const res = await api.post(`/api/pages/${pageId}/revisions/${revId}/restore`);
      if (res.data.success) {
        success(`Restored version ${verNum}`);
        setPage(res.data.page);
        setTitle(res.data.page.title);
        setContent(res.data.page.content);
        setShowRevisions(false);
        fetchRevisions();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to restore revision');
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleDeletePage = async () => {
    setDeleteSubmitting(true);
    try {
      const res = await api.delete(`/api/pages/${pageId}`);
      if (res.data.success) {
        success('Document deleted');
        router.push('/pages');
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete document');
      setDeleteSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const canDeletePage = () => {
    const uId = user?.id || user?._id;
    const isAdmin = user?.role === 'ADMIN';
    const isCreator = (page as any)?.createdBy?._id === uId || (page as any)?.createdBy === uId;
    return isAdmin || isCreator;
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-zinc-400">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading document editor...</span>
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Action & Presence Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-14 z-20 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Breadcrumb info */}
          <div className="text-xs text-zinc-400 flex items-center space-x-1.5">
            {page.projectId && (
              <>
                <span className="text-zinc-300">
                  {typeof page.projectId === 'object' ? page.projectId.name : 'Project'}
                </span>
                <span>/</span>
              </>
            )}
            <span className="text-zinc-200 font-medium truncate max-w-[200px]">{title}</span>
          </div>

          {/* Save status badge */}
          <div className="flex items-center space-x-1.5 text-[11px]">
            {saveStatus === 'saving' && (
              <span className="text-cyan-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                Saving changes...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-400/80 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All changes saved
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-amber-400/80 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Unsaved modifications
              </span>
            )}
          </div>
        </div>

        {/* Right side: Active Presence & Actions */}
        <div className="flex items-center space-x-3">
          {/* Active collaborator typing notice */}
          {activeEditorUser && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-[11px] text-cyan-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>{activeEditorUser} is editing...</span>
            </div>
          )}

          {/* Active users on this document */}
          {pagePresence.length > 0 && (
            <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
              <div className="flex -space-x-1.5">
                {pagePresence.map((u, idx) => (
                  <div
                    key={idx}
                    title={`${u.name} is currently viewing this page`}
                    className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-zinc-950 uppercase"
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View / Edit Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                viewMode === 'edit'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                viewMode === 'preview'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Revision History button */}
          <button
            onClick={() => setShowRevisions(!showRevisions)}
            className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1.5 transition ${
              showRevisions
                ? 'bg-zinc-800 border-zinc-700 text-cyan-400'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title="Version History"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">v{page.version}</span>
          </button>

          {/* Force Manual Save button */}
          <button
            onClick={() => saveDocument(title, content)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Delete button — only for admin/creator */}
          {canDeletePage() && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-8 flex gap-8">
        <div className="flex-1 flex flex-col">
          {/* Document Title Header */}
          <div className="mb-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Document"
              className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none tracking-tight border-b border-transparent focus:border-zinc-800 pb-2 transition"
            />
            {/* Last Edited By Metadata Info (Section 11) */}
            <div className="flex items-center space-x-2 text-[11px] text-zinc-500 mt-2">
              <span>Created by {page.createdBy?.name || 'Admin'}</span>
              <span>·</span>
              <span className="text-zinc-400 font-medium">
                Last edited by {page.updatedBy?.name || 'Operator'} · {formatTimeAgo(page.updatedAt)}
              </span>
            </div>
          </div>

          {/* Formatting Toolbar */}
          {viewMode === 'edit' && (
            <div className="sticky top-28 z-10 flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 mb-4 backdrop-blur shadow-sm">
              <button
                type="button"
                onClick={() => insertFormatting('# ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('## ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('- ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Bullet list"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Numbered list"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- [ ] ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Checklist"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('```typescript\n', '\n```')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Code block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[Link Title](', ')')}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title="Insert link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Editor Area vs Preview */}
          <div className="flex-1">
            {viewMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing documentation, notes, or automation specifications..."
                className="w-full h-[70vh] bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none font-mono leading-relaxed resize-none p-1"
              />
            ) : (
              <div className="prose prose-invert max-w-none text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {content}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Revision History Drawer */}
        {showRevisions && (
          <aside className="w-72 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Revision History</span>
              </div>
              <button
                onClick={() => setShowRevisions(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {revisions.map((rev) => (
                <div
                  key={rev._id}
                  className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 font-mono text-[11px]">
                      Version {rev.version}
                    </span>
                    <button
                      onClick={() => restoreRevision(rev._id, rev.version)}
                      className="text-[10px] text-zinc-400 hover:text-cyan-400 flex items-center space-x-1 bg-zinc-800 px-2 py-0.5 rounded"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-zinc-300 truncate">
                    {rev.changeSummary || 'Content edit'}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    by {rev.editedBy?.name || 'Operator'} · {formatTimeAgo(rev.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Delete Document Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Delete Document?</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              <span className="font-semibold text-zinc-200">{title}</span> will be permanently deleted along with all revision history. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePage}
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
