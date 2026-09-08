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
import EventApprovalPreviewModal from "../components/EventApprovalPreviewModal";
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
        ? "bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400"
        : "bg-cn-surface border-cn-border"
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

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewModalEvent, setPreviewModalEvent] = useState(null);

  const [rescheduleData, setRescheduleData] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState(null);

  const [conflictCenterOpen, setConflictCenterOpen] = useState(false);

  const { role: authRole } = useAuth();
  const userRole = authRole || "admin";
  const canManageCalendar = !readOnly && (userRole === "admin" || userRole === "facultyCoordinator");

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

      // Determine date range parameters based on subView
      const start = new Date(currentDate);
      let end = new Date(currentDate);

      if (subView === "month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        // Include buffer for calendar grid padding
        if (activeView === "calendar") {
          start.setDate(start.getDate() - 7);
          end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 7, 23, 59, 59, 999);
        } else {
          end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        }
      } else if (subView === "week") {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        // "day" subView or timeline single day
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
        getConflicts().catch(() => ({ data: { totalIssues: 0 } }))
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
      setConflictCount(conflictRes?.data?.totalIssues || 0);
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

  const handleApproveEvent = async (eventItemOrId, comment = "Approved by faculty coordinator") => {
    const eventId = typeof eventItemOrId === 'string' ? eventItemOrId : (eventItemOrId?.id || eventItemOrId?._id);
    const title = typeof eventItemOrId === 'object' ? eventItemOrId?.title : 'Event';
    try {
      await reviewEvent(eventId, {
        status: "PUBLISHED",
        comment: comment || "Approved by faculty coordinator"
      });
      showNotification(`Event approved successfully.`, "success");
      setDrawerOpen(false);
      setPreviewModalEvent(null);
      fetchCalendarData();
    } catch (err) {
      showNotification("Failed to approve event.", "error");
    }
  };

  const handleRejectEvent = async (eventItemOrId, customReason = null) => {
    const eventId = typeof eventItemOrId === 'string' ? eventItemOrId : (eventItemOrId?.id || eventItemOrId?._id);
    const title = typeof eventItemOrId === 'object' ? eventItemOrId?.title : 'Event';
    let reason = customReason;
    if (reason === null) {
      reason = prompt(`Enter rejection reason for "${title}":`);
      if (reason === null) return; // Cancelled
    }
    try {
      await reviewEvent(eventId, {
        status: "REJECTED",
        comment: reason.trim() || "Proposal rejected by faculty coordinator."
      });
      showNotification(`Event rejected.`, "info");
      setDrawerOpen(false);
      setPreviewModalEvent(null);
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
        <div className="bg-cn-surface border border-cn-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-neutral-100 dark:divide-zinc-800/60">
              <thead>
                <tr className="bg-neutral-50/60 dark:bg-zinc-900/40 text-neutral-400 dark:text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Event Name</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Venue</th>
                  <th className="py-3.5 px-4">Organizing Club</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/50 font-medium">
                {events.map((e) => {
                  const eventId = e.id || e._id;
                  const eventSlug = e.slug || eventId;
                  const eventUrl = `/event/${eventSlug}`;
                  const startDate = e.startTime || e.eventDate;
                  const dObj = startDate ? new Date(startDate) : null;
                  const dateStr = dObj && !isNaN(dObj.getTime())
                    ? dObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "N/A";
                  const timeStr = dObj && !isNaN(dObj.getTime())
                    ? dObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "";
                  const clubName = e.club?.clubName || e.clubName || "ODSW";
                  const status = e.reviewStatus || "PENDING";
                  
                  return (
                    <tr
                      key={eventId}
                      onClick={() => handleSelectEvent(e)}
                      className="hover:bg-neutral-50/80 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-xs line-clamp-1">
                            {e.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                            {e.club?.category || "General"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                            {dateStr}
                          </span>
                          {timeStr && (
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                              {timeStr}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-neutral-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{e.venue || "TBD / Auditorium"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-semibold ${clubName === 'ODSW' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          {clubName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-700"
                        }`}>
                          {status === "PUBLISHED" ? "Approved" : status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <a
                          href={eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-colors"
                          title="Open public event page"
                        >
                          <span>View</span>
                          <ExternalLink size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-neutral-400 text-xs">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">No events found for this time period</p>
                        <p className="text-[11px]">Adjust your date selector, view switch, or clear active filters.</p>
                      </div>
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
        onOpenPreview={(ev) => setPreviewModalEvent(ev)}
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

      <EventApprovalPreviewModal
        event={previewModalEvent}
        isOpen={Boolean(previewModalEvent)}
        onClose={() => setPreviewModalEvent(null)}
        onApprove={handleApproveEvent}
        onReject={handleRejectEvent}
        userRole={userRole}
      />

      {canManageCalendar && <RescheduleConfirmModal
        rescheduleData={rescheduleData}
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        onSuccess={() => fetchCalendarData()}
      />}

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
