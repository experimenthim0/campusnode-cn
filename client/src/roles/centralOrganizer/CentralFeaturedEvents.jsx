import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Shuffle,
  ListOrdered,
  AlertCircle,
  Calendar,
  X,
} from "lucide-react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import FeaturedEventCard from "../../components/FeaturedEventCard";
import { formatFeaturedEventDateTime } from "../../utils/formatFeaturedEventDate";

const CentralFeaturedEvents = () => {
  const { showNotification } = useNotification();

  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [orderingMode, setOrderingMode] = useState("CUSTOM");
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);

  // Live Preview Target
  const [previewEvent, setPreviewEvent] = useState(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [adding, setAdding] = useState(false);

  const fetchFeaturedEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/featured-events/manage");
      const list = res.data?.featuredEvents || [];
      setFeaturedEvents(list);
      setOrderingMode(res.data?.orderingMode || "CUSTOM");

      if (list.length > 0) {
        setPreviewEvent((prev) => (prev ? list.find((e) => e.id === prev.id) || list[0] : list[0]));
      } else {
        setPreviewEvent(null);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to load featured events.", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchFeaturedEvents();
  }, [fetchFeaturedEvents]);

  // Search candidates for Add Modal
  const searchCandidates = useCallback(async (query = "") => {
    try {
      setLoadingCandidates(true);
      const res = await api.get(`/api/featured-events/candidates?query=${encodeURIComponent(query)}`);
      setCandidates(res.data?.candidates || []);
    } catch (err) {
      showNotification("Failed to search candidate events.", "error");
    } finally {
      setLoadingCandidates(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (isAddModalOpen) {
      searchCandidates(candidateSearch);
    }
  }, [isAddModalOpen, candidateSearch, searchCandidates]);

  // Handle Ordering Mode Change
  const handleModeChange = async (newMode) => {
    if (newMode === orderingMode) return;
    try {
      setSavingMode(true);
      await api.patch("/api/featured-events/settings", { orderingMode: newMode });
      setOrderingMode(newMode);
      showNotification(
        newMode === "AUTOMATIC"
          ? "Switched to Automatic Rotation mode. Order will randomize on fresh loads."
          : "Switched to Custom Order mode.",
        "success"
      );
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update ordering mode.", "error");
    } finally {
      setSavingMode(false);
    }
  };

  // Move Up / Move Down in Custom Order
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= featuredEvents.length) return;

    const updated = [...featuredEvents];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Optimistically update
    setFeaturedEvents(updated);

    try {
      const orderedIds = updated.map((item) => item.id);
      await api.patch("/api/featured-events/reorder", { orderedIds });
      showNotification("Order updated successfully.", "success");
    } catch (err) {
      showNotification("Failed to save reorder.", "error");
      fetchFeaturedEvents();
    }
  };

  // Toggle Active / Inactive
  const handleToggleActive = async (item) => {
    const nextState = !item.isActive;
    try {
      await api.patch(`/api/featured-events/${item.id}`, { isActive: nextState });
      setFeaturedEvents((prev) =>
        prev.map((fe) => (fe.id === item.id ? { ...fe, isActive: nextState } : fe))
      );
      if (previewEvent?.id === item.id) {
        setPreviewEvent((prev) => ({ ...prev, isActive: nextState }));
      }
      showNotification(
        nextState ? "Event activated in featured pool." : "Event deactivated from public view.",
        "success"
      );
    } catch (err) {
      showNotification("Failed to update status.", "error");
    }
  };

  // Remove Featured Event
  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this event from Featured Events?")) return;
    try {
      await api.delete(`/api/featured-events/${id}`);
      showNotification("Event removed from Featured Events.", "success");
      fetchFeaturedEvents();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to remove event.", "error");
    }
  };

  // Submit Add Event
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      showNotification("Please select an event to feature.", "error");
      return;
    }

    try {
      setAdding(true);
      await api.post("/api/featured-events", {
        eventId: selectedCandidate.id,
      });

      showNotification("Event added to Featured Events!", "success");
      setIsAddModalOpen(false);
      setSelectedCandidate(null);
      fetchFeaturedEvents();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to add featured event.", "error");
    } finally {
      setAdding(false);
    }
  };

  // Slots 1, 2, 3 (from active pool or first 3)
  const activePool = featuredEvents.filter((fe) => fe.isActive);
  const slots = activePool.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-md">
              <Sparkles size={12} />
              Homepage & Event Feed Spotlight
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
            Featured Events Management
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
            Promote college-wide highlights, sponsor partnerships, and flagship gatherings across the CampusNode Homepage and Event Feed.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setCandidateSearch("");
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus size={18} />
          <span>Add Featured Event</span>
        </button>
      </div>

      {/* Ordering Mode Controller */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Ordering Mode</span>
              {savingMode && <span className="text-xs text-brand-600 animate-pulse">Saving...</span>}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Control how the three homepage slots are resolved and displayed to students.
            </p>
          </div>

          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60 shrink-0">
            <button
              onClick={() => handleModeChange("CUSTOM")}
              disabled={savingMode}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                orderingMode === "CUSTOM"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <ListOrdered size={14} />
              <span>Custom Order</span>
            </button>

            <button
              onClick={() => handleModeChange("AUTOMATIC")}
              disabled={savingMode}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                orderingMode === "AUTOMATIC"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Shuffle size={14} />
              <span>Automatic Rotation</span>
            </button>
          </div>
        </div>

        {/* Mode explanation */}
        {orderingMode === "AUTOMATIC" && (
          <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Automatic Rotation Active:</span> Featured events will automatically rotate their order on each fresh page load/refresh among the active pool. The saved custom order remains intact and will be restored if you switch back to Custom Order.
            </div>
          </div>
        )}
      </div>

      {/* Slots Preview & Live Preview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Homepage 3 Slots */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Homepage Featured Slots (Top 3)</span>
              <span className="px-2 py-0.5 text-[10px] bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-md font-bold">
                {slots.length} / 3 Filled
              </span>
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {orderingMode === "CUSTOM" ? "Rearrange using ↑ ↓ arrows" : "Dynamic rotation active"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <Calendar size={28} className="mx-auto text-neutral-400 mb-2" />
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">No Active Featured Slots</div>
              <div className="text-xs text-neutral-500 mt-1 mb-4">Add events below to feature them on the homepage.</div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                + Add First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((item, idx) => {
                const { dateStr, timeStr } = formatFeaturedEventDateTime(item.startTime);
                const isSelectedForPreview = previewEvent?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-4 bg-white dark:bg-neutral-900 border rounded-2xl transition-all flex items-center justify-between gap-4 ${
                      isSelectedForPreview
                        ? "border-brand-500 ring-2 ring-brand-500/20 shadow-xs"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-black text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {dateStr} · {timeStr} • <span className="font-medium">{item.hostName}</span>
                        </div>
                        {item.sponsorName && (
                          <div className="text-[11px] font-medium text-brand-600 dark:text-brand-400 mt-0.5 truncate">
                            ★ Sponsored by {item.sponsorName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewEvent(item)}
                        title="Preview Public Card"
                        className={`p-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          isSelectedForPreview
                            ? "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400"
                            : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Eye size={15} />
                      </button>

                      {orderingMode === "CUSTOM" && (
                        <>
                          <button
                            onClick={() => handleMoveOrder(idx, -1)}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(idx, 1)}
                            disabled={idx === featuredEvents.length - 1}
                            title="Move Down"
                            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowDown size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Card Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Eye size={14} className="text-brand-500" />
              <span>Live Public Card Preview</span>
            </h3>
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
              Interactive Preview
            </span>
          </div>

          <div className="p-6 bg-neutral-100/70 dark:bg-neutral-950/60 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl flex-1 flex flex-col justify-center">
            {previewEvent ? (
              <div>
                <FeaturedEventCard event={previewEvent} isPreview={true} />
                <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500 mt-3">
                  This preview updates in real-time as you modify sponsor information or select different cards.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-neutral-400">
                Select or add a featured event to preview its public card appearance.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Events Pool (Full Table) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              Featured Events Pool ({featuredEvents.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              All configured events. Inactive events remain stored without appearing publicly.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading featured events pool...</div>
        ) : featuredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400">No events currently featured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Event Title & Host</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Sponsor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {featuredEvents.map((item, idx) => {
                  const { combinedStr } = formatFeaturedEventDateTime(item.startTime);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-neutral-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-bold text-neutral-900 dark:text-neutral-50 truncate max-w-xs">
                          {item.title}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs mt-0.5">
                          {item.hostName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {combinedStr}
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        {item.sponsorName ? (
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[140px] block">
                            {item.sponsorName}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            item.eventStatus === "LIVE"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : item.eventStatus === "UPCOMING"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {item.eventStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                            item.isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700"
                          }`}
                        >
                          {item.isActive ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewEvent(item)}
                            title="Preview in Card"
                            className="p-1.5 text-neutral-400 hover:text-brand-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleRemove(item.id)}
                            title="Remove from Featured"
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Featured Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50">
                  Add to Featured Events
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Select an existing campus event and optionally specify sponsor details.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSelectedCandidate(null);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Event Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    1. Search Upcoming & Live Events
                  </label>
                  <span className="text-[10px] text-neutral-400">Only upcoming & live events</span>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search upcoming or live events by title or club..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Candidate Selection List */}
              <div>
                {(() => {
                  const eligibleCandidates = candidates.filter((c) => c.status !== "ENDED");
                  return (
                    <>
                      <div className="text-xs font-semibold text-neutral-500 mb-2">
                        {loadingCandidates ? "Searching events..." : `Available upcoming & live events (${eligibleCandidates.length})`}
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50/50 dark:bg-neutral-950/40">
                        {eligibleCandidates.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            {loadingCandidates ? "Loading..." : "No upcoming or live events found."}
                          </div>
                        ) : (
                          eligibleCandidates.map((c) => {
                            const isSelected = selectedCandidate?.id === c.id;
                            const isAlreadyFeatured = c.isFeatured;
                            const isLive = c.status === "LIVE";
                            return (
                              <div
                                key={c.id}
                                onClick={() => !isAlreadyFeatured && setSelectedCandidate(c)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isAlreadyFeatured
                                    ? "opacity-50 bg-neutral-100 dark:bg-neutral-800 border-transparent cursor-not-allowed"
                                    : isSelected
                                    ? "bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 ring-1 ring-brand-500 cursor-pointer"
                                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                                    {c.title}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isAlreadyFeatured ? (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                                        Already Featured
                                      </span>
                                    ) : isLive ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 rounded uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                        Live Now
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded uppercase tracking-wider">
                                        Upcoming
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                                  <span>{new Date(c.startTime).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{c.hostName}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Event Sponsor Info (Auto-detected from event) */}
              {selectedCandidate && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      Event Sponsor
                    </label>
                    <span className="text-[11px] text-neutral-400">Pulled automatically from event</span>
                  </div>
                  {selectedCandidate.sponsorName ? (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">Associated Sponsor:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{selectedCandidate.sponsorName}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-500 italic">
                      No sponsor attached to this event.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSelectedCandidate(null);
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={!selectedCandidate || adding}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {adding ? "Adding..." : "Add to Featured Events"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralFeaturedEvents;
