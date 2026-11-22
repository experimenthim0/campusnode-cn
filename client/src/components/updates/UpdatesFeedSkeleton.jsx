import React from "react";

export const PostCardSkeleton = () => {
  return (
    <div className="w-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl overflow-hidden shadow-xs mb-4 animate-pulse">
      {/* Compact Header Skeleton */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-cn-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-cn-surface-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="w-28 h-3.5 bg-cn-surface-muted rounded" />
            <div className="w-16 h-2.5 bg-cn-surface-muted rounded" />
          </div>
        </div>
        <div className="w-16 h-5 bg-cn-surface-muted rounded-full" />
      </div>

      {/* Media Placeholder (Instagram / Twitter style) */}
      <div className="w-full aspect-16/9 bg-cn-surface-muted" />

      {/* Description & Details Skeleton */}
      <div className="p-4 sm:p-5 space-y-2.5">
        <div className="w-3/4 h-5 bg-cn-surface-muted rounded" />
        <div className="w-full h-3.5 bg-cn-surface-muted rounded" />
        <div className="w-4/5 h-3.5 bg-cn-surface-muted rounded" />
      </div>

      {/* Action / Metadata Bar Skeleton */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-cn-border/80 bg-cn-surface-muted/40 flex items-center justify-between gap-3">
        <div className="w-28 h-6 bg-cn-surface-muted rounded-full" />
        <div className="flex items-center gap-2">
          <div className="w-16 h-7 bg-cn-surface-muted rounded-full" />
          <div className="w-20 h-7 bg-cn-surface-muted rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const UpdatesFeedSkeleton = ({ count = 3 }) => {
  return (
    <div className="w-full space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default UpdatesFeedSkeleton;
