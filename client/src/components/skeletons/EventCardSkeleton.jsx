import React from "react";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "@/utils/cn";

/**
 * EventCardSkeleton - A loading placeholder that mimics the modern EventCard layout
 */
const EventCardSkeleton = ({ className }) => {
  return (
    <div
      className={cn(
        "border border-neutral-200 dark:border-neutral-800/80 rounded-xl overflow-hidden flex flex-col h-full shadow-sm bg-white dark:bg-[#0d0d0d]",
        className
      )}
    >
      {/* Image Skeleton with aspect-[21/11] */}
      <div className="relative w-full aspect-[21/11] overflow-hidden bg-slate-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800/80">
        <Skeleton className="w-full h-full rounded-none" />

        {/* Status Badge Skeleton */}
        <div className="absolute top-2 left-2">
          <Skeleton className="w-16 h-5 rounded-md" />
        </div>
      </div>

      {/* Main Body Skeleton */}
      <div className="px-4 pt-2 flex flex-auto flex-col">
        {/* Organizer Row Skeleton */}
        <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
          <div className="flex items-center min-w-0 gap-2">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <Skeleton className="w-28 h-3.5 rounded" />
          </div>
        </div>

        {/* Title Skeleton */}
        <div className="mb-2 space-y-1.5">
          <Skeleton className="w-3/4 h-5 rounded" />
          <Skeleton className="w-1/2 h-5 rounded" />
        </div>

        {/* Info Rows & Big Calendar Date Badge */}
        <div className="flex items-center justify-between gap-2.5 mb-1">
          {/* Left info items */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
              <Skeleton className="w-36 h-3 rounded" />
            </div>
            {/* Venue */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
              <Skeleton className="w-24 h-3 rounded" />
            </div>
            {/* Seats */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
              <Skeleton className="w-20 h-3 rounded" />
            </div>
          </div>

          {/* Right Section: Big Calendar Date Badge */}
          <div className="shrink-0 self-center pl-1">
            <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[54px] bg-white dark:bg-neutral-900 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700/80 shadow-xs">
              {/* Header bar (month placeholder) */}
              <Skeleton className="w-full h-3.5 rounded-none bg-neutral-200 dark:bg-neutral-700/80" />
              {/* Day number box */}
              <div className="w-full flex items-center justify-center py-1 sm:py-1.5 bg-neutral-50 dark:bg-neutral-900/90">
                <Skeleton className="w-6 h-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Skeleton */}
      <div className="px-5 pb-4 mt-auto">
        <div className="flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
          {/* Entry Fee Pill */}
          <Skeleton className="w-14 h-8 rounded-lg shrink-0" />
          {/* Primary Action Button (Register / View) */}
          <Skeleton className="flex-1 h-9 rounded-full" />
          {/* Calendar Dropdown Button */}
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default EventCardSkeleton;

