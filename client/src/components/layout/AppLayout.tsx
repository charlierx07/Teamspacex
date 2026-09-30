'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useAuth } from '../../context/AuthContext';
import { usePathname } from 'next/navigation';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-mono text-zinc-400">Loading TeamspaceX...</div>
      </div>
    );
  }

  // If on public page (like /login), do not render sidebar/header
  if (!user || pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          {children}
        </main>
      </div>
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
