import React from 'react';
import { ThumbsUp, HelpCircle, XCircle } from 'lucide-react';

const AttendanceIntent = ({ recommendationAnalytics = {}, totalResponses = 0 }) => {
  const yes = recommendationAnalytics.yes || { count: 0, percentage: 0 };
  const maybe = recommendationAnalytics.maybe || { count: 0, percentage: 0 };
  const no = recommendationAnalytics.no || { count: 0, percentage: 0 };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ThumbsUp className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          <span>Would Attend a Similar Event Again?</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Attendance Intent
        </span>
      </div>

      {/* Dominant Primary YES Metric Card */}
      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
            Dominant Response
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {yes.percentage}% YES
          </p>
          <p className="text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
            {yes.count} of {totalResponses} attendees would attend again
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ThumbsUp className="w-6 h-6" aria-hidden="true" />
        </div>
      </div>

      {/* Subtle Secondary Breakdown for Maybe and No */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Maybe: Strictly Amber/Yellow */}
        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Maybe</p>
          </div>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
            {maybe.percentage}%
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            {maybe.count} {maybe.count === 1 ? 'vote' : 'votes'}
          </p>
        </div>

        {/* No: Subtle Red/Rose */}
        <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-rose-700 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-wider">No</p>
          </div>
          <p className="text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">
            {no.percentage}%
          </p>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
            {no.count} {no.count === 1 ? 'vote' : 'votes'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceIntent;
