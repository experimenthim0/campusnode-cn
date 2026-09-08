import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  unsubscribePushSubscription,
  isPushSubscribed,
} from "../utils/pushSubscription";

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getDateGroup = (dateStr) => {
  if (!dateStr) return "EARLIER";
  const notifDate = new Date(dateStr);
  if (isNaN(notifDate.getTime())) return "EARLIER";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

  const diffDays = Math.round((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return "EARLIER";
};

const NotificationAvatar = ({ notif }) => {
  const isTeam =
    notif.type === "TEAM_INVITATION" ||
    notif.type === "TEAM_RESPONSE" ||
    Boolean(notif.teamId) ||
    notif.title?.toLowerCase().includes("team") ||
    notif.title?.toLowerCase().includes("invitation");

  const logoUrl = !isTeam
    ? notif.sender?.clubLogo ||
      notif.sender?.club?.clubLogo ||
      notif.sender?.logo ||
      notif.clubLogo
    : null;

  if (logoUrl) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 flex items-center justify-center shadow-2xs">
        <img
          src={logoUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    );
  }

  const isPayment = notif.type === "PAYMENT_REVIEW" || notif.title?.toLowerCase().includes("payment");
  const isEvent = Boolean(notif.eventId) || notif.type === "EVENT_UPDATE" || notif.title?.toLowerCase().includes("event");

  let iconClass = "ri-notification-3-line text-neutral-600 dark:text-neutral-400";
  let bgClass = "bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200/80 dark:border-neutral-700/80";

  if (isTeam) {
    iconClass = "ri-team-line text-brand-600 dark:text-brand-400";
    bgClass = "bg-brand-50 dark:bg-brand-950/30 border-brand-200/80 dark:border-brand-900/40";
  } else if (isPayment) {
    iconClass = "ri-wallet-3-line text-emerald-600 dark:text-emerald-400";
    bgClass = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40";
  } else if (isEvent) {
    iconClass = "ri-calendar-event-line text-neutral-700 dark:text-neutral-300";
    bgClass = "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700";
  }

  return (
    <div
      className={`w-10 h-10 rounded-xl shrink-0 border flex items-center justify-center shadow-2xs ${bgClass}`}
    >
      <i className={`${iconClass} text-lg`} />
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, setUnreadCount, setNotifications, syncNotifications } =
    useSocket() || {};
  const { showNotification } = useNotification() || {};
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [permissionState, setPermissionState] = useState(getNotificationPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("hidePushBanner") === "true"
  );

  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  useEffect(() => {
    document.title = "Notifications - CampusNode";
    const state = getNotificationPermissionState();
    setPermissionState(state);
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
        if (showNotification) showNotification("Push notifications enabled successfully!", "success");
      } else if (state === "denied") {
        if (showNotification) showNotification("Notifications blocked by browser settings.", "warning");
      }
    } catch (err) {
      console.error("Failed to enable push:", err);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDisablePush = async () => {
    setEnablingPush(true);
    try {
      await unsubscribePushSubscription();
      setIsSubscribed(false);
      if (showNotification) showNotification("Unsubscribed from push notifications.", "info");
    } catch (err) {
      console.error("Failed to disable push:", err);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("hidePushBanner", "true");
  };

  const handleAcceptInvite = async (notifId, e) => {
    if (e) e.stopPropagation();
    if (actionLoading[notifId]) return;
    setActionLoading((prev) => ({ ...prev, [notifId]: "accept" }));
    try {
      const res = await api.post(`/api/teams/invitations/${notifId}/accept`);
      if (showNotification) showNotification(res.data.message || "Invitation accepted successfully!", "success");
      if (syncNotifications) await syncNotifications(true);
    } catch (err) {
      if (showNotification) showNotification(err.response?.data?.message || "Failed to accept invitation", "error");
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
      if (showNotification) showNotification(res.data.message || "Invitation declined.", "success");
      if (syncNotifications) await syncNotifications(true);
    } catch (err) {
      if (showNotification) showNotification(err.response?.data?.message || "Failed to decline invitation", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notifId]: null }));
    }
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

  const handleCardClick = (notif, e) => {
    if (e.target.closest("button") || e.target.closest("a")) {
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
      (notif.type === "PAYMENT_REVIEW" || notif.title?.toLowerCase().includes("payment")
        ? `/my-events${notif.eventId ? `?eventId=${notif.eventId}` : ""}`
        : notif.eventId
        ? `/event/${notif.eventId}`
        : null);

    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  // Group notifications into TODAY, YESTERDAY, EARLIER
  const groupedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return {};

    const groups = {
      TODAY: [],
      YESTERDAY: [],
      EARLIER: [],
    };

    notifications.forEach((notif) => {
      const groupKey = getDateGroup(notif.createdAt);
      if (groups[groupKey]) {
        groups[groupKey].push(notif);
      } else {
        groups.EARLIER.push(notif);
      }
    });

    return groups;
  }, [notifications]);

  const activeGroupKeys = useMemo(() => {
    return ["TODAY", "YESTERDAY", "EARLIER"].filter(
      (key) => groupedNotifications[key] && groupedNotifications[key].length > 0
    );
  }, [groupedNotifications]);

  const totalCount = notifications?.length || 0;

  return (
    <div className="min-h-screen bg-cn-bg transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-10">

        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/40">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-1">
                Updates from clubs, event organizers, and campus activities.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={isSubscribed ? handleDisablePush : handleEnablePush}
                disabled={enablingPush}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold hover:border-brand-500 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                title={isSubscribed ? "Click to unsubscribe from Push Notifications" : "Click to enable Push Notifications"}
              >
                {enablingPush ? (
                  <i className="ri-loader-4-line animate-spin text-brand-500 text-xs" />
                ) : isSubscribed ? (
                  <i className="ri-notification-3-fill text-emerald-500 text-xs" />
                ) : (
                  <i className="ri-notification-3-line text-neutral-400 text-xs" />
                )}
                <span>{enablingPush ? "Updating..." : isSubscribed ? "Push Enabled" : "Enable Push"}</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold hover:border-brand-500 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {loading ? (
                    <i className="ri-loader-4-line animate-spin text-xs" />
                  ) : (
                    <i className="ri-check-double-line text-xs text-brand-600 dark:text-brand-400" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Push Notification Banner */}
        {!isSubscribed && !bannerDismissed && permissionState !== "denied" && (
          <div className="mb-6 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs relative transition-all">
            <button
              onClick={handleDismissBanner}
              className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <i className="ri-close-line text-base" />
            </button>

            <div className="flex items-center justify-between gap-4 flex-wrap pr-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/80 dark:border-brand-900/40 flex items-center justify-center text-base shrink-0">
                  <i className="ri-notification-badge-line" />
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                    Get Real-time Event Alerts
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    Enable push notifications for registered events and invitations.
                  </p>
                </div>
              </div>

              <button
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
              >
                {enablingPush ? (
                  <i className="ri-loader-4-line animate-spin text-xs" />
                ) : (
                  <i className="ri-notification-badge-line text-xs" />
                )}
                <span>Enable Notifications</span>
              </button>
            </div>
          </div>
        )}

        {/* Notification Activity Feed Grouped by Date */}
        {totalCount > 0 ? (
          <div className="space-y-6">
            {activeGroupKeys.map((groupKey) => (
              <section key={groupKey} className="space-y-3">
                {/* Date Section Heading */}
                <div className="flex items-center gap-2.5 px-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {groupKey}
                  </span>
                  <div className="h-px flex-1 bg-neutral-200/70 dark:bg-neutral-800/80" />
                </div>

                {/* Group Notifications List */}
                <div className="space-y-2.5">
                  {groupedNotifications[groupKey].map((notif) => {
                    const notifId = notif.id || notif._id;
                    const isRead = (notif.readBy || []).includes(currentUserId);
                    const isTeamNotif =
                      notif.type === "TEAM_INVITATION" ||
                      notif.type === "TEAM_RESPONSE" ||
                      Boolean(notif.teamId) ||
                      notif.title?.toLowerCase().includes("team") ||
                      notif.title?.toLowerCase().includes("invitation");
                    const isTeamInvite = notif.type === "TEAM_INVITATION" && notif.title === "Team Invitation";
                    const isPayment = notif.type === "PAYMENT_REVIEW" || notif.title?.toLowerCase().includes("payment");
                    const hasClickableDestination = Boolean(
                      notif.url ||
                      notif.eventId ||
                      isPayment ||
                      (isTeamInvite && notif.eventId)
                    );

                    return (
                      <div
                        key={notifId}
                        onClick={(e) => handleCardClick(notif, e)}
                        className={`group relative rounded-xl border p-3.5 sm:p-4 transition-all duration-150 flex items-start gap-3 sm:gap-3.5 ${
                          hasClickableDestination
                            ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs"
                            : ""
                        } ${
                          !isRead
                            ? "border-brand-200/80 dark:border-brand-900/40 bg-brand-50/20 dark:bg-brand-950/10"
                            : "border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900"
                        }`}
                      >
                        {/* Source Avatar / Icon */}
                        <NotificationAvatar notif={notif} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Source Name + Time + Dot */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                                !isRead
                                  ? "text-brand-600 dark:text-brand-400"
                                  : "text-neutral-500 dark:text-neutral-400"
                              }`}>
                                {isTeamNotif ? "CampusNode" : (notif.sender?.clubName || notif.sender?.name || "CampusNode")}
                              </span>
                              {!isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" title="Unread" />
                              )}
                            </div>

                            <span
                              className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0 whitespace-nowrap"
                              title={new Date(notif.createdAt).toLocaleString()}
                            >
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className={`text-xs sm:text-sm leading-snug ${
                            !isRead
                              ? "font-bold text-neutral-900 dark:text-white"
                              : "font-semibold text-neutral-800 dark:text-neutral-200"
                          }`}>
                            {notif.title}
                          </h3>

                          {/* Message Body */}
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed break-words">
                            {notif.message}
                          </p>

                          {/* Action Buttons */}
                          {isTeamInvite ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={(e) => handleAcceptInvite(notifId, e)}
                                disabled={!!actionLoading[notifId]}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer border-0 shadow-2xs"
                              >
                                {actionLoading[notifId] === "accept" ? (
                                  <>
                                    <i className="ri-loader-4-line animate-spin text-xs" />
                                    <span>Accepting...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-check-line text-xs" />
                                    <span>Accept</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => handleDeclineInvite(notifId, e)}
                                disabled={!!actionLoading[notifId]}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {actionLoading[notifId] === "decline" ? (
                                  <>
                                    <i className="ri-loader-4-line animate-spin text-xs" />
                                    <span>Declining...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-close-line text-xs" />
                                    <span>Decline</span>
                                  </>
                                )}
                              </button>
                              {notif.eventId && (
                                <Link
                                  to={`/event/${notif.eventId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium transition-colors"
                                >
                                  <span>View Event</span>
                                  <i className="ri-arrow-right-s-line text-xs" />
                                </Link>
                              )}
                            </div>
                          ) : isPayment ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                to={notif.url || `/my-events${notif.eventId ? `?eventId=${notif.eventId}` : ""}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                              >
                                <i className="ri-wallet-3-line text-xs font-light" />
                                <span>{notif.title?.includes("Approved") ? "View Ticket" : "Update Payment"}</span>
                              </Link>
                              {!isRead && (
                                <button
                                  onClick={(e) => handleMarkAsRead(notifId, e)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {notif.eventId && (
                                <Link
                                  to={`/event/${notif.eventId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                                >
                                  <span>View Event</span>
                                  <i className="ri-arrow-right-line text-xs" />
                                </Link>
                              )}

                              {!isRead && (
                                <button
                                  onClick={(e) => handleMarkAsRead(notifId, e)}
                                  className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <i className="ri-check-line text-xs" /> Mark read
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Subtle Right Chevron on hover for clickable cards */}
                        {hasClickableDestination && (
                          <div className="hidden sm:flex items-center self-center text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all shrink-0">
                            <i className="ri-arrow-right-s-line text-lg" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6 shadow-2xs">
            <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 dark:text-neutral-600 text-xl">
              <i className="ri-notification-off-line" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                You're all caught up!
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                No new notifications or pending announcements.
              </p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold rounded-xl hover:bg-brand-600 dark:hover:bg-brand-600 hover:text-white dark:hover:text-white transition-colors cursor-pointer mt-1"
            >
              Go to Home
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default Notifications;