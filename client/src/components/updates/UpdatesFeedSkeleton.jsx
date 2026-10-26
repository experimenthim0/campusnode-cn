import React from "react";

export const PostCardSkeleton = () => {
  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs mb-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 bg-neutral-200 dark:bg-zinc-800 rounded" />
            <div className="w-20 h-2.5 bg-neutral-100 dark:bg-zinc-850 rounded" />
          </div>
        </div>
        <div className="w-16 h-6 bg-neutral-100 dark:bg-zinc-800 rounded-full" />
      </div>

      {/* Media placeholder */}
      <div className="w-full aspect-4/3 bg-neutral-200 dark:bg-zinc-800" />

      {/* Description & Details */}
      <div className="p-4 space-y-2.5">
        <div className="w-3/4 h-4 bg-neutral-200 dark:bg-zinc-800 rounded" />
        <div className="w-full h-3 bg-neutral-100 dark:bg-zinc-850 rounded" />
        <div className="w-5/6 h-3 bg-neutral-100 dark:bg-zinc-850 rounded" />
        <div className="w-2/3 h-3 bg-neutral-100 dark:bg-zinc-850 rounded" />

        {/* Action button mock */}
        <div className="pt-2 flex justify-between items-center">
          <div className="w-24 h-8 bg-neutral-100 dark:bg-zinc-800 rounded-lg" />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-zinc-800" />
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const UpdatesFeedSkeleton = ({ count = 3 }) => {
  return (
    <div className="w-full max-w-[620px] mx-auto">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default UpdatesFeedSkeleton;
