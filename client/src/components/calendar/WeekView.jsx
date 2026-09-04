import React from "react";
import { Clock, MapPin, AlertTriangle } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

const CATEGORY_COLORS = {
  Technical: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  Cultural: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  Sports: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  Academic: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
  DEFAULT: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/40"
};

const STATUS_BADGES = {
  PUBLISHED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  DRAFT: "bg-neutral-400",
  REJECTED: "bg-rose-500"
};

const WeekView = ({ currentDate, events = [], blackouts = [], onSelectEvent }) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBlackouts = Array.isArray(blackouts) ? blackouts : [];

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h.toString().padStart(2, "0")}:00 ${period}`;
  };

  const getEventsForDay = (dateObj) => {
    const dStr = dateObj.toDateString();
    return safeEvents.filter((e) => {
      const eDate = new Date(e.startTime || e.eventDate);
      return eDate.toDateString() === dStr;
    });
  };

  const getBlackoutsForDay = (dateObj) => {
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

  const getBlockStyle = (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    let startHour = start.getHours() + start.getMinutes() / 60;
    let endHour = end.getHours() + end.getMinutes() / 60;

    // Clamp between 8 AM and 10 PM
    startHour = Math.max(8, Math.min(22, startHour));
    endHour = Math.max(8, Math.min(22, endHour));

    const duration = Math.max(0.5, endHour - startHour);
    const top = (startHour - 8) * 60;
    const height = duration * 60;

    return {
      top: `${top}px`,
      height: `${height}px`
    };
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60 sticky top-0 z-20">
        <div className="py-3 text-center text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 border-r border-neutral-200 dark:border-zinc-800">
          Time
        </div>
        {weekDays.map((dayObj, i) => {
          const isToday =
            dayObj.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className="py-2.5 px-2 text-center border-r border-neutral-100 dark:border-zinc-800/80 last:border-r-0"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                {dayObj.toLocaleDateString("default", { weekday: "short" })}
              </p>
              <p
                className={`text-sm font-black mx-auto inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                  isToday
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-neutral-900 dark:text-white"
                }`}
              >
                {dayObj.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hourly Schedule Body */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] relative overflow-y-auto max-h-[600px] divide-x divide-neutral-100 dark:divide-zinc-800/60">
        {/* Time Axis Column */}
        <div className="divide-y divide-neutral-100 dark:divide-zinc-800/60 bg-neutral-50/50 dark:bg-zinc-950/40">
          {HOURS.map((h) => (
            <div
              key={h}
              className="h-[60px] pr-2 flex items-start justify-end text-[10px] font-bold text-neutral-400 pt-1"
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* 7 Day Columns */}
        {weekDays.map((dayObj, colIdx) => {
          const dayEvents = getEventsForDay(dayObj);
          const dayBlackouts = getBlackoutsForDay(dayObj);

          return (
            <div key={colIdx} className="relative h-[900px] bg-white dark:bg-[#0a0a0a]">
              {/* Background hour grid lines */}
              {HOURS.map((h, i) => (
                <div
                  key={i}
                  className="h-[60px] border-b border-neutral-100 dark:border-zinc-800/40"
                />
              ))}

              {dayBlackouts.map((b) => {
                const style = getBlockStyle(b.startTime, b.endTime);
                return (
                  <div
                    key={b.id || b._id}
                    style={style}
                    className="absolute left-1 right-1 z-10 bg-rose-500/20 border-2 border-rose-500/40 rounded-xl p-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                      <span className="font-extrabold truncate">{b.venue} BLACKOUT</span>
                    </div>
                    <p className="truncate opacity-80">{b.title}</p>
                  </div>
                );
              })}

              {dayEvents.map((event) => {
                const style = getBlockStyle(event.startTime, event.endTime);
                const category = event.club?.category || "Technical";
                const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;
                const statusDot = STATUS_BADGES[event.reviewStatus] || "bg-neutral-400";

                const startStr = new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const endStr = new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <div
                    key={event.id || event._id}
                    onClick={() => onSelectEvent(event)}
                    style={style}
                    className={`absolute left-1 right-1 z-10 p-2 rounded-xl border text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden ${colorClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-black dark:text-white truncate">
                          {event.title}
                        </span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                      </div>
                      <p className="text-[10px] opacity-80 truncate">{event.club?.clubName}</p>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] font-bold opacity-90">
                      <span className="truncate">{event.venue}</span>
                      <span>{startStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
