import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Calendar, User, Shield, ShieldCheck, X, Sun, Moon, Package, Monitor, Download, Smartphone, ChevronDown } from "lucide-react";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { CalendarDaysIcon } from "./ui/calendar-days";
import { IndianRupeeIcon } from "./ui/indian-rupee";
import { ConciergeBellIcon } from "./ui/concierge-bell";
import { LogoutIcon } from "./ui/logout";
import { CalendarCogIcon } from "./ui/calendar-cog";
import { LayoutGridIcon } from "./ui/layout-grid";
import LogInIcon from "./ui/login";
import { hasPermission, PERMISSIONS } from "../utils/rbac";

const LostFoundIcon = ({ size = 24, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 14 14" 
    height={size} 
    width={size} 
    {...props}
  >
    <g id="lost-and-found">
      <path 
        fill="currentColor" 
        fillRule="evenodd" 
        d="M5.763 2.263A1.75 1.75 0 0 1 8.75 3.5h-3.5c0 -0.464 0.184 -0.91 0.513 -1.237ZM3.75 3.5a3.25 3.25 0 0 1 6.5 0h1.25A2.5 2.5 0 0 1 14 6v5.5a2.5 2.5 0 0 1 -2.5 2.5h-9A2.5 2.5 0 0 1 0 11.5V6a2.5 2.5 0 0 1 2.5 -2.5h1.25Zm2.915 3.067A0.875 0.875 0 1 1 7 8.25a0.625 0.625 0 0 0 -0.625 0.625v1a0.625 0.625 0 1 0 1.25 0v-0.469a2.125 2.125 0 1 0 -2.75 -2.031 0.625 0.625 0 1 0 1.25 0 0.875 0.875 0 0 1 0.54 -0.808Zm0.337 6.308a0.75 0.75 0 1 1 0 -1.5 0.75 0.75 0 0 1 0 1.5Z" 
        clipRule="evenodd" 
      />
    </g>
  </svg>
);

const BottomNav = () => {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openClubId, setOpenClubId] = useState(null);
  const drawerRef = useRef(null);
  const { isInstallable, installApp } = usePwaInstall();
 const {
  theme,
  setTheme,
  isDark,
} = useTheme();

  const { user, role, logout } = useAuth();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Click-outside to close drawer
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false);
      }
    };
    if (drawerOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const handleLogout = () => {
    logout('/');
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: "Home", icon: Home, path: "/" },
    // { label: "Clubs", icon: Users, path: "/clubs" },
    { label: "Events", icon: Calendar, path: "/events" },
    { label: "L&F", icon: LostFoundIcon, path: "/lost-found" },
  ];

  if (user && (role === "admin" || role === "paymentAdmin")) {
    navItems.push({
      label: "Admin",
      icon: ShieldCheck,
      path: "/admin-dashboard",
    });
  } else if (user && role === "lostFoundAdmin") {
    navItems.push({
      label: "Admin",
      icon: ShieldCheck,
      path: "/admin/lost-found",
    });
  }

  navItems.push(
    user
      ? { label: "Profile", icon: User, action: () => setDrawerOpen(true), isActiveCheck: drawerOpen }
      : { label: "Login", icon: LogInIcon, path: "/login" }
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full cn-safe-bottom bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-t border-gray-200 dark:border-neutral-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = item.isActiveCheck !== undefined ? item.isActiveCheck : isActive(item.path);

            const content = (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-1 relative pt-1">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-600 rounded-b-md transition-all duration-300" />
                )}
                <div
                  className={`p-1.5 rounded-full transition-transform duration-300 ${
                    active ? "scale-110 text-orange-600 bg-orange-50 dark:bg-orange-950/40" : "text-neutral-500 hover:text-orange-500"
                  }`}
                >
                  <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                    active ? "text-orange-600 dark:text-orange-500" : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );

            if (item.action) {
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex-1 flex justify-center items-center h-full focus:outline-none"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={index}
                to={item.path}
                className="flex-1 flex justify-center items-center h-full focus:outline-none"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-up Drawer for Profile */}
      {user && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
              drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div
            ref={drawerRef}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-xl border-t border-gray-200 dark:border-neutral-800 transition-transform duration-300 ease-in-out md:hidden pb-[env(safe-area-inset-bottom)] max-h-[85dvh] flex flex-col ${
              drawerOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* Drawer Handle */}
            <div className="w-full flex justify-center pt-3 pb-2" onClick={() => setDrawerOpen(false)}>
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-neutral-400 mb-0.5">Logged in as</p>
                <p className="text-base font-black text-black dark:text-white">{user.name}</p>
                <p className="text-[11px] tracking-widest text-orange-600 dark:text-orange-500 font-bold mt-0.5">
                  {Boolean(user?.rollNo || user?.branch || user?.expectedGraduationYear || user?.academicYear || user?.year || role === 'student' || role === 'member')
                    ? user?.memberships?.some(m => m.role === "CLUB_HEAD")
                      ? "Student • Student Lead"
                      : user?.memberships?.some(m => m.role === "COORDINATOR")
                      ? "Student • Coordinator"
                      : "Student"
                    : role === "club"
                    ? "Club Account"
                    : role === "facultyCoordinator"
                    ? "Faculty Coordinator"
                    : role === "admin"
                    ? "Admin"
                    : role === "lostFoundAdmin"
                    ? "L&F Admin"
                    : "Student"}
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-neutral-500 hover:text-black dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-2 py-1 flex-1">
              <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <User size={18} />
                </div>
                My Profile
              </Link>

              {/* My Events (Visible for all students, leads & coordinators; hidden for pure official club accounts) */}
              {(!(!user?.rollNo && role === "club") && Boolean(user?.rollNo || user?.branch || user?.expectedGraduationYear || user?.academicYear || user?.year || role === "student" || role === "member" || (user?.memberships && user.memberships.length > 0))) && (
                <Link to="/my-events" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                   <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                     <CalendarDaysIcon size={18} />
                   </div>
                   My Events
                </Link>
              )}
              {role === "lostFoundAdmin" && (
                <Link to="/admin/lost-found" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                   <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600">
                     <LostFoundIcon size={18} />
                   </div>
                   Moderation Panel
                </Link>
              )}

              {(user?.accessLevel === "central_organizer" || role === "central_organizer") && (
                <Link
                  to="/central-organizer"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Shield size={18} />
                  </div>
                  Central Organizer Portal
                </Link>
              )}

              <Link
                to="/event-staff"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                  <ShieldCheck size={18} />
                </div>
                Event Staff Portal
              </Link>

              {!user?.rollNo && role === "club" && (
                <Link to="/event-calendar" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    <CalendarCogIcon size={18} />
                  </div>
                  Event Schedule
                </Link>
              )}

              {(role === "admin" || role === "paymentAdmin") && (
                <Link
                  to="/admin-dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600">
                    <ShieldCheck size={18} />
                  </div>
                  Admin Dashboard
                </Link>
              )}

              {(role === "club" || (user?.memberships && user.memberships.length > 0) || role === "facultyCoordinator") && (
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="px-4 py-2 text-[12px] font-bold tracking-widest text-neutral-500 dark:text-neutral-400">
                    Management
                  </p>

                  {(!user?.rollNo && role === "club") && (user?.clubId || user?.id) && (
                    <div className="mb-2">
                      <Link
                        to={`/club-events/${user.clubId || user.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                          <CalendarCogIcon size={18} />
                        </div>
                        Club Events
                      </Link>
                      <Link
                        to={`/club/${user.clubId || user.id}/team`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                          <User size={18} />
                        </div>
                        Team Management
                      </Link>
                      <Link
                        to="/payments"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                          <IndianRupeeIcon size={18} />
                        </div>
                        Payments
                      </Link>
                      <Link
                        to="/send-notification"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                          <ConciergeBellIcon size={18} />
                        </div>
                        Notifications & Broadcasts
                      </Link>
                      <Link
                        to={`/club/edit/${user.clubId || user.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                          <LayoutGridIcon size={18} />
                        </div>
                        Club Settings
                      </Link>
                    </div>
                  )}

                  {(Boolean(user?.rollNo) || role !== "club") && (() => {
                    const eligibleMemberships = (user?.memberships || []).filter((m) => {
                      const isLead = m.role === "CLUB_HEAD";
                      const isCoord = m.role === "COORDINATOR";
                      const canManageClub = isLead || isCoord;
                      const hasOps = canManageClub || m.canEditEvents || m.canCheckRegistration || m.canTakeAttendance || m.permissions?.canEditEvents || m.permissions?.canCheckRegistration || m.permissions?.canTakeAttendance;
                      return hasOps;
                    });

                    if (eligibleMemberships.length === 0) return null;

                    // If 2 or more clubs, collapse each into an accordion dropdown to keep drawer compact
                    if (eligibleMemberships.length >= 2) {
                      return (
                        <div className="space-y-2 mb-2">
                          {eligibleMemberships.map((m) => {
                            const isLead = m.role === "CLUB_HEAD";
                            const isCoord = m.role === "COORDINATOR";
                            const canManageClub = isLead || isCoord;
                            const isCurrentClubActive = location.pathname.includes(m.clubId);
                            const isOpen = openClubId === m.clubId || (openClubId === null && isCurrentClubActive);

                            return (
                              <div
                                key={m.clubId}
                                className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-800/20"
                              >
                                <button
                                  type="button"
                                  onClick={() => setOpenClubId(isOpen ? "" : m.clubId)}
                                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-orange-600 shrink-0" />
                                    <span className="truncate text-neutral-900 dark:text-neutral-100 font-bold text-xs">
                                      {m.clubName || "Club"}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-semibold shrink-0">
                                      {isLead ? "Lead" : isCoord ? "Coord" : "Member"}
                                    </span>
                                  </div>
                                  <ChevronDown
                                    size={14}
                                    className={`text-neutral-400 transition-transform duration-200 shrink-0 ${
                                      isOpen ? "rotate-180 text-orange-600 dark:text-orange-400" : ""
                                    }`}
                                  />
                                </button>

                                {isOpen && (
                                  <div className="p-1 space-y-0.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/80">
                                    <Link
                                      to={`/club-events/${m.clubId}`}
                                      onClick={() => setDrawerOpen(false)}
                                      className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                    >
                                      <CalendarCogIcon size={16} className="text-neutral-500" />
                                      Club Events
                                    </Link>

                                    {hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId }) && (
                                      <Link
                                        to={`/club/${m.clubId}/team`}
                                        onClick={() => setDrawerOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                      >
                                        <User size={16} className="text-neutral-500" />
                                        Team Management
                                      </Link>
                                    )}

                                    {canManageClub && (
                                      <>
                                        <Link
                                          to="/payments"
                                          onClick={() => setDrawerOpen(false)}
                                          className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                        >
                                          <IndianRupeeIcon size={16} className="text-neutral-500" />
                                          Payments
                                        </Link>
                                        <Link
                                          to="/send-notification"
                                          onClick={() => setDrawerOpen(false)}
                                          className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                        >
                                          <ConciergeBellIcon size={16} className="text-neutral-500" />
                                          Notifications
                                        </Link>
                                        <Link
                                          to={`/club/edit/${m.clubId}`}
                                          onClick={() => setDrawerOpen(false)}
                                          className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                        >
                                          <LayoutGridIcon size={16} className="text-neutral-500" />
                                          Club Settings
                                        </Link>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // Exactly 1 club: render flatly without dropdown
                    const m = eligibleMemberships[0];
                    const isLead = m.role === "CLUB_HEAD";
                    const isCoord = m.role === "COORDINATOR";
                    const canManageClub = isLead || isCoord;

                    return (
                      <div key={m.clubId} className="mb-2 last:mb-0">
                        <p className="px-4 py-1.5 text-[11px] font-bold tracking-widest text-orange-600 mb-2">
                          {m.clubName || "Club"}
                        </p>

                        <Link to={`/club-events/${m.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                            <CalendarCogIcon size={18} />
                          </div>
                          Club Events
                        </Link>

                        {/* Team Management - Only for users with club.manage_members permission */}
                        {hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId }) && (
                          <Link to={`/club/${m.clubId}/team`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                              <User size={18} />
                            </div>
                            Team Management
                          </Link>
                        )}

                        {/* Payments, Broadcasts & Settings - For both Student Lead and Coordinator */}
                        {canManageClub && (
                          <>
                            <Link to="/payments" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                                <IndianRupeeIcon size={18} />
                              </div>
                              Payments
                            </Link>
                            <Link to="/send-notification" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                                <ConciergeBellIcon size={18} />
                              </div>
                              Notifications
                            </Link>
                            <Link to={`/club/edit/${m.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200">
                                <LayoutGridIcon size={18} />
                              </div>
                              Club Settings
                            </Link>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {role === "facultyCoordinator" && user.clubId && (!user.memberships || !user.memberships.find((m) => m.clubId === user.clubId)) && (
                    <div className="mb-4">
                      <p className="px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-orange-600 bg-orange-50/50 dark:bg-orange-950/20 mb-2">
                        Faculty Review
                      </p>
                      <Link to="/my-events" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                          <CalendarCogIcon size={18} />
                        </div>
                        Review Events
                      </Link>
                      <Link to={`/club/${user.clubId}/team`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                          <User size={18} />
                        </div>
                        Team Management
                      </Link>
                      <Link to={`/club/edit/${user.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                          <LayoutGridIcon size={18} />
                        </div>
                        Club Settings
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
             
             <div className="rounded-2xl mb-2">
  
  <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 p-1">

    {/* Light */}
    <button
      onClick={() => setTheme("light")}
      className={`flex flex-row items-center justify-center gap-1 rounded-lg py-1.5 transition-all duration-200 ${
        theme === "light"
          ? "bg-black dark:bg-white text-white dark:text-black shadow-xs font-semibold"
          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      <Sun size={18} strokeWidth={2} />
      <span className="text-xs font-medium">Light</span>
    </button>

    {/* Dark */}
    <button
      onClick={() => setTheme("dark")}
      className={`flex flex-row items-center justify-center gap-1 rounded-lg py-1.5 transition-all duration-200 ${
        theme === "dark"
          ? "bg-black dark:bg-white text-white dark:text-black shadow-xs font-semibold"
          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      <Moon size={18} strokeWidth={2} />
      <span className="text-xs font-medium">Dark</span>
    </button>

    {/* Auto */}
    <button
      onClick={() => setTheme("system")}
      className={`flex flex-row items-center justify-center gap-1 rounded-lg py-1.5 transition-all duration-200 ${
        theme === "system"
          ? "bg-black dark:bg-white text-white dark:text-black shadow-xs font-semibold"
          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      <Monitor size={18} strokeWidth={2} />
      <span className="text-xs font-medium">Auto</span>
    </button>

  </div>
</div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                <LogoutIcon size={18} />
                Logout
              </button>
              <span className="text-center text-[10px] text-neutral-500 font-medium mt-2 block select-none">
                <span className="logofont tracking-wider font-light text-[18px] text-black dark:text-neutral-200">Campus<span className="text-orange-600 dark:text-orange-500">Node</span></span>
                <span className="block mt-0.5 text-[9px] text-neutral-400">Developed By Team Xplore</span>
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomNav;
