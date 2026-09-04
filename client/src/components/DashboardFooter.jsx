import React from 'react';
import { Link } from 'react-router-dom';

const DashboardFooter = () => {
  return (
    <footer className="w-full bg-white dark:bg-[#0f0f0f] border-t border-neutral-200 dark:border-neutral-800/60 py-3 px-6 text-neutral-500 dark:text-neutral-400 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="text-[11px] tracking-wide text-neutral-500 dark:text-neutral-400">
          © {new Date().getFullYear()} <span className="font-light text-black dark:text-neutral-200 logofont tracking-wider select-none">Campus<span className="text-brand-600 dark:text-brand-500">Node</span></span>
        </p>

        <div className="flex items-center gap-x-5">
          <Link to='/Team' className="text-[11px] hover:text-black dark:hover:text-white font-medium transition-colors">
            Team
          </Link>
          <Link to="/contribute" className="text-[11px] hover:text-black dark:hover:text-white font-medium transition-colors">
            Contribute
          </Link>
          <Link to="/faq" className="text-[11px] hover:text-black dark:hover:text-white font-medium transition-colors">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
