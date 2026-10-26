import React, { useState } from "react";
import {
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getEventColorPalette } from "./calendarColorUtils";
import DayEventsOverviewModal from "./DayEventsOverviewModal";

const MonthView = ({
  currentDate,
  events = [],
  blackouts = [],
  onSelectEvent,
  onSelectDate,
  onDateChange,
}) => {
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

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

  const handleDayClick = (cellDate, dayEvents) => {
    if (dayEvents.length > 0) {
      setSelectedDayInfo({ date: cellDate, events: dayEvents });
    } else if (onSelectDate) {
      onSelectDate(cellDate);
    } else {
      setSelectedDayInfo({ date: cellDate, events: [] });
    }
  };

  const handlePrevMonth = () => {
    if (!onDateChange) return;
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    onDateChange(prev);
  };

  const handleNextMonth = () => {
    if (!onDateChange) return;
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    onDateChange(next);
  };

  const handleToday = () => {
    if (!onDateChange) return;
    onDateChange(new Date());
  };

  return (
    <div className="bg-cn-surface border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Optional Integrated Month Header when onDateChange is passed */}
      {onDateChange && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 dark:border-zinc-800 bg-cn-surface text-cn-text hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-zinc-800 bg-cn-surface text-cn-text hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-zinc-800 bg-cn-surface text-cn-text hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60">
        {dayNames.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
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
              onClick={() => handleDayClick(cell.date, dayEvents)}
              className={`min-h-[92px] sm:min-h-[115px] md:min-h-[125px] p-1.5 sm:p-2 flex flex-col transition-colors cursor-pointer group ${
                cell.isCurrentMonth
                  ? "bg-cn-surface hover:bg-neutral-50/80 dark:hover:bg-zinc-900/40"
                  : "bg-neutral-50/50 dark:bg-zinc-950/40 text-neutral-400 opacity-60"
              }`}
            >
              {/* Cell Header: Day Number + Event Count Badge */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
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
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Blackout Warnings */}
              {dayBlackouts.map((b) => (
                <div
                  key={b.id || b._id}
                  className="mb-1 p-1 bg-rose-500/15 border border-rose-500/30 rounded-lg text-[10px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate"
                >
                  <AlertTriangle size={10} className="shrink-0 text-rose-500" />
                  <span className="truncate">{b.venue}: CLOSED</span>
                </div>
              ))}

              {/* 1) MOBILE / TABLET COMPACT VIEW: COLOR DOTS ONLY */}
              <div className="flex md:hidden flex-wrap items-center gap-1 mt-1 flex-1">
                {dayEvents.slice(0, 4).map((event, evIdx) => {
                  const palette = getEventColorPalette(event, evIdx);
                  return (
                    <span
                      key={event.id || event._id || evIdx}
                      className={`w-2.5 h-2.5 rounded-full ${palette.dot} ring-1 ring-white/40 dark:ring-black/40`}
                      title={`${event.title} (${event.club?.clubName || "Club"})`}
                    />
                  );
                })}
                {dayEvents.length > 4 && (
                  <span className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
                    +{dayEvents.length - 4}
                  </span>
                )}
              </div>

              {/* 2) DESKTOP VIEW: TRUNCATE EVENT NAMES WITH DISTINCT CLUB COLORS */}
              <div className="hidden md:flex flex-col space-y-1 flex-1 overflow-hidden mt-0.5">
                {dayEvents.slice(0, 3).map((event, evIdx) => {
                  const palette = getEventColorPalette(event, evIdx);
                  return (
                    <div
                      key={event.id || event._id || evIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayInfo({ date: cell.date, events: dayEvents });
                      }}
                      className={`px-1.5 py-0.5 sm:py-1 rounded-md border text-[11px] font-medium transition-all hover:scale-[1.01] cursor-pointer flex items-center gap-1.5 min-w-0 ${palette.bg} ${palette.border} ${palette.text}`}
                      title={`${event.title} • ${event.club?.clubName || "Club"}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${palette.dot}`} />
                      <span className="truncate max-w-full font-medium leading-tight">
                        {event.title}
                      </span>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 text-left pl-1">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Events Overview Modal with Direct Event Page Links */}
      <DayEventsOverviewModal
        isOpen={Boolean(selectedDayInfo)}
        date={selectedDayInfo?.date}
        events={selectedDayInfo?.events || []}
        onClose={() => setSelectedDayInfo(null)}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
};

export default MonthView;
