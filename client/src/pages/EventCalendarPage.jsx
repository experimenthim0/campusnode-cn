import React, { useState, useEffect, useCallback } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { getVenues } from "../services/adminService";
import { getClubs } from "../services/clubService";
import { getCalendarEvents, getConflicts } from "../services/eventService";
import CalendarViewSwitch from "../components/calendar/CalendarViewSwitch";
import CalendarFilterBar from "../components/calendar/CalendarFilterBar";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import VenueTimelineView from "../components/calendar/VenueTimelineView";
import EventQuickViewDrawer from "../components/calendar/EventQuickViewDrawer";
import RescheduleConfirmModal from "../components/calendar/RescheduleConfirmModal";
import BlackoutModal from "../components/calendar/BlackoutModal";
import ConflictCenter from "../components/calendar/ConflictCenter";
import ShimmerText from "../components/ShimmerText";
import {
  Calendar as CalendarIcon,
  Clock,
  Building2,
  AlertTriangle,
  Users,
  CheckCircle,
  Plus,
  Layers,
  ExternalLink,
  RotateCcw
} from "lucide-react";

const StatCard = ({ label, value, accent, icon: Icon }) => (
  <div
    className={`p-4 rounded-2xl border transition-all ${
      accent
        ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400"
        : "bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-zinc-800"
    }`}
  >
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
        {label}
      </p>
      {Icon && <Icon size={16} className="text-neutral-400" />}
    </div>
    <p className="text-2xl font-black mt-1 text-black dark:text-white">{value}</p>
  </div>
);

