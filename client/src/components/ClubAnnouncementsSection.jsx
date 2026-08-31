import React, { useState, useEffect } from "react";
import { useNotification } from "../context/NotificationContext";
import {
  createClubAnnouncement,
  deleteClubAnnouncement,
  togglePinClubAnnouncement,
} from "../services/clubService";

const ClubAnnouncementsSection = ({
  clubId,
  clubName = "Club",
  initialAnnouncements = [],
  canManage = true,
  onUpdate,
}) => {
  const { showNotification } = useNotification();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    isPinned: false,
  });

  useEffect(() => {
    if (initialAnnouncements) {
      setAnnouncements(initialAnnouncements);
    }
  }, [initialAnnouncements]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showNotification("Please provide both a title and content", "error");
      return;
    }
    if (!clubId) {
      showNotification("Club ID is missing. Cannot post announcement.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createClubAnnouncement(clubId, {
        title: form.title.trim(),
        content: form.content.trim(),
        isPinned: form.isPinned,
      });

      const newAnnouncement = res.data?.announcement || {
        id: res.data?.id || `temp-${Date.now()}`,
        title: form.title.trim(),
        content: form.content.trim(),
        isPinned: form.isPinned,
        createdAt: new Date().toISOString(),
      };

      // Add to list and sort pinned on top
      setAnnouncements((prev) => {
        const next = [newAnnouncement, ...prev];
        return next.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      });

      setForm({ title: "", content: "", isPinned: false });
      setIsFormOpen(false);
      showNotification("Announcement published successfully!", "success");
      if (onUpdate) onUpdate();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to post announcement",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    setActionLoadingId(announcementId);
    try {
      await deleteClubAnnouncement(clubId, announcementId);
      setAnnouncements((prev) => prev.filter((a) => (a.id || a._id) !== announcementId));
      showNotification("Announcement deleted successfully", "success");
      if (onUpdate) onUpdate();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to delete announcement",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePin = async (announcementId) => {
    setActionLoadingId(announcementId);
    try {
      await togglePinClubAnnouncement(clubId, announcementId);
      setAnnouncements((prev) => {
        const next = prev.map((a) =>
          (a.id || a._id) === announcementId ? { ...a, isPinned: !a.isPinned } : a
        );
        return next.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      });
      showNotification("Announcement pin status updated", "success");
      if (onUpdate) onUpdate();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to update pin status",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const pinnedCount = announcements.filter((a) => a.isPinned).length;

  return (
    <section
      id="announcements"
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs scroll-mt-20 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <i className="ri-megaphone-line text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Club Announcements
              </h2>
              {announcements.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-neutral-700">
                  {announcements.length}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Broadcast updates, important alerts, and notices for {clubName}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
              isFormOpen
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            <i className={isFormOpen ? "ri-close-line text-sm" : "ri-add-line text-sm"} />
            {isFormOpen ? "Cancel" : "Post Announcement"}
          </button>
        )}
      </div>

      {isFormOpen && canManage && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 sm:p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-orange-200/60 dark:border-orange-900/30 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <i className="ri-edit-line" /> Compose New Announcement
            </h3>
            <span className="text-[11px] text-neutral-400">Visible to all students & members</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Registrations open for Annual Hackathon 2026!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                required
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                Announcement Content <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Write your announcement details, instructions, links, or guidelines here..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-y"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded accent-orange-600 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <i className="ri-pushpin-line text-orange-600" /> Pin announcement to top of feed
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-sm" /> Publishing...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line text-sm" /> Publish Announcement
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements Feed */}
      {announcements.length > 0 ? (
        <div className="space-y-3.5">
          {announcements.map((item) => {
            const itemId = item.id || item._id;
            const isLoading = actionLoadingId === itemId;

            return (
              <div
                key={itemId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  item.isPinned
                    ? "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/30 dark:border-orange-500/30"
                    : "bg-neutral-50/50 dark:bg-neutral-800/30 border-neutral-200/80 dark:border-neutral-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 rounded-md border border-orange-200 dark:border-orange-900/50">
                        <i className="ri-pushpin-fill text-[11px] font-light" /> Pinned
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white break-words">
                      {item.title}
                    </h3>
                  </div>

                  <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0 whitespace-nowrap">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <i className="ri-user-line text-xs" />
                    <span>Posted by {item.authorName || item.createdBy?.name || clubName}</span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(itemId)}
                        disabled={isLoading}
                        title={item.isPinned ? "Unpin announcement" : "Pin announcement"}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                          item.isPinned
                            ? "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40 hover:bg-orange-100"
                            : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        <i className={item.isPinned ? "ri-pushpin-fill text-xs font-light" : "ri-pushpin-line text-xs font-light"} />
                        <span className="hidden sm:inline">{item.isPinned ? "Unpin" : "Pin"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(itemId)}
                        disabled={isLoading}
                        title="Delete announcement"
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-white dark:bg-neutral-800 text-red-600 dark:text-red-400 border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900/40 transition-colors cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-xs font-light" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/20 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <i className="ri-megaphone-line text-2xl" />
          </div>
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            No announcements posted yet.
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">
            Keep your members updated with announcements about upcoming events, meetings, and recruitments.
          </p>
          {canManage && !isFormOpen && (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-700 transition cursor-pointer"
            >
              <i className="ri-add-line" /> Post First Announcement
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ClubAnnouncementsSection;
