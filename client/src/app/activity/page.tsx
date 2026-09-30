'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { Activity, Clock, User, Filter, ArrowUpRight } from 'lucide-react';
import { Activity as ActivityType } from '../../types';

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchActivities = async () => {
    try {
      const res = await api.get('/api/activity?limit=50');
      if (res.data.success) {
        setActivities(res.data.activities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Real-time new activity event
  useEffect(() => {
    if (!socket) return;
    socket.on('NEW_ACTIVITY', (newAct: ActivityType) => {
      setActivities((prev) => [newAct, ...prev]);
    });
    return () => {
      socket.off('NEW_ACTIVITY');
    };
  }, [socket]);

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    if (action.includes('UPDATED')) return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    if (action.includes('DELETED')) return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    if (action.includes('PERMISSION')) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-zinc-800 text-zinc-300';
  };

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-zinc-100">Global Activity Audit Trail</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Chronological, real-time log of document modifications, task completions, and security changes.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          Loading audit trail...
        </div>
      ) : activities.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-zinc-800">
          No activities recorded yet.
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-zinc-800/60">
            {activities.map((act) => {
              const actorName = act.actor?.name || 'Operator';
              return (
                <div
                  key={act._id}
                  className="p-4 hover:bg-zinc-800/40 transition flex items-start justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 mt-0.5">
                      {actorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs text-zinc-200">
                        <span className="font-semibold text-zinc-100">{actorName}</span>{' '}
                        <span className="text-zinc-400 font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 mx-1">
                          {act.action}
                        </span>{' '}
                        <span className="text-zinc-100 font-medium">{act.resourceTitle}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center space-x-2 mt-1">
                        <span className="uppercase text-[9px] font-semibold text-zinc-400">
                          {act.resourceType}
                        </span>
                        <span>·</span>
                        <span>{formatTimestamp(act.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded shrink-0 ${getActionColor(
                      act.action
                    )}`}
                  >
                    {act.action.split('_')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
