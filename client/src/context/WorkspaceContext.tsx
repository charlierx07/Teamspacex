'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaceName: string;
  workspaceDescription: string;
  loadingWorkspace: boolean;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState<string>('Workspace');
  const [workspaceDescription, setWorkspaceDescription] = useState<string>('');
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);

  const fetchWorkspace = async () => {
    try {
      const res = await api.get('/api/workspaces/current');
      if (res.data.success && res.data.workspace) {
        setWorkspaceName(res.data.workspace.name);
        setWorkspaceDescription(res.data.workspace.description || '');
      }
    } catch (e) {
      // fallback silently
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspace();
    } else {
      setWorkspaceName('Workspace');
      setLoadingWorkspace(false);
    }
  }, [user]);

  const refreshWorkspace = async () => {
    await fetchWorkspace();
  };

  return (
    <WorkspaceContext.Provider value={{ workspaceName, workspaceDescription, loadingWorkspace, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};