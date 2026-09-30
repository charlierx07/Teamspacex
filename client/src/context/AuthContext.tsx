'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUserData: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      // Purge any legacy PII from localStorage if present
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }

      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.get('/api/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Route protection
  useEffect(() => {
    if (!loading) {
      const isPublicPath = pathname === '/login';
      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && isPublicPath) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        // Note: User profile is kept strictly in React memory, never persisted in localStorage
        setUser(res.data.user);
        router.push('/dashboard');
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Network error during login';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
      setUser(null);
      router.push('/login');
    }
  };

  const updateUserData = (userData: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...userData };
      setUser(updated);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserData, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
