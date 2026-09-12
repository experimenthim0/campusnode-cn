import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User,
  CalendarDays,
  Users,
  Wallet,
  Bell,
  LayoutGrid,
  Package,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Shield,
  ShieldCheck,
  Plus,
  Radio,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { hasPermission, PERMISSIONS, isStudentLeadRole } from "../utils/rbac";
import { useSocket } from "../context/SocketContext";

/**
 * Returns a human-readable role label for display.
 */
const getRoleLabel = (role, user) => {
  const isFaculty = Boolean(
    role === "facultyCoordinator" ||
    user?.role === "facultyCoordinator" ||
    user?.principalType === "FACULTY" ||
    user?.memberships?.some(m => m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || m.role === "FACULTY")
  );
  if (isFaculty) return "Faculty Coordinator";

  const isExternal = Boolean(
    role === 'external' ||
    user?.role === 'external' ||
    user?.isExternal ||
    localStorage.getItem('role') === 'external'
  );
  if (isExternal) return 'External Participant';

  const isStudent = Boolean(user?.rollNo || user?.branch || user?.expectedGraduationYear || user?.academicYear || user?.year || role === 'student' || role === 'member');
  if (isStudent) {
    if (user?.memberships?.some(m => m.role === 'CLUB_HEAD')) return 'Student • Student Lead';
    if (user?.memberships?.some(m => m.role === 'COORDINATOR')) return 'Student • Coordinator';
    return 'Student';
  }
  const labels = {
    member: "Student",
    student: "Student",
    external: "External Participant",
    facultyCoordinator: "Faculty Coordinator",
    admin: "Administrator",
    paymentAdmin: "Payment Admin",
    lostFoundAdmin: "L&F Moderator",
    central_organizer: "Central Event Organiser",
    INSTITUTIONAL: "Central Event Organiser",
  };
  return labels[role] || "User";
};

/**
 * Sidebar direct nav link component.
 */
const SidebarLink = ({ to, icon: Icon, label, isActive, isCollapsed, badge }) => (
  <Link
    to={to}
    title={isCollapsed ? label : undefined}
    className={`group flex items-center rounded-xl text-[13px] transition-all duration-200 relative ${isCollapsed
        ? "w-10 h-10 mx-auto justify-center p-0"
        : "w-full gap-3 px-3 py-1.5"
      } ${isActive
        ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold border-0"
        : "text-slate-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white font-medium"
      }`}
  >
    <div className="relative shrink-0 flex items-center justify-center">
      <Icon
        size={17}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`w-[17px] h-[17px] min-w-[17px] min-h-[17px] shrink-0 transition-colors duration-200 ${isActive
            ? "text-brand-600 dark:text-brand-400"
            : "text-slate-600 dark:text-slate-400 group-hover:text-black dark:group-hover:text-white"
          }`}
      />
      {isCollapsed && badge && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-zinc-900" />
      )}
    </div>
    {!isCollapsed && <span className="truncate">{label}</span>}
    {!isCollapsed && badge && (
      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-black rounded-full bg-brand-500 text-white leading-none">
        {badge}
      </span>
    )}
    {!isCollapsed && !badge && isActive && (
      <ChevronRight size={14} className="w-3.5 h-3.5 min-w-[12px] min-h-[12px] ml-auto text-brand-600 shrink-0" />
    )}
  </Link>
);

/**
 * Collapsible Dropdown Component for grouped navigation (e.g. Broadcasts & Notifications / Club Hub).
 */
