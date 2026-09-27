"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface EyeIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EyeIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  alwaysAnimate?: boolean;
  loop?: boolean;
  duration?: number;
  repeatDelay?: number;
}

const EyeIcon = forwardRef<EyeIconHandle, EyeIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      alwaysAnimate = true,
      loop = true,
      duration = 0.45,
      repeatDelay = 1.4,
      ...props
    },
    ref
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const isAlways = alwaysAnimate || loop;

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    useEffect(() => {
      if (isAlways) {
        controls.start("animate");
      }
    }, [isAlways, controls]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else if (!isAlways) {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter, isAlways]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else if (!isAlways) {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave, isAlways]
    );

    return (
      <div
        className={cn("inline-flex items-center justify-center", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            initial="normal"
            animate={isAlways ? "animate" : controls}
            d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
            variants={{
              normal: { scaleY: 1, opacity: 1 },
              animate: {
                scaleY: [1, 0.08, 1],
                opacity: [1, 0.35, 1],
                transition: {
                  duration,
                  ease: "easeInOut",
                  repeat: isAlways ? Infinity : 0,
                  repeatDelay: isAlways ? repeatDelay : 0,
                },
              },
            }}
          />
          <motion.circle
            initial="normal"
            animate={isAlways ? "animate" : controls}
            cx="12"
            cy="12"
            r="3"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: {
                scale: [1, 0.25, 1],
                opacity: [1, 0.35, 1],
                transition: {
                  duration,
                  ease: "easeInOut",
                  repeat: isAlways ? Infinity : 0,
                  repeatDelay: isAlways ? repeatDelay : 0,
                },
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

EyeIcon.displayName = "EyeIcon";

export { EyeIcon };
