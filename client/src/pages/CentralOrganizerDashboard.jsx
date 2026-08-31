import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  Calendar,
  Users,
  Shield,
  Building2,
  PlusCircle,
  Sparkles,
  FileText,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { EVENT_VENUES } from "../constants/eventVenues";
import {
  CentralOrganizerStats,
  CentralEventList,
  CentralEventForm,
  CentralStaffDelegation,
  CentralParticipatingClubs,
  CentralAuditLogs,
} from "../roles/centralOrganizer";

const initialFormData = {
  title: "",
  description: "",
  venue: "",
  startTime: "",
  endTime: "",
  totalSeats: 0,
  registrationDeadline: "",
  registrationType: "individual",
  reviewStatus: "PUBLISHED",
  minTeamSize: 1,
  maxTeamSize: 1,
  provideCertificate: false,
  showWinner: false,
  feedbackEnabled: true,
  paymentMethod: "FREE",
  registrationFee: 0,
  imageUrl: "",
  allowedPrograms: ["BTECH", "MTECH", "MSC", "MBA", "PHD", "OTHER"],
  allowedYears: [],
  allowedBranches: [],
};

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CentralOrganizerDashboard = () => {
  const { showNotification } = useNotification();
  const { user, role } = useAuth();
  const isSuperAdmin = user?.role === "admin" || user?.role === "SUPER_ADMIN";
  const isLeadCO =
    isSuperAdmin ||
    user?.role === "central_organizer" ||
    role === "central_organizer" ||
    user?.principalType === "INSTITUTIONAL" ||
    user?.userType === "institutional" ||
    user?.accessLevel === "central_organizer" ||
    user?.institutionalAssignments?.some((a) => a.role === "CENTRAL_EVENT_ORGANISER");

  const canManageEvents = true;
  const canDelegateStaff = true;
  const canViewAudit = true;

  const [activeTab, setActiveTab] = useState("events"); // "events" | "create" | "staff" | "clubs" | "audit"
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    activeStaff: 0,
  });
  const [events, setEvents] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [allYears, setAllYears] = useState(true);
  const [allBranches, setAllBranches] = useState(true);
  const [availableVenues, setAvailableVenues] = useState(EVENT_VENUES);

  const [formData, setFormData] = useState(initialFormData);
  const [creating, setCreating] = useState(false);

  const [selectedClubId, setSelectedClubId] = useState("");
  const [addingClub, setAddingClub] = useState(false);

  useEffect(() => {
    const fetchOpenVenues = async () => {
      try {
        const res = await api.get('/api/venues?openOnly=true');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableVenues(res.data.map((v) => (typeof v === "string" ? v : v.name)));
        }
      } catch (err) {
        // Fallback to static EVENT_VENUES
      }
    };
    fetchOpenVenues();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".event-card-menu")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes, clubsRes] = await Promise.all([
        api.get('/api/central-organizer/dashboard-stats'),
        api.get('/api/central-organizer/events'),
        api.get('/api/clubs'),
      ]);

      setStats(statsRes.data);
      const freshEvents = eventsRes.data.events || [];
      setEvents(freshEvents);
      setAllClubs(clubsRes.data || []);
      if (freshEvents.length > 0) {
        setSelectedEvent((prev) => {
          if (!prev) return freshEvents[0];
          return freshEvents.find((e) => e.id === prev.id) || freshEvents[0];
        });
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        showNotification("Access Denied. You are not authorized as Central Organizer.", "error");
      } else {
        showNotification(err.response?.data?.message || "Failed to load dashboard data.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePosterFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification("Poster file size exceeds 5MB limit.", "warning");
      return;
    }

    try {
      setUploadingPoster(true);
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      const { data } = await api.post('/api/events/upload', formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.secure_url }));
        showNotification("Poster image uploaded successfully!", "success");
      }
    } catch (err) {
      showNotification(err.response?.data?.message || "Poster upload failed.", "error");
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleEditClick = (ev) => {
    setEditingEventId(ev.id);
    const hasYears = Array.isArray(ev.allowedYears) && ev.allowedYears.length > 0;
    const hasBranches = Array.isArray(ev.allowedBranches) && ev.allowedBranches.length > 0;
    setAllYears(!hasYears);
    setAllBranches(!hasBranches);

    setFormData({
      title: ev.title || "",
      description: ev.description || "",
      venue: ev.venue || "",
      startTime: formatDateTimeLocal(ev.startTime),
      endTime: formatDateTimeLocal(ev.endTime),
      totalSeats: ev.totalSeats || 0,
      registrationDeadline: formatDateTimeLocal(ev.registrationDeadline),
      registrationType: ev.registrationType || "individual",
      reviewStatus: ev.reviewStatus || "PUBLISHED",
      minTeamSize: ev.minTeamSize || 1,
      maxTeamSize: ev.maxTeamSize || 1,
      provideCertificate: ev.provideCertificate || false,
      showWinner: ev.showWinner || false,
      feedbackEnabled: ev.feedbackEnabled !== undefined ? ev.feedbackEnabled : true,
      paymentMethod: ev.paymentMethod || "FREE",
      registrationFee: ev.registrationFee || 0,
      imageUrl: ev.imageUrl || "",
      allowedPrograms:
        ev.allowedPrograms?.length > 0
          ? ev.allowedPrograms
          : ["BTECH", "MTECH", "MSC", "MBA", "PHD", "OTHER"],
      allowedYears: ev.allowedYears || [],
      allowedBranches: ev.allowedBranches || [],
    });
    setActiveTab("create");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleOpenCreateTab = () => {
    setEditingEventId(null);
    setFormData(initialFormData);
    setAllYears(true);
    setAllBranches(true);
    setActiveTab("create");
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.venue || !formData.startTime || !formData.endTime) {
      showNotification("Please fill in all required fields.", "warning");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        ...formData,
        totalSeats: formData.registrationType === "none" ? 0 : (Number(formData.totalSeats) || 0),
        registrationFee: formData.registrationType === "none" ? 0 : (Number(formData.registrationFee) || 0),
        allowedPrograms:
          formData.allowedPrograms && formData.allowedPrograms.length > 0
            ? formData.allowedPrograms
            : ["BTECH", "MTECH", "MSC", "MBA", "PHD", "OTHER"],
        allowedYears: allYears ? [] : (formData.allowedYears || []),
        allowedBranches: allBranches ? [] : (formData.allowedBranches || []),
        provideCertificate: !!formData.provideCertificate,
        showWinner: !!formData.showWinner,
        feedbackEnabled: formData.feedbackEnabled !== undefined ? !!formData.feedbackEnabled : true,
      };

      if (editingEventId) {
        const res = await api.put(`/api/central-organizer/events/${editingEventId}`, payload);
        showNotification("Central event updated successfully!", "success");
      } else {
        const res = await api.post('/api/central-organizer/events', payload);
        showNotification("Central event published successfully!", "success");
      }

      setEditingEventId(null);
      setFormData(initialFormData);
      setAllYears(true);
      setAllBranches(true);
      setActiveTab("events");
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to ${editingEventId ? "update" : "create"} event.`, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (eventId, currentStatus) => {
    const newStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await api.put(`/api/central-organizer/events/${eventId}`, {
        reviewStatus: newStatus,
      });
      showNotification(`Event is now ${newStatus === "PUBLISHED" ? "Live / Published" : "saved as Draft"}.`, "success");
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update event status.", "error");
    }
  };

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/central-organizer/events/${eventId}`);
      showNotification("Event deleted successfully.", "success");
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete event.", "error");
    }
  };

  const handleAddClub = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !selectedClubId) return;

    try {
      setAddingClub(true);
      await api.post(`/api/central-organizer/events/${selectedEvent.id}/clubs`, {
        clubId: selectedClubId,
      });
      showNotification("Participating club added successfully.", "success");
      setSelectedClubId("");
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to add participating club.", "error");
    } finally {
      setAddingClub(false);
    }
  };

  const handleRemoveClub = async (eventId, clubId) => {
    try {
      await api.delete(`/api/central-organizer/events/${eventId}/clubs/${clubId}`);
      showNotification("Participating club removed.", "success");
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to remove participating club.", "error");
    }
  };

  const handleManageStaff = (ev) => {
    setSelectedEvent(ev);
    setActiveTab("staff");
  };

  const handleManageClubs = (ev) => {
    setSelectedEvent(ev);
    setActiveTab("clubs");
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-md">
                <Sparkles size={12} />
                Central Events
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mt-1">
              Central Organizer Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Create and manage college-wide events, coordinate participating clubs, delegate staff, and audit actions.
            </p>
          </div>
          <button
            onClick={handleOpenCreateTab}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <PlusCircle size={18} />
            Create College Event
          </button>
        </div>

        <CentralOrganizerStats stats={stats} />

        <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-6 text-sm font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("events")}
            className={`pb-3 relative transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "events"
                ? "text-orange-600 dark:text-orange-500"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Central Events ({events.length})
            {activeTab === "events" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
            )}
          </button>

          {canManageEvents && (
            <button
              onClick={handleOpenCreateTab}
              className={`pb-3 relative transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "create"
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {editingEventId ? "Edit Central Event" : "Create New Event"}
              {activeTab === "create" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
              )}
            </button>
          )}

          {canDelegateStaff && (
            <button
              onClick={() => {
                if (!selectedEvent && events.length > 0) setSelectedEvent(events[0]);
                setActiveTab("staff");
              }}
              className={`pb-3 relative transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "staff"
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              Staff
              {activeTab === "staff" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
              )}
            </button>
          )}

          <button
            onClick={() => {
              if (!selectedEvent && events.length > 0) setSelectedEvent(events[0]);
              setActiveTab("clubs");
            }}
            className={`pb-3 relative transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "clubs"
                ? "text-orange-600 dark:text-orange-500"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Clubs
            {activeTab === "clubs" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
            )}
          </button>

          {canViewAudit && (
            <button
              onClick={() => setActiveTab("audit")}
              className={`pb-3 relative transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "audit"
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Shield size={14} />
              Audit Logs
              {activeTab === "audit" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
              )}
            </button>
          )}
        </div>


        {activeTab === "events" && (
          <CentralEventList
            events={events}
            loading={loading}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            onEdit={handleEditClick}
            onTogglePublish={handleTogglePublish}
            onDelete={handleDeleteEvent}
            onManageStaff={handleManageStaff}
            onManageClubs={handleManageClubs}
            onCreateClick={handleOpenCreateTab}
          />
        )}

        {activeTab === "create" && (
          <CentralEventForm
            formData={formData}
            setFormData={setFormData}
            editingEventId={editingEventId}
            creating={creating}
            uploadingPoster={uploadingPoster}
            allYears={allYears}
            setAllYears={setAllYears}
            allBranches={allBranches}
            setAllBranches={setAllBranches}
            availableVenues={availableVenues}
            onPosterFileChange={handlePosterFileChange}
            onSubmit={handleSaveEvent}
            onCancel={() => {
              setEditingEventId(null);
              setFormData(initialFormData);
              setActiveTab("events");
            }}
            onSwitchToCreate={handleOpenCreateTab}
          />
        )}

        {activeTab === "staff" && (
          <CentralStaffDelegation
            events={events}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            onCreateClick={handleOpenCreateTab}
          />
        )}

        {activeTab === "clubs" && (
          <CentralParticipatingClubs
            events={events}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            allClubs={allClubs}
            selectedClubId={selectedClubId}
            setSelectedClubId={setSelectedClubId}
            addingClub={addingClub}
            onAddClub={handleAddClub}
            onRemoveClub={handleRemoveClub}
            onCreateClick={handleOpenCreateTab}
          />
        )}

        {activeTab === "audit" && (
          <CentralAuditLogs events={events} />
        )}
      </div>
    </div>
  );
};

export default CentralOrganizerDashboard;
