import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Premium ThemeToggle button with animated icon transitions,
 * tactile spring physics, and full-screen circular ripple view transition.
 */
export default function ThemeToggle({
  className = "",
  size = "md",
  ariaLabel,
  title,
}) {
  const { isDark, toggleTheme } = useTheme();

  // Size configurations
  const config = {
    sm: {
      btn: "w-8 h-8",
      icon: 16,
    },
    md: {
      btn: "w-9 h-9",
      icon: 18,
    },
    lg: {
      btn: "w-10 h-10",
      icon: 20,
    },
  }[size] || {
    btn: "w-9 h-9",
    icon: 18,
  };

  const currentTitle =
    title || (isDark ? "Switch to light mode" : "Switch to dark mode");

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.08, translateY: -1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      aria-label={ariaLabel || currentTitle}
      title={currentTitle}
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer select-none hover:border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cn-blue-500/50 touch-manipulation overflow-hidden ${
        config.btn
      } ${
        isDark
          ? " hover:bg-neutral-800/90 text-amber-400 hover:text-amber-300  "
          : " hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900"
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="dark-sun-icon"
            initial={{ rotate: -80, scale: 0.3, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 80, scale: 0.3, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              mass: 0.85,
            }}
            className="flex items-center justify-center"
          >
            <Sun
              size={config.icon}
              strokeWidth={2.2}
              className="drop-shadow-[0_0_5px_rgba(251,191,36,0.55)]"
            />
          </motion.span>
        ) : (
          <motion.span
            key="light-moon-icon"
            initial={{ rotate: 80, scale: 0.3, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -80, scale: 0.3, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              mass: 0.85,
            }}
            className="flex items-center justify-center"
          >
            <Moon
              size={config.icon}
              strokeWidth={2.2}
              className="drop-shadow-[0_0_4px_rgba(99,102,241,0.35)]"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
