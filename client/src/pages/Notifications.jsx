import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Bell,
  Calendar,
  Users,
  CreditCard,
  Megaphone,
  Check,
  CheckCheck,
  ExternalLink,
  X,
  Inbox,
  Loader2,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getNotifications, markAsRead, markAllAsRead } from "../services/notificationService";
import { useNotification } from "../context/NotificationContext";
import {
  getNotificationPermissionState,
  requestPermissionWithUserGesture,
} from "../utils/pushNotifications";
import {
  registerPushSubscription,
  isPushSubscribed,
} from "../utils/pushSubscription";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";

/**
 * Format notification timestamp to clean time labels
 */
const formatMeetSphereTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    if (diffHr <= 3) {
      return `${diffHr}h ago`;
    }
    return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }

  if (diffDays <= 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

/**
 * Determines icon and category tag for the notification
 */
const getNotificationBadge = (notif) => {
  const isTeam =
    notif.type === "TEAM_INVITATION" ||
    notif.type === "TEAM_RESPONSE" ||
    Boolean(notif.teamId) ||
    notif.title?.toLowerCase().includes("team") ||
    notif.title?.toLowerCase().includes("invitation");

  const isPayment =
    notif.type === "PAYMENT_REVIEW" ||
    notif.title?.toLowerCase().includes("payment");

  const isClub =
    Boolean(notif.clubId) ||
    Boolean(notif.sender?.clubName) ||
    Boolean(notif.sender?.clubLogo) ||
    notif.type === "BROADCAST";

  const isEvent =
    Boolean(notif.eventId) ||
    notif.type === "EVENT_UPDATE" ||
    notif.type === "EVENT_ANNOUNCEMENT" ||
    notif.title?.toLowerCase().includes("event");

  if (isTeam) {
    return {
      icon: Users,
      label: "Team Invite",
      variant: "secondary",
      className: "text-primary border-primary/20 bg-primary/10",
    };
  }
  if (isPayment) {
    return {
      icon: CreditCard,
      label: "Payment Review",
      variant: "secondary",
      className: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    };
  }
  if (isClub) {
    const clubLabel = notif.sender?.clubName || notif.club?.clubName || "Club Broadcast";
    return {
      icon: Megaphone,
      label: clubLabel.length > 24 ? `${clubLabel.slice(0, 22)}...` : clubLabel,
      variant: "outline",
      className: "",
    };
  }
  if (isEvent) {
    return {
      icon: Calendar,
      label: "Event Alert",
      variant: "secondary",
      className: "text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/10",
    };
  }
  return {
    icon: Bell,
    label: "Notification",
    variant: "outline",
    className: "",
  };
};

const Notifications = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params with fallbacks
  const urlTab = searchParams.get("tab") === "read" ? "read" : "unread";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const validUrlPage = Number.isInteger(urlPage) && urlPage > 0 ? urlPage : 1;
  const urlSort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const urlSearch = searchParams.get("search") || "";

  const { unreadCount, setUnreadCount, syncNotifications } = useSocket() || {};
  const { showNotification } = useNotification() || {};
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  // Filters & Pagination State
  const [activeTab, setActiveTab] = useState(urlTab);
  const [currentPage, setCurrentPage] = useState(validUrlPage);
  const [sortOrder, setSortOrder] = useState(urlSort);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Data & Status State
  const [notificationsList, setNotificationsList] = useState([]);
  const [pagination, setPagination] = useState({
    page: validUrlPage,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [tabCounts, setTabCounts] = useState({
    unread: typeof unreadCount === "number" ? unreadCount : 0,
    read: 0,
  });
  const [isFetching, setIsFetching] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [markAllLoading, setMarkAllLoading] = useState(false);

  // Push Permission Banner State
  const [permissionState, setPermissionState] = useState(getNotificationPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("hidePushBanner") === "true"
  );

  // Race condition prevention
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Initial push check
  useEffect(() => {
    document.title = "Notifications - Campusnode";
    setPermissionState(getNotificationPermissionState());
    isPushSubscribed().then((sub) => setIsSubscribed(sub));
  }, []);

  // Debounce search query by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL search parameters for shareability & history
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== "unread") params.set("tab", activeTab);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (sortOrder && sortOrder !== "newest") params.set("sort", sortOrder);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    setSearchParams(params, { replace: true });
  }, [activeTab, currentPage, sortOrder, debouncedSearch, setSearchParams]);

  // Server-side Fetcher
  const fetchNotificationsData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFetching(true);

    try {
      const res = await getNotifications({
        page: currentPage,
        limit: 15,
        tab: activeTab,
        search: debouncedSearch.trim() || undefined,
        sort: sortOrder,
      });

      if (currentReqId !== requestIdRef.current) return;

      const data = res.data;
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      setNotificationsList(list);

      if (data?.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          page: currentPage,
          limit: 15,
          total: list.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      }

      if (typeof data?.unreadCount === "number" || typeof data?.readCount === "number") {
        setTabCounts({
          unread: data.unreadCount ?? 0,
          read: data.readCount ?? 0,
        });
        if (setUnreadCount && typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      if (currentReqId === requestIdRef.current) {
        console.error("Failed to load notifications:", err);
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsFetching(false);
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, activeTab, debouncedSearch, sortOrder, setUnreadCount]);

  useEffect(() => {
    fetchNotificationsData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchNotificationsData]);

  // Tab change handler (resets page to 1)
  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  // Sort change handler (resets page to 1)
  const handleSortChange = (newSort) => {
    if (newSort === sortOrder) return;
    setSortOrder(newSort);
    setCurrentPage(1);
  };

  // Search input change handler (resets page to 1)
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Pagination navigation handler
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const state = await requestPermissionWithUserGesture();
      setPermissionState(state);
      if (state === "granted") {
        const sub = await registerPushSubscription();
        setIsSubscribed(!!sub);
        if (showNotification) showNotification("Push notifications enabled!", "success");
      } else if (state === "denied") {
        if (showNotification) showNotification("Notifications blocked by browser settings.", "warning");
      }
    } catch (err) {
      console.error("Failed to enable push:", err);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("hidePushBanner", "true");
  };

  const handleMarkAllAsRead = async () => {
    if (tabCounts.unread === 0 && unreadCount === 0) return;
    setMarkAllLoading(true);
    try {
      await markAllAsRead();
      if (setUnreadCount) setUnreadCount(0);
      setTabCounts((prev) => ({
        unread: 0,
        read: prev.read + prev.unread,
      }));
      setNotificationsList((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...(n.readBy || []), currentUserId],
        }))
      );
      if (showNotification) showNotification("All notifications marked as read.", "success");
      await fetchNotificationsData();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotificationsList((prev) =>
        prev.map((n) =>
          n.id === id || n._id === id
            ? { ...n, readBy: [...(n.readBy || []), currentUserId] }
            : n
        )
      );
      setTabCounts((prev) => ({
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
      if (setUnreadCount) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleAcceptInvite = async (notifId, e) => {
    if (e) e.stopPropagation();
    if (actionLoading[notifId]) return;
    setActionLoading((prev) => ({ ...prev, [notifId]: "accept" }));
    try {
      const res = await api.post(`/api/teams/invitations/${notifId}/accept`);
      if (showNotification) showNotification(res.data.message || "Invitation accepted!", "success");
      if (syncNotifications) await syncNotifications(true);
      await fetchNotificationsData();
    } catch (err) {
      if (showNotification) showNotification(err.response?.data?.message || "Failed to accept", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notifId]: null }));
    }
  };

  const handleDeclineInvite = async (notifId, e) => {
    if (e) e.stopPropagation();
    if (actionLoading[notifId]) return;
    setActionLoading((prev) => ({ ...prev, [notifId]: "decline" }));
    try {
      const res = await api.post(`/api/teams/invitations/${notifId}/decline`);
      if (showNotification) showNotification(res.data.message || "Invitation declined.", "info");
      if (syncNotifications) await syncNotifications(true);
      await fetchNotificationsData();
    } catch (err) {
      if (showNotification) showNotification(err.response?.data?.message || "Failed to decline", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notifId]: null }));
    }
  };

  const handleRowClick = (notif, e) => {
    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("[data-slot='dropdown-menu']")) {
      return;
    }

    const notifId = notif.id || notif._id;
    const isRead = (notif.readBy || []).includes(currentUserId);
    if (!isRead) {
      handleMarkAsRead(notifId);
    }

    if (notif.type === "TEAM_INVITATION" || notif.type === "TEAM_RESPONSE") {
      if (notif.eventId) {
        navigate(`/event/${notif.eventId}`);
      }
      return;
    }

    const targetUrl =
      notif.url ||
      (notif.eventId
        ? `/event/${notif.eventId}`
        : notif.type === "PAYMENT_REVIEW"
        ? "/my-events"
        : null);

    if (targetUrl) {
      try {
        navigate(targetUrl);
      } catch {
        window.location.href = targetUrl;
      }
    }
  };

  // Helper to generate pagination page numbers with ellipsis
  const getPageNumbers = () => {
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  return (
    <div className="w-full bg-background text-foreground min-h-full py-6 sm:py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Push Notification Banner */}
        {!isSubscribed && !bannerDismissed && permissionState !== "denied" && (
          <Card className="mb-6 p-4 flex items-center justify-between gap-4 flex-wrap bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-medium">
                  Enable browser push notifications
                </h4>
                <p className="text-xs text-muted-foreground">
                  Receive instant real-time updates for registered events and club broadcasts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                {enablingPush ? "Enabling..." : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissBanner}
                className="h-8 w-8 text-muted-foreground cursor-pointer"
                title="Dismiss"
              >
                <X size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight mb-4">
            Notifications
          </h1>

          {/* Tabs: Unread | Read */}
          <div className="flex items-center gap-6 border-b border-border">
            <button
              type="button"
              onClick={() => handleTabChange("unread")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === "unread"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground font-normal"
              }`}
            >
              <span>Unread</span>
              {tabCounts.unread > 0 && (
                <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 h-4">
                  {tabCounts.unread}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("read")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === "read"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground font-normal"
              }`}
            >
              <span>Read</span>
              {tabCounts.read > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({tabCounts.read})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 pr-8 text-xs sm:text-sm h-9"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleSearchChange("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground cursor-pointer"
              >
                <X size={14} />
              </Button>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-medium cursor-pointer">
                  <span>Date: {sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange("newest")} className="flex items-center justify-between cursor-pointer">
                  <span>Newest first</span>
                  {sortOrder === "newest" && <Check size={14} className="text-primary ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("oldest")} className="flex items-center justify-between cursor-pointer">
                  <span>Oldest first</span>
                  {sortOrder === "oldest" && <Check size={14} className="text-primary ml-2" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark all as read button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllLoading || tabCounts.unread === 0}
              className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
            >
              {markAllLoading ? (
                <Loader2 size={14} className="animate-spin text-primary" />
              ) : (
                <CheckCheck size={15} className="text-primary" />
              )}
              <span>Mark all as read</span>
            </Button>
          </div>
        </div>

        {/* Notifications List Card */}
        <Card className="overflow-hidden shadow-xs relative">
          {/* Subtle loading progress indicator during refetches */}
          {isFetching && !isInitialLoad && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-10">
              <div className="w-full h-full bg-primary animate-pulse" />
            </div>
          )}

          {isInitialLoad ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-muted mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="w-24 h-4 bg-muted rounded shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          ) : notificationsList.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
                <Inbox size={22} />
              </div>
              <h3 className="text-sm font-medium">
                {debouncedSearch
                  ? "No matching notifications found"
                  : activeTab === "unread"
                  ? "No unread notifications"
                  : "No read notifications"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {debouncedSearch
                  ? `No updates match "${debouncedSearch}". Try clearing search filters.`
                  : activeTab === "unread"
                  ? "You are completely caught up! New updates from campus clubs and events will appear here."
                  : "You haven't marked any notifications as read yet."}
              </p>
              {activeTab === "unread" && tabCounts.read > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleTabChange("read")}
                  className="mt-3 text-xs cursor-pointer"
                >
                  View read history ({tabCounts.read})
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notificationsList.map((notif) => {
                const notifId = notif.id || notif._id;
                const isRead = (notif.readBy || []).includes(currentUserId);
                const badge = getNotificationBadge(notif);
                const BadgeIcon = badge.icon;
                const formattedTime = formatMeetSphereTime(notif.createdAt);

                const isTeamInvite =
                  notif.type === "TEAM_INVITATION" &&
                  notif.title?.toLowerCase().includes("invitation");

                return (
                  <div
                    key={notifId}
                    onClick={(e) => handleRowClick(notif, e)}
                    className="group relative flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {/* Left Column: Indicator Dot + Title & Message */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="pt-1.5 shrink-0">
                        <span
                          className={`block w-2 h-2 rounded-full ${
                            !isRead ? "bg-primary shadow-xs" : "bg-transparent"
                          }`}
                          title={!isRead ? "Unread notification" : "Read"}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Inline team invite actions on mobile */}
                        {isTeamInvite && (
                          <div className="flex items-center gap-2 mt-2 md:hidden">
                            <Button
                              size="sm"
                              onClick={(e) => handleAcceptInvite(notifId, e)}
                              disabled={actionLoading[notifId] === "accept"}
                              className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer"
                            >
                              {actionLoading[notifId] === "accept" ? "Accepting..." : "Accept"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleDeclineInvite(notifId, e)}
                              disabled={actionLoading[notifId] === "decline"}
                              className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer"
                            >
                              {actionLoading[notifId] === "decline" ? "Declining..." : "Decline"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Column: Category Badge */}
                    <div className="flex items-center gap-3 pl-5 md:pl-0 shrink-0">
                      <div className="w-40 hidden md:flex items-center">
                        <Badge
                          variant={badge.variant}
                          className={`gap-1.5 text-xs truncate font-medium ${badge.className}`}
                          title={badge.label}
                        >
                          <BadgeIcon size={12} className="shrink-0" />
                          <span className="truncate">{badge.label}</span>
                        </Badge>
                      </div>

                      {/* Right Column: Timestamp */}
                      <div className="w-24 text-left md:text-right shrink-0 mr-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {formattedTime}
                        </span>
                      </div>

                      {/* Far Right Column: Action Dropdown */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Notification actions"
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {!isRead ? (
                              <DropdownMenuItem
                                onClick={(e) => handleMarkAsRead(notifId, e)}
                                className="text-xs font-medium cursor-pointer"
                              >
                                <Check size={14} className="text-primary mr-2" />
                                <span>Mark as read</span>
                              </DropdownMenuItem>
                            ) : (
                              <div className="px-2 py-1 text-[11px] text-muted-foreground font-medium">
                                Already marked as read
                              </div>
                            )}

                            {isTeamInvite && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handleAcceptInvite(notifId, e)}
                                  disabled={actionLoading[notifId] === "accept"}
                                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                >
                                  <Check size={14} className="mr-2" />
                                  <span>Accept invitation</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleDeclineInvite(notifId, e)}
                                  disabled={actionLoading[notifId] === "decline"}
                                  className="text-xs font-medium text-destructive cursor-pointer"
                                >
                                  <X size={14} className="mr-2" />
                                  <span>Decline invitation</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {notif.eventId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => navigate(`/event/${notif.eventId}`)}
                                  className="text-xs font-medium cursor-pointer"
                                >
                                  <ExternalLink size={13} className="mr-2" />
                                  <span>View event details</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {notif.sender?.slug && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/club/${notif.sender.slug}`)}
                                className="text-xs font-medium cursor-pointer"
                              >
                                <ExternalLink size={13} className="mr-2" />
                                <span>View club page</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Traditional Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
            <div className="text-xs text-muted-foreground font-medium">
              Page <span className="font-semibold text-foreground">{pagination.page}</span> of{" "}
              <span className="font-semibold text-foreground">{pagination.totalPages}</span>
              {" "}• {pagination.total} total {pagination.total === 1 ? "notification" : "notifications"}
            </div>

            <nav aria-label="Notifications Pagination" className="inline-flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage || isFetching}
                className="h-8 px-2.5 text-xs font-medium cursor-pointer"
              >
                <ChevronLeft size={14} className="mr-1" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-muted-foreground select-none">
                      …
                    </span>
                  ) : (
                    <Button
                      key={`page-${p}`}
                      variant={pagination.page === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(p)}
                      disabled={isFetching}
                      className={`h-8 w-8 p-0 text-xs font-semibold cursor-pointer ${
                        pagination.page === p
                          ? "bg-primary text-primary-foreground shadow-xs pointer-events-none"
                          : ""
                      }`}
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage || isFetching}
                className="h-8 px-2.5 text-xs font-medium cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </nav>
          </div>
        )}

      </div>
    </div>
  );
};

export default Notifications;