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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm transition-all">
      <div className="w-full max-w-lg bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl shadow-2xl overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0 font-bold">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">
                Reschedule Event?
              </h3>
              <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">
                Please confirm the proposed schedule changes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-[#555555] dark:text-[#B5B5B5]">
          {/* Event Title */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">Target Event</p>
            <p className="text-sm font-bold text-[#111111] dark:text-[#F5F5F5] mt-0.5">{event.title}</p>
            <p className="text-xs text-[#F97316] dark:text-[#FB923C] font-bold">{event.club?.clubName}</p>
          </div>

          {/* Schedule Comparison Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Schedule */}
            <div className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-[#FAFAFA] dark:bg-[#222222] space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                Current Schedule
              </p>
              <div>
                <p className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">{formatDt(origStart)}</p>
                <p className="text-[11px] text-[#888888] dark:text-[#808080]">to {formatDt(origEnd)}</p>
              </div>
              <p className="text-xs font-bold text-[#555555] dark:text-[#B5B5B5] pt-1.5 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                Venue: {origVenue}
              </p>
            </div>

            {/* New Proposed Schedule */}
            <div className="p-4 rounded-xl border border-brand-200/80 dark:border-brand-900/60 bg-[#FFF7ED] dark:bg-[#2A1A0F] space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F97316] dark:text-[#FB923C]">
                New Schedule
              </p>
              <div>
                <p className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">{formatDt(newStart)}</p>
                <p className="text-[11px] text-[#555555] dark:text-[#B5B5B5]">to {formatDt(newEnd)}</p>
              </div>
              <p className="text-xs font-bold text-[#F97316] dark:text-[#FB923C] pt-1.5 border-t border-brand-200/60 dark:border-brand-900/40">
                Venue: {newVenue}
              </p>
            </div>
          </div>

          {/* Info Note */}
          <p className="text-xs text-[#888888] dark:text-[#808080] flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            The change will be validated against active venue bookings & blackouts before saving.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? "Validating & Saving..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleConfirmModal;
