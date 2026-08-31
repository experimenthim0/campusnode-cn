import React from "react";
import { Shield, PlusCircle } from "lucide-react";
import EventStaffManager from "../../components/EventStaffManager";

const CentralStaffDelegation = ({
  events,
  selectedEvent,
  setSelectedEvent,
  onCreateClick,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-12 text-center rounded-2xl shadow-xs">
        <Shield className="mx-auto text-neutral-400 mb-3" size={44} />
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No Central Events Available</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Create a college-wide event first to delegate event staff and scanner operators.
        </p>
        <button
          onClick={onCreateClick}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          <PlusCircle size={15} />
          Create College Event
        </button>
      </div>
    );
  }

  if (!selectedEvent) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Managing Staff For
          </p>
          <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">
            {selectedEvent.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Select Event:</span>
          <select
            value={selectedEvent.id}
            onChange={(e) => {
              const ev = events.find((x) => x.id === e.target.value);
              if (ev) setSelectedEvent(ev);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Delegation Manager Component */}
      <EventStaffManager eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
    </div>
  );
};

export default CentralStaffDelegation;
