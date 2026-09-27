import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, ShieldAlert, LogOut, Sparkles } from 'lucide-react';

/**
 * RolloutBlocked — Launch screen displayed when an authenticated student's
 * rollout stage has not yet begun.
 *
 * @param {object} props
 * @param {object} [props.rollout] - Rollout metadata evaluated by server
 */
export const RolloutBlocked = ({ rollout }) => {
  const { user, logout } = useAuth();

  const groupLabel = rollout?.group || (user?.program ? `${user.program} Student` : 'Campus Member');
  const availableDate = rollout?.availableDateFormatted || 'Date to be announced';

  return (
    <div className="mysans min-h-screen bg-cn-bg text-cn-text relative overflow-hidden transition-colors duration-300 flex items-center justify-center px-4 py-12 sm:px-6">
      {/* ── Ambient Background Glow ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(0, 148, 255, 0.14) 0%, rgba(249, 115, 22, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-lg relative z-10">
        {/* Launch Phased Card */}
        <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-6 sm:p-8 relative overflow-hidden text-center flex flex-col items-center">
          
          {/* Phased Launch Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/50 border border-cn-blue-200/60 dark:border-cn-blue-800/60 text-cn-blue-600 dark:text-cn-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cn-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cn-blue-500" />
            </span>
            <span>CampusNode Launch in Phases</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
            CampusNode is launching in phases.
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed font-normal">
            To ensure high reliability, access is rolling out in scheduled academic cohorts.
          </p>

          {/* Scheduled Date Display Box */}
          <div className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 mb-4 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5 text-cn-blue-500" />
              <span>Your access will be available from:</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {availableDate}
            </div>
          </div>

          {/* User Group Display Box */}
          <div className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 mb-6 text-left">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Your group:
            </div>
            <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              {groupLabel}
            </div>
            {user?.email && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                Signed in as: <span className="font-mono text-zinc-700 dark:text-zinc-300">{user.email}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 italic">
            Please check back when your rollout stage begins.
          </p>

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={() => logout('/login')}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-400/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolloutBlocked;
