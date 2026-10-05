import React from "react";
import { Link, useLocation } from "react-router-dom";
import { HeadsetIcon, HelpCircle } from "lucide-react";

const FloatingSupportButton = () => {
  const location = useLocation();

  // Hide on the Contact page itself or during maintenance
  if (location.pathname === "/contact" || location.pathname === "/maintenance") {
    return null;
  }

  return (
    <Link
      to="/contact"
      aria-label="Contact Support & Report Bugs"
      className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 inline-flex items-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md hover:shadow-lg border border-neutral-700/60 dark:border-neutral-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 text-xs font-semibold select-none group px-2 py-2"
    >
      <HeadsetIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-300 dark:text-neutral-600 group-hover:text-white dark:group-hover:text-neutral-900 transition-colors shrink-0 " />
      {/* <span>Support</span> */}
    </Link>
  );
};

export default FloatingSupportButton;
