import React, { useState, useEffect } from "react";
import { X, Building2, Calendar, Clock, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const BlackoutModal = ({
  isOpen,
  onClose,
  venues = [],
  editingBlackout = null,
  onSuccess
}) => {
  const { showNotification } = useNotification();
  const [venue, setVenue] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingBlackout) {
      setVenue(editingBlackout.venue || "");
      setTitle(editingBlackout.title || "");
      setReason(editingBlackout.reason || "");
      setStartTime(
        editingBlackout.startTime
          ? new Date(editingBlackout.startTime).toISOString().slice(0, 16)
          : ""
      );
      setEndTime(
        editingBlackout.endTime
          ? new Date(editingBlackout.endTime).toISOString().slice(0, 16)
          : ""
      );
    } else {
      setVenue(venues[0]?.name || (typeof venues[0] === "string" ? venues[0] : "ALT"));
      setTitle("");
      setReason("");
      setStartTime("");
      setEndTime("");
    }
  }, [editingBlackout, venues, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!venue || !title || !startTime || !endTime) {
      showNotification("Please fill in all required fields.", "error");
      return;
    }

    const s = new Date(startTime);
    const eTime = new Date(endTime);
    if (s >= eTime) {
      showNotification("Start time must be before end time.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        venue,
        title,
        reason,
        startTime: s.toISOString(),
        endTime: eTime.toISOString()
      };

      if (editingBlackout) {
        await api.put(`/api/venues/blackouts/${editingBlackout.id || editingBlackout._id}`, payload);
        showNotification("Blackout window updated.", "success");
      } else {
        await api.post('/api/venues/blackouts', payload);
        showNotification("Blackout window scheduled.", "success");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Blackout submit error:", err);
      const msg = err.response?.data?.message || "Failed to save blackout period.";
      showNotification(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBlackout) return;
    if (!window.confirm("Are you sure you want to remove this venue blackout period?")) return;

    try {
      setSubmitting(true);
      await api.delete(`/api/venues/blackouts/${editingBlackout.id || editingBlackout._id}`);
      showNotification("Blackout window removed.", "success");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showNotification("Failed to delete blackout window.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const venueList = venues.map((v) => (typeof v === "string" ? v : v.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-black dark:text-white">
                {editingBlackout ? "Edit Venue Blackout" : "Add Venue Blackout"}
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Block a venue for maintenance, exams, or convocation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Venue *
            </label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-black dark:text-white outline-none focus:border-orange-500"
              required
            >
              {venueList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Blackout Title / Reason *
            </label>
            <input
              type="text"
              placeholder="e.g. Annual Maintenance, Examination, Convocation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Additional Details / Description
            </label>
            <textarea
              placeholder="Optional notes regarding the restriction..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-zinc-800">
            {editingBlackout ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Remove
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {submitting ? "Saving..." : editingBlackout ? "Update Blackout" : "Save Blackout"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlackoutModal;
