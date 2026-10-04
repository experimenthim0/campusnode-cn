import React from 'react';
import { Link } from 'react-router-dom';

const DashboardFooter = () => {
  return (
    <footer className="w-full bg-cn-surface border-t border-cn-border py-3 px-6 text-cn-text-muted mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 ">
          <span className='mt-1 text-lg'>© </span>
          <p className="text-[11px] tracking-wide text-cn-text-muted">
            {new Date().getFullYear()} <span className="font-light text-cn-text logofont tracking-wider select-none">Campusnode</span>
          </p>
        </div>


        <div className="flex items-center gap-x-5">
          {/* <Link to="/clubs/directory" className="text-[11px] hover:text-cn-text font-medium transition-colors">
            Club Directory
          </Link> */}
          <Link to='/Team' className="text-[11px] hover:text-cn-text font-medium transition-colors">
            Team
          </Link>
          <Link to="/contact" className="text-[11px] hover:text-cn-text font-medium transition-colors">
            Contact
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
