import React from 'react';
import { ThumbsUp, Flame, Check, AlertTriangle } from 'lucide-react';

const priorityBadgeStyles = {
  high: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

const KeyInsightsColumns = ({ whatStudentsLiked = [], improvementAreas = [] }) => {
  return (
    <section aria-label="Key Insights: Strengths and Improvement Areas" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-5 md:p-6 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/70 dark:border-emerald-900/30 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-emerald-200/50 dark:border-emerald-900/40 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>What Students Liked</span>
          </h4>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            {whatStudentsLiked.length} Positive Themes
          </span>
        </div>

        {whatStudentsLiked.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No positive themes recorded.</p>
        ) : (
          <div className="space-y-3">
            {whatStudentsLiked.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-snug">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>{item.theme}</span>
                  </span>
                  {typeof item.evidenceCount === 'number' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0">
                      {item.evidenceCount} {item.evidenceCount === 1 ? 'response' : 'responses'}
                    </span>
                  )}
                </div>
                {item.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {item.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/70 dark:border-amber-900/30 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-amber-200/50 dark:border-amber-900/40 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>What Should Improve</span>
          </h4>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            {improvementAreas.length} Improvement Areas
          </span>
        </div>

        {improvementAreas.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No critical improvement areas identified.</p>
        ) : (
          <div className="space-y-3">
            {improvementAreas.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-amber-100 dark:border-neutral-800 shadow-2xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-snug">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                    <span>{item.theme}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${priorityBadgeStyles[item.priority] || priorityBadgeStyles.medium}`}>
                        {item.priority}
                      </span>
                    )}
                    {typeof item.evidenceCount === 'number' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400">
                        {item.evidenceCount} {item.evidenceCount === 1 ? 'mention' : 'mentions'}
                      </span>
                    )}
                  </div>
                </div>
                {item.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {item.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default KeyInsightsColumns;
