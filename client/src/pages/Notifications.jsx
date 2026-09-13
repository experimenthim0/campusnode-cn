import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
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
  Clock,
  Inbox,
  Loader2
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { markAsRead, markAllAsRead } from "../services/notificationService";
import { useNotification } from "../context/NotificationContext";
import {
  getNotificationPermissionState,
  requestPermissionWithUserGesture,
} from "../utils/pushNotifications";
import {
  registerPushSubscription,
  isPushSubscribed,
} from "../utils/pushSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
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
  const { notifications, unreadCount, setUnreadCount, setNotifications, syncNotifications } =
    useSocket() || {};
  const { showNotification } = useNotification() || {};
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  const [activeTab, setActiveTab] = useState("unread"); // 'unread' | 'read'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' | 'oldest'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const [permissionState, setPermissionState] = useState(getNotificationPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("hidePushBanner") === "true"
  );

  useEffect(() => {
    document.title = "Notifications - CampusNode";
    setPermissionState(getNotificationPermissionState());
    isPushSubscribed().then((sub) => setIsSubscribed(sub));
    if (syncNotifications) {
      syncNotifications(true);
    }
  }, [syncNotifications]);

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
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        (prev || []).map((n) => ({
          ...n,
          readBy: [...(n.readBy || []), currentUserId],
        }))
      );
      if (showNotification) showNotification("All notifications marked as read.", "success");
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        (prev || []).map((n) =>
          n.id === id || n._id === id
            ? { ...n, readBy: [...(n.readBy || []), currentUserId] }
            : n
        )
      );
      const newUnread = (notifications || []).filter(
        (n) => n.id !== id && n._id !== id && !(n.readBy || []).includes(currentUserId)
      ).length;
      setUnreadCount(newUnread);
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

  // Precomputed unread / read counts
  const unreadNotifications = useMemo(() => {
    return (notifications || []).filter((n) => !(n.readBy || []).includes(currentUserId));
  }, [notifications, currentUserId]);

  const readNotifications = useMemo(() => {
    return (notifications || []).filter((n) => (n.readBy || []).includes(currentUserId));
  }, [notifications, currentUserId]);

  // Filtered and sorted notifications for current active tab
  const displayedNotifications = useMemo(() => {
    let list = activeTab === "unread" ? unreadNotifications : readNotifications;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const title = (n.title || "").toLowerCase();
        const msg = (n.message || "").toLowerCase();
        const sender = (n.sender?.clubName || n.sender?.name || "").toLowerCase();
        return title.includes(q) || msg.includes(q) || sender.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [activeTab, unreadNotifications, readNotifications, searchQuery, sortOrder]);

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
                <h4 className="text-xs sm:text-sm font-semibold">
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
                className="h-8 text-xs font-semibold"
              >
                {enablingPush ? "Enabling..." : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissBanner}
                className="h-8 w-8 text-muted-foreground"
                title="Dismiss"
              >
                <X size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
            Notifications
          </h1>

          {/* Tabs: Unread | Read */}
          <div className="flex items-center gap-6 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === "unread"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground font-normal"
              }`}
            >
              <span>Unread</span>
              {unreadNotifications.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4">
                  {unreadNotifications.length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("read")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === "read"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground font-normal"
              }`}
            >
              <span>Read</span>
              {readNotifications.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({readNotifications.length})
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 pr-8 text-xs sm:text-sm h-9"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
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
                <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-medium">
                  <span>Date: {sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOrder("newest")} className="flex items-center justify-between">
                  <span>Newest first</span>
                  {sortOrder === "newest" && <Check size={14} className="text-primary ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="flex items-center justify-between">
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
              disabled={loading || unreadNotifications.length === 0}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin text-primary" />
              ) : (
                <CheckCheck size={15} className="text-primary" />
              )}
              <span>Mark all as read</span>
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <Card className="overflow-hidden shadow-xs">
          {displayedNotifications.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
                <Inbox size={22} />
              </div>
              <h3 className="text-sm font-semibold">
                {searchQuery
                  ? "No matching notifications found"
                  : activeTab === "unread"
                  ? "No unread notifications"
                  : "No read notifications"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery
                  ? `No updates match "${searchQuery}". Try clearing search filters.`
                  : activeTab === "unread"
                  ? "You are completely caught up! New updates from campus clubs and events will appear here."
                  : "You haven't marked any notifications as read yet."}
              </p>
              {activeTab === "unread" && readNotifications.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setActiveTab("read")}
                  className="mt-3 text-xs"
                >
                  View read history
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayedNotifications.map((notif) => {
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
                        <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
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
                              className="h-7 px-2.5 text-[11px] font-bold"
                            >
                              {actionLoading[notifId] === "accept" ? "Accepting..." : "Accept"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleDeclineInvite(notifId, e)}
                              disabled={actionLoading[notifId] === "decline"}
                              className="h-7 px-2.5 text-[11px] font-bold"
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
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
      </div>
    </div>
  );
};

export default Notifications;