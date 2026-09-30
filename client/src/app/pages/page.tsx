'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { FileText, Plus, Pin, Clock, User as UserIcon, X, Search, Trash2, AlertCircle } from 'lucide-react';
import { Page } from '../../types';

export default function PagesIndexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { success, error } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete state
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchPages = async () => {
    try {
      const res = await api.get('/api/pages');
      if (res.data.success) {
        setPages(res.data.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // Real-time socket events for Pages
  useEffect(() => {
    if (!socket) return;

    // All workspace members now get all pages from backend, so always add
    const handlePageCreated = (newPage: any) => {
      setPages((prev) => [newPage, ...prev.filter((p) => p._id !== newPage._id)]);
    };

    const handlePageUpdatedWorkspace = (data: { pageId: string; title: string; timestamp: string }) => {
      setPages((prev) =>
        prev.map((p) =>
          p._id === data.pageId ? { ...p, title: data.title, updatedAt: data.timestamp as any } : p
        )
      );
    };

    const handlePageDeleted = ({ pageId }: { pageId: string }) => {
      setPages((prev) => prev.filter((p) => p._id !== pageId));
    };

    socket.on('PAGE_CREATED', handlePageCreated);
    socket.on('PAGE_UPDATED_WORKSPACE', handlePageUpdatedWorkspace);
    socket.on('PAGE_DELETED', handlePageDeleted);

    return () => {
      socket.off('PAGE_CREATED', handlePageCreated);
      socket.off('PAGE_UPDATED_WORKSPACE', handlePageUpdatedWorkspace);
      socket.off('PAGE_DELETED', handlePageDeleted);
    };
  }, [socket]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.post('/api/pages', {
        title: newTitle.trim(),
        content: `# ${newTitle.trim()}\n\nStart drafting document content...`
      });

      if (res.data.success) {
        success('Document created');
        setShowModal(false);
        router.push(`/pages/${res.data.page._id}`);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create document');
    }
  };

  const handleDeletePage = async () => {
    if (!deletePageId) return;
    setDeleteSubmitting(true);
    try {
      const res = await api.delete(`/api/pages/${deletePageId}`);
      if (res.data.success) {
        success('Document deleted');
        setPages((prev) => prev.filter((p) => p._id !== deletePageId));
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeleteSubmitting(false);
      setDeletePageId(null);
    }
  };

  const canManagePage = (page: Page) => {
    const uId = user?.id || user?._id;
    const isAdmin = user?.role === 'ADMIN';
    const isCreator = (page as any).createdBy?._id === uId || (page as any).createdBy === uId;
    return isAdmin || isCreator;
  };

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-zinc-100">Documents &amp; Pages</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Create, organize, and collaborate on documents, notes, and knowledge base pages.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-md shadow-cyan-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>New Document</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter documents by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          Loading documents...
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="py-20 text-center text-zinc-400 text-xs bg-zinc-900/30 rounded-xl border border-zinc-800/60 p-8">
          No documents found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => (
            <div key={page._id} className="relative group">
              <Link
                href={`/pages/${page._id}`}
                className="p-5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 transition flex flex-col justify-between group hover:border-zinc-700 block"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-cyan-400 transition line-clamp-2 pr-6">
                      {page.title}
                    </h3>
                    {page.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-cyan-400 shrink-0 fill-cyan-400/20" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed font-mono">
                    {page.content.replace(/[#*`_]/g, '').slice(0, 120) || 'Empty document.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center uppercase">
                      {page.updatedBy?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="truncate max-w-[100px]">{page.updatedBy?.name || 'Operator'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(page.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Delete button — only for admin/creator */}
              {canManagePage(page) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeletePageId(page._id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Create New Document</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Product Architecture Specification"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
                >
                  Create &amp; Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirm Modal */}
      {deletePageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Delete Document?</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              This will permanently delete the document and all its revision history. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeletePageId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
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
