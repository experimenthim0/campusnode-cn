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

  const handleNotificationClick = async () => {
    setNotifDropdownOpen(!notifDropdownOpen);
    if (!notifDropdownOpen && unreadCount > 0) {
      try {
        await api.put("/api/notifications/read-all");
        setUnreadCount(0);
        setNotifications((prev) => prev.map(n => ({ ...n, readBy: [...(n.readBy || []), user._id || user.id] })));
      } catch (err) {
        console.error(err);
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
    `relative py-1 text-[14px] font-medium tracking-widest transition-all duration-300 group ${isActive(path)
      ? "text-orange-600 dark:text-orange-500"
      : "text-neutral-850 dark:text-neutral-200 hover:text-orange-600 dark:hover:text-orange-500"
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
        className={`sticky top-0 z-50 pt-[env(safe-area-inset-top)] bg-white/30 dark:bg-[#0a0a0a]/75 border-b border-transparent backdrop-blur-md transition-all duration-300 myfont  ${scrolled ? "shadow-sm border-neutral-100/80 dark:border-white/10" : ""
          }`}
      >
        {/* Orange top accent on scroll */}
        {/* {scrolled && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-600 z-10 pointer-events-none" />
        )} */}

        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4 rounded-full">
          <div className="flex items-center sm:gap-5 gap-auto">
            <img src="/nitjlogo.png" alt="NITJ Logo" className="w-11 h-12" />
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group logofont hidden sm:block "
            >
              <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none">
                Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
              </span>
            </Link>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group logofont sm:hidden block"
          >
            <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none">
              Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 ">
            <Link to="/" className={navLinkCls("/")}>
              Home
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-orange-600 dark:bg-orange-500 transform transition-transform duration-300 origin-left ${isActive("/") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link>
            <Link to="/clubs" className={navLinkCls("/clubs")}>
              Clubs
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-orange-600 dark:bg-orange-500 transform transition-transform duration-300 origin-left ${isActive("/clubs") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link>
            <Link to="/events" className={navLinkCls("/events")}>
              Events
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-orange-600 dark:bg-orange-500 transform transition-transform duration-300 origin-left ${isActive("/events") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link>
            <Link to="/lost-found" className={navLinkCls("/lost-found")}>
              L&F
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-orange-600 dark:bg-orange-500 transform transition-transform duration-300 origin-left ${isActive("/lost-found") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link>
            {/* <Link to="/team" className={navLinkCls("/team")}>
              Team
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-orange-600 transform transition-transform duration-300 origin-left ${isActive("/team") ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link> */}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800" />

            <button
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
              className="p-2 rounded-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer"
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <i className={`${searchOpen ? "ri-close-line" : "ri-search-line"} text-lg`} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => {
                document.documentElement.classList.add('dark-transition');
                toggleTheme();
                setTimeout(() => document.documentElement.classList.remove('dark-transition'), 400);
              }}
              className="p-2 rounded-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer"
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>

            {/* {isInstallable && (
              <button
                onClick={installApp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ml-1"
                title="Install CampusNode App"
              >
                <i className="ri-download-2-line text-sm" />
                <span>Install App</span>
              </button>
            )} */}

            {user ? (
              <>
                {(role === "member" || role === "facultyCoordinator" || role === "club" || role === "admin" || role === "student") && (
                  <div className="relative" ref={notifDropdownRef}>
                    <button
                      onClick={handleNotificationClick}
                      className="relative p-2 rounded-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer inline-flex items-center justify-center shrink-0"
                      aria-label="Notifications"
                    >
                      <BellIcon size={20} className="shrink-0" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white dark:border-[#0a0a0a]"></span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {notifDropdownOpen && (
                      <div className="absolute top-[calc(100%+10px)] right-0 w-80 max-h-96  overflow-y-auto bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-800  rounded-t-4xl rounded-sm z-50 mt-1 shadow-lg">
                        <div className="px-4 py-2 border-b-2 border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-100 dark:bg-neutral-950 sticky top-0 z-10">
                          <h3 className="text-[12px] font-black tracking-widest text-neutral-800 dark:text-neutral-200">Notifications</h3>
                          <Link
                            to="/notifications"
                            onClick={() => setNotifDropdownOpen(false)}
                            className="flex items-center gap-1 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors text-[12px]"
                          >
                            See All
                            <i className="ri-arrow-right-line text-base text-orange-600 dark:text-orange-500 transition-transform duration-200" />
                          </Link>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                          {notifications?.length > 0 ? (
                            notifications.slice(0, 4).map((notif, idx) => (
                              <Link
                                key={idx}
                                to={notif.type === 'TEAM_INVITATION' ? '/notifications' : notif.url || '/notifications'}
                                onClick={() => setNotifDropdownOpen(false)}
                                className={`block p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${!notif.readBy?.includes(user?._id || user?.id) ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] font-medium text-orange-600 dark:text-orange-500 tracking-widest">{notif.sender?.clubName || notif.sender?.name || "CampusNode"}</span>
                                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{formatDate(notif.createdAt)}</span>
                                </div>
                                <h4 className="text-[13px] font-bold text-black dark:text-neutral-100 mb-1">{notif.title}</h4>
                                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 line-clamp-2">{notif.message}</p>
                              </Link>
                            ))
                          ) : (
                            <div className="p-6 text-center text-neutral-500 dark:text-neutral-450 text-[12px] font-bold uppercase tracking-widest">
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
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm border-2 border-transparent text-neutral-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    <span className="text-[12px] font-bold text-black dark:text-neutral-200 max-w-[80px] truncate hidden lg:block">
                      {user.name?.split(" ")[0]}
                    </span>
                    <i
                      className={`ri-arrow-down-s-line text-base text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute top-[calc(100%+10px)] right-0 w-52 bg-white dark:bg-neutral-900 dark:border-neutral-800 rounded-sm z-50 overflow-hidden mt-2 shadow-lg"
                      role="menu"
                    >
                      <div className="px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                        <p className="text-[10px] font-bold tracking-widest text-neutral-400 dark:text-neutral-500 mb-0.5">
                          Logged in as
                        </p>
                        <p className="text-[14px] font-black text-black dark:text-neutral-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-[10px] tracking-widest text-orange-600 dark:text-orange-500 font-semibold mt-0.5">
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
                      <div className="py-1">
                        {(role === "admin" || role === "paymentAdmin") ? (
                          <Link
                            to="/admin-dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[12px] font-bold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            role="menuitem"
                          >
                            <LayoutDashboard size={18} className="text-neutral-500 dark:text-neutral-400" />
                            Admin Dashboard
                          </Link>
                        ) : (
                          <>
                            <Link
                              to={
                                role === "lostFoundAdmin"
                                  ? "/admin/lost-found"
                                  : "/profile"
                              }
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-black dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              role="menuitem"
                            >
                              <LayoutDashboard size={18} className="text-neutral-500 dark:text-neutral-400" />
                              Profile / Dashboard
                            </Link>

                            {(user?.accessLevel === "central_organizer" || role === "central_organizer" || user?.principalType === "INSTITUTIONAL") && (
                              <Link
                                to="/central-organizer"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                                role="menuitem"
                              >
                                <Shield size={18} />
                                Central Organizer
                              </Link>
                            )}
                          </>
                        )}
                      </div>

                      {/* Divider + logout */}
                      <div className="border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          role="menuitem"
                        >
                          {/* <i className="ri-logout-box-r-line" /> */}
                          <LogoutIcon size={18} >
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
                  className="relative py-1 pl-3 text-[13px] font-bold tracking-widest text-black dark:text-neutral-200 group transition-colors hover:text-orange-600 dark:hover:text-orange-500"
                >
                  Login
                  <span className="absolute ml-2 bottom-0 left-0 w-full h-[2px] bg-orange-600 dark:bg-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link
                  to="/register/student"
                  className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white text-[13px] font-bold tracking-widest rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 transition-all duration-150 hover:-translate-y-px"
                >
                  <ArrowRightIcon size={18}>
                    <p className="font-semibold">
                      Register
                    </p>
                  </ArrowRightIcon>
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
              className="relative px-1 rounded-sm text-neutral-700 dark:text-neutral-300 transition-colors duration-150 cursor-pointer"
              aria-label="Search"
            >
              <i className={`${searchOpen ? 'ri-close-line' : 'ri-search-line'} text-[20px]`} />
            </button>

            {user ? (
              (role === "member" || role === "facultyCoordinator" || role === "club" || role === "admin" || role === "student") && (
                <div className="relative" ref={notifMobileDropdownRef}>
                  <button
                    onClick={() => {
                      handleNotificationClick();
                      setSearchOpen(false);
                    }}
                    className="relative py-1.5  text-neutral-700 dark:text-neutral-300  transition-colors duration-150 cursor-pointer inline-flex items-center justify-center "
                    aria-label="Notifications"
                  >
                    <BellIcon size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white dark:border-[#0a0a0a]"></span>
                    )}
                  </button>

                  {/* Mobile Notification Dropdown */}
                  {notifDropdownOpen && (
                    <div className="fixed top-16 left-5 right-5 max-h-96 overflow-y-auto bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-800 rounded-t-4xl rounded-sm z-50 shadow-lg">
                      <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-100 dark:bg-neutral-950 sticky top-0 z-10">
                        <h3 className="text-[14px] font-black tracking-widest text-black dark:text-neutral-200">Notifications</h3>
                        <Link
                          to="/notifications"
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            setMobileOpen(false);
                          }}
                          className="text-xs font-medium tracking-widest text-orange-600 dark:text-orange-500 
                        hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                        >
                          See all
                          <i className="ri-arrow-right-line text-sm text-orange-600 dark:text-orange-500 transition-transform duration-200" />
                        </Link>
                      </div>
                      <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                        {notifications?.length > 0 ? (
                          notifications.slice(0, 4).map((notif, idx) => (
                            <div key={idx} className={`p-4 transition-colors ${!notif.readBy?.includes(user?._id || user?.id) ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-medium text-orange-600 dark:text-orange-500 tracking-widest">{notif.sender?.clubName || "CampusNode"}</span>
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{formatDate(notif.createdAt)} </span>
                              </div>
                              <h4 className="text-[13px] font-bold text-black dark:text-neutral-100 mb-1">{notif.title}</h4>
                              <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{notif.message}</p>
                            </div>
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
                className="p-2 rounded-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer"
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
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

      <div
        className={`search-overlay ${searchOpen ? 'search-overlay-visible' : ''}`}
        onClick={() => setSearchOpen(false)}
      />
    </>
  );
};

export default Navbar;
