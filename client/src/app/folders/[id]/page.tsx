'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import {
  Folder as FolderIcon,
  FileText,
  Table as TableIcon,
  Plus,
  ArrowLeft,
  Clock,
  Trash2,
  X,
  PlusCircle
} from 'lucide-react';
import { Folder, Page, DataTable } from '../../../types';

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params?.id as string;
  const { success, error } = useToast();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [tables, setTables] = useState<DataTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPageModal, setShowPageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newTableName, setNewTableName] = useState('');

  // Row creation for tables
  const [activeTableForNewRow, setActiveTableForNewRow] = useState<string | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  const fetchFolderData = async () => {
    try {
      const res = await api.get(`/api/folders/${folderId}`);
      if (res.data.success) {
        setFolder(res.data.folder);
        setSubfolders(res.data.subfolders || []);
        setPages(res.data.pages || []);
        setTables(res.data.tables || []);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to open folder. Permission denied.');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (folderId) fetchFolderData();
  }, [folderId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    try {
      const res = await api.post('/api/pages', {
        title: newPageTitle.trim(),
        folderId,
        projectId: folder?.projectId || null,
        content: `# ${newPageTitle.trim()}\n\nWrite folder documentation...`
      });

      if (res.data.success) {
        success('Document created');
        setShowPageModal(false);
        router.push(`/pages/${res.data.page._id}`);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create document');
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    try {
      const res = await api.post('/api/tables', {
        name: newTableName.trim(),
        folderId,
        projectId: folder?.projectId || null
      });

      if (res.data.success) {
        success('Table created');
        setShowTableModal(false);
        setNewTableName('');
        fetchFolderData();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create table');
    }
  };

  const handleAddRow = async (tableId: string) => {
    try {
      const res = await api.post(`/api/tables/${tableId}/rows`, {
        rowData: newRowData
      });

      if (res.data.success) {
        success('Row added to table');
        setActiveTableForNewRow(null);
        setNewRowData({});
        fetchFolderData();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to add row');
    }
  };

  const handleDeleteRow = async (tableId: string, rowId: string) => {
    try {
      await api.delete(`/api/tables/${tableId}/rows/${rowId}`);
      success('Row deleted');
      fetchFolderData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete row');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-zinc-400">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading folder...</span>
        </div>
      </div>
    );
  }

  if (!folder) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <FolderIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">{folder.name}</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Created by {folder.createdBy?.name || 'Administrator'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTableModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1.5"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>New Table</span>
            </button>
            <button
              onClick={() => setShowPageModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-semibold flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Subfolders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {subfolders.map((sub) => (
              <Link
                key={sub._id}
                href={`/folders/${sub._id}`}
                className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center space-x-3 transition group"
              >
                <FolderIcon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
                <span className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                  {sub.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documents inside Folder */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Documents ({pages.length})
        </h2>
        {pages.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
            No documents in this folder yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((p) => (
              <Link
                key={p._id}
                href={`/pages/${p._id}`}
                className="p-4 rounded-xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200 group-hover:text-cyan-400 mb-2">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {p.content.replace(/[#*`]/g, '').slice(0, 100) || 'Empty document.'}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>v{p.version}</span>
                  <span>{new Date(p.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Data Tables inside Folder (Section 14) */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Data Tables ({tables.length})
            </h2>
          </div>
        </div>

        {tables.map((tbl) => (
          <div
            key={tbl._id}
            className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-100">{tbl.name}</h3>
                <span className="text-[10px] text-zinc-500">{tbl.rows?.length || 0} rows</span>
              </div>
              <button
                onClick={() => {
                  setActiveTableForNewRow(tbl._id);
                  setNewRowData({});
                }}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/20 text-zinc-400">
                    {tbl.columns.map((col) => (
                      <th key={col.key} className="py-2.5 px-4 font-semibold uppercase text-[10px]">
                        {col.name}
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {tbl.rows?.length === 0 ? (
                    <tr>
                      <td colSpan={tbl.columns.length + 1} className="py-6 text-center text-zinc-500">
                        No rows yet. Click &quot;Add Row&quot; to insert record.
                      </td>
                    </tr>
                  ) : (
                    tbl.rows?.map((r: any) => (
                      <tr key={r._rowId} className="hover:bg-zinc-800/40 transition">
                        {tbl.columns.map((col) => (
                          <td key={col.key} className="py-2.5 px-4 font-mono text-[11px]">
                            {col.type === 'status' ? (
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {r[col.key] || 'PENDING'}
                              </span>
                            ) : (
                              r[col.key] || '—'
                            )}
                          </td>
                        ))}
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRow(tbl._id, r._rowId)}
                            className="text-zinc-500 hover:text-rose-400 p-1"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Row Inline Form */}
            {activeTableForNewRow === tbl._id && (
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center gap-3">
                {tbl.columns.map((col) => (
                  <input
                    key={col.key}
                    type="text"
                    placeholder={col.name}
                    value={newRowData[col.key] || ''}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, [col.key]: e.target.value })
                    }
                    className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                ))}
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    onClick={() => setActiveTableForNewRow(null)}
                    className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddRow(tbl._id)}
                    className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs"
                  >
                    Save Row
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Document Modal */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Create Document</h3>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="e.g. Deployment SOP"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPageModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
                >
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Create Data Table</h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. Lead Pipeline"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
