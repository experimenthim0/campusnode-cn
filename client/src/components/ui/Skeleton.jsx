import React from "react";
import { cn } from "@/utils/cn";

/**
 * Skeleton - A base component for loading placeholders
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200/90 dark:bg-neutral-800/80",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

