import React, { useState, useEffect } from 'react';
import { Download, X, TabletSmartphone } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

/**
 * InstallPwaBanner
 * Sleek bottom floating banner prompting user to install CampusNode as a native app.
 */
export const InstallPwaBanner = () => {
  const { isInstallable, installApp, isInstalled } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (isDismissed) setDismissed(true);
    } catch (e) {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch (e) {}
  };

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-100 dark:bg-neutral-900/95 text-black dark:text-white p-4 rounded-2xl shadow-2xl border border-neutral-300 dark:border-neutral-800 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl  flex items-center justify-center shrink-0 text-brand-500">
            <TabletSmartphone size={24} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-black dark:text-white truncate">Install CampusNode</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Add to home screen for fast offline access</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installApp}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaBanner;
