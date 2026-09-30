'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface OnlineUser {
  userId: string;
  name: string;
  avatar?: string;
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
  joinPage: (pageId: string) => void;
  leavePage: (pageId: string) => void;
  sendEditingIndicator: (pageId: string, isEditing: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { info } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setOnlineUsers([]);
      return;
    }

    const s = getSocket();
    if (!s) return;

    setSocket(s);

    s.on('WORKSPACE_PRESENCE_UPDATED', ({ onlineUsers }: { onlineUsers: OnlineUser[] }) => {
      setOnlineUsers(onlineUsers);
    });

    s.on('PAGE_UPDATED_WORKSPACE', (data: { title: string; updatedByName: string }) => {
      info(`📝 ${data.updatedByName} edited "${data.title}"`);
    });

    s.on('NEW_NOTIFICATION', (notif: any) => {
      info(`🔔 ${notif.message}`);
    });

    return () => {
      s.off('WORKSPACE_PRESENCE_UPDATED');
      s.off('PAGE_UPDATED_WORKSPACE');
      s.off('NEW_NOTIFICATION');
    };
  }, [user, info]);

  const joinPage = (pageId: string) => {
    if (socket && pageId) {
      socket.emit('join_page', pageId);
    }
  };

  const leavePage = (pageId: string) => {
    if (socket && pageId) {
      socket.emit('leave_page', pageId);
    }
  };

  const sendEditingIndicator = (pageId: string, isEditing: boolean) => {
    if (socket && pageId) {
      socket.emit('page_editing_indicator', { pageId, isEditing });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        joinPage,
        leavePage,
        sendEditingIndicator
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
