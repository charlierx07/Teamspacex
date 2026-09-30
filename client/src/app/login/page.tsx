'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMsg('');
    setLoading(true);

    const res = await login(loginEmail, loginPass);
    if (!res.success) {
      setErrorMsg(res.message || 'Login failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    await executeLogin(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
            Teamspace<span className="text-cyan-400">X</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-semibold">
            Private Team Workspace
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-zinc-200">Sign in to your workspace</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Private system. Access is strictly by Administrator invitation only.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-semibold py-2.5 px-4 rounded-lg text-xs transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Instructions & Credentials Box */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Demo Access Instructions
              </span>
              <span className="text-[10px] text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">
                1-Click Sign In
              </span>
            </div>

            <div className="space-y-2">
              {/* Admin Card */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('chetan@agency.com', 'AdminPassword123!')}
                className="w-full text-left p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:border-cyan-500/50 hover:bg-zinc-800/40 transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-zinc-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Admin Account
                  </span>
                  <span className="text-[10px] text-cyan-400 group-hover:underline">Instant Sign In →</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono mt-1">
                  <div>
                    <span className="text-zinc-400 font-sans">ID: </span>
                    <span className="text-zinc-200">chetan@agency.com</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-sans">Pass: </span>
                    <span className="text-zinc-200">AdminPassword123!</span>
                  </div>
                </div>
              </button>

              {/* Member Card */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('alex@gmail.com', 'Alex@1234')}
                className="w-full text-left p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-800/40 transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-zinc-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Member Account
                  </span>
                  <span className="text-[10px] text-indigo-400 group-hover:underline">Instant Sign In →</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono mt-1">
                  <div>
                    <span className="text-zinc-400 font-sans">ID: </span>
                    <span className="text-zinc-200">alex@gmail.com</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-sans">Pass: </span>
                    <span className="text-zinc-200">Alex@1234</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center mt-6 text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Zero-trust server-side authorization enabled</span>
        </div>
      </div>
    </div>
  );
}
