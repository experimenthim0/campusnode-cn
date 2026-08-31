import React, { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  Radio,
  Sliders,
  Settings,
  LogOut,
  Shield,
  Layers
} from "lucide-react";

const AdminSidebarLink = ({ to, icon: Icon, label, isActive, collapsed }) => (
  <Link
    to={to}
    className={`admin-sidebar-link group relative flex items-center rounded-xl transition-all duration-200 py-2 px-2.5 my-0.5
      ${isActive
        ? "bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white font-bold shadow-xs border border-neutral-200/80 dark:border-zinc-700/60"
        : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white font-medium border border-transparent"
      }`}
    title={collapsed ? label : undefined}
  >
    <Icon
      size={18}
      strokeWidth={isActive ? 2.2 : 1.7}
      className={`shrink-0 sidebar-link-icon transition-colors ${
        isActive ? "text-orange-600 dark:text-orange-500" : "text-neutral-400 dark:text-neutral-500 group-hover:text-black dark:group-hover:text-white"
      }`}
    />
    <span className="text-[13px] tracking-wide truncate sidebar-link-text ml-3">
      {label}
    </span>
    {isActive && (
      <span className="ml-auto shrink-0 w-1.5 h-3.5 rounded-full bg-orange-600 dark:bg-orange-500" />
    )}

    {/* Tooltip — collapsed mode */}
    {collapsed && (
      <span className="admin-sidebar-tooltip absolute left-full ml-3 px-2.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold tracking-wide rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-lg">
        {label}
        <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rotate-45" />
      </span>
    )}
  </Link>
);

