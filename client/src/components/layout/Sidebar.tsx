'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Activity,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { workspaceName } = useWorkspace();

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Pages', href: '/pages', icon: FileText },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Settings', href: '/profile', icon: Settings },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'Admin Panel', href: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-zinc-100 tracking-tight flex items-center gap-1.5">
              Teamspace<span className="text-cyan-400">X</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium tracking-wide truncate max-w-[130px]" title={workspaceName}>
              {workspaceName}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800/90 text-cyan-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400/60" />}
            </Link>
          );
        })}
      </div>

      {/* User Profile Bar */}
      <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
          <Link href="/profile" className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200 truncate">{user?.name}</div>
              <div className="text-[10px] text-zinc-400 flex items-center gap-1 truncate">
                <span className={`px-1 rounded text-[9px] font-semibold ${user?.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  {user?.role}
                </span>
                <span className="truncate">{user?.title || 'Team'}</span>
              </div>
            </div>
          </Link>
          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
