import React from "react";
import { Skeleton } from "../ui/Skeleton";

/**
 * EventCardSkeleton - A loading placeholder that mimics the EventCard layout
 */
const EventCardSkeleton = () => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-sm overflow-hidden flex flex-col h-full group">
      {/* Image Skeleton */}
      <Skeleton className="h-64 border-b-2 border-gray-300 rounded-none w-full" />

      {/* Main Body Skeleton */}
      <div className="p-3 flex flex-auto flex-col">
        {/* Title Skeleton */}
        <Skeleton className="w-5/6 h-6 mb-2" />
        
        {/* Description Skeleton */}
        <div className="space-y-1 mb-4">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-4/5 h-3" />
        </div>

        {/* Info Rows Skeletons */}
        <div className="space-y-2 mb-2 mt-auto">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="w-1/2 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="w-2/3 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="w-1/3 h-4" />
          </div>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-3 border-t-2 border-neutral-100 pt-2">
          <Skeleton className="w-16 h-8" />
          <Skeleton className="flex-1 h-10" />
        </div>
      </div>
    </div>
  );
};

export default EventCardSkeleton;
