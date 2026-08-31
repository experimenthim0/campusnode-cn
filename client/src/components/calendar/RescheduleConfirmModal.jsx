import React, { useState } from "react";
import { X, Clock, MapPin, Calendar, AlertTriangle, Check, RotateCcw } from "lucide-react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const RescheduleConfirmModal = ({
  rescheduleData,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showNotification } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !rescheduleData) return null;

  const { event, newStart, newEnd, newVenue } = rescheduleData;

  const origStart = new Date(event.startTime);
  const origEnd = new Date(event.endTime);
  const origVenue = event.venue;

  const formatDt = (d) =>
    d ? d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const payload = {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        venue: newVenue
      };

      const res = await api.put(`/api/events/${event.id || event._id}/reschedule`, payload);

      showNotification(res.data.message || "Event rescheduled successfully", "success");
      if (onSuccess) onSuccess(res.data.event);
      onClose();
    } catch (err) {
      console.error("Reschedule error:", err);
      const msg = err.response?.data?.message || "Failed to reschedule event. Venue may be booked or unavailable.";
      showNotification(msg, "error");
      onClose(); // Triggers calendar revert
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-black dark:text-white">
                Reschedule Event?
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Please confirm the proposed schedule changes.
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

        {/* Event Title */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800">
          <p className="text-[10px] font-black uppercase text-neutral-400">Target Event</p>
          <p className="text-sm font-black text-black dark:text-white mt-0.5">{event.title}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">{event.club?.clubName}</p>
        </div>

        {/* Schedule Comparison Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Schedule */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/40 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Current Schedule
            </p>
            <div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{formatDt(origStart)}</p>
              <p className="text-[11px] text-neutral-400">to {formatDt(origEnd)}</p>
            </div>
            <p className="text-xs font-extrabold text-neutral-600 dark:text-neutral-400 pt-1 border-t border-neutral-200/60 dark:border-zinc-800">
              Venue: {origVenue}
            </p>
          </div>

          {/* New Proposed Schedule */}
          <div className="p-4 rounded-2xl border-2 border-orange-500/60 bg-orange-50/30 dark:bg-orange-950/20 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
              New Schedule
            </p>
            <div>
              <p className="text-xs font-bold text-black dark:text-white">{formatDt(newStart)}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">to {formatDt(newEnd)}</p>
            </div>
            <p className="text-xs font-extrabold text-orange-600 dark:text-orange-400 pt-1 border-t border-orange-200 dark:border-orange-900">
              Venue: {newVenue}
            </p>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          The change will be validated against active venue bookings & blackouts before saving.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? "Validating & Saving..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleConfirmModal;
