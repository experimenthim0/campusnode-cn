import React from "react";
import { Building2, PlusCircle, Trash2 } from "lucide-react";

const CentralParticipatingClubs = ({
  events,
  selectedEvent,
  setSelectedEvent,
  allClubs,
  selectedClubId,
  setSelectedClubId,
  addingClub,
  onAddClub,
  onRemoveClub,
  onCreateClick,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-12 text-center rounded-2xl shadow-xs">
        <Building2 className="mx-auto text-neutral-400 mb-3" size={44} />
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No Central Events Available</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Create a college-wide event first to attach participating student clubs.
        </p>
        <button
          onClick={onCreateClick}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          <PlusCircle size={15} />
          Create College Event
        </button>
      </div>
    );
  }

  if (!selectedEvent) return null;

  const availableClubsToAdd = allClubs.filter(
    (c) => !selectedEvent.participatingClubs?.some((pc) => pc.clubId === c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Managing Clubs For
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
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
            Participating Clubs — {selectedEvent.title}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Attach recognized campus clubs and student chapters assisting with this central event.
          </p>
        </div>

        <form onSubmit={onAddClub} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            required
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="">Select a club to add...</option>
            {availableClubsToAdd.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clubName} ({c.category || "Club"})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addingClub || !selectedClubId}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
          >
            {addingClub ? "Adding..." : "Add Club"}
          </button>
        </form>

        {/* List of Attached Participating Clubs */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 pt-2">
          {!selectedEvent.participatingClubs || selectedEvent.participatingClubs.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-850/40 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <Building2 className="mx-auto text-neutral-400 mb-2" size={28} />
              No participating clubs added yet for this event.
            </div>
          ) : (
            selectedEvent.participatingClubs.map((pc) => (
              <div key={pc.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400 text-xs shrink-0">
                    {pc.club?.clubLogo ? (
                      <img
                        src={pc.club.clubLogo}
                        alt={pc.club.clubName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Building2 size={18} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      {pc.club?.clubName}
                    </p>
                    <p className="text-xs text-neutral-500">Participating Club Coordinator</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveClub(selectedEvent.id, pc.clubId)}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CentralParticipatingClubs;
