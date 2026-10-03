import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-cn-bg border-t border-cn-border py-4 px-6 hidden md:block transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-cn-text-muted tracking-wide">
            © {new Date().getFullYear()} <span className="font-light text-cn-text logofont tracking-wider select-none">Cam<span className="uppercase text-[8px] font-medium">P</span>usnode</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          
            <Link to='/Team' className="text-[11px] text-cn-text-secondary hover:text-cn-text font-medium transition-colors">
              Team
            </Link>
            <Link to="/contribute" className="text-[11px] text-cn-text-secondary hover:text-cn-text font-medium transition-colors">
              Contribute
            </Link>
           
            <Link to="/faq" className="text-[11px] text-cn-text-secondary hover:text-cn-text font-medium transition-colors">
              FAQ
            </Link>
              <Link to="/what-we-access" className="text-[11px] hover:text-brand-600 dark:hover:text-brand-400 font-semibold transition-colors text-neutral-400">
                        Access Telemetry
                      </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
