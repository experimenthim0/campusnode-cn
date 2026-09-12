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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur transition-all">
      <div className="w-full max-w-md bg-cn-surface border border-cn-border rounded-2xl shadow-2xl overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-cn-text leading-tight">
                {editingBlackout ? "Edit Venue Blackout" : "Add Venue Blackout"}
              </h3>
              <p className="text-xs text-cn-text-muted font-normal mt-0.5">
                Block a venue for maintenance, exams, or convocation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-cn-text-secondary">
          <div>
            <label className="block text-xs font-bold text-cn-text mb-1.5">
              Select Venue <span className="text-brand-500">*</span>
            </label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-cn-surface-muted border border-cn-border rounded-xl text-xs sm:text-[13px] font-bold text-cn-text outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
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
            <label className="block text-xs font-bold text-cn-text mb-1.5">
              Blackout Title / Reason <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Annual Maintenance, Examination, Convocation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-cn-surface-muted border border-cn-border rounded-xl text-xs sm:text-[13px] font-medium text-cn-text placeholder-cn-text-muted outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-cn-text mb-1.5">
              Additional Details / Description
            </label>
            <textarea
              placeholder="Optional notes regarding the restriction..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-cn-surface-muted border border-cn-border rounded-xl text-xs sm:text-[13px] font-medium text-cn-text placeholder-cn-text-muted outline-none focus:border-brand-500 dark:focus:border-brand-400 resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-cn-text mb-1.5">
                Start Date & Time <span className="text-brand-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cn-surface-muted border border-cn-border rounded-xl text-xs sm:text-[13px] font-medium text-cn-text outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-cn-text mb-1.5">
                End Date & Time <span className="text-brand-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cn-surface-muted border border-cn-border rounded-xl text-xs sm:text-[13px] font-medium text-cn-text outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-cn-border-subtle">
            {editingBlackout ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted dark:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-cn-bg text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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
