import React from 'react';

const Maintainance = () => {
  return (
    <div className="flex items-center justify-center min-h-screen flex-col bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 p-6 transition-colors selection:bg-brand-500 selection:text-white">
      <div className="text-center max-w-lg flex flex-col items-center">
        {/* 3D Construction Machine Image */}
        <div className="relative mb-6">
          <img
            src="/construction-machine.png"
            alt="CampusNode Under Maintenance"
            className="w-64 sm:w-80 md:w-96 max-w-full h-auto object-contain drop-shadow-xl select-none pointer-events-none"
            loading="eager"
          />
        </div>

        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
          </span>
          <span>System Upgrade in Progress</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
          Under Construction
        </h1>

        {/* Themed Message without time */}
        <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base font-medium leading-relaxed max-w-lg">
          Campus<span className="text-brand-600 dark:text-brand-500 font-bold">Node</span> is currently undergoing scheduled improvements. We’re upgrading our servers and tuning features to give you a smoother campus experience.
        </p>

      
      </div>
    </div>
  );
};

export default Maintainance;