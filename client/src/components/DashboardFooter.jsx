import React from 'react';
import { Link } from 'react-router-dom';

const DashboardFooter = () => {
  return (
    <footer className="w-full bg-cn-surface border-t border-cn-border py-3 px-6 text-cn-text-muted mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="text-[11px] tracking-wide text-cn-text-muted">
          © {new Date().getFullYear()} <span className="font-light text-cn-text logofont tracking-wider select-none">Campus<span className="text-brand-600 dark:text-brand-500">Node</span></span>
        </p>

        <div className="flex items-center gap-x-5">
          <Link to='/Team' className="text-[11px] hover:text-cn-text font-medium transition-colors">
            Team
          </Link>
          <Link to="/contribute" className="text-[11px] hover:text-cn-text font-medium transition-colors">
            Contribute
          </Link>
          <Link to="/faq" className="text-[11px] hover:text-cn-text font-medium transition-colors">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
