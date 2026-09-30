'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { User, Lock, Shield, Mail, Calendar, Key, Check, Trash2, AlertTriangle, X } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user, updateUserData, logout } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/api/auth/profile', { name, title });
      if (res.data.success) {
        success('Profile updated successfully');
        updateUserData(res.data.user);
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      error('Password must be at least 8 characters');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      error('Password is required to confirm deletion');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await api.delete('/api/auth/account', {
        data: { password: deletePassword }
      });
      if (res.data.success) {
        success('Account and personal data permanently deleted');
        setShowDeleteModal(false);
        await logout();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl font-bold text-zinc-100">Account & Workspace Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your personal profile and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white font-bold text-2xl flex items-center justify-center uppercase shadow-xl mb-4">
            {user?.name?.charAt(0) || 'U'}
          </div>

          <h2 className="text-base font-bold text-zinc-100">{user?.name}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>

          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded ${
                user?.role === 'ADMIN'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {user?.role}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-500/10">
              {user?.status}
            </span>
          </div>

          <div className="w-full border-t border-zinc-800/80 my-5 pt-4 space-y-2 text-left text-xs text-zinc-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              <span>Role: {user?.role}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full mt-auto py-2 rounded-lg bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 text-xs font-medium text-zinc-300 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Right Column: Profile Edit & Password Change */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile Information */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4">Personal Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Job Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center space-x-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Change Security Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition disabled:opacity-50"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone: Account & Data Deletion */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-rose-300 mb-1 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Danger Zone: Account &amp; Data Deletion</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Permanently delete your account, personal data, and active sessions. This action cannot be reversed.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeletePassword('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs transition flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account &amp; Personal Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-zinc-100">Confirm Account Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete your account? All your personal information, notification history, and workspace access permissions will be permanently removed.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Enter your current password to confirm
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="px-4 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingAccount ? 'Deleting...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
