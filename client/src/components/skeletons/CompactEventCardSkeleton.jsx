import React from "react";
import { Skeleton } from "../ui/Skeleton";

/**
 * CompactEventCardSkeleton - Loading placeholder matching the CompactEventCard layout
 */
const CompactEventCardSkeleton = () => {
  return (
    <div className="bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)] flex items-center gap-3.5 sm:gap-4 overflow-hidden">
      {/* Poster Skeleton */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-100 dark:bg-zinc-800">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Info Skeleton */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 self-stretch space-y-2">
        <div className="space-y-2">
          {/* Title */}
          <Skeleton className="w-3/4 h-4 sm:h-5 rounded-md" />
          {/* Venue */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
            <Skeleton className="w-24 sm:w-32 h-3 rounded" />
          </div>
          {/* Date */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
            <Skeleton className="w-28 sm:w-36 h-3 rounded" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="w-16 h-6 rounded-full" />
          <Skeleton className="w-20 h-6 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default CompactEventCardSkeleton;
