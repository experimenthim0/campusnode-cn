import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendNotification, getSentNotifications } from "../services/notificationService";
import { getClubManagedEvents } from "../services/eventService";
import { getClubById } from "../services/clubService";
import ClubAnnouncementsSection from "../components/ClubAnnouncementsSection";

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

const SendNotification = () => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state: "notifications" | "announcements"
  const currentTab = searchParams.get("tab") === "announcements" ? "announcements" : "notifications";

  const handleTabChange = (tab) => {
    setSearchParams(tab === "notifications" ? {} : { tab });
  };

  const [targetType, setTargetType] = useState("ALL_STUDENTS");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState([]);

  const [managedClubs, setManagedClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [activeClubData, setActiveClubData] = useState(null);
  const [loadingClub, setLoadingClub] = useState(false);

  useEffect(() => {
    if (user) {
      const clubs = [];
      if (user.clubId) {
        clubs.push({
          id: user.clubId,
          name: user.name || "Club",
        });
      } else if (role === "club") {
        clubs.push({
          id: user.id || user._id,
          name: user.name || "Club",
        });
      }

      if (user.memberships && Array.isArray(user.memberships)) {
        user.memberships.forEach((m) => {
          if (
            (m.role === "CLUB_HEAD" || m.role === "COORDINATOR" || m.role === "facultyCoordinator") &&
            m.clubId &&
            !clubs.some((c) => c.id === m.clubId)
          ) {
            clubs.push({
              id: m.clubId,
              name: m.clubName || "Club",
            });
          }
        });
      }

      setManagedClubs(clubs);
      if (clubs.length > 0 && !selectedClubId) {
        setSelectedClubId(clubs[0].id);
      }
    }
  }, [user, role, selectedClubId]);

  const fetchActiveClubDetails = useCallback(async (clubIdToFetch) => {
    const targetId = clubIdToFetch || selectedClubId;
    if (!targetId) return;

    setLoadingClub(true);
    try {
      const res = await getClubById(targetId);
      const fetchedClub = res.data?.club || res.data;
      if (fetchedClub) {
        setActiveClubData(fetchedClub);
      }
    } catch (err) {
      console.error("Error fetching club details for announcements:", err);
    } finally {
      setLoadingClub(false);
    }
  }, [selectedClubId]);

  useEffect(() => {
    if (selectedClubId) {
      fetchActiveClubDetails(selectedClubId);
    }
  }, [selectedClubId, fetchActiveClubDetails]);

  useEffect(() => {
    if (user && (user.id || user.clubId || user._id)) {
      const isCentral = role === "central_organizer" || user?.principalType === "INSTITUTIONAL";
      const targetClubId = user.clubId || selectedClubId;

      if (isCentral) {
        import("../services/api").then(({ default: api }) => {
          api.get("/api/central-organizer/events")
            .then((res) => setEvents(res.data.events || []))
            .catch((err) => console.error("Could not fetch central events", err));
        });
      } else if (targetClubId) {
        getClubManagedEvents(targetClubId)
          .then((res) => {
            setEvents(res.data || []);
          })
          .catch((err) => console.error("Could not fetch events", err));
      }

      getSentNotifications()
        .then((res) => setHistory(res.data || []))
        .catch((err) => console.error("Could not fetch history", err));
    }
  }, [user, role, selectedClubId]);

  const handleSubmitNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await sendNotification({
        title,
        message,
        targetType,
        eventId: targetType === "EVENT_PARTICIPANTS" ? selectedEventId : undefined,
      });

      setSuccessMsg("Notification broadcast dispatched successfully!");
      setHistory((prev) => [res.data, ...prev]);
      setTitle("");
      setMessage("");
      setTargetType("ALL_STUDENTS");
      setSelectedEventId("");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  const currentClubName =
    activeClubData?.clubName ||
    managedClubs.find((c) => c.id === selectedClubId)?.name ||
    user?.name ||
    "Club";

  return (
    <div className="max-w-[850px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 myfont space-y-6 md:space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 rounded-full">
            Broadcasts & Communication
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight">
          Broadcast Center
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-1">
          Dispatch real-time notifications to student feeds and post official club announcements.
        </p>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => handleTabChange("notifications")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === "notifications"
              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <i className="ri-broadcast-line text-orange-600 text-base font-light" />
          <span>Push Notification</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("announcements")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === "announcements"
              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <i className="ri-megaphone-line text-orange-600 text-base font-light" />
          <span>Club Announcements</span>
          {activeClubData?.announcements?.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-full">
              {activeClubData.announcements.length}
            </span>
          )}
        </button>
      </div>

      {currentTab === "notifications" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs">
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 font-semibold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <i className="ri-checkbox-circle-fill text-lg"></i>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 font-semibold text-red-700 dark:text-red-400 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <i className="ri-error-warning-fill text-lg"></i>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitNotification} className="flex flex-col gap-5">
              {/* Target Audience */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  Target Audience
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { value: "ALL_STUDENTS", label: "All Students" },
                    { value: "REGISTERED_STUDENTS", label: "Registered Students" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        targetType === opt.value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-600"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        value={opt.value}
                        checked={targetType === opt.value}
                        onChange={() => setTargetType(opt.value)}
                        className="accent-orange-600 scale-110"
                      />
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Selector (Conditional) */}
              {targetType === "REGISTERED_STUDENTS" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                    Select Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-medium bg-white dark:bg-neutral-900 text-black dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="" disabled>
                      -- Select an event --
                    </option>
                    {events.map((evt) => (
                      <option key={evt.id || evt._id} value={evt.id || evt._id}>
                        {evt.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Only students registered for this event will receive the notification.
                  </p>
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Important Venue Change"
                  className="w-full border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-medium bg-white dark:bg-neutral-900 text-black dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-medium bg-white dark:bg-neutral-900 text-black dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400 resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-xs ${
                  loading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 cursor-pointer"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin text-lg" /> Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-send-plane-line font-light" /> Send Notification
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* History */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-black dark:text-white tracking-tight mb-4">
              Notification History
            </h2>
            {history.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl py-12 flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-center text-neutral-300 dark:text-neutral-700">
                  <i className="ri-notification-off-line text-xl"></i>
                </div>
                <p className="text-sm font-bold text-neutral-400">No notifications sent yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {history.map((notif) => (
                  <div
                    key={notif.id || notif._id}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"
                  >
                    <div className="flex justify-between items-start mb-2 gap-3 flex-wrap">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ${
                          notif.targetType === "ALL_STUDENTS"
                            ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 border border-orange-200/50 dark:border-orange-900/40"
                            : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200/50 dark:border-blue-900/40"
                        }`}
                      >
                        {notif.targetType === "ALL_STUDENTS"
                          ? "Sent to all students"
                          : `Event: ${notif.eventId?.title || "Unknown Event"}`}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-400" title={new Date(notif.createdAt).toLocaleString()}>
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-black dark:text-white mb-1">{notif.title}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{notif.message}</p>
                    {/* <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-semibold text-neutral-400">
                        Read by {notif.readBy?.length || 0} student(s)
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-400">
                        Sent to {notif.targetType === "ALL_STUDENTS" ? "All" : (notif.recipients?.length || 0)} student(s)
                      </span>
                    </div> */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === "announcements" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Multiple Managed Clubs Selector if applicable */}
          {managedClubs.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Select Club to Manage:
              </label>
              <select
                value={selectedClubId || ""}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-orange-500"
              >
                {managedClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingClub && !activeClubData ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <i className="ri-loader-4-line animate-spin text-2xl text-orange-600 mb-2 inline-block" />
              <p className="text-xs font-semibold text-neutral-400">Loading club announcements...</p>
            </div>
          ) : selectedClubId ? (
            <ClubAnnouncementsSection
              clubId={selectedClubId}
              clubName={currentClubName}
              initialAnnouncements={activeClubData?.announcements || []}
              canManage={true}
              onUpdate={() => fetchActiveClubDetails(selectedClubId)}
            />
          ) : (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <i className="ri-building-line text-3xl text-neutral-400 mb-2 inline-block" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No club assigned to manage announcements.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                You must be a club account or hold a leadership role (Club Head / Coordinator) to post announcements.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SendNotification;
