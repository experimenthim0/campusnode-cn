import React, { useState } from 'react';
import { Quote, ChevronDown, ChevronUp, Sparkles, MessageCircle } from 'lucide-react';

const NotableFeedback = ({ positiveHighlights = [], constructiveHighlights = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const primaryPraised = positiveHighlights[0] || null;
  const primaryCriticism = constructiveHighlights[0] || null;

  const remainingPraised = positiveHighlights.slice(1);
  const remainingCriticism = constructiveHighlights.slice(1);
  const totalExtra = remainingPraised.length + remainingCriticism.length;

  if (!primaryPraised && !primaryCriticism) {
    return null;
  }

  return (
    <section aria-label="Notable Attendee Feedback" className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-orange-500" aria-hidden="true" />
          <span>Notable Feedback (Verbatim Quotes)</span>
        </h4>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Direct student feedback
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Praised Quote */}
        {primaryPraised && (
          <div className="p-4 md:p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-200/70 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Most Praised Highlight</span>
            </div>
            <blockquote className="text-xs italic text-slate-800 dark:text-slate-200 font-medium leading-relaxed border-l-2 border-emerald-400 pl-3">
              "{primaryPraised.quote}"
            </blockquote>
            {primaryPraised.reason && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-emerald-800 dark:text-emerald-300">Why it matters:</strong> {primaryPraised.reason}
              </p>
            )}
          </div>
        )}

        {/* Most Actionable Criticism Quote */}
        {primaryCriticism && (
          <div className="p-4 md:p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Quote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Most Actionable Criticism</span>
            </div>
            <blockquote className="text-xs italic text-slate-800 dark:text-slate-200 font-medium leading-relaxed border-l-2 border-amber-400 pl-3">
              "{primaryCriticism.quote}"
            </blockquote>
            {primaryCriticism.reason && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-amber-800 dark:text-amber-300">Why it matters:</strong> {primaryCriticism.reason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expandable Extra Quotes */}
      {totalExtra > 0 && (
        <div className="space-y-3 pt-1">
          {expanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              {remainingPraised.map((h, idx) => (
                <div
                  key={`p-${idx}`}
                  className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 space-y-2"
                >
                  <p className="text-xs italic text-slate-700 dark:text-slate-300">
                    "{h.quote}"
                  </p>
                  {h.reason && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Context: {h.reason}
                    </p>
                  )}
                </div>
              ))}

              {remainingCriticism.map((h, idx) => (
                <div
                  key={`c-${idx}`}
                  className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 space-y-2"
                >
                  <p className="text-xs italic text-slate-700 dark:text-slate-300">
                    "{h.quote}"
                  </p>
                  {h.reason && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Context: {h.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <span>{expanded ? 'Show Less Quotes' : `View ${totalExtra} More Attendee Quotes`}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default NotableFeedback;
