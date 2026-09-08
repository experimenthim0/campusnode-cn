import React, { useState, useEffect } from "react";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import DynamicSidebar from "./DynamicSidebar";
import DashboardFooter from "./DashboardFooter";
import InstallPwaBanner from "./InstallPwaBanner";
/**
 * Routes that activate the sidebar "dashboard" layout.
 * If the current pathname starts with any of these prefixes,
 * the sidebar will be rendered on desktop.
 */
const SIDEBAR_ROUTE_PREFIXES = [
  "/profile",
  "/my-events",
  "/club-events",
  "/payments",
  "/send-notification",
  "/club/edit",
  "/club/",       // catches /club/:clubId/team
  "/dashboard",
  "/create",
  "/events/edit",
  "/central-organizer",
  "/event-staff",
  "/event-calendar",
];

/**
 * Check if the given pathname should show the sidebar layout.
 */
const isSidebarRoute = (pathname) => {
  // Registration, attendance, and certificate management pages are event
  // dashboard pages too. Keep public event details outside this layout.
  if (/^\/event\/[^/]+\/(registrations|check-in|design-certificate)$/.test(pathname)) {
    return true;
  }

  // Exclude public club detail pages like /club/some-slug (no /edit or /team suffix)
  // but include /club/:id/team and /club/edit/:id
  if (pathname.startsWith("/club/")) {
    const subpath = pathname.slice("/club/".length);
    // Only activate sidebar for /club/:id/team or /club/edit/:id
    if (subpath.includes("/team") || pathname.startsWith("/club/edit")) {
      return true;
    }
    return false;
  }

  // Exclude /clubs (the public clubs listing page)
  if (pathname === "/clubs") return false;

  return SIDEBAR_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

/**
 * AppLayout — master container that conditionally renders the dashboard sidebar.
 *
 * When the current route is a management/dashboard route:
 *   - Desktop: Navbar on top → sidebar (left 256px) + scrollable main content (right)
 *   - Mobile:  Navbar on top → main content only, BottomNav at the bottom
 *
 * On all other routes:
 *   - Renders the standard public layout (Navbar + content + Footer + BottomNav)
 *
 * Auth redirect: unauthenticated users on sidebar routes are sent to /login.
 */
/**
 * Authentication and credential recovery routes where mobile BottomNav is suppressed.
 */
const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/otp",
  "/admin-secret-login",
];

const isAuthRoute = (pathname) => {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)
  );
};

const AppLayout = () => {
  const location = useLocation();
  const isDashboardRoute = isSidebarRoute(location.pathname);
  const isAuth = isAuthRoute(location.pathname);

  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const isShown = sessionStorage.getItem("whatsapp_channel_tooltip_shown");
    if (!isShown) {
      let closeTimer;
      const showTimer = setTimeout(() => {
        setShowTooltip(true);
        sessionStorage.setItem("whatsapp_channel_tooltip_shown", "true");

        // Autoclose after 5 seconds
        closeTimer = setTimeout(() => {
          setShowTooltip(false);
        }, 5000);
      }, 2500);

      return () => {
        clearTimeout(showTimer);
        if (closeTimer) clearTimeout(closeTimer);
      };
    }
  }, []);

  const { user, isAuthenticated } = useAuth();

  if (isDashboardRoute && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const layoutContent = isDashboardRoute ? (
    <div className="cn-app-height flex min-w-0 flex-col bg-cn-bg text-cn-text transition-colors duration-300">
      {/* Navbar — always pinned at top, full width */}
      <Navbar />

      {/* Dashboard body: sidebar + content */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Sidebar — desktop only (hidden below md) */}
        <DynamicSidebar user={user} />

        {/* Main content area — scrollable */}
        <main
          className="min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 relative"
          style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-top))" }}
        >
          <div className="min-h-full flex flex-col">
            <div className="flex-grow">
              <Outlet />
            </div>
            <DashboardFooter />
          </div>
        </main>
      </div>

      {/* BottomNav — mobile only (self-hides on md+, suppressed on auth routes) */}
    <BottomNav />
    </div>
  ) : (
    <div className={`cn-app-height flex min-w-0 flex-col bg-cn-bg text-cn-text ${isAuth ? '' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'} md:pb-0 transition-colors duration-300`}>
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <BottomNav />
    </div>
  );

  return (
    <>
      {layoutContent}

      <InstallPwaBanner />
    </>
  );
};

export default AppLayout;
