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
import { hasPermission, PERMISSIONS, isStudentLeadRole, isClubManagementRole } from "../utils/rbac";

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
    { label: "Clubs", icon: Users, path: "/clubs" },
    { label: "Events", icon: Calendar, path: "/events" },
    // 
  ];

  if (user && (role === "admin" || role === "paymentAdmin")) {
    navItems.push({
      label: "Admin",
      icon: ShieldCheck,
      path: "/admin-dashboard",
    });
  }

  navItems.push(
    user
      ? { label: "Profile", icon: User, action: () => setDrawerOpen(true), isActiveCheck: drawerOpen }
      : { label: "Login", icon: LogInIcon, path: "/login" }
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full cn-safe-bottom bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-cn-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2 mysans">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = item.isActiveCheck !== undefined ? item.isActiveCheck : isActive(item.path);

            const content = (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-1 relative pt-1">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-600 rounded-b-md transition-all duration-300" />
                )}
                <div
                  className={`p-1.5 rounded-full transition-transform duration-300 ${
                    active ? "scale-110 text-brand-600 dark:bg-brand-950/40" : "text-cn-text-muted hover:text-cn-blue-600 dark:hover:text-cn-blue-400"
                  }`}
                >
                  <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span
                  className={`text-[10px] tracking-wide transition-all duration-300 ${
                    active
                      ? "font-bold text-black"
                      : "font-medium text-cn-text-muted"
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
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
              drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div
            ref={drawerRef}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#121212] rounded-t-2xl shadow-xl border-t border-cn-border transition-transform duration-300 ease-in-out md:hidden pb-[env(safe-area-inset-bottom)] max-h-[85dvh] flex flex-col ${
              drawerOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* Drawer Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1.5" onClick={() => setDrawerOpen(false)}>
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-neutral-400 mb-0.5">Logged in as</p>
                <p className="text-base font-black text-black dark:text-white">{user.name}</p>
                <p className="text-[11px] tracking-widest text-brand-600 dark:text-brand-500 font-bold mt-0.5">
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

            <div className="overflow-y-auto px-2 py-1 space-y-0.5">
              <Link to="/profile" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                  <User size={16} />
                </div>
                My Profile
              </Link>

              {/* My Events (Visible for all students, leads & coordinators; hidden for pure official club accounts) */}
              {(!(!user?.rollNo && role === "club") && Boolean(user?.rollNo || user?.branch || user?.expectedGraduationYear || user?.academicYear || user?.year || role === "student" || role === "member" || (user?.memberships && user.memberships.length > 0))) && (
                <Link to="/my-events" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                   <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                     <CalendarDaysIcon size={16} />
                   </div>
                   My Events
                </Link>
              )}



              {!user?.rollNo && role === "club" && (
                <Link to="/event-calendar" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                    <CalendarCogIcon size={16} />
                  </div>
                  Event Schedule
                </Link>
              )}

              {(role === "admin" || role === "paymentAdmin") && (
                <Link
                  to="/admin-dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  Admin Dashboard
                </Link>
              )}

              {(role === "club" || (user?.memberships && user.memberships.length > 0) || role === "facultyCoordinator") && (
                <div className="mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Management
                  </p>

                  {(!user?.rollNo && role === "club") && (user?.clubId || user?.id) && (
                    <div className="space-y-0.5">
                      <Link
                        to={`/club-events/${user.clubId || user.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <CalendarCogIcon size={16} />
                        </div>
                        Club Events
                      </Link>
                      <Link
                        to={`/club/${user.clubId || user.id}/team`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <User size={16} />
                        </div>
                        Team Management
                      </Link>
                      <Link
                        to="/payments"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                          <IndianRupeeIcon size={16} />
                        </div>
                        Payments
                      </Link>
                      <Link
                        to={user.clubId || user.id ? `/send-notification?clubId=${user.clubId || user.id}` : "/send-notification"}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                          <ConciergeBellIcon size={16} />
                        </div>
                        Broadcasts
                      </Link>
                      <Link
                        to={`/club/edit/${user.clubId || user.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                          <LayoutGridIcon size={16} />
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
                                    <div className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                                    <span className="truncate text-neutral-900 dark:text-neutral-100 font-bold text-xs">
                                      {m.clubName || "Club"}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold shrink-0">
                                      {isLead ? "Lead" : isCoord ? "Coord" : "Member"}
                                    </span>
                                  </div>
                                  <ChevronDown
                                    size={14}
                                    className={`text-neutral-400 transition-transform duration-200 shrink-0 ${
                                      isOpen ? "rotate-180 text-brand-600 dark:text-brand-400" : ""
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

                                    {(isStudentLeadRole(m.role) || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId })) && (
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
                                          to={`/send-notification?clubId=${m.clubId}`}
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
                    const isLead = isStudentLeadRole(m.role);
                    const canManageClub = isClubManagementRole(m.role);

                    return (
                      <div key={m.clubId} className="space-y-0.5 mb-1.5 last:mb-0">
                        <p className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                          {m.clubName || "Club"}
                        </p>

                        <Link to={`/club-events/${m.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                            <CalendarCogIcon size={16} />
                          </div>
                          Club Events
                        </Link>

                        {/* Team Management - For student lead or with club.manage_members permission */}
                        {(isLead || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId })) && (
                          <Link to={`/club/${m.clubId}/team`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                              <User size={16} />
                            </div>
                            Team Management
                          </Link>
                        )}

                        {/* Payments, Broadcasts & Settings - For both Student Lead and Coordinator */}
                        {canManageClub && (
                          <>
                            <Link to="/payments" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                                <IndianRupeeIcon size={16} />
                              </div>
                              Payments
                            </Link>
                            <Link to={`/send-notification?clubId=${m.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                                <ConciergeBellIcon size={16} />
                              </div>
                              Broadcasts
                            </Link>
                            <Link to={`/club/edit/${m.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                              <div className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-neutral-200 shrink-0">
                                <LayoutGridIcon size={16} />
                              </div>
                              Club Settings
                            </Link>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {role === "facultyCoordinator" && user.clubId && (!user.memberships || !user.memberships.find((m) => m.clubId === user.clubId)) && (
                    <div className="space-y-0.5 mb-2">
                      <p className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        Faculty Review
                      </p>
                      <Link to="/my-events" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <CalendarCogIcon size={16} />
                        </div>
                        Review Events
                      </Link>
                      <Link to={`/club/${user.clubId}/team`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <User size={16} />
                        </div>
                        Team Management
                      </Link>
                      <Link to={`/club/edit/${user.clubId}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-black dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <LayoutGridIcon size={16} />
                        </div>
                        Club Settings
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212]">
              <div className="rounded-2xl mb-1.5">
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-neutral-200/80 dark:bg-[#181818] border border-neutral-300/40 dark:border-neutral-800/80 p-1">

                  {/* Light */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex flex-row items-center justify-center gap-1.5 rounded-lg py-1 transition-all duration-200 cursor-pointer select-none ${
                      theme === "light"
                        ? "theme-toggle-active font-semibold shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-300/50 dark:hover:bg-neutral-800/70"
                    }`}
                  >
                    <Sun size={17} strokeWidth={2.2} />
                    <span className="text-xs font-semibold">Light</span>
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex flex-row items-center justify-center gap-1.5 rounded-lg py-1 transition-all duration-200 cursor-pointer select-none ${
                      theme === "dark"
                        ? "theme-toggle-active font-semibold shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-300/50 dark:hover:bg-neutral-800/70"
                    }`}
                  >
                    <Moon size={17} strokeWidth={2.2} />
                    <span className="text-xs font-semibold">Dark</span>
                  </button>

                  {/* Auto */}
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`flex flex-row items-center justify-center gap-1.5 rounded-lg py-1 transition-all duration-200 cursor-pointer select-none ${
                      theme === "system" || !theme
                        ? "theme-toggle-active font-semibold shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-300/50 dark:hover:bg-neutral-800/70"
                    }`}
                  >
                    <Monitor size={17} strokeWidth={2.2} />
                    <span className="text-xs font-semibold">Auto</span>
                  </button>

                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                <LogoutIcon size={18} />
                Logout
              </button>
              <span className="text-center text-[10px] text-neutral-500 font-medium mt-2 block select-none">
                <span className="logofont tracking-wider font-light text-[18px] text-black dark:text-neutral-200">CampusNode</span>
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
