import React from "react";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "@/utils/cn";

/**
 * ClubCardSkeleton - A loading placeholder that mimics the modern ClubCard layout
 */
const ClubCardSkeleton = ({ className }) => {
  return (
    <div
      className={cn(
        "relative border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full bg-white dark:bg-[#121316] shadow-sm",
        className
      )}
    >
      {/* Banner Skeleton matching h-32 sm:h-36 with subtle fades */}
      <div className="relative w-full h-32 sm:h-36 overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
        <Skeleton className="w-full h-full rounded-none" />
        {/* Multi-layered progressive fade matching card surface */}
        <div className="absolute inset-x-0 bottom-0 h-20 sm:h-16 bg-gradient-to-t from-white/95 via-white/65 via-35% to-transparent dark:from-[#121316]/95 dark:via-[#121316]/65 dark:via-35% dark:to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-[#121316] to-transparent pointer-events-none" />
      </div>

      {/* Floating Circular Club Logo */}
      <div className="-mt-8 sm:-mt-9 flex justify-center relative z-10">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 shadow-lg flex items-center justify-center overflow-hidden p-1">
          <Skeleton className="w-full h-full rounded-full" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 pt-1 flex flex-col flex-grow relative z-10">
        {/* Club Name Skeleton */}
        <div className="flex justify-center mb-2">
          <Skeleton className="w-36 sm:w-44 h-6 rounded-md" />
        </div>

        {/* Faculty Lead & Student Lead Section */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-3.5 pb-2 text-left flex flex-row justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="w-16 h-2.5 rounded mb-1.5" />
            <Skeleton className="w-24 sm:w-28 h-4 rounded" />
          </div>
          <div className="space-y-1 flex flex-col items-end">
            <Skeleton className="w-16 h-2.5 rounded mb-1.5" />
            <Skeleton className="w-20 sm:w-24 h-4 rounded" />
          </div>
        </div>

        {/* Social connections & View Page Button at bottom */}
        <div className="mt-auto pt-3">
          {/* Social Icons Placeholder */}
          <div className="flex items-center justify-center gap-1.5 mb-3 min-h-[32px]">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          </div>

          {/* View Page Button */}
          <Skeleton className="w-full h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default ClubCardSkeleton;

