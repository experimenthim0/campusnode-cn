import React from "react";
import { Clock, MapPin, Building2, AlertTriangle } from "lucide-react";

// Category color mappings following CampusNode design system
const CATEGORY_COLORS = {
  Technical: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  Cultural: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  Sports: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  Academic: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
  DEFAULT: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/40"
};

const STATUS_BADGES = {
  PUBLISHED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  DRAFT: "bg-neutral-400 text-white",
  REJECTED: "bg-rose-500 text-white"
};

const MonthView = ({ currentDate, events = [], blackouts = [], onSelectEvent, onSelectDate }) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBlackouts = Array.isArray(blackouts) ? blackouts : [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Grid days generation
  const gridCells = [];

  // Padding days from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, day);
    gridCells.push({ date: dateObj, isCurrentMonth: false });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    gridCells.push({ date: dateObj, isCurrentMonth: true });
  }

  // Padding days for next month to complete grid
  const remainingCells = 42 - gridCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const dateObj = new Date(year, month + 1, d);
    gridCells.push({ date: dateObj, isCurrentMonth: false });
  }

  const isToday = (dateObj) => {
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDate = (dateObj) => {
    const dStr = dateObj.toDateString();
    return safeEvents.filter((e) => {
      const eDate = new Date(e.startTime || e.eventDate);
      return eDate.toDateString() === dStr;
    });
  };

  const getBlackoutsForDate = (dateObj) => {
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    return safeBlackouts.filter((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < endOfDay && bEnd > startOfDay;
    });
  };

  return (
    <div className="bg-cn-surface border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60">
        {dayNames.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Month Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-neutral-100 dark:divide-zinc-800/60">
        {gridCells.map((cell, idx) => {
          const dayEvents = getEventsForDate(cell.date);
          const dayBlackouts = getBlackoutsForDate(cell.date);
          const today = isToday(cell.date);

          return (
            <div
              key={idx}
              onClick={() => onSelectDate && onSelectDate(cell.date)}
              className={`min-h-[120px] p-1.5 flex flex-col transition-colors cursor-pointer ${
                cell.isCurrentMonth
                  ? "bg-cn-surface hover:bg-neutral-50/80 dark:hover:bg-zinc-900/40"
                  : "bg-neutral-50/50 dark:bg-zinc-950/40 text-neutral-400 opacity-60"
              }`}
            >
              {/* Cell Header: Day Number + Density Badge */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    today
                      ? "bg-brand-600 text-white shadow-sm"
                      : cell.isCurrentMonth
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-400"
                  }`}
                >
                  {cell.date.getDate()}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300">
                    {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>

              {/* Blackout Warnings */}
              {dayBlackouts.map((b) => (
                <div
                  key={b.id || b._id}
                  className="mb-1 p-1 bg-rose-500/15 border border-rose-500/30 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate"
                >
                  <AlertTriangle size={10} className="shrink-0 text-rose-500" />
                  <span className="truncate">{b.venue}: CLOSED</span>
                </div>
              ))}

              {/* Day Event Blocks */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  const category = event.club?.category || "Technical";
                  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;
                  const statusDot = STATUS_BADGES[event.reviewStatus] || "bg-neutral-400";
                  const timeStr = event.startTime
                    ? new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <div
                      key={event.id || event._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className={`p-1.5 rounded-xl border text-[11px] font-semibold transition-all hover:scale-[1.02] cursor-pointer ${colorClass}`}
                    >
                      <div className="flex items-center justify-between gap-1 leading-tight mb-0.5">
                        <span className="font-bold truncate text-black dark:text-white">
                          {event.title}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} title={`Status: ${event.reviewStatus}`} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-80">
                        <span className="truncate">{event.club?.clubName || "Club"}</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <p className="text-[10px] font-bold text-neutral-400 text-center pt-0.5">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
