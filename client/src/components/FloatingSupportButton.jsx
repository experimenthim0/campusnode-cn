import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { HeadsetIcon, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FloatingSupportButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const autoCloseTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  // Wait 5 to 6 seconds after page load before showing popup, then auto-close
  useEffect(() => {
    const showDelayTimer = setTimeout(() => {
      setIsOpen(true);

      // Auto-close after 5 seconds once shown
      autoCloseTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 5000);
    }, 5500);

    return () => {
      clearTimeout(showDelayTimer);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // When hovering on the button or bubble, open and keep it open
  const handleMouseEnter = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsOpen(true);
  };

  // When cursor leaves the button or bubble, close after a brief buffer
  const handleMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="mb-3 pointer-events-auto"
          >
            <div className="relative group/bubble bg-white dark:bg-[#101930] text-neutral-900 dark:text-neutral-100 rounded-2xl p-3 sm:p-3.5 pr-2.5 shadow-xl shadow-black/10 dark:shadow-black/50 border border-neutral-200/90 dark:border-white/10 backdrop-blur-md max-w-[230px] sm:max-w-[260px] transition-all duration-200">
              <Link
                to="/contact"
                className="flex items-start gap-2.5 text-left select-none"
                aria-label="Need help or have feedback? Contact support"
              >
              
               

                <div className="flex-1 min-w-0 pr-1">
               
                  <p className="text-[12px] sm:text-[13px] font-medium text-neutral-900 dark:text-white leading-tight">
                    Need help or have feedback?
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1 font-normal group-hover/bubble:text-cn-blue-600 dark:group-hover/bubble:text-cn-blue-400 transition-colors">
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

              {/* Speech bubble pointer arrow pointing down towards the circular button */}
              <div 
                className="absolute -bottom-1.5 right-4 sm:right-5 w-3 h-3 bg-white dark:bg-[#101930] border-b border-r border-neutral-200/90 dark:border-white/10 rotate-45 pointer-events-none" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Circular Support Button */}
      <Link
        to="/contact"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Contact Support & Share Feedback"
        className="pointer-events-auto relative inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg shadow-black/15 dark:shadow-black/40 border border-neutral-700/60 dark:border-neutral-200/80 hover:scale-105 active:scale-95 transition-all duration-200 select-none group"
      >
        <HeadsetIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-110" />

      
        
      </Link>
    </div>
  );
};

export default FloatingSupportButton;