const EventCalendarPage = ({ readOnly = false }) => {
  const { showNotification } = useNotification();

  // State
  const [activeView, setActiveView] = useState("timeline"); // "list" | "calendar" | "timeline"
  const [subView, setSubView] = useState("month"); // "month" | "week" | "day"
  const [currentDate, setCurrentDate] = useState(new Date());

  const [events, setEvents] = useState([]);
  const [blackouts, setBlackouts] = useState([]);
  const [venues, setVenues] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    venues: [],
    clubId: "all",
    category: "all",
    status: "all"
  });

  // Modal / Drawer States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rescheduleData, setRescheduleData] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState(null);

  const [conflictCenterOpen, setConflictCenterOpen] = useState(false);

  const { role: authRole } = useAuth();
  const userRole = authRole || "admin";
  const canManageCalendar = !readOnly && (userRole === "admin" || userRole === "facultyCoordinator");

  // Fetch Venues & Clubs reference lists
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [vRes, cRes] = await Promise.all([
          getVenues().catch(() => ({ data: [] })),
          getClubs().catch(() => ({ data: [] }))
        ]);

        const venuesData = Array.isArray(vRes?.data)
          ? vRes.data
          : Array.isArray(vRes?.data?.venues)
          ? vRes.data.venues
          : Array.isArray(vRes?.data?.data)
          ? vRes.data.data
          : [];
        setVenues(venuesData);

        const clubsData = Array.isArray(cRes?.data)
          ? cRes.data
          : Array.isArray(cRes?.data?.clubs)
          ? cRes.data.clubs
          : Array.isArray(cRes?.data?.data)
          ? cRes.data.data
          : [];
        setClubs(clubsData);
      } catch (err) {
        console.error("Failed to load venue/club references:", err);
        setVenues([]);
        setClubs([]);
      }
    };
    fetchReferences();
  }, []);

  // Fetch Calendar Data (events & blackouts for date range)
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      // Determine date range parameters based on subView or activeView
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (activeView === "calendar" && subView === "month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      } else if (subView === "week") {
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 7);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }

      const params = {
        start: start.toISOString(),
        end: end.toISOString()
      };

      if (filters.venues.length > 0) {
        params.venue = filters.venues.join(",");
      }
      if (filters.clubId !== "all") params.clubId = filters.clubId;
      if (filters.category !== "all") params.category = filters.category;
      if (filters.status !== "all") params.reviewStatus = filters.status;

      const [calRes, conflictRes] = await Promise.all([
        getCalendarEvents(params),
        getConflicts()
      ]);

      const eventsData = Array.isArray(calRes?.data?.events)
        ? calRes.data.events
        : Array.isArray(calRes?.data)
        ? calRes.data
        : [];
      const blackoutsData = Array.isArray(calRes?.data?.blackouts)
        ? calRes.data.blackouts
        : [];

      setEvents(eventsData);
      setBlackouts(blackoutsData);
      setConflictCount(conflictRes.data?.totalIssues || 0);
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
      setEvents([]);
      setBlackouts([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, activeView, subView, filters]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      venues: [],
      clubId: "all",
      category: "all",
      status: "all"
    });
  };

  const handleSelectEvent = (eventItem) => {
    setSelectedEvent(eventItem);
    setDrawerOpen(true);
  };

  const handleInitiateReschedule = (reschedulePayload) => {
    setRescheduleData(reschedulePayload);
    setRescheduleModalOpen(true);
  };

  const handleApproveEvent = async (eventItem) => {
    try {
      await reviewEvent(eventItem.id || eventItem._id, {
        status: "PUBLISHED",
        comment: "Approved from Event Calendar"
      });
      showNotification(`Event "${eventItem.title}" approved successfully.`, "success");
      setDrawerOpen(false);
      fetchCalendarData();
    } catch (err) {
      showNotification("Failed to approve event.", "error");
    }
  };

  const handleRejectEvent = async (eventItem) => {
    const reason = prompt(`Enter rejection reason for "${eventItem.title}":`);
    if (reason === null) return; // Cancelled
    try {
      await reviewEvent(eventItem.id || eventItem._id, {
        status: "REJECTED",
        comment: reason.trim() || "Proposal rejected by faculty coordinator."
      });
      showNotification(`Event "${eventItem.title}" rejected.`, "info");
      setDrawerOpen(false);
      fetchCalendarData();
    } catch (err) {
      showNotification("Failed to reject event.", "error");
    }
  };

  // Metrics calculations
  const todayStr = new Date().toDateString();
  const todayEvents = events.filter(
    (e) => new Date(e.startTime || e.eventDate).toDateString() === todayStr
  );
  const pendingEvents = events.filter((e) => e.reviewStatus === "PENDING");

  const occupiedVenueNames = new Set(
    todayEvents.map((e) => e.venue).filter(Boolean)
  );

  return (
    <div className="space-y-6 myfont px-5 py-3">
      {/* Operational metrics are for administrators; club users get the schedule view only. */}
      {!readOnly && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Today's Events" value={todayEvents.length} icon={CalendarIcon} />
          <StatCard label="Pending Approval" value={pendingEvents.length} icon={Clock} />
          <StatCard label="Occupied Venues" value={occupiedVenueNames.size} icon={Building2} />
          <StatCard label="Conflicts Detected" value={conflictCount} accent icon={AlertTriangle} />
          <StatCard label="Active Blackouts" value={blackouts.length} icon={Layers} />
        </div>
      )}

      {/* Main View Switch & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CalendarViewSwitch activeView={activeView} onViewChange={setActiveView} />

        <p className="text-xs text-neutral-400 font-medium hidden sm:block">
          Displaying {events.length} events across campus venues
        </p>
      </div>

      {/* Reusable Filter Bar */}
      <CalendarFilterBar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        subView={subView}
        onSubViewChange={setSubView}
        venues={venues}
        clubs={clubs}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onNewBlackout={canManageCalendar ? () => {
          setEditingBlackout(null);
          setBlackoutModalOpen(true);
        } : undefined}
        onOpenConflictCenter={() => setConflictCenterOpen(true)}
        conflictCount={conflictCount}
      />

      {/* Calendar Views Render Switch */}
      {loading ? (
        <div className="p-16 border border-neutral-200 dark:border-zinc-800 rounded-2xl text-center">
          <ShimmerText text="Loading CampusNode calendar schedule..." className="text-sm font-medium" />
        </div>
      ) : activeView === "list" ? (
        <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-zinc-800 text-neutral-400 font-black uppercase text-[10px]">
                  <th className="py-3 px-3">Title</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Venue</th>
                  <th className="py-3 px-3">Club</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/50 font-medium">
                {events.map((e) => (
                  <tr
                    key={e.id || e._id}
                    onClick={() => handleSelectEvent(e)}
                    className="hover:bg-neutral-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-black dark:text-white">{e.title}</td>
                    <td className="py-3 px-3 text-neutral-500">
                      {new Date(e.startTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-800 dark:text-neutral-200">{e.venue}</td>
                    <td className="py-3 px-3 text-orange-600 dark:text-orange-400 font-semibold">{e.club?.clubName || 'ODSW'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-zinc-700">
                        {e.reviewStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      No events found matching current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === "calendar" ? (
        subView === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            blackouts={blackouts}
            onSelectEvent={handleSelectEvent}
            onSelectDate={(d) => {
              setCurrentDate(d);
              setSubView("day");
            }}
          />
        ) : subView === "week" ? (
          <WeekView
            currentDate={currentDate}
            events={events}
            blackouts={blackouts}
            onSelectEvent={handleSelectEvent}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            events={events}
            blackouts={blackouts}
            onSelectEvent={handleSelectEvent}
          />
        )
      ) : (
        <VenueTimelineView
          currentDate={currentDate}
          venues={venues}
          events={events}
          blackouts={blackouts}
          onSelectEvent={handleSelectEvent}
          onInitiateReschedule={canManageCalendar ? handleInitiateReschedule : undefined}
          canEdit={canManageCalendar}
        />
      )}

      {/* Quick-View Event Drawer */}
      <EventQuickViewDrawer
        event={selectedEvent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApprove={userRole === "facultyCoordinator" ? handleApproveEvent : null}
        onReject={userRole === "facultyCoordinator" ? handleRejectEvent : null}
        onOpenReschedule={canManageCalendar ? (ev) => {
          setRescheduleData({
            event: ev,
            newStart: new Date(ev.startTime),
            newEnd: new Date(ev.endTime),
            newVenue: ev.venue
          });
          setRescheduleModalOpen(true);
        } : undefined}
        userRole={userRole}
      />

      {/* Reschedule Confirmation Modal */}
      {canManageCalendar && <RescheduleConfirmModal
        rescheduleData={rescheduleData}
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        onSuccess={() => fetchCalendarData()}
      />}

      {/* Blackout Window Modal */}
      {canManageCalendar && <BlackoutModal
        isOpen={blackoutModalOpen}
        onClose={() => {
          setBlackoutModalOpen(false);
          setEditingBlackout(null);
        }}
        venues={venues}
        editingBlackout={editingBlackout}
        onSuccess={() => fetchCalendarData()}
      />}

      {/* Conflict Center Modal */}
      <ConflictCenter
        isOpen={conflictCenterOpen}
        onClose={() => setConflictCenterOpen(false)}
        onSelectEvent={(ev) => {
          setConflictCenterOpen(false);
          handleSelectEvent(ev);
        }}
      />
    </div>
  );
};

export default EventCalendarPage;
