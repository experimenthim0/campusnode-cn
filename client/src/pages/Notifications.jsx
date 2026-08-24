import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { markAsRead, markAllAsRead } from "../services/notificationService";
import { Link } from "react-router-dom";
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
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Notifications = () => {
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

  useEffect(() => {
    document.title = "Notifications - CampusNode";
    const state = getNotificationPermissionState();
    setPermissionState(state);
    isPushSubscribed().then((sub) => setIsSubscribed(sub));
  }, []);

  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

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

  const handleAcceptInvite = async (notifId) => {
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

  const handleDeclineInvite = async (notifId) => {
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
        prev.map((n) => ({
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

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id === id || n._id === id)
            ? { ...n, readBy: [...(n.readBy || []), currentUserId] }
            : n
        )
      );
      const newUnread = notifications.filter(
        (n) => (n.id !== id && n._id !== id) && !(n.readBy || []).includes(currentUserId)
      ).length;
      setUnreadCount(newUnread);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-10 md:py-12">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-orange-600 font-semibold mt-1">
                  {unreadCount} unread
                </p>
              )}
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-1">
                Updates from clubs, event organizers, and system.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Clean Push Notification Control Pill */}
              <button
                onClick={isSubscribed ? handleDisablePush : handleEnablePush}
                disabled={enablingPush}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold hover:border-orange-500 transition-all cursor-pointer disabled:opacity-60 shrink-0"
                title={isSubscribed ? "Click to unsubscribe from Push Notifications" : "Click to enable Push Notifications"}
              >
                {enablingPush ? (
                  <i className="ri-loader-4-line animate-spin text-orange-500 font-light" />
                ) : isSubscribed ? (
                  <i className="ri-notification-3-fill text-emerald-500 font-light" />
                ) : (
                  <i className="ri-notification-3-line text-neutral-400 font-light" />
                )}
                <span>{enablingPush ? "Updating..." : isSubscribed ? "Push Enabled" : "Enable Push"}</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {loading ? (
                    <i className="ri-loader-4-line animate-spin text-sm font-light" />
                  ) : (
                    <i className="ri-check-double-line text-sm font-light" />
                  )}
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Dismissible Push Notification Promotion Banner ──────────────────────── */}
        {!isSubscribed && !bannerDismissed && permissionState !== "denied" && (
          <div className="mb-6 p-4 md:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative transition-all">
            <button
              onClick={handleDismissBanner}
              className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 transition-colors cursor-pointer"
              title="Dismiss notification banner"
            >
              <i className="ri-close-line text-lg" />
            </button>

            <div className="flex items-center justify-between gap-4 flex-wrap pr-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-lg shrink-0">
                  <i className="ri-notification-badge-line" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    Get Real-time Event Alerts
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Enable push notifications for direct updates on registered events, approvals, and messages.
                  </p>
                </div>
              </div>

              <button
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 shrink-0"
              >
                {enablingPush ? (
                  <i className="ri-loader-4-line animate-spin text-sm" />
                ) : (
                  <i className="ri-notification-badge-line text-sm" />
                )}
                Enable Push Notifications
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

        {/* Notification List */}
        {notifications?.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notif) => {
              const notifId = notif.id || notif._id;
              const isRead = (notif.readBy || []).includes(currentUserId);
              return (
                <div
                  key={notifId}
                  className={`relative bg-white dark:bg-neutral-900 border rounded-xl transition-all duration-200 overflow-hidden
                    ${!isRead
                      ? "border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/10"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                >
                  <div className="p-5 md:p-6">
                    {/* Top row: sender + time */}
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {notif.sender?.clubName || notif.sender?.name || "CampusNode"}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <span
                        className="text-[11px] font-medium text-neutral-400"
                        title={new Date(notif.createdAt).toLocaleString()}
                      >
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-sm sm:text-base font-bold leading-snug mb-1.5 ${
                      !isRead ? "text-black dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                    }`}>
                      {notif.title}
                    </h3>

                    {/* Message */}
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    {/* Actions */}
                    {notif.type === "TEAM_INVITATION" && notif.title === "Team Invitation" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleAcceptInvite(notifId)}
                          disabled={!!actionLoading[notifId]}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-60 text-white text-[11px] font-bold transition-colors cursor-pointer border-0 outline-none shadow-sm"
                        >
                          {actionLoading[notifId] === "accept" ? (
                            <>
                              <i className="ri-loader-4-line animate-spin text-xs" /> Accepting...
                            </>
                          ) : (
                            "Accept Invite"
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(notifId)}
                          disabled={!!actionLoading[notifId]}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 disabled:opacity-60 text-white text-[11px] font-bold transition-colors cursor-pointer border-0 outline-none shadow-sm"
                        >
                          {actionLoading[notifId] === "decline" ? (
                            <>
                              <i className="ri-loader-4-line animate-spin text-xs" /> Declining...
                            </>
                          ) : (
                            "Decline"
                          )}
                        </button>
                        {notif.eventId && (
                          <Link
                            to={`/event/${notif.eventId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white transition-colors text-[11px] font-semibold"
                          >
                            View Event
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {(notif.type === "PAYMENT_REVIEW" || notif.title?.toLowerCase().includes("payment")) ? (
                          <>
                            <Link
                              to={notif.url || `/my-events${notif.eventId ? `?eventId=${notif.eventId}` : ""}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
                            >
                              <i className="ri-wallet-3-line text-xs font-light" />
                              {notif.title?.includes("Approved") ? "View Ticket in My Events" : "Update Payment Info"}
                            </Link>
                            {notif.eventId && (
                              <Link
                                to={`/event/${notif.eventId}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors text-[11px] font-semibold"
                              >
                                View Event
                              </Link>
                            )}
                          </>
                        ) : notif.eventId ? (
                          <Link
                            to={`/event/${notif.eventId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 hover:text-white dark:hover:text-white text-[11px] font-semibold transition-colors"
                          >
                            View Event
                          </Link>
                        ) : null}

                        {!isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notifId)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white hover:border-neutral-300 transition-colors text-[11px] font-semibold cursor-pointer border-0 outline-none"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl py-16 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-300 dark:text-neutral-700">
              <i className="ri-notification-off-line text-2xl"></i>
            </div>
            <div>
              <p className="text-base font-bold text-black dark:text-white">
                You're all caught up!
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1.5">
                No new notifications.
              </p>
            </div>
            <Link
              to="/"
              className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 hover:text-white dark:hover:text-white transition-colors cursor-pointer mt-2"
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