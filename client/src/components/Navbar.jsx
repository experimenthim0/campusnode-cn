import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { BellIcon } from "./ui/bell";
import { UserIcon } from "./ui/user";
import { CalendarDaysIcon } from "./ui/calendar-days";
import { IndianRupeeIcon } from "./ui/indian-rupee";
import { SettingsIcon } from "./ui/settings";
import { ConciergeBellIcon } from "./ui/concierge-bell";
import { LogoutIcon } from "./ui/logout";
import { CalendarCogIcon } from "./ui/calendar-cog";
import { LayoutGridIcon } from "./ui/layout-grid";
import LogInIcon from "./ui/login";
import { LayoutDashboard, Shield } from "lucide-react";
import SearchBar from "./SearchBar";
import { ArrowRightIcon } from "./ui/arrow-right";
import { usePwaInstall } from "../hooks/usePwaInstall";
import DesktopPWAControls from "./DesktopPWAControls";
import api from "../services/api";


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

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { isInstallable, installApp } = usePwaInstall();
  const { user, role, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { notifications, unreadCount, setUnreadCount, setNotifications } = useSocket() || {};
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef(null);
  const notifMobileDropdownRef = useRef(null);

  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target) &&
        (!notifMobileDropdownRef.current || !notifMobileDropdownRef.current.contains(e.target))
      ) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = () => {
    setNotifDropdownOpen((prev) => !prev);
  };

  const handleMarkAllNotificationsRead = async (e) => {
    if (e) e.stopPropagation();
    if (unreadCount <= 0) return;
    try {
      await api.put("/api/notifications/read-all");
      if (setUnreadCount) setUnreadCount(0);
      const userId = user?._id || user?.id;
      if (setNotifications && userId) {
        setNotifications((prev) =>
          (prev || []).map((n) => ({
            ...n,
            readBy: [...(n.readBy || []), userId],
          }))
        );
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationItemClick = async (notif) => {
    setNotifDropdownOpen(false);
    setMobileOpen?.(false);
    const userId = user?._id || user?.id;
    const notifId = notif.id || notif._id;
    if (userId && notifId && !notif.readBy?.includes(userId)) {
      try {
        await api.put(`/api/notifications/${notifId}/read`);
        if (setNotifications) {
          setNotifications((prev) =>
            (prev || []).map((n) =>
              n.id === notifId || n._id === notifId
                ? { ...n, readBy: [...(n.readBy || []), userId] }
                : n
            )
          );
        }
        if (setUnreadCount) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout('/');
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const navLinkCls = (path) =>
    `relative px-3.5 py-1.5 text-[13.5px] font-semibold tracking-wide rounded-full transition-all duration-200 group flex items-center justify-center ${isActive(path)
      ? "text-cn-blue-600 dark:text-cn-blue-400 font-bold bg-cn-blue-50 dark:bg-cn-blue-950/40 shadow-2xs"
      : "text-cn-text-secondary hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:bg-cn-surface-muted"
    }`;


  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const day = date.getDate();

    const month = date.toLocaleString('default', { month: 'short' });

    const year = date.getFullYear();

    const time = date.toLocaleString('default', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${time}, ${day} ${month} ${year} `;
  };


  return (
    <>
      <nav
        className={`sticky top-0 z-50 pt-[env(safe-area-inset-top)] bg-cn-bg/40 border-b border-cn-border-subtle backdrop-blur-xl transition-all duration-300 myfont ${scrolled ? "shadow-xs border-cn-border-subtle bg-cn-bg/80" : ""
          }`}
      >


        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center sm:gap-5 gap-auto">
            <DesktopPWAControls />
            <img src="/nitjlogo.png" alt="NITJ Logo" className="w-11 h-12" />
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group logofont hidden sm:block"
            >
              <span className="font-light text-[24px] tracking-wider text-black uppercase  dark:text-neutral-200 leading-none select-none group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                Campusnode
              </span>
            </Link>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group logofont sm:hidden block"
          >
            <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none">
              Campusnode
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <Link to="/" className={navLinkCls("/")}>
              Home
              <span className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-cn-blue-600 dark:bg-cn-blue-400 rounded-full transform transition-all duration-200 origin-center ${isActive("/") ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-75"}`} />
            </Link>
            <Link to="/clubs" className={navLinkCls("/clubs")}>
              Clubs
              <span className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-cn-blue-600 dark:bg-cn-blue-400 rounded-full transform transition-all duration-200 origin-center ${isActive("/clubs") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:opacity-75"}`} />
            </Link>
            <Link to="/events" className={navLinkCls("/events")}>
              Events
              <span className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-cn-blue-600 dark:bg-cn-blue-400 rounded-full transform transition-all duration-200 origin-center ${isActive("/events") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:opacity-75"}`} />
            </Link>
            {/* <Link to="/team" className={navLinkCls("/team")}>
              Team
              <span className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-brand-600 transform transition-all duration-200 origin-center ${isActive("/team") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link> */}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

            <button
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-2 xl:px-3 xl:py-1.5 rounded-full text-cn-text-secondary hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:bg-cn-surface-muted border border-transparent hover:border-cn-border transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs group"
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <i className={`${searchOpen ? "ri-close-line text-cn-blue-600" : "ri-search-line group-hover:scale-110"} text-base transition-transform duration-200`} />
              <span className="hidden xl:inline-block text-[10px] font-bold uppercase tracking-wider text-cn-text-muted group-hover:text-cn-text bg-cn-surface-muted px-1.5 py-0.5 rounded border border-cn-border">⌘K</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => {
                document.documentElement.classList.add('dark-transition');
                toggleTheme();
                setTimeout(() => document.documentElement.classList.remove('dark-transition'), 400);
              }}
              className="p-2 rounded-full text-cn-text-secondary hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:bg-cn-surface-muted border border-transparent hover:border-cn-border transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs hover:rotate-12"
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>

            {user ? (
              <>
                {(role === "member" || role === "facultyCoordinator" || role === "club" || role === "admin" || role === "student" || role === "central_organizer" || user?.principalType === "INSTITUTIONAL" || role === "external" || role === "lostFoundAdmin" || role === "paymentAdmin") && (
                  <div className="relative" ref={notifDropdownRef}>
                    <button
                      onClick={handleNotificationClick}
                      className="relative p-2 rounded-full text-cn-text-secondary hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:bg-cn-surface-muted border border-transparent hover:border-cn-border transition-all duration-200 cursor-pointer inline-flex items-center justify-center shrink-0 active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs group"
                      aria-label="Notifications"
                    >
                      <BellIcon size={19} className="shrink-0 group-hover:scale-105 transition-transform duration-200" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-cn-blue-500 rounded-full border-2 border-cn-bg"></span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {notifDropdownOpen && (
                      <div className="absolute top-[calc(100%+12px)] right-0 w-80 max-h-96 overflow-y-auto bg-cn-surface/95 backdrop-blur-xl border border-cn-border rounded-2xl z-50 shadow-2xl overflow-hidden animate-in fade-in duration-200">
                        <div className="px-4 py-3 border-b border-cn-border flex justify-between items-center bg-cn-surface-muted/80 backdrop-blur-md sticky top-0 z-10">
                          <h3 className="text-xs font-black uppercase tracking-wider text-cn-text">Notifications</h3>
                          <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={handleMarkAllNotificationsRead}
                                className="text-[11px] font-bold text-cn-text-muted hover:text-cn-text transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                              >
                                Mark all read
                              </button>
                            )}
                            <Link
                              to="/notifications"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="inline-flex items-center gap-1 text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation text-xs font-bold uppercase tracking-wider group"
                            >
                              See All
                              <i className="ri-arrow-right-line text-sm text-cn-blue-600 dark:text-cn-blue-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                            </Link>
                          </div>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                          {notifications?.length > 0 ? (
                            notifications.slice(0, 4).map((notif, idx) => (
                              <Link
                                key={notif.id || notif._id || idx}
                                to={notif.type === 'TEAM_INVITATION' || notif.type === 'TEAM_RESPONSE' || Boolean(notif.teamId) ? '/notifications' : notif.url || '/notifications'}
                                onClick={() => handleNotificationItemClick(notif)}
                                className={`block p-3.5 transition-all duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${!notif.readBy?.includes(user?._id || user?.id) ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'bg-transparent'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-500 uppercase tracking-wider truncate max-w-[170px]">
                                    {notif.type === 'TEAM_INVITATION' || notif.type === 'TEAM_RESPONSE' || Boolean(notif.teamId)
                                      ? 'CampusNode'
                                      : (notif.sender?.clubName || notif.sender?.name || 'CampusNode')}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap ml-2">{formatDate(notif.createdAt)}</span>
                                </div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-0.5 line-clamp-1">{notif.title}</h4>
                                <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                              </Link>
                            ))
                          ) : (
                            <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 text-xs font-bold uppercase tracking-wider">
                              No notifications yet
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* Avatar dropdown ── */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-300 hover:border-brand-500/50 hover:bg-brand-50/30 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-white transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group active:scale-95 hover:-translate-y-0.5 touch-manipulation"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    {/* <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                      {initials}
                    </span> */}
                    <img
                      src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=facc15&color=0f172a&bold=true&size=32`}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover shrink-0 shadow-sm border-2 border-white dark:border-neutral-900 group-hover:border-brand-500/40 transition-colors duration-200"
                    />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 max-w-[90px] truncate hidden lg:block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {user.name?.split(" ")[0]}
                    </span>
                    <i
                      className={`ri-arrow-down-s-line text-sm text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute top-[calc(100%+12px)] right-0 w-56 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl z-50 overflow-hidden shadow-2xl p-1.5 animate-in fade-in duration-200"
                      role="menu"
                    >
                      <div className="px-3 py-2.5 mb-1 rounded-xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-100 dark:border-neutral-800/80">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          Logged in as
                        </p>
                        <p className="text-xs font-black text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
                          {user.name}
                        </p>
                        <p className="text-[10px] tracking-wide text-brand-600 dark:text-brand-400 font-semibold truncate mt-0.5">
                          {user?.memberships?.some(m => m.role === "CLUB_HEAD")
                            ? "Student • Student Lead"
                            : user?.memberships?.some(m => m.role === "COORDINATOR")
                              ? "Student • Coordinator"
                              : role === "club"
                                ? (user?.rollNo ? "Student • Student Lead" : "Club Account")
                                : role === "facultyCoordinator"
                                  ? "Faculty Coordinator"
                                  : (role === "central_organizer" || user?.principalType === "INSTITUTIONAL")
                                    ? "Central Event Organiser"
                                    : role === "admin"
                                      ? "Admin"
                                      : role === "lostFoundAdmin"
                                        ? "L&F Admin"
                                        : "Student"}
                        </p>
                      </div>

                      {/* Menu items */}
                      <div className="space-y-0.5">
                        {(role === "admin" || role === "paymentAdmin") ? (
                          <Link
                            to="/admin-dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-150 hover:-translate-y-0.5 active:scale-95 touch-manipulation group"
                            role="menuitem"
                          >
                            <LayoutDashboard size={16} className="text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                            Admin Dashboard
                          </Link>
                        ) : (
                            <Link
                              to="/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-150 hover:-translate-y-0.5 active:scale-95 touch-manipulation group"
                              role="menuitem"
                            >
                              <LayoutDashboard size={16} className="text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                              Profile / Dashboard
                            </Link>
                        )}
                      </div>

                      {/* Divider + logout */}
                      <div className="mt-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 transition-all duration-150 cursor-pointer group hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                          role="menuitem"
                        >
                          <LogoutIcon size={16} className="text-red-500 group-hover:translate-x-0.5 transition-transform duration-150">
                            Logout
                          </LogoutIcon>

                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs sm:text-[13px] font-bold tracking-wider text-cn-text hover:text-cn-blue-600 dark:hover:text-cn-blue-400 rounded-full hover:bg-cn-surface-muted border border-transparent hover:border-cn-border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 touch-manipulation hover:shadow-xs"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-4 py-2 bg-cn-blue-600 hover:bg-cn-blue-700 text-white border-2 border-cn-blue-600 hover:border-cn-blue-700 text-[13px] font-bold tracking-widest rounded-full transition-all duration-200 shadow-sm shadow-cn-blue-500/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
                >
                  <span>Register</span>
                  <i className="ri-arrow-right-line text-xs" />
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setNotifDropdownOpen(false);
              }}
              className="relative p-2 rounded-full text-cn-text-secondary hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:bg-cn-surface-muted border border-transparent hover:border-cn-border transition-all duration-200 cursor-pointer inline-flex items-center justify-center shrink-0 active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs"
              aria-label="Search"
            >
              <i className={`${searchOpen ? 'ri-close-line text-cn-blue-600' : 'ri-search-line'} text-[19px]`} />
            </button>

            {user ? (
              (role === "member" || role === "facultyCoordinator" || role === "club" || role === "admin" || role === "student" || role === "central_organizer" || user?.principalType === "INSTITUTIONAL" || role === "external" || role === "lostFoundAdmin" || role === "paymentAdmin") && (
                <div className="relative" ref={notifMobileDropdownRef}>
                  <button
                    onClick={() => {
                      handleNotificationClick();
                      setSearchOpen(false);
                    }}
                    className="relative p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/70 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 transition-all duration-200 cursor-pointer inline-flex items-center justify-center shrink-0 active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs group"
                    aria-label="Notifications"
                  >
                    <BellIcon size={19} className="shrink-0 group-hover:scale-105 transition-transform duration-200" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-600 rounded-full border-2 border-cn-bg"></span>
                    )}
                  </button>

                  {/* Mobile Notification Dropdown */}
                  {notifDropdownOpen && (
                    <div className="fixed top-16 left-5 right-5 max-h-96 overflow-y-auto bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-800 rounded-t-4xl rounded-sm z-50 shadow-lg">
                      <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-100 dark:bg-neutral-950 sticky top-0 z-10">
                        <h3 className="text-[14px] font-black tracking-widest text-black dark:text-neutral-200">Notifications</h3>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllNotificationsRead}
                              className="text-xs font-medium tracking-widest text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                            >
                              Mark read
                            </button>
                          )}
                          <Link
                            to="/notifications"
                            onClick={() => {
                              setNotifDropdownOpen(false);
                              setMobileOpen(false);
                            }}
                            className="text-xs font-medium tracking-widest text-brand-600 dark:text-brand-500 
                          hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                          >
                            See all
                            <i className="ri-arrow-right-line text-sm text-brand-600 dark:text-brand-500 transition-transform duration-200" />
                          </Link>
                        </div>
                      </div>
                      <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                        {notifications?.length > 0 ? (
                          notifications.slice(0, 4).map((notif, idx) => (
                            <Link
                              key={notif.id || notif._id || idx}
                              to={notif.type === 'TEAM_INVITATION' || notif.type === 'TEAM_RESPONSE' || Boolean(notif.teamId) ? '/notifications' : notif.url || '/notifications'}
                              onClick={() => handleNotificationItemClick(notif)}
                              className={`block p-4 transition-colors ${!notif.readBy?.includes(user?._id || user?.id) ? 'bg-brand-50 dark:bg-brand-500/10' : 'bg-transparent'}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-medium text-brand-600 dark:text-brand-500 tracking-widest">
                                  {notif.type === 'TEAM_INVITATION' || notif.type === 'TEAM_RESPONSE' || Boolean(notif.teamId)
                                    ? 'CampusNode'
                                    : (notif.sender?.clubName || notif.sender?.name || 'CampusNode')}
                                </span>
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{formatDate(notif.createdAt)} </span>
                              </div>
                              <h4 className="text-[13px] font-bold text-black dark:text-neutral-100 mb-1">{notif.title}</h4>
                              <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{notif.message}</p>
                            </Link>
                          ))
                        ) : (
                          <div className="p-6 text-center text-neutral-500 dark:text-neutral-450 text-[12px] font-bold tracking-widest">
                            No notifications yet
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )
            ) : (
              <button
                onClick={() => {
                  document.documentElement.classList.add('dark-transition');
                  toggleTheme();
                  setTimeout(() => document.documentElement.classList.remove('dark-transition'), 400);
                }}
                className="p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/70 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-0.5 touch-manipulation hover:shadow-xs shrink-0"
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                )}
              </button>
            )}

            {/* Hamburger (Removed for BottomNav PWA style) */}
          </div>

        </div>

      </nav>

      <SearchBar
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
};

export default Navbar;
