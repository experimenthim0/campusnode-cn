import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import DashboardFooter from "./DashboardFooter";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";
import {
  Laptop,
  Smartphone,
  LogOut,
  ExternalLink,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";

/**
 * AdminLayout — dedicated layout for admin routes.
 *
 * Renders a custom AdminNavbar + collapsible AdminSidebar + main content for desktop.
 * On mobile / smaller screens (< 768px), restricts access and displays a friendly notice
 * with a direct Logout button.
 */
const AdminLayout = () => {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout("/admin-secret-login");
  };

  const handleToggleTheme = () => {
    document.documentElement.classList.add("dark-transition");
    toggleTheme();
    setTimeout(() => document.documentElement.classList.remove("dark-transition"), 400);
  };

  return (
    <div className="cn-app-height flex min-w-0 flex-col bg-cn-bg text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* ========================================================= */}
      {/* 1. MOBILE / SMALL SCREEN RESTRICTION VIEW (< 768px)       */}
      {/* ========================================================= */}
      <div className="md:hidden flex flex-col justify-between min-h-[100dvh] w-full p-5 sm:p-6 bg-gradient-to-b from-neutral-50 via-white to-neutral-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        {/* Top Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <img src="/nitjlogo.png" alt="NITJ Logo" className="w-8 h-9 shrink-0" />
            <span className="font-light text-[20px] tracking-wider text-black dark:text-white leading-none select-none logofont">
              Cam<span className="uppercase">P</span>usnode
            </span>
            <span className="px-2 py-0.5 bg-neutral-200/70 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-[9px] font-bold uppercase tracking-wider rounded-md shrink-0">
              Admin
            </span>
          </div>

          <button
            onClick={handleToggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle dark mode"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 shrink-0 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 shrink-0 text-neutral-700" />
            )}
          </button>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-sm mx-auto my-auto py-6 flex flex-col items-center text-center">
          {/* Badge Illustration */}
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10">
              <Laptop className="w-10 h-10 shrink-0" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900">
              <Smartphone className="w-4 h-4 shrink-0" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-3">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Desktop Display Required</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2 leading-snug">
            Sorry, this page is not designed for smaller screens
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
            The Admin Control Panel is designed for desktop and laptop displays to manage analytics, clubs, events, and approvals. Please access this portal from a computer.
          </p>

          {/* User Session Info */}
          {user && (
            <div className="w-full p-3 mb-6 rounded-xl bg-white dark:bg-zinc-900/80 border border-neutral-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between text-left gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">
                  Signed In As
                </p>
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {user?.name || "Administrator"}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {user?.email || (role === "paymentAdmin" ? "payment@admin.system" : "admin@college.edu")}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 uppercase">
                {role === "paymentAdmin" ? "Finance" : "Admin"}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-2.5">
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              className="w-full h-11 text-xs font-semibold rounded-xl gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Log Out
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="w-full h-10 text-xs font-medium rounded-xl gap-2 cursor-pointer border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Return to Website
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-neutral-400 dark:text-neutral-600">
          CampusNode Security & Administration
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP DASHBOARD VIEW (>= 768px)                      */}
      {/* ========================================================= */}
      <div className="hidden md:flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Admin Navbar — always pinned at top, full width */}
        <AdminNavbar />

        {/* Dashboard body: sidebar + content */}
        <div className="flex min-w-0 flex-1 overflow-hidden">
          {/* Admin Sidebar — desktop only */}
          <AdminSidebar />

          {/* Main content area — scrollable */}
          <main
            className="min-w-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] relative"
            style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top))" }}
          >
            <div className="min-h-full flex flex-col">
              <div className="flex-grow">
                {!isMobile && <Outlet />}
              </div>
              <DashboardFooter />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