const SidebarDropdown = ({ icon: Icon, label, items, isCollapsed }) => {
  const location = useLocation();

  const isAnyChildActive = items.some((item) => {
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  });

  const [isOpen, setIsOpen] = useState(isAnyChildActive);

  React.useEffect(() => {
    if (isAnyChildActive) setIsOpen(true);
  }, [isAnyChildActive]);

  if (isCollapsed) {
    return (
      <SidebarLink
        to={items[0]?.to || "#"}
        icon={Icon}
        label={label}
        isActive={isAnyChildActive}
        isCollapsed={true}
      />
    );
  }

  return (
    <div className="my-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer ${isAnyChildActive
            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
            : "text-slate-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white font-medium"
          }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            size={19}
            strokeWidth={isAnyChildActive ? 2.2 : 1.8}
            className={`w-[19px] h-[19px] min-w-[19px] min-h-[19px] shrink-0 transition-colors duration-200 ${isAnyChildActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-600 dark:text-slate-400"
              }`}
          />
          <span className="text-[13px] tracking-wide truncate">{label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`w-3.5 h-3.5 min-w-[14px] min-h-[14px] shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-600 dark:text-brand-400" : ""
            }`}
        />
      </button>

      {/* Submenu links */}
      {isOpen && (
        <div className="pl-4 pt-1 pb-1 space-y-1 border-l-2 border-brand-500/20 dark:border-zinc-800 ml-4 my-1">
          {items.map((item, idx) => {
            const isTabAnnouncement = item.to.includes("tab=announcements");
            const isCurrentAnnouncement = location.search.includes("tab=announcements");

            let isActive = false;
            if (isTabAnnouncement) {
              isActive = location.pathname === "/send-notification" && isCurrentAnnouncement;
            } else if (item.to === "/send-notification") {
              isActive = location.pathname === "/send-notification" && !isCurrentAnnouncement;
            } else {
              isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            }

            return (
              <Link
                key={idx}
                to={item.to}
                className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${isActive
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-white"
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${isActive ? "bg-brand-500" : "bg-neutral-300 dark:bg-zinc-700"
                    }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Section header label inside the sidebar.
 */
const SectionLabel = ({ children, isCollapsed }) => {
  if (isCollapsed) return <hr className="border-gray-200 dark:border-zinc-800 my-3 mx-2" />;
  return (
    <p className="px-3 mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-400">
      {children}
    </p>
  );
};

/**
 * Club name sub-header inside the Management section.
 */
const ClubHeader = ({ name, isCollapsed }) => {
  if (isCollapsed) return null;
  return (
    <p className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-white dark:bg-zinc-900 rounded-md">
      {name}
    </p>
  );
};

const DynamicSidebar = ({ user }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const location = useLocation();
  const role = localStorage.getItem("role");
  const { unreadCount = 0 } = useSocket() || {};
  const isFacultyCoordinator = Boolean(
    role === "facultyCoordinator" ||
    user?.role === "facultyCoordinator" ||
    user?.principalType === "FACULTY" ||
    user?.memberships?.some(
      (m) => m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || m.role === "FACULTY"
    )
  );

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", String(newVal));
  };

  const userClubId = user?.clubId || user?.clubSlug || user?.memberships?.[0]?.clubId;

  // Detect active club context from current URL pathname
  const matchClubEvents = location.pathname.match(/\/club-events\/([a-zA-Z0-9_-]+)/);
  const matchClub = location.pathname.match(/\/club\/(?:edit\/|team\/)?([a-zA-Z0-9_-]+)/);
  const activeRouteClubId = matchClubEvents?.[1] || matchClub?.[1];

  const eligibleCreateClubs = (user?.memberships || []).filter(
    (m) => m.role === "CLUB_HEAD" || m.role === "COORDINATOR" || m.canEditEvents
  );

  let createEventUrl = "/create";
  if (activeRouteClubId) {
    createEventUrl = `/create?clubId=${activeRouteClubId}`;
  } else if (eligibleCreateClubs.length === 1) {
    createEventUrl = `/create?clubId=${eligibleCreateClubs[0].clubId}`;
  }

  // Assigned clubs for faculty coordinator
  const facultyClubs = [];
  if (user?.clubId) {
    facultyClubs.push({ clubId: user.clubId, clubName: user.clubName || "Assigned Club" });
  }
  (user?.memberships || []).forEach((m) => {
    if ((m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || isFacultyCoordinator) && !facultyClubs.some((c) => c.clubId === m.clubId)) {
      facultyClubs.push({ clubId: m.clubId, clubName: m.clubName || m.club?.name || "Assigned Club" });
    }
  });
  if (facultyClubs.length === 0 && isFacultyCoordinator && userClubId) {
    facultyClubs.push({ clubId: userClubId, clubName: "Assigned Club" });
  }

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-cn-surface text-cn-text border-r border-cn-border transition-all duration-300 overflow-y-auto ${isCollapsed ? "w-16" : "w-64"}`}
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-top))" }}
      aria-label="Dashboard sidebar"
    >
      <div className="px-3 py-4 border-b border-cn-border shrink-0">
        <div className={`flex items-center justify-between ${isCollapsed ? "flex-col gap-3 items-center" : "px-1"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full overflow-hidden text-black dark:text-white bg-gray-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0 select-none border border-neutral-200 dark:border-zinc-800">
              {(user?.profileImage || user?.picture || user?.clubLogo) ? (
                <img
                  src={user.profileImage || user.picture || user.clubLogo}
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-brand-400 font-semibold tracking-wide">
                  {getRoleLabel(role, user)}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors border-0 outline-none shrink-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} className="w-4 h-4 min-w-[16px] min-h-[16px] shrink-0" />
            ) : (
              <ChevronLeft size={16} className="w-4 h-4 min-w-[16px] min-h-[16px] shrink-0" />
            )}
          </button>
        </div>
      </div>

      {!isFacultyCoordinator && user?.memberships?.some(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR" || m.canEditEvents) &&
        hasPermission(user, PERMISSIONS.EVENT_CREATE) && (
        <div className={`pt-2 pb-2 shrink-0 ${isCollapsed ? "px-2 flex justify-center" : "px-4"}`}>
          <Link
            to={createEventUrl}
            title={isCollapsed ? "Create Event" : undefined}
            className={`flex items-center justify-center bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black shadow-sm hover:shadow-md hover:-translate-y-px transition-all font-bold text-[12px] uppercase tracking-wider cursor-pointer border-0 outline-none ${isCollapsed ? "w-10 h-10 p-0 rounded-xl" : "w-full gap-2.5 px-3 py-3 rounded-full"
              }`}
          >
            <Plus size={18} strokeWidth={2.8} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] shrink-0" />
            {!isCollapsed && <span>Create Event</span>}
          </Link>
        </div>
      )}

      <nav className={`flex-1 py-3 space-y-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-3"}`} aria-label="Dashboard navigation">

        <SectionLabel isCollapsed={isCollapsed}>General</SectionLabel>
        <SidebarLink to="/profile" icon={User} label="Profile" isActive={isActive("/profile")} isCollapsed={isCollapsed} />
        <SidebarLink
          to="/notifications"
          icon={Bell}
          label="Notifications"
          badge={unreadCount > 0 ? unreadCount : null}
          isActive={isActive("/notifications")}
          isCollapsed={isCollapsed}
        />

        {role !== "admin" && (Boolean(isFacultyCoordinator || user?.rollNo || user?.branch || user?.expectedGraduationYear || user?.academicYear || user?.year || user?.collegeName || role === "student" || role === "member" || role === "external" || user?.role === "external" || user?.isExternal || (user?.memberships && user.memberships.length > 0))) && (
          <SidebarLink to="/my-events" icon={CalendarDays} label="My Events" isActive={isActive("/my-events")} isCollapsed={isCollapsed} />
        )}

        {((isFacultyCoordinator && facultyClubs.length > 0) || (!isFacultyCoordinator && (user?.memberships && user.memberships.length > 0))) && (
          <>
            <SectionLabel isCollapsed={isCollapsed}>Management</SectionLabel>

            {/* Faculty Coordinator: only Club Events and Team Management */}
            {isFacultyCoordinator && (
              <div className="space-y-3 mb-3">
                {facultyClubs.map((fc) => (
                  <div key={fc.clubId} className="space-y-1">
                    <ClubHeader name={fc.clubName || "Assigned Club"} isCollapsed={isCollapsed} />
                    <SidebarLink
                      to={`/club-events/${fc.clubId}`}
                      icon={CalendarDays}
                      label="Club Events"
                      isActive={isActive(`/club-events/${fc.clubId}`)}
                      isCollapsed={isCollapsed}
                    />
                    <SidebarLink
                      to={`/club/${fc.clubId}/team`}
                      icon={Users}
                      label="Team Management"
                      isActive={isActive(`/club/${fc.clubId}/team`)}
                      isCollapsed={isCollapsed}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Membership-based clubs (Student Leads & Coordinators across all clubs) */}
            {!isFacultyCoordinator && (() => {
              const eligibleMemberships = (user?.memberships || []).filter((m) => {
                const isLead = isStudentLeadRole(m.role);
                const canManageTeam = isLead || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId });
                const canReviewPayments = hasPermission(user, PERMISSIONS.PAYMENT_REVIEW, { clubId: m.clubId });
                const canUpdateClub = isLead || hasPermission(user, PERMISSIONS.CLUB_UPDATE, { clubId: m.clubId });
                const canBroadcast = isLead || m.role === "COORDINATOR" || hasPermission(user, PERMISSIONS.NOTIFICATION_CREATE, { clubId: m.clubId });
                return canManageTeam || canReviewPayments || canUpdateClub || canBroadcast || m.canEditEvents || m.canTakeAttendance;
              });

              if (eligibleMemberships.length === 0) return null;

              // If 2 or more clubs, collapse each into a SidebarDropdown to prevent vertical clutter
              if (eligibleMemberships.length >= 2) {
                return (
                  <div className="space-y-1 mb-3">
                    {eligibleMemberships.map((m) => {
                      const isLead = isStudentLeadRole(m.role);
                      const canManageTeam = isLead || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId });
                      const canReviewPayments = hasPermission(user, PERMISSIONS.PAYMENT_REVIEW, { clubId: m.clubId });
                      const canUpdateClub = isLead || hasPermission(user, PERMISSIONS.CLUB_UPDATE, { clubId: m.clubId });
                      const canBroadcast = isLead || m.role === "COORDINATOR" || hasPermission(user, PERMISSIONS.NOTIFICATION_CREATE, { clubId: m.clubId });

                      const items = [
                        { label: "Club Events", to: `/club-events/${m.clubId}` },
                      ];
                      if (canManageTeam) {
                        items.push({ label: "Team Management", to: `/club/${m.clubId}/team` });
                      }
                      if (canReviewPayments) {
                        items.push({ label: "Payments", to: "/payments" });
                      }
                      if (canBroadcast) {
                        items.push({ label: "Broadcasts", to: `/send-notification?clubId=${m.clubId}` });
                      }
                      if (canUpdateClub) {
                        items.push({ label: "Club Settings", to: `/club/edit/${m.clubId}` });
                      }

                      return (
                        <SidebarDropdown
                          key={m.clubId}
                          icon={Users}
                          label={m.clubName || "Club"}
                          isCollapsed={isCollapsed}
                          items={items}
                        />
                      );
                    })}
                  </div>
                );
              }

              // Exactly 1 club: render flat layout directly without dropdown
              const m = eligibleMemberships[0];
              const isLead = isStudentLeadRole(m.role);
              const canManageTeam = isLead || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId });
              const canReviewPayments = hasPermission(user, PERMISSIONS.PAYMENT_REVIEW, { clubId: m.clubId });
              const canUpdateClub = isLead || hasPermission(user, PERMISSIONS.CLUB_UPDATE, { clubId: m.clubId });
              const canBroadcast = isLead || m.role === "COORDINATOR" || hasPermission(user, PERMISSIONS.NOTIFICATION_CREATE, { clubId: m.clubId });

              return (
                <div key={m.clubId} className="space-y-1 mb-3">
                  <ClubHeader name={m.clubName || "Club"} isCollapsed={isCollapsed} />

                  <SidebarLink
                    to={`/club-events/${m.clubId}`}
                    icon={CalendarDays}
                    label="Club Events"
                    isActive={isActive(`/club-events/${m.clubId}`)}
                    isCollapsed={isCollapsed}
                  />

                  {/* Team Management - Only for users with club.manage_members permission */}
                  {canManageTeam && (
                    <SidebarLink
                      to={`/club/${m.clubId}/team`}
                      icon={Users}
                      label="Team Management"
                      isActive={isActive(`/club/${m.clubId}/team`)}
                      isCollapsed={isCollapsed}
                    />
                  )}

                  {/* Payments */}
                  {canReviewPayments && (
                    <SidebarLink
                      to="/payments"
                      icon={Wallet}
                      label="Payments"
                      isActive={isActive("/payments")}
                      isCollapsed={isCollapsed}
                    />
                  )}

                  {/* Broadcasts */}
                  {canBroadcast && (
                    <SidebarLink
                      to={`/send-notification?clubId=${m.clubId}`}
                      icon={Radio}
                      label="Broadcasts"
                      isActive={isActive(`/send-notification?clubId=${m.clubId}`) || (location.pathname === "/send-notification" && !new URLSearchParams(location.search).get("clubId"))}
                      isCollapsed={isCollapsed}
                    />
                  )}

                  {/* Club Settings */}
                  {canUpdateClub && (
                    <SidebarLink
                      to={`/club/edit/${m.clubId}`}
                      icon={LayoutGrid}
                      label="Club Settings"
                      isActive={isActive(`/club/edit/${m.clubId}`)}
                      isCollapsed={isCollapsed}
                    />
                  )}
                </div>
              );
            })()}
          </>
        )}
      </nav>


      <div className={`pb-2 pt-2 border-t border-gray-200 dark:border-zinc-800 mt-auto shrink-0 ${isCollapsed ? "px-2" : "px-3"}`}>
        <Link
          to="/"
          title={isCollapsed ? "Exit Dashboard" : undefined}
          className={`group flex items-center rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-400 dark:hover:text-red-400 transition-all duration-200 ${isCollapsed ? "w-10 h-10 mx-auto justify-center p-0" : "w-full gap-3 px-3 py-2.5"
            }`}
        >
          <LogOut
            size={19}
            strokeWidth={1.8}
            className="w-[19px] h-[19px] min-w-[19px] min-h-[19px] shrink-0 text-red-600 group-hover:text-red-400 transition-colors duration-200"
          />
          {!isCollapsed && (
            <span className="text-black dark:text-slate-300 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors duration-200">
              Exit Dashboard
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default DynamicSidebar;
