import React, { useEffect, useState } from 'react';

const NotificationPopup = ({ message, type = 'info', onClose, duration = 3000 }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!duration) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  // Standardized modern color palette and subtle icons
  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: <i className="ri-checkbox-circle-fill text-emerald-500 text-lg" />,
          progress: 'bg-emerald-500',
        };
      case 'error':
        return {
          icon: <i className="ri-error-warning-fill text-rose-500 text-lg" />,
          progress: 'bg-rose-500',
        };
      case 'warning':
        return {
          icon: <i className="ri-alert-fill text-amber-500 text-lg" />,
          progress: 'bg-amber-500',
        };
      default:
        return {
          icon: <i className="ri-information-fill text-blue-500 text-lg" />,
          progress: 'bg-blue-500',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed top-20 sm:top-auto sm:bottom-5 right-4 sm:right-5 z-[9999] max-w-[calc(100vw-2rem)] sm:max-w-sm w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl overflow-hidden shadow-lg dark:shadow-2xl transition-all duration-300 animate-slide-in-right">
      <div className="p-2 flex items-center gap-3 justify-center">
        {/* Modern Icon instead of harsh text badge */}
        <div className="flex-shrink-0 mt-0.5">
          {theme.icon}
        </div>
        
        {/* Clean, standard typography */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-normal break-words">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose} 
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer p-0.5 rounded "
          aria-label="Dismiss notification"
        >
          <i className="ri-close-line text-lg" />
        </button>
      </div>

      {/* Modern, sleek Progress Bar */}
      {duration && (
        <div className="w-full h-[2px] bg-neutral-100 dark:bg-neutral-800">
          <div 
            className={`h-full ${theme.progress} transition-all duration-300 ease-out`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.21, 1.02, 0.43, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default NotificationPopup;