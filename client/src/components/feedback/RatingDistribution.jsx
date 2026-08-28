import React from 'react';
import { Star } from 'lucide-react';

const RatingDistribution = ({ ratingDistribution = [] }) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" aria-hidden="true" />
          <span>Rating Distribution (Overall)</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          5-Star Scale
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {ratingDistribution.map((dist) => (
          <div key={dist.stars} className="flex items-center gap-3 text-xs">
            <span className="w-10 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <span>{dist.stars}</span>
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" aria-hidden="true" />
            </span>
            <div className="flex-1 bg-slate-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 dark:bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${dist.percentage}%` }}
                role="progressbar"
                aria-valuenow={dist.percentage}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`${dist.stars} stars: ${dist.count} responses (${dist.percentage}%)`}
              />
            </div>
            <span className="w-24 text-right font-medium text-slate-600 dark:text-slate-400 shrink-0">
              {dist.count} ({dist.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingDistribution;
