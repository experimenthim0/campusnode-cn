import React, { useState, useMemo } from "react";
import { Calendar, Search, PlusCircle, Filter } from "lucide-react";
import CentralEventCard from "./CentralEventCard";
import ShimmerText from "../../components/ShimmerText";

const CentralEventList = ({
  events,
  loading,
  activeMenuId,
  setActiveMenuId,
  onEdit,
  onTogglePublish,
  onDelete,
  onManageStaff,
  onManageClubs,
  onCreateClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "PUBLISHED" | "DRAFT"

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        !searchQuery ||
        ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.venue?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || ev.reviewStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <ShimmerText text="Loading central events..." className="text-sm font-medium" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-12 text-center rounded-2xl shadow-xs">
        <Calendar className="mx-auto text-neutral-400 mb-3" size={44} />
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No Central Events Yet</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Create your first college-wide event to coordinate participating clubs and staff members.
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title or venue..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-neutral-800 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 pl-1">
            <Filter size={14} />
            <span className="font-semibold hidden sm:inline">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All ({events.length})</option>
            <option value="PUBLISHED">Live ({events.filter((e) => e.reviewStatus === "PUBLISHED").length})</option>
            <option value="DRAFT">Drafts ({events.filter((e) => e.reviewStatus === "DRAFT").length})</option>
          </select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 text-center rounded-2xl">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No events matched your search</p>
          <p className="text-xs text-neutral-500 mt-1">Try searching with a different keyword or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((ev) => (
            <CentralEventCard
              key={ev.id}
              event={ev}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onEdit={onEdit}
              onTogglePublish={onTogglePublish}
              onDelete={onDelete}
              onManageStaff={onManageStaff}
              onManageClubs={onManageClubs}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CentralEventList;
