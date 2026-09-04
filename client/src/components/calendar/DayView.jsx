import React from "react";
import { Clock, MapPin, Building2, AlertTriangle, Users, CheckCircle, Hourglass } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

const CATEGORY_COLORS = {
  Technical: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  Cultural: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  Sports: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  Academic: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
  DEFAULT: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/40"
};

const DayView = ({ currentDate, events = [], blackouts = [], onSelectEvent }) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBlackouts = Array.isArray(blackouts) ? blackouts : [];

  const dStr = currentDate.toDateString();

  const dayEvents = safeEvents.filter((e) => {
    const eDate = new Date(e.startTime || e.eventDate);
    return eDate.toDateString() === dStr;
  });

  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dayBlackouts = safeBlackouts.filter((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return bStart < endOfDay && bEnd > startOfDay;
  });

  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h.toString().padStart(2, "0")}:00 ${period}`;
  };

  const getBlockStyle = (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    let startHour = start.getHours() + start.getMinutes() / 60;
    let endHour = end.getHours() + end.getMinutes() / 60;

    startHour = Math.max(8, Math.min(22, startHour));
    endHour = Math.max(8, Math.min(22, endHour));

    const duration = Math.max(0.5, endHour - startHour);
    const top = (startHour - 8) * 70;
    const height = duration * 70;

    return {
      top: `${top}px`,
      height: `${height}px`
    };
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const showCurrentTimeLine = isToday && currentHour >= 8 && currentHour <= 22;
  const currentTimeTop = (currentHour - 8) * 70;

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black dark:text-white">
            {currentDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <p className="text-xs text-neutral-400 font-medium">
            {dayEvents.length} scheduled events • {dayBlackouts.length} blackout windows
          </p>
        </div>
      </div>

      {/* Hourly Schedule Body */}
      <div className="grid grid-cols-[90px_1fr] relative overflow-y-auto max-h-[650px] divide-x divide-neutral-100 dark:divide-zinc-800/60">
        {/* Time Labels */}
        <div className="bg-neutral-50/50 dark:bg-zinc-950/40">
          {HOURS.map((h) => (
            <div
              key={h}
              className="h-[70px] pr-3 flex items-start justify-end text-xs font-bold text-neutral-400 pt-1"
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Schedule Day Slot Area */}
        <div className="relative h-[1050px] bg-white dark:bg-[#0a0a0a]">
          {/* Background Hour Lines */}
          {HOURS.map((h, i) => (
            <div key={i} className="h-[70px] border-b border-neutral-100 dark:border-zinc-800/40" />
          ))}

          {/* Red Current Time Line */}
          {showCurrentTimeLine && (
            <div
              style={{ top: `${currentTimeTop}px` }}
              className="absolute left-0 right-0 z-30 border-t-2 border-rose-500 flex items-center"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.25" />
            </div>
          )}

          {dayBlackouts.map((b) => {
            const style = getBlockStyle(b.startTime, b.endTime);
            return (
              <div
                key={b.id || b._id}
                style={style}
                className="absolute left-3 right-3 z-10 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl p-3 text-xs font-bold text-rose-600 dark:text-rose-400 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                  <div>
                    <p className="font-extrabold uppercase tracking-wide">{b.venue} BLACKOUT</p>
                    <p className="opacity-90">{b.title}</p>
                  </div>
                </div>
                {b.reason && <p className="text-[11px] opacity-75 font-normal">Reason: {b.reason}</p>}
              </div>
            );
          })}

          {dayEvents.map((event) => {
            const style = getBlockStyle(event.startTime, event.endTime);
            const category = event.club?.category || "Technical";
            const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.DEFAULT;

            const startStr = new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const endStr = new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={event.id || event._id}
                onClick={() => onSelectEvent(event)}
                style={style}
                className={`absolute left-3 right-3 z-20 p-3 rounded-2xl border text-xs font-medium shadow-sm transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between overflow-hidden ${colorClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-black dark:text-white leading-tight">
                      {event.title}
                    </h4>
                    <p className="text-xs opacity-80">{event.club?.clubName}</p>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-zinc-700">
                    {event.venue}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1.5 opacity-90">
                    <Clock size={13} />
                    <span>
                      {startStr} - {endStr}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase tracking-wider font-extrabold">
                    {event.reviewStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayView;
