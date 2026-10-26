import React from "react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const AdminNavbar = () => {
  const { user: admin, logout } = useAuth();

  const handleLogout = () => {
    logout('/admin-secret-login');
  };

  const handleVisitWebsite = () => {
    window.open("/", "_blank");
  };

  return (
    <nav className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] bg-cn-surface border-b border-cn-border">
      <div className="max-w-full mx-auto px-5 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/nitjlogo.png" alt="NITJ Logo" className="w-9 h-10" />
          <span className="text-[22px] tracking-wider text-cn-text leading-none select-none logofont">
            Campusnode
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-cn-surface-muted text-cn-text-muted text-[10px] font-medium uppercase tracking-[0.15em] rounded-md">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Visit Website */}
          <button
            onClick={handleVisitWebsite}
            className="flex items-center gap-1.5 px-3 py-1.5 text-nav text-cn-text-secondary rounded-lg hover:bg-cn-surface-muted hover:text-cn-text transition-all duration-150 cursor-pointer"
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
          <ThemeToggle size="sm" />

          <div className="w-px h-5 bg-cn-border" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-nav text-cn-text-secondary rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/20 hover:text-danger-600 dark:hover:text-danger-400 transition-all duration-150 cursor-pointer"
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
