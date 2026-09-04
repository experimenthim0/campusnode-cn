import React from 'react';
import { Star, MessageSquare, Percent, Award } from 'lucide-react';

const CoreMetrics = ({ totalResponses, totalAttendees, responseRate, overallScore }) => {
  const roundedOverall = typeof overallScore === 'number' ? overallScore : parseFloat(overallScore) || 0;

  return (
    <section aria-label="Core Performance Metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Responses
          </span>
          <MessageSquare className="w-4 h-4 text-brand-500" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalResponses}
          </span>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            / {totalAttendees} attendees
          </span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
          Verified attendee feedback submissions
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Response Rate
          </span>
          <Percent className="w-4 h-4 text-amber-500" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {responseRate}%
          </span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
          Check-in attendee participation
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overall Score
          </span>
          <Award className="w-4 h-4 text-brand-500" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {roundedOverall.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            / 5.0
          </span>
          <div className="flex items-center text-amber-400 ml-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(roundedOverall)
                    ? 'fill-amber-400 stroke-amber-500'
                    : 'text-neutral-300 dark:text-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
          Average attendee satisfaction rating
        </p>
      </div>
    </section>
  );
};

export default CoreMetrics;
