import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Building2,
  Info,
} from "lucide-react";
import { getEventColorPalette } from "./calendarColorUtils";
import { markdownToHtml } from "../../utils/htmlMarkdownConverter";

// Simple strip of HTML/markdown for short clean previews
const getShortText = (htmlOrMd, maxLen = 140) => {
  if (!htmlOrMd) return "";
  const plain = htmlOrMd
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_`~\[\]\(\)]/g, "")
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen) + "...";
};

const DayEventsOverviewModal = ({
  isOpen,
  onClose,
  date,
  events = [],
  onSelectEvent,
}) => {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !date) return null;

  const dateHeading = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-blur flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-cn-surface border border-cn-border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-cn-border bg-cn-surface-muted/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-cn-text leading-tight">
                {dateHeading}
              </h3>
              <p className="text-xs text-cn-text-muted font-medium">
                {safeEvents.length}{" "}
                {safeEvents.length === 1 ? "Event Scheduled" : "Events Scheduled"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-cn-text-muted hover:text-cn-text hover:bg-neutral-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Event List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {safeEvents.length === 0 ? (
            <div className="py-12 text-center text-cn-text-muted">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center">
                <Info size={22} className="text-neutral-400" />
              </div>
              <p className="text-sm font-semibold text-cn-text">No events on this date</p>
              <p className="text-xs text-cn-text-muted mt-1">
                There are no scheduled activities or sessions for {dateHeading}.
              </p>
            </div>
          ) : (
            safeEvents.map((event, idx) => {
              const palette = getEventColorPalette(event, idx);
              const eventSlugOrId = event.slug || event.id || event._id;
              const eventPageLink = `/event/${eventSlugOrId}`;

              const start = event.startTime ? new Date(event.startTime) : null;
              const end = event.endTime ? new Date(event.endTime) : null;
              const timeString = start
                ? `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${
                    end
                      ? ` – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : ""
                  }`
                : "Time TBA";

              const clubTitle =
                event.club?.clubName ||
                event.organizers?.[0]?.club?.clubName ||
                "Campus Organization";

              const venueText = event.venue || "Venue TBA";
              const shortDesc =
                event.tagline ||
                getShortText(event.description || event.details, 150) ||
                "Join us for an exciting campus event featuring interactive sessions and networking.";

              return (
                <div
                  key={eventSlugOrId || idx}
                  className={`p-4 rounded-xl border transition-all duration-200 bg-card hover:border-brand-500/40 shadow-xs relative overflow-hidden group`}
                >
                  {/* Left accent color bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${palette.dot}`}
                  />

                  <div className="pl-2">
                    {/* Club Tag + Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${palette.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${palette.dot}`}
                          />
                          <span className="truncate max-w-[200px]">{clubTitle}</span>
                        </span>
                        {event.category && (
                          <span className="text-[11px] font-medium text-cn-text-muted uppercase tracking-wider">
                            • {event.category}
                          </span>
                        )}
                      </div>

                      {event.reviewStatus && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            event.reviewStatus === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : event.reviewStatus === "PENDING"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20"
                          }`}
                        >
                          {event.reviewStatus}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-cn-text group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {event.title}
                    </h4>

                    {/* Quick Metadata: Time & Venue */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-cn-text-secondary mt-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-brand-500 shrink-0" />
                        <span>{timeString}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-brand-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{venueText}</span>
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-cn-text-secondary mt-2.5 leading-relaxed line-clamp-2">
                      {shortDesc}
                    </p>

                    {/* Actions: Direct Event Page Link */}
                    <div className="mt-3.5 pt-3 border-t border-cn-border flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={eventPageLink}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-cn-bg shadow-xs transition-colors cursor-pointer"
                      >
                        <span>View Event Page</span>
                        <ExternalLink size={13} />
                      </Link>

                      {onSelectEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectEvent(event);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-cn-text-secondary hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                        >
                          <span>Manage / Quick View</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-cn-border bg-cn-surface-muted/60 flex items-center justify-between shrink-0 text-xs text-cn-text-muted">
          <span>Click any event to view full details and registration.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-cn-border hover:bg-neutral-200/50 dark:hover:bg-zinc-800 text-cn-text font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayEventsOverviewModal;
