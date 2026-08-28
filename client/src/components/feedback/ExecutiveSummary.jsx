import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

const sentimentStyles = {
  very_positive: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  positive: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/50',
  mixed: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  negative: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
  very_negative: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
  insufficient_data: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-neutral-800 dark:text-slate-300 dark:border-neutral-700',
};

const ExecutiveSummary = ({ summary, sentiment, keyTakeaways }) => {
  const sentimentBadgeClass = sentimentStyles[sentiment] || sentimentStyles.positive;
  const formattedSentiment = (sentiment || 'positive').replace(/_/g, ' ');

  return (
    <div className="space-y-4">
      {/* Executive Summary Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/90 dark:border-neutral-700/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Executive Summary
          </span>
          <span className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${sentimentBadgeClass}`}>
            {formattedSentiment}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed max-w-4xl">
          {summary}
        </p>
      </div>

      {/* Key Takeaways Grid */}
      {Array.isArray(keyTakeaways) && keyTakeaways.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
            <span>Key Takeaways</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 flex items-start gap-3 shadow-2xs"
              >
                <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                  {idx + 1}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {takeaway}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummary;
