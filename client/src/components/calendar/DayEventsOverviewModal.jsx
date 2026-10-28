import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Info,
} from "lucide-react";

import { getEventColorPalette } from "./calendarColorUtils";

// Extract a short preview from event content
const getShortText = (htmlOrMd, maxLen = 140) => {
  if (!htmlOrMd) return "";

  const plain = htmlOrMd
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`~\[\]\(\)]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLen) return plain;

  return plain.slice(0, maxLen).trimEnd() + "...";
};

const DayEventsOverviewModal = ({
  isOpen,
  onClose,
  date,
  events = [],
  onSelectEvent,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !date) return null;

  const dateHeading = date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 dark:bg-black/70 p-3 sm:p-4 modal-backdrop-blur animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-events-title"
    >
      <div
        className="relative my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cn-border bg-cn-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-cn-border bg-cn-surface-muted/40 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Calendar size={18} />
            </div> */}

            <div className="min-w-0">
              <h3
                id="day-events-title"
                className="text-base font-medium leading-snug text-cn-text sm:text-lg"
              >
                {dateHeading}
              </h3>

              <p className="mt-0.5 text-xs text-cn-text-muted">
                {safeEvents.length}{" "}
                {safeEvents.length === 1 ? "event" : "events"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cn-text-muted transition-colors hover:bg-neutral-200/60 hover:text-cn-text dark:hover:bg-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        {/* Event List */}
        <div className="min-h-0 space-y-3 overflow-y-auto p-3 sm:p-5">
          {safeEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-cn-surface-muted">
                <Info size={20} className="text-cn-text-muted" />
              </div>

              <p className="text-sm font-medium text-cn-text">
                No events scheduled
              </p>
            </div>
          ) : (
            safeEvents.map((event, idx) => {
              const palette = getEventColorPalette(event, idx);

              const eventSlugOrId =
                event.slug || event.id || event._id;

              const eventPageLink = `/event/${eventSlugOrId}`;

              const start = event.startTime
                ? new Date(event.startTime)
                : null;

              const end = event.endTime
                ? new Date(event.endTime)
                : null;

              const timeString = start
                ? `${start.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}${
                    end
                      ? ` – ${end.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}`
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
                getShortText(
                  event.description || event.details,
                  150
                );

              return (
                <div
                  key={eventSlugOrId || idx}
                  className="group relative min-w-0 rounded-xl border border-cn-border bg-card p-4 transition-colors duration-200 hover:border-brand-500/40"
                >
                  {/* Club and Category */}
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${palette.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.dot}`}
                      />

                      <span className="truncate max-w-[200px]">
                        {clubTitle}
                      </span>
                    </span>

                    {event.category && (
                      <span className="text-[11px] text-cn-text-muted">
                        {event.category}
                      </span>
                    )}
                  </div>

                  {/* Event Title */}
                  <h4 className="break-words text-[15px] font-medium leading-snug text-cn-text sm:text-base">
                    {event.title}
                  </h4>

                  {/* Time and Venue */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-cn-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Clock
                        size={14}
                        className="shrink-0 text-cn-text-muted"
                      />

                      <span>{timeString}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin
                        size={14}
                        className="shrink-0 text-cn-text-muted"
                      />

                      <span className="max-w-[200px] truncate">
                        {venueText}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {shortDesc && (
                    <p className="mt-2.5 line-clamp-2 break-words text-xs leading-relaxed text-cn-text-secondary">
                      {shortDesc}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to={eventPageLink}
                      onClick={onClose}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cn-border bg-cn-surface px-3 py-1.5 text-xs font-medium text-cn-text transition-colors hover:border-brand-500/40 hover:bg-brand-500/5 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                    >
                      View Details
                      <ArrowUpRight size={14} />
                    </Link>

                    {onSelectEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectEvent(event);
                        }}
                        className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-cn-text-secondary transition-colors hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                      >
                        Quick View
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DayEventsOverviewModal;