import React, { useState, useRef } from "react";
import { Clock, Building2, AlertTriangle, Layers, GripHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM (14 hours range)
const HOUR_WIDTH_PX = 110; // Width in pixels per hour for clear horizontal readability

const CATEGORY_COLORS = {
  Technical: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  Cultural: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  Sports: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  Academic: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
  DEFAULT: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/60"
};

const STATUS_BADGES = {
  PUBLISHED: { bg: "bg-emerald-500", label: "Approved" },
  PENDING: { bg: "bg-amber-500", label: "Pending" },
  DRAFT: { bg: "bg-neutral-400", label: "Draft" },
  REJECTED: { bg: "bg-rose-500", label: "Rejected" },
  CANCELLED: { bg: "bg-neutral-500", label: "Cancelled" }
};

const VenueTimelineView = ({
  currentDate,
  venues = [],
  events = [],
  blackouts = [],
  onSelectEvent,
  onInitiateReschedule,
  canEdit = true
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBlackouts = Array.isArray(blackouts) ? blackouts : [];
  const safeVenues = Array.isArray(venues) ? venues : [];

  const dStr = currentDate.toDateString();

  // Filter events matching visible day
  const dayEvents = safeEvents.filter((e) => {
    const eDate = new Date(e.startTime || e.eventDate);
    return eDate.toDateString() === dStr;
  });

  // Filter blackouts matching visible day
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dayBlackouts = safeBlackouts.filter((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return bStart < endOfDay && bEnd > startOfDay;
  });

  const formatHourLabel = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h.toString().padStart(2, "0")}:00 ${period}`;
  };

  const getXPosition = (timeDateObj) => {
    const d = new Date(timeDateObj);
    const hours = d.getHours() + d.getMinutes() / 60;
    const clampedHours = Math.max(8, Math.min(22, hours));
    return (clampedHours - 8) * HOUR_WIDTH_PX;
  };

  const getWidth = (startObj, endObj) => {
    const s = new Date(startObj);
    const e = new Date(endObj);
    let sH = s.getHours() + s.getMinutes() / 60;
    let eH = e.getHours() + e.getMinutes() / 60;
    sH = Math.max(8, Math.min(22, sH));
    eH = Math.max(8, Math.min(22, eH));
    const hoursDuration = Math.max(0.5, eH - sH);
    return hoursDuration * HOUR_WIDTH_PX;
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const showCurrentTimeLine = isToday && currentHour >= 8 && currentHour <= 22;
  const currentTimeX = (currentHour - 8) * HOUR_WIDTH_PX;

  // Drag state for interactive rescheduling preview
  const [dragState, setDragState] = useState(null);

  const handleDragStart = (e, eventItem, type = "move") => {
    if (!canEdit) return;
    e.stopPropagation();
    setDragState({
      event: eventItem,
      type, // "move" or "resize"
      initialX: e.clientX,
      originalStart: new Date(eventItem.startTime),
      originalEnd: new Date(eventItem.endTime),
      currentVenue: eventItem.venue,
      newStart: new Date(eventItem.startTime),
      newEnd: new Date(eventItem.endTime),
      newVenue: eventItem.venue
    });
  };

  const handleDragOver = (e) => {
    if (!dragState) return;
    e.preventDefault();
  };

  const handleDropOnVenue = (targetVenueName) => {
    if (!dragState) return;
    if (onInitiateReschedule) {
      onInitiateReschedule({
        event: dragState.event,
        newStart: dragState.newStart,
        newEnd: dragState.newEnd,
        newVenue: targetVenueName || dragState.newVenue
      });
    }
    setDragState(null);
  };

  const venueList = safeVenues.map((v) => (typeof v === "string" ? v : v.name || v.venueName || "Unnamed Venue"));

  return (
    <div className="bg-cn-surface border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-3 px-4 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xs">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-black dark:text-white tracking-wide">
              Venue Timeline Grid — {currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </h3>
            <p className="text-[11px] text-neutral-400 font-medium">
              {venueList.length} venues mapped • {canEdit ? "Drag blocks or handles to reschedule" : "View-only schedule"}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Technical
          </span>
          <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Cultural
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sports
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Academic
          </span>
        </div>
      </div>

      {/* Main Scrollable Timeline Grid Container */}
      <div className="overflow-x-auto relative">
        <div
          className="min-w-max"
          style={{ width: `${200 + HOURS.length * HOUR_WIDTH_PX}px` }}
          onDragOver={handleDragOver}
        >
          {/* Timeline Header Row (Sticky top) */}
          <div className="flex border-b border-neutral-200 dark:border-zinc-800 bg-neutral-100/80 dark:bg-zinc-900 sticky top-0 z-30">
            <div
              className="w-[200px] shrink-0 p-3 bg-neutral-100 dark:bg-zinc-900 border-r border-neutral-200 dark:border-zinc-800 text-xs font-black uppercase text-neutral-400 tracking-wider sticky left-0 z-40"
            >
              Venues ({venueList.length})
            </div>

            <div className="flex-1 flex divide-x divide-neutral-200/60 dark:divide-zinc-800/60">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ width: `${HOUR_WIDTH_PX}px` }}
                  className="shrink-0 p-2.5 text-center text-xs font-black text-neutral-500 dark:text-neutral-400 tracking-wide"
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Venue Grid Rows */}
          <div className="divide-y divide-neutral-100 dark:divide-zinc-800/60 relative">
            {/* Vertical Current Time Line Overlay */}
            {showCurrentTimeLine && (
              <div
                style={{ left: `${200 + currentTimeX}px` }}
                className="absolute top-0 bottom-0 z-20 border-l-2 border-rose-500 pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1 -mt-1" />
              </div>
            )}

            {venueList.map((venueName) => {
              const venueEvents = dayEvents.filter((e) => e.venue === venueName);
              const venueBlackouts = dayBlackouts.filter((b) => b.venue === venueName);

              return (
                <div
                  key={venueName}
                  onDrop={() => handleDropOnVenue(venueName)}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex min-h-[75px] group hover:bg-neutral-50/50 dark:hover:bg-zinc-900/30 transition-colors relative"
                >
                  {/* Sticky Venue Left Label Column */}
                  <div
                    className="w-[200px] shrink-0 p-3 bg-cn-surface group-hover:bg-neutral-50 dark:group-hover:bg-zinc-900/80 border-r border-neutral-200 dark:border-zinc-800 sticky left-0 z-20 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 size={15} className="text-neutral-400 shrink-0" />
                      <span className="text-xs font-bold text-black dark:text-white truncate">
                        {venueName}
                      </span>
                    </div>

                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-400">
                      {venueEvents.length}
                    </span>
                  </div>

                  {/* Horizontal Time Slots Container for this Venue */}
                  <div className="flex-1 relative flex divide-x divide-neutral-100 dark:divide-zinc-800/40 min-h-[75px]">
                    {/* Background hour grid lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{ width: `${HOUR_WIDTH_PX}px` }}
                        className="shrink-0 h-full border-r border-neutral-100 dark:border-zinc-800/40"
                      />
                    ))}

                    {venueBlackouts.map((b) => {
                      const leftPx = getXPosition(b.startTime);
                      const widthPx = getWidth(b.startTime, b.endTime);

                      return (
                        <div
                          key={b.id || b._id}
                          style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                          className="absolute top-2 bottom-2 z-10 bg-rose-500/20 border-2 border-rose-500/40 rounded-xl p-2 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 overflow-hidden shadow-sm"
                        >
                          <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                          <div className="truncate">
                            <p className="font-black text-[11px] uppercase tracking-wider">
                              BLACKOUT: {b.title}
                            </p>
                            <p className="text-[10px] opacity-80 truncate">{b.reason || "Maintenance"}</p>
                          </div>
                        </div>
                      );
                    })}

                    {venueEvents.map((event) => {
                      const leftPx = getXPosition(event.startTime);
                      const widthPx = getWidth(event.startTime, event.endTime);
                      const category = event.club?.category || "Technical";
                      const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;
                      const statusInfo = STATUS_BADGES[event.reviewStatus] || STATUS_BADGES.PENDING;

                      const startStr = new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const endStr = new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      return (
                        <div
                          key={event.id || event._id}
                          draggable={canEdit}
                          onDragStart={(e) => handleDragStart(e, event, "move")}
                          onClick={() => onSelectEvent(event)}
                          style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                          className={`absolute top-2 bottom-2 z-10 p-2.5 rounded-2xl border text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-grab active:cursor-grabbing flex flex-col justify-between overflow-hidden group/block ${colorClass}`}
                        >
                          <div className="flex items-center justify-between gap-1 leading-tight mb-1">
                            <h5 className="font-extrabold text-xs text-black dark:text-white truncate">
                              {event.title}
                            </h5>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.bg}`}
                              title={`Status: ${statusInfo.label}`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold opacity-90">
                            <span className="truncate">{event.club?.clubName || "Club"}</span>
                            <span className="shrink-0">{startStr} - {endStr}</span>
                          </div>

                          {/* Resize Right Handle */}
                          {canEdit && (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, event, "resize")}
                              className="absolute right-0 top-0 bottom-0 w-2.5 hover:bg-black/20 dark:hover:bg-white/20 cursor-ew-resize opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center justify-center"
                              title="Drag to resize duration"
                            >
                              <div className="w-1 h-4 bg-neutral-400 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {venueList.length === 0 && (
              <div className="py-16 text-center text-neutral-400 text-sm">
                No venues configured. Please add venues from the Venues tab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueTimelineView;
