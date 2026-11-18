import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { HeadsetIcon, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FloatingSupportButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isShrunk, setIsShrunk] = useState(false);
  const shrinkTimerRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  // Initial load: show bubble early, then shrink to a simple dot after 10 seconds
  useEffect(() => {
    // Show speech bubble at 2.5s to introduce support
    bubbleTimerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 2500);

    // Auto-close bubble and shrink into simple dot after 10 seconds
    shrinkTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsShrunk(true);
    }, 10000);

    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // When cursor comes near or hovers over the button / dot: expand to full size
  const handleMouseEnter = () => {
    if (shrinkTimerRef.current) {
      clearTimeout(shrinkTimerRef.current);
      shrinkTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsShrunk(false);
    setIsOpen(true);
  };

  // When cursor leaves: close bubble quickly and shrink back to dot after brief buffer
  const handleMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);

    if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
    shrinkTimerRef.current = setTimeout(() => {
      setIsShrunk(true);
      setIsOpen(false);
    }, 3500);
  };

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setIsOpen(false);
  };

  // Hide on the Contact page itself or during maintenance
  if (location.pathname === "/contact" || location.pathname === "/maintenance") {
    return null;
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 flex flex-col items-end pointer-events-none"
    >
      {/* Speech Bubble / Popup Message */}
      <AnimatePresence>
        {!isShrunk && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="mb-2.5 pointer-events-auto"
          >
            <div className="relative group/bubble bg-white dark:bg-[#151F30] text-neutral-900 dark:text-neutral-100 rounded-2xl p-2.5 sm:p-3 pr-2 shadow-lg shadow-black/10 dark:shadow-black/50 border border-neutral-200/90 dark:border-white/10 backdrop-blur-md max-w-[210px] sm:max-w-[235px] transition-all duration-200">
              <Link
                to="/contact"
                className="flex items-start gap-2 text-left select-none"
                aria-label="Need help or have feedback? Contact support"
              >
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[11.5px] sm:text-[12.5px] font-medium text-neutral-900 dark:text-white leading-tight">
                    Need help or have feedback?
                  </p>
                  <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1 font-normal group-hover/bubble:text-brand-600 dark:group-hover/bubble:text-brand-400 transition-colors">
                    <span>We'd love to hear from you</span>
                    <ArrowRight className="w-3 h-3 group-hover/bubble:translate-x-0.5 transition-transform" />
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss message"
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors -mt-1 -mr-1 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Link>

              {/* Speech bubble pointer arrow */}
              <div 
                className="absolute -bottom-1.5 right-3.5 sm:right-4 w-2.5 h-2.5 bg-white dark:bg-[#151F30] border-b border-r border-neutral-200/90 dark:border-white/10 rotate-45 pointer-events-none" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proximity wrapper & Floating Support Button */}
      <div
        className="pointer-events-auto p-2.5 -m-2.5 flex items-center justify-center cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to="/contact"
          aria-label={isShrunk ? "Support & feedback (hover to expand)" : "Contact Support & Share Feedback"}
          className="relative inline-flex items-center justify-center select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <AnimatePresence mode="wait">
            {isShrunk ? (
              /* Shrunk Dot State: Simple, clean, static dot (no blinking, no animations) */
              <motion.div
                key="dot"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative flex items-center justify-center w-6 h-6"
              >
                <span className="w-3 h-3 rounded-full bg-brand-600 dark:bg-brand-500 ring-2 ring-white dark:ring-[#151F30] shadow-sm" />
              </motion.div>
            ) : (
              /* Full Size Button - 10% smaller */
              <motion.div
                key="button"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md shadow-black/15 dark:shadow-black/40 border border-neutral-700/60 dark:border-neutral-200/80 hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <HeadsetIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110" />
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </div>
  );
};

export default FloatingSupportButton;