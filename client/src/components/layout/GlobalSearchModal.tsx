'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, Folder, FileText, CheckSquare, X, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

interface SearchResultItem {
  _id: string;
  name?: string;
  title?: string;
  status?: string;
  priority?: string;
}

interface SearchResults {
  projects: SearchResultItem[];
  folders: SearchResultItem[];
  pages: SearchResultItem[];
  tasks: SearchResultItem[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ projects: [], folders: [], pages: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ projects: [], folders: [], pages: [], tasks: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], folders: [], pages: [], tasks: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.data.success) {
          setResults(res.data.results);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const hasAnyResults =
    results.projects.length > 0 ||
    results.folders.length > 0 ||
    results.pages.length > 0 ||
    results.tasks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
          <Search className="w-5 h-5 text-zinc-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, folders, documents, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-zinc-400 hover:text-zinc-200 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            onClick={onClose}
            className="cursor-pointer text-[11px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 font-mono"
          >
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="p-3 overflow-y-auto space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              Searching workspace...
            </div>
          )}

          {!loading && query && !hasAnyResults && (
            <div className="py-12 text-center text-zinc-400 text-xs">
              No matching projects, pages, or tasks found for &quot;{query}&quot;
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-zinc-400 text-xs">
              Type to instantly search across all workspace resources
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                <FolderKanban className="w-3 h-3 text-cyan-400" />
                Projects
              </div>
              <div className="space-y-1">
                {results.projects.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => navigateTo(`/projects/${p._id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer text-xs transition-colors group"
                  >
                    <span className="font-medium text-zinc-200 group-hover:text-cyan-400">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folders */}
          {results.folders.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3 h-3 text-indigo-400" />
                Folders
              </div>
              <div className="space-y-1">
                {results.folders.map((f) => (
                  <div
                    key={f._id}
                    onClick={() => navigateTo(`/folders/${f._id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer text-xs transition-colors group"
                  >
                    <span className="font-medium text-zinc-200 group-hover:text-indigo-400">{f.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          {results.pages.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-emerald-400" />
                Pages / Documents
              </div>
              <div className="space-y-1">
                {results.pages.map((page) => (
                  <div
                    key={page._id}
                    onClick={() => navigateTo(`/pages/${page._id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer text-xs transition-colors group"
                  >
                    <span className="font-medium text-zinc-200 group-hover:text-emerald-400">{page.title}</span>
                    <span className="text-[10px] text-zinc-400">Open page</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3 h-3 text-amber-400" />
                Tasks
              </div>
              <div className="space-y-1">
                {results.tasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => navigateTo(`/tasks`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer text-xs transition-colors group"
                  >
                    <span className="font-medium text-zinc-200 group-hover:text-amber-400">{t.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
