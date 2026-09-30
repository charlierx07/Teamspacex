'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, Mail, Shield, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { User } from '../../types';

export default function TeamDirectoryPage() {
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/api/users');
        if (res.data.success) {
          setTeam(res.data.users);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-zinc-100">Team Directory</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Authorized members and automation specialists operating within this workspace.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          Loading team directory...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div
              key={member._id}
              className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center uppercase shadow-md">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-zinc-100">{member.name}</h3>
                      <div className="text-[11px] text-zinc-400">{member.title || 'Team Member'}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded ${
                      member.role === 'ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400 my-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="capitalize">{member.status.toLowerCase()}</span>
                </div>
                <div className="text-zinc-500">
                  Joined {new Date(member.createdAt || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
