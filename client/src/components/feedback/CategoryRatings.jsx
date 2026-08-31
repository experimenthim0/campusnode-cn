import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';

const CategoryRatings = ({ averageRatings = {} }) => {
  const categories = [
    { label: 'Overall Experience', score: Number(averageRatings.overall) || 0 },
    { label: 'Event Organization', score: Number(averageRatings.organization) || 0 },
    { label: 'Usefulness & Content', score: Number(averageRatings.usefulness) || 0 },
    { label: 'Speaker / Host', score: Number(averageRatings.speaker) || 0 },
    { label: 'Venue & Facilities', score: Number(averageRatings.venue) || 0 },
    { label: 'Timing & Punctuality', score: Number(averageRatings.timing) || 0 },
  ];

  const overallScore = Number(averageRatings.overall) || 0;

  // Filter out the overall experience to find specific dimension gaps
  const dimensionCategories = categories.filter((c) => c.label !== 'Overall Experience');
  
  // Find weakest category
  let weakestCategory = null;
  let lowestScore = 5;
  dimensionCategories.forEach((cat) => {
    if (cat.score < lowestScore) {
      lowestScore = cat.score;
      weakestCategory = cat;
    }
  });

  const gap = weakestCategory && overallScore > weakestCategory.score 
    ? (overallScore - weakestCategory.score).toFixed(1)
    : null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-500" aria-hidden="true" />
          <span>Category Ratings Breakdown</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Scale: 0.0 – 5.0
        </span>
      </div>

      {/* Category Progress Bars */}
      <div className="space-y-4 pt-1">
        {categories.map((cat, idx) => {
          const pct = Math.min(100, Math.max(0, (cat.score / 5) * 100));
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs font-semibold">
                <span className="text-slate-800 dark:text-slate-200">{cat.label}</span>
                <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                  {cat.score.toFixed(1)}{' '}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">/ 5</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={cat.score}
                  aria-valuemin="0"
                  aria-valuemax="5"
                  aria-label={`${cat.label} score: ${cat.score} out of 5`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 0 to 5 Scale Indicator */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-0.5" aria-hidden="true">
          <span>0.0</span>
          <span>1.0</span>
          <span>2.0</span>
          <span>3.0</span>
          <span>4.0</span>
          <span>5.0</span>
        </div>
      </div>

      {weakestCategory && gap && Number(gap) > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-300 block uppercase tracking-wider text-[10px]">
              Biggest Satisfaction Gap
            </span>
            <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
              <strong className="text-slate-900 dark:text-white font-bold">{weakestCategory.label}</strong> ({weakestCategory.score.toFixed(1)} / 5) is{' '}
              <strong className="text-amber-800 dark:text-amber-300">{gap} points</strong> below overall satisfaction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryRatings;
