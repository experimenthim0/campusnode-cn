import React from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import DashboardFooter from "./DashboardFooter";

/**
 * AdminLayout — dedicated layout for admin routes.
 *
 * Renders a custom AdminNavbar + collapsible AdminSidebar + main content.
 * Completely separate from the public AppLayout — no public Navbar, Footer, or BottomNav.
 *
 * Auth gating is handled by <ProtectedRoute> in App.jsx.
 */
const AdminLayout = () => {

  return (
    <div className="cn-app-height flex min-w-0 flex-col bg-cn-bg text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Admin Navbar — always pinned at top, full width */}
      <AdminNavbar />

      {/* Dashboard body: sidebar + content */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Admin Sidebar — desktop only (hidden below md) */}
        <AdminSidebar />

        {/* Main content area — scrollable */}
        <main
          className="min-w-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] relative"
          style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top))" }}
        >
          <div className="min-h-full flex flex-col">
            <div className="flex-grow">
              <Outlet />
            </div>
            <DashboardFooter />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
