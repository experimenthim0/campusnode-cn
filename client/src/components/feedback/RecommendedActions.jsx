import React from 'react';
import { Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';

const priorityOrder = { high: 1, medium: 2, low: 3 };

const priorityStyles = {
  high: {
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
    cardBorder: 'border-rose-200/80 dark:border-rose-900/40',
    label: 'High Priority',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    cardBorder: 'border-amber-200/80 dark:border-amber-900/40',
    label: 'Medium Priority',
  },
  low: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    cardBorder: 'border-neutral-200/90 dark:border-neutral-800',
    label: 'Low Priority',
  },
};

const RecommendedActions = ({ recommendations = [] }) => {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return null;
  }

  // Sort: HIGH -> MEDIUM -> LOW, then by evidenceCount descending
  const sortedRecs = [...recommendations].sort((a, b) => {
    const pA = priorityOrder[(a.priority || 'medium').toLowerCase()] || 2;
    const pB = priorityOrder[(b.priority || 'medium').toLowerCase()] || 2;
    if (pA !== pB) return pA - pB;
    const countA = typeof a.evidenceCount === 'number' ? a.evidenceCount : 0;
    const countB = typeof b.evidenceCount === 'number' ? b.evidenceCount : 0;
    return countB - countA;
  });

  return (
    <section aria-label="Actionable Recommendations for Next Event" className="p-5 md:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/90 dark:border-neutral-700/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-700/60 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span>Recommended Actions for Next Event</span>
        </h4>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Ranked by operational priority
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRecs.map((rec, idx) => {
          const pKey = (rec.priority || 'medium').toLowerCase();
          const pConfig = priorityStyles[pKey] || priorityStyles.medium;

          return (
            <div
              key={idx}
              className={`bg-white dark:bg-neutral-900 p-4 md:p-5 rounded-xl border ${pConfig.cardBorder} shadow-2xs space-y-2.5 flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {rec.title}
                  </h5>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${pConfig.badge}`}>
                    {pConfig.label}
                  </span>
                </div>

                {rec.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {rec.description}
                  </p>
                )}
              </div>

              {typeof rec.evidenceCount === 'number' && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" />
                  <span>Based on {rec.evidenceCount} {rec.evidenceCount === 1 ? 'attendee mention' : 'attendee mentions'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedActions;
