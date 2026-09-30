'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Check, UserCircle, Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../lib/api';
import { Notification } from '../../types';

interface HeaderProps {
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar Trigger */}
      <button
        onClick={onOpenSearch}
        className="flex items-center space-x-3 text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 px-3 py-1.5 rounded-lg w-72 transition-colors text-left group"
      >
        <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400" />
        <span className="flex-1">Search projects, docs, tasks...</span>
        <kbd className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-700/80 text-zinc-400 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Right controls: Active Presence + Notifications + User */}
      <div className="flex items-center space-x-4">
        {/* Online team members */}
        {onlineUsers && onlineUsers.length > 0 && (
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-zinc-300 font-medium">
              {onlineUsers.length} online
            </span>
            <div className="flex -space-x-1.5 ml-1">
              {onlineUsers.slice(0, 4).map((u) => (
                <div
                  key={u.userId}
                  title={u.name}
                  className="w-5 h-5 rounded-full bg-indigo-600 border border-zinc-950 text-[9px] font-bold text-white flex items-center justify-center uppercase"
                >
                  {u.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] font-bold text-zinc-950 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-zinc-200">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-400">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => markAsRead(n._id)}
                      className={`p-3 text-xs hover:bg-zinc-800/50 cursor-pointer transition-colors flex items-start space-x-2.5 ${
                        !n.read ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          !n.read ? 'bg-cyan-400' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-zinc-200 font-medium leading-snug">{n.message}</div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Link */}
        <Link
          href="/profile"
          className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-200 p-1 rounded-lg"
        >
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 uppercase">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </Link>
      </div>
    </header>
  );
};
