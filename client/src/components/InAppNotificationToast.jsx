import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * InAppNotificationToast — High-visibility real-time in-app notification popup banner.
 *
 * Appears when a real-time notification arrives via Socket.io or Polling while the user is inside CampusNode.
 */
const InAppNotificationToast = ({ toast, onClose }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
    }
  }, [toast]);

  useEffect(() => {
    if (!toast || isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Auto-dismiss after 5.5 seconds
    timerRef.current = setTimeout(() => {
      handleClose();
    }, 5500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, isHovered]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleNavigate = () => {
    if (toast?.url) {
      try {
        navigate(toast.url);
      } catch (err) {
        window.location.href = toast.url;
      }
    }
    handleClose();
  };

  if (!toast) return null;

  return (
    <div
      className={`fixed z-50 bottom-5 right-5 left-5 sm:left-auto sm:w-[380px] transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm shrink-0">
              <i className="ri-notification-3-line" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {toast.sender?.clubName || toast.sender?.name || 'CampusNode'}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Notification Title */}
        <h4
          onClick={handleNavigate}
          className="text-sm font-bold text-black dark:text-white leading-snug mb-1 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2"
        >
          {toast.title}
        </h4>

        {/* Notification Message */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3 line-clamp-3 break-words">
          {toast.message}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
          <button
            onClick={handleNavigate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <span>View</span>
            <i className="ri-arrow-right-line text-xs" />
          </button>

          <span className="text-[10px] text-neutral-400 font-medium">
            Just now
          </span>
        </div>
      </div>
    </div>
  );
};

export default InAppNotificationToast;
