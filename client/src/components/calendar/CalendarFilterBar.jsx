import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Building2,
  Calendar as CalendarIcon,
  Check,
  RotateCcw
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { id: "all", label: "All Categories" },
  { id: "Technical", label: "Technical" },
  { id: "Cultural", label: "Cultural" },
  { id: "Sports", label: "Sports" },
  { id: "Academic", label: "Academic / Official" },
  { id: "Workshop", label: "Workshop & Seminar" },
];

const STATUS_OPTIONS = [
  { id: "all", label: "All Statuses" },
  { id: "PUBLISHED", label: "Approved / Published" },
  { id: "PENDING", label: "Pending Approval" },
  { id: "DRAFT", label: "Draft" },
  { id: "REJECTED", label: "Rejected" },
];

const CalendarFilterBar = ({
  currentDate,
  onDateChange,
  subView,
  onSubViewChange,
  venues = [],
  clubs = [],
  filters,
  onFilterChange,
  onClearFilters,
  onNewBlackout,
  onOpenConflictCenter,
  conflictCount = 0,
}) => {
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const venueRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (venueRef.current && !venueRef.current.contains(event.target)) {
        setVenueDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeVenues = Array.isArray(venues) ? venues : [];
  const safeClubs = Array.isArray(clubs) ? clubs : [];

  const selectedVenues = filters.venues || [];

  const handleVenueToggle = (venueName) => {
    let next;
    if (selectedVenues.includes(venueName)) {
      next = selectedVenues.filter((v) => v !== venueName);
    } else {
      next = [...selectedVenues, venueName];
    }
    onFilterChange("venues", next);
  };

  const handleSelectAllVenues = () => {
    onFilterChange(
      "venues",
      safeVenues.map((v) => (typeof v === "string" ? v : v.name || v.venueName || ""))
    );
  };

  const handleClearVenues = () => {
    onFilterChange("venues", []);
  };

  const isFilterActive =
    (filters.venues && filters.venues.length > 0) ||
    (filters.clubId && filters.clubId !== "all") ||
    (filters.category && filters.category !== "all") ||
    (filters.status && filters.status !== "all");

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (subView === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (subView === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (subView === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (subView === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const formatDateTitle = () => {
    if (subView === "month") {
      return currentDate.toLocaleString("default", { month: "long", year: "numeric" });
    }
    if (subView === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("default", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-3 space-y-3">
      {/* Top Bar: Date Controls + SubView Controls + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-black dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={handlePrevDate}
              className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextDate}
              className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-sm font-black text-black dark:text-white tracking-wide ml-1">
            {formatDateTitle()}
          </span>
        </div>

        {/* Center: Sub-view Mode Switcher (Month / Week / Day) */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-zinc-900 p-1 border border-neutral-200 dark:border-zinc-800 rounded-xl">
          {["month", "week", "day"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSubViewChange(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                subView === mode
                  ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Operational Actions (Blackout & Conflict Center) */}
        <div className="flex items-center gap-2">
          {onOpenConflictCenter && (
            <button
              type="button"
              onClick={onOpenConflictCenter}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                conflictCount > 0
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                  : "bg-neutral-50 dark:bg-zinc-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-zinc-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${conflictCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
              <span>Conflicts ({conflictCount})</span>
            </button>
          )}

          {onNewBlackout && (
            <button
              type="button"
              onClick={onNewBlackout}
              className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Building2 size={14} />
              <span>Venue Blackout</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar: Reusable Multi-Select Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800/80">
        <div className="relative" ref={venueRef}>
          <button
            type="button"
            onClick={() => setVenueDropdownOpen((prev) => !prev)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              selectedVenues.length > 0
                ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/60 font-bold"
                : "bg-neutral-50 dark:bg-zinc-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-zinc-800"
            }`}
          >
            <Building2 size={14} />
            <span>
              Venue: {selectedVenues.length === 0 ? "All Venues" : `${selectedVenues.length} selected`}
            </span>
          </button>

          {venueDropdownOpen && (
            <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-zinc-800 px-1">
                <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Venues ({venues.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVenues}
                    className="text-[10px] text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearVenues}
                    className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
                {safeVenues.map((v) => {
                  const vName = typeof v === "string" ? v : (v.name || v.venueName || "Unnamed Venue");
                  const isChecked = selectedVenues.includes(vName);
                  return (
                    <label
                      key={vName}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800/80 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleVenueToggle(vName)}
                        className="rounded border-neutral-300 dark:border-zinc-700 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="truncate">{vName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <select
          value={filters.clubId || "all"}
          onChange={(e) => onFilterChange("clubId", e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="all">All Clubs / Orgs</option>
          {safeClubs.map((c, idx) => {
            const clubId = c.id || c._id || `club-${idx}`;
            const clubName = c.clubName || c.name || c.title || "Unnamed Club";
            return (
              <option key={clubId} value={clubId}>
                {clubName}
              </option>
            );
          })}
        </select>

        <select
          value={filters.category || "all"}
          onChange={(e) => onFilterChange("category", e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status || "all"}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 outline-none focus:border-orange-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>

        {isFilterActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-zinc-800 rounded-xl transition-all flex items-center gap-1 cursor-pointer ml-auto"
          >
            <RotateCcw size={13} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarFilterBar;
