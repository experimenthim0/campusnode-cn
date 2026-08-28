import React from 'react';
import { Star, Clock } from 'lucide-react';

const ZeroFeedbackState = ({ isCompleted }) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-12 md:p-16 text-center shadow-xs max-w-xl mx-auto space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
        <Star className="w-8 h-8 fill-amber-400 stroke-amber-500" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white">
        No Attendee Feedback Yet
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
        Feedback requests appear automatically to verified attendees for 72 hours after the event completes. Once students submit their ratings, aggregated analytics and anonymized responses will appear right here.
      </p>
      {!isCompleted ? (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
          <span>Feedback collection unlocks when event ends</span>
        </div>
      ) : (
        <div className="pt-2">
          <a
            href="/feedback-questions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            <span>Preview Student Feedback Questions →</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default ZeroFeedbackState;
