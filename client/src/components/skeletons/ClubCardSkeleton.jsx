import React from "react";
import { Skeleton } from "../ui/Skeleton";

/**
 * ClubCardSkeleton - A loading placeholder that mimics the ClubCard layout
 */
const ClubCardSkeleton = () => {
  return (
    <div className="bg-cn-surface border border-cn-border rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* Banner Skeleton */}
      <Skeleton className="w-full h-28 sm:h-32 rounded-none shrink-0" />

      <div className="p-5 sm:p-6 pt-0 flex flex-col flex-grow">
        
        {/* Top: Overlapping Logo & Name in Same Row */}
        <div className="flex items-end gap-3.5 -mt-7 sm:-mt-8 mb-4 min-w-0">
          {/* Logo Skeleton */}
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0 border-3 border-cn-surface" />
          
          <div className="space-y-1.5 flex-grow pb-0.5">
            {/* Category Skeleton */}
            <Skeleton className="w-16 h-3 rounded-full" />
            {/* Title Skeleton */}
            <Skeleton className="w-3/4 h-5 rounded" />
          </div>
        </div>

        {/* Description Skeletons */}
        <div className="space-y-2">
          <Skeleton className="w-full h-3.5 rounded" />
          <Skeleton className="w-5/6 h-3.5 rounded" />
        </div>

        {/* Divider */}
        <div className="border-t border-cn-border-subtle my-4" />

        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="w-12 h-2.5 rounded" />
            <Skeleton className="w-24 h-3.5 rounded" />
          </div>
          <div className="space-y-1">
            <Skeleton className="w-12 h-2.5 rounded" />
            <Skeleton className="w-24 h-3.5 rounded" />
          </div>
        </div>

        <div className="mt-auto pt-5 space-y-3.5">
          <div>
            <Skeleton className="w-12 h-2 rounded mb-1.5" />
            <div className="flex gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
          
          <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-3.5">
            <Skeleton className="w-full h-[38px] rounded-xl" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClubCardSkeleton;
