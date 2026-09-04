import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const AdminNavbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user: admin, logout } = useAuth();

  const handleLogout = () => {
    logout('/admin-secret-login');
  };

  const handleVisitWebsite = () => {
    window.open("/", "_blank");
  };

  return (
    <nav className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] bg-white dark:bg-[#0a0a0a] border-b border-neutral-100 dark:border-neutral-800/80 myfont">
      <div className="max-w-full mx-auto px-5 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/nitjlogo.png" alt="NITJ Logo" className="w-9 h-10" />
          <span className="font-light text-[22px] tracking-wider text-black dark:text-neutral-200 leading-none select-none logofont">
            Campus<span className="text-brand-600 dark:text-brand-500">Node</span>
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Visit Website */}
          <button
            onClick={handleVisitWebsite}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-all duration-150 cursor-pointer"
            title="Open website in new tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="hidden sm:inline">Website</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => {
              document.documentElement.classList.add('dark-transition');
              toggleTheme();
              setTimeout(() => document.documentElement.classList.remove('dark-transition'), 400);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-colors duration-150 cursor-pointer"
            aria-label="Toggle dark mode"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>

          <div className="w-px h-5 bg-neutral-100 dark:bg-neutral-800" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 cursor-pointer"
            title="Secure Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
