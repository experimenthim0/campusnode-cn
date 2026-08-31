import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { setAppIconBadge } from "../utils/pushNotifications";
import { processNotification, normalizeNotification } from "../utils/notificationManager";
import { registerPushSubscription } from "../utils/pushSubscription";
import { useNotification } from "./NotificationContext";
import { useAuth } from "./AuthContext";
import { getNotifications } from "../services/notificationService";

const API_URL = import.meta.env.VITE_API_URL || '';


const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, role: userRole } = useAuth();

  const userId = user?.id || user?._id || null;
  const userRef = useRef(user);
  userRef.current = user;
  const userRoleRef = useRef(userRole);
  userRoleRef.current = userRole;

  const { showRealtimeToast } = useNotification() || {};
  const mountTimeRef = useRef(new Date());

  // Sync app icon badge whenever unreadCount updates
  useEffect(() => {
    setAppIconBadge(unreadCount);
  }, [unreadCount]);

  // Sync notifications from backend API (Polling / Recovery)
  const syncNotifications = useCallback(async (isInitialSync = false) => {
    const currentUser = userRef.current;
    const currentRole = userRoleRef.current;
    if (!currentUser) return;
    const currentUserId = String(currentUser._id || currentUser.id);

    if (!["member", "club", "facultyCoordinator", "admin", "student"].includes(currentRole)) return;

    try {
      const res = await getNotifications();
      const fetched = res.data || [];
      const normalizedList = fetched.map((n) => normalizeNotification(n)).filter(Boolean);

      setNotifications(normalizedList);

      const unread = normalizedList.filter(
        (n) => !(n.readBy || []).includes(currentUserId)
      ).length;

      setUnreadCount(unread);
      setAppIconBadge(unread);

      // Check if any genuinely NEW notification arrived during polling sync
      if (!isInitialSync) {
        normalizedList.forEach((notif) => {
          const createdAt = new Date(notif.createdAt);
          if (createdAt > mountTimeRef.current && !(notif.readBy || []).includes(currentUserId)) {
            processNotification(notif, {
              onToast: (toastData) => {
                if (showRealtimeToast) showRealtimeToast(toastData);
              },
            });
          }
        });
      }
    } catch (err) {
      console.error("[SocketContext] Could not sync notifications:", err.message);
    }
  }, [showRealtimeToast]);

  useEffect(() => {
    if (!userId) return;

    registerPushSubscription().catch(() => {});

    // Initial sync
    syncNotifications(true);

    // Socket.io connection setup
    const socketServerUrl = API_URL.replace("/api", "");
    const newSocket = io(socketServerUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    const handleConnect = () => {
      console.log("[SocketContext] Socket connected:", newSocket.id);
      newSocket.emit("join", String(userId));
      syncNotifications(false);
    };

    const handleNewNotification = (rawNotif) => {
      console.log("[SocketContext] new-notification event received:", rawNotif?.title);

      const processed = processNotification(rawNotif, {
        onToast: (toastData) => {
          if (showRealtimeToast) showRealtimeToast(toastData);
        },
      });

      if (processed) {
        setNotifications((prev) => [processed, ...prev]);
        setUnreadCount((prev) => {
          const updated = prev + 1;
          setAppIconBadge(updated);
          return updated;
        });
      }
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("new-notification", handleNewNotification);

    // ── Polling & Recovery Fallbacks ──────────────────────────────────────────
    const interval = setInterval(() => {
      syncNotifications(false);
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNotifications(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      newSocket.off("connect", handleConnect);
      newSocket.off("new-notification", handleNewNotification);
      newSocket.disconnect();
    };
  }, [userId, syncNotifications, showRealtimeToast]);

  const value = {
    socket,
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    syncNotifications,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
