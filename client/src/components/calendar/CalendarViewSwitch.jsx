import React from "react";
import { List, Calendar, Layers } from "lucide-react";

const CalendarViewSwitch = ({ activeView, onViewChange }) => {
  const views = [
    { id: "list", label: "List View", icon: List },
    { id: "calendar", label: "Calendar View", icon: Calendar },
    { id: "timeline", label: "Venue Timeline", icon: Layers },
  ];

  return (
    <div className="inline-flex items-center p-1 bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl">
      {views.map((v) => {
        const Icon = v.icon;
        const isActive = activeView === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewChange(v.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              isActive
                ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Icon size={14} className={isActive ? "text-brand-500" : ""} />
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CalendarViewSwitch;