const AdminSidebarDropdown = ({
  id,
  icon: Icon,
  label,
  items,
  collapsed,
  isOpen,
  onToggle
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");

  const isAnyChildActive = items.some((item) => {
    if (item.exactPath) return location.pathname === item.exactPath;
    return location.pathname === "/admin-dashboard" && currentTab === item.tab;
  });

  return (
    <div className="sidebar-dropdown-group my-0.5">
      <button
        type="button"
        onClick={() => !collapsed && onToggle(id)}
        className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 transition-all duration-200 cursor-pointer ${
          isAnyChildActive
            ? "bg-neutral-100/80 dark:bg-zinc-800/80 text-black dark:text-white font-bold border border-neutral-200/60 dark:border-zinc-700/50"
            : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white border border-transparent"
        }`}
        title={collapsed ? label : undefined}
      >
        <div className="flex items-center min-w-0">
          <Icon 
            size={18} 
            strokeWidth={isAnyChildActive ? 2.2 : 1.7} 
            className={`shrink-0 transition-colors ${
              isAnyChildActive ? "text-orange-600 dark:text-orange-500" : "text-neutral-400 dark:text-neutral-500"
            }`} 
          />
          {!collapsed && (
            <span className="text-[13px] font-bold tracking-wide truncate ml-3">
              {label}
            </span>
          )}
        </div>
        {!collapsed && (
          <ChevronDown
            size={14}
            className={`shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-black dark:text-white" : ""
            }`}
          />
        )}
      </button>

      {/* Submenu links without dots, clean auto-collapsible */}
      {!collapsed && isOpen && (
        <div className="pl-3 pt-1 pb-1 space-y-0.5 border-l-2 border-neutral-200 dark:border-zinc-800 ml-4 my-1">
          {items.map((item, idx) => {
            const isActive = item.exactPath
              ? location.pathname === item.exactPath
              : location.pathname === "/admin-dashboard" && currentTab === item.tab;

            const linkTo = item.exactPath || `/admin-dashboard?tab=${item.tab}`;

            return (
              <Link
                key={idx}
                to={linkTo}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-zinc-800/70 hover:text-black dark:hover:text-white font-medium"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 ml-2" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SectionDivider = ({ title, collapsed }) => (
  <div className="sidebar-divider my-2">
    {title && !collapsed && (
      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        {title}
      </p>
    )}
    <div className="h-px bg-neutral-100 dark:bg-zinc-800/80 mx-1" />
  </div>
);

const AdminSidebar = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const { user, role, logout } = useAuth();
  const { theme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("adminSidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  // Dropdown categories definition
  const dropdownCategories = [
    {
      id: "events",
      icon: Calendar,
      label: "Events",
      items: [
        { label: "All Events", tab: "event-data" },
        { label: "Calendar & Schedule", tab: "calendar" },
      ]
    },
    {
      id: "clubs",
      icon: Users,
      label: "Clubs Management",
      items: [
        { label: "Clubs", tab: "club-heads" },
        { label: "Coordinators", tab: "coordinators" },
      ]
    },
    {
      id: "finance",
      icon: Wallet,
      label: "Financial Operations",
      items: [
        { label: "Transactions", tab: "payments-overview" },
        { label: "Payouts", tab: "payouts" },
      ]
    },
    {
      id: "comms",
      icon: Radio,
      label: "Communication",
      items: [
        { label: "Broadcasts (Outgoing)", tab: "broadcasts" },
        { label: "Notifications (Incoming)", tab: "notifications" },
      ]
    },
    {
      id: "system",
      icon: Sliders,
      label: "System Admin",
      items: [
        { label: "Export Center", tab: "export-center" },
        { label: "Venues", tab: "venues" },
      ]
    }
  ];

  // Accordion state: only one open category at a time
  const findMatchingCategory = (tab) => {
    return dropdownCategories.find(cat => 
      cat.items.some(item => item.tab === tab || (item.exactPath && location.pathname === item.exactPath))
    )?.id || null;
  };

  const [openDropdownId, setOpenDropdownId] = useState(() => findMatchingCategory(currentTab));

  // Automatically switch open accordion when active tab changes
  useEffect(() => {
    const matched = findMatchingCategory(currentTab);
    if (matched) {
      setOpenDropdownId(matched);
    } else if (currentTab === "overview" || currentTab === "profile") {
      setOpenDropdownId(null);
    }
  }, [currentTab, location.pathname]);

  const handleToggleDropdown = (id) => {
    setOpenDropdownId(prev => (prev === id ? null : id));
  };

  const adminName = user?.name || "Admin User";
  const adminEmail = user?.email || (role === "paymentAdmin" ? "payment@admin.system" : "admin@college.edu");

  const handleLogout = () => {
    logout('/admin-secret-login');
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-white dark:bg-[#0a0a0a] border-r border-neutral-200/80 dark:border-zinc-800/80 overflow-hidden admin-sidebar-transition ${
        collapsed ? "admin-sidebar-collapsed" : "admin-sidebar-expanded"
      }`}
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top))" }}
      aria-label="Admin sidebar"
    >
      <div className="flex items-center justify-between px-3.5 pt-4 pb-2 relative min-h-[48px]">
        <div className="flex items-center gap-2.5 min-w-0 sidebar-brand-container">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500 flex items-center justify-center shrink-0 border border-orange-500/20">
            <Shield size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 sidebar-brand-text">
            <p className="text-[13px] font-black text-black dark:text-white truncate leading-tight tracking-tight">
              Control Panel
            </p>
            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold tracking-wider uppercase leading-tight mt-0.5">
              {role === "paymentAdmin" ? "Finance Desk" : "Administration"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="admin-sidebar-toggle-btn w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={15} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={15} strokeWidth={2.5} />
          )}
        </button>
      </div>

      <SectionDivider collapsed={collapsed} />

      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto overflow-x-hidden" aria-label="Admin navigation">
        {role === "admin" && (
          <>
            <AdminSidebarLink
              to="/admin-dashboard?tab=overview"
              icon={LayoutDashboard}
              label="Overview"
              isActive={
                location.pathname === "/admin-dashboard" &&
                (!currentTab || currentTab === "overview")
              }
              collapsed={collapsed}
            />

            {/* 2-6. Accordion Dropdown Categories */}
            {dropdownCategories.map((cat) => (
              <AdminSidebarDropdown
                key={cat.id}
                id={cat.id}
                icon={cat.icon}
                label={cat.label}
                items={cat.items}
                collapsed={collapsed}
                isOpen={openDropdownId === cat.id}
                onToggle={handleToggleDropdown}
              />
            ))}
          </>
        )}

        {role === "paymentAdmin" && (
          <>
            <AdminSidebarLink
              to="/admin-dashboard?tab=payouts"
              icon={Wallet}
              label="Payouts"
              isActive={location.pathname === "/admin-dashboard" && currentTab === "payouts"}
              collapsed={collapsed}
            />
            <AdminSidebarLink
              to="/admin-dashboard?tab=payments-overview"
              icon={Layers}
              label="Transactions"
              isActive={location.pathname === "/admin-dashboard" && currentTab === "payments-overview"}
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-neutral-200/80 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-950/40 p-2.5 space-y-2">
        {/* Settings Tab - Positioned directly above profile & logout */}
        <AdminSidebarLink
          to="/admin-dashboard?tab=profile"
          icon={Settings}
          label="Settings"
          isActive={
            location.pathname === "/admin-dashboard" &&
            currentTab === "profile"
          }
          collapsed={collapsed}
        />

        {/* Divider */}
        <div className="h-px bg-neutral-200/60 dark:bg-zinc-800/60 mx-1" />

        {/* Profile Card and Logout Row */}
        {!collapsed ? (
          /* Expanded state: Non-clickable profile info + Logout button */
          <div className="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-neutral-200/60 dark:border-zinc-800/50">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 select-none">
              <div className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-neutral-200 dark:ring-zinc-700 overflow-hidden shrink-0">
                <img src={`${theme === "light" ? "/lightthemelogo.png" : "/darkthemelogo.png"}`} alt="logo" className='w-8 h-8 rounded-full object-cover' />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                  {adminName}
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight mt-0.5">
                  {adminEmail}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150 cursor-pointer shrink-0"
              title="Sign out of Admin"
              aria-label="Logout"
            >
              <LogOut size={15} strokeWidth={2} />
            </button>
          </div>
        ) : (
          /* Collapsed state: Centered Avatar (static) & Logout Button */
          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              className="group relative flex items-center justify-center cursor-default select-none"
              title={`Signed in as ${adminName} (${adminEmail})`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-neutral-200 dark:ring-zinc-700 overflow-hidden">
                <img src={`${theme === "light" ? "/lightthemelogo.png" : "/darkthemelogo.png"}`} alt="logo" className='w-8 h-8 rounded-full object-cover' />
              </div>
              <span className="admin-sidebar-tooltip absolute left-full ml-3 px-2.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold tracking-wide rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-lg">
                {adminName}
                <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rotate-45" />
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer group relative"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={15} strokeWidth={2} />
              <span className="admin-sidebar-tooltip absolute left-full ml-3 px-2.5 py-1.5 bg-red-600 text-white text-[11px] font-bold tracking-wide rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-lg">
                Logout
                <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-red-600 rotate-45" />
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;

