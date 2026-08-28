import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ContactModal from './ContactModal';

const Footer = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="bg-[#fafafa] dark:bg-[#0c0c0c] border-t border-neutral-200 dark:border-neutral-800 py-4 px-6 hidden md:block transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 tracking-wide">
            © {new Date().getFullYear()} <span className="font-light text-black dark:text-neutral-100 logofont tracking-wider select-none">Campus<span className="text-orange-600 dark:text-orange-500">Node</span></span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {/* <button
              onClick={() => setIsContactOpen(true)}
              className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Contact / Feedback
            </button> */}
            <Link to='/Team' className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition-colors">
              Team
            </Link>
            <Link to="/contribute" className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition-colors">
              Contribute
            </Link>
            <Link to="/faq" className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>

      {/* Contact & Suggestion Modal */}
      <ContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </footer>
  );
};

export default Footer;
