import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import {
  Search,
  RefreshCw,
  Code,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import ShimmerText from "../../components/ShimmerText";

// Determine if action is a critical/destructive/revocation alert
const isAlertAction = (action) => {
  if (!action) return false;
  const alertKeywords = ["DELETED", "REVOKED", "REJECTED", "BLOCKED", "DENIED", "FAILED", "ERROR"];
  return alertKeywords.some((keyword) => action.toUpperCase().includes(keyword));
};

const formatTimestamp = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";

  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const CentralAuditLogs = ({ events = [] }) => {
  const { showNotification } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEventId, setSelectedEventId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [availableActions, setAvailableActions] = useState([]);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchAuditLogs = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const params = {
          page,
          limit: 20,
        };
        if (selectedAction !== "ALL") params.action = selectedAction;
        if (selectedEventId !== "ALL") params.eventId = selectedEventId;
        if (search.trim()) params.search = search.trim();

        const res = await api.get('/api/central-organizer/audit-logs', { params });
        setLogs(res.data.logs || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.availableActions) setAvailableActions(res.data.availableActions);

        if (isManualRefresh) {
          showNotification("Audit logs refreshed.", "info");
        }
      } catch (err) {
        showNotification(err.response?.data?.message || "Failed to load audit logs.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, selectedAction, selectedEventId, search, showNotification]
  );

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const handleCopyPayload = (payload) => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 myfont">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-white dark:text-neutral-100 shrink-0">
              <Terminal size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold myfont tracking-tight text-black dark:text-white uppercase">
                System Audit Logs
              </h2>
              <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                Immutable security and transaction log for central organizer operations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => fetchAuditLogs(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "REFRESHING" : "REFRESH"}</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor email, action name, or keyword..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none cursor-pointer focus:border-black dark:focus:border-white"
            >
              <option value="ALL">ALL ACTIONS</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none cursor-pointer focus:border-black dark:focus:border-white max-w-[180px] truncate"
            >
              <option value="ALL">ALL EVENTS</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <ShimmerText text="QUERYING AUDIT STREAM..." className="text-xs font-mono tracking-wider" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center px-4 font-mono">
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              No Log Entries Found
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {search || selectedAction !== "ALL" || selectedEventId !== "ALL"
                ? "No entries match the specified query filters."
                : "Operational and security events will be appended here automatically."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 uppercase">
                  <th className="py-2.5 px-4 font-bold tracking-wider whitespace-nowrap">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4 font-bold tracking-wider whitespace-nowrap">Level</th>
                  <th className="py-2.5 px-4 font-bold tracking-wider whitespace-nowrap">Action</th>
                  <th className="py-2.5 px-4 font-bold tracking-wider whitespace-nowrap">Event</th>
                  <th className="py-2.5 px-4 font-bold tracking-wider whitespace-nowrap">Actor</th>
                  <th className="py-2.5 px-4 font-bold tracking-wider text-right whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {logs.map((log) => {
                  const alert = isAlertAction(log.action);
                  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors ${
                        alert ? "bg-red-500/5 dark:bg-red-500/10" : ""
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 text-[11px]">
                        {formatTimestamp(log.createdAt)}
                      </td>

                      {/* Level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alert ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-red-600 text-white rounded">
                            <AlertTriangle size={10} />
                            ALERT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 rounded">
                            INFO
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold">
                        <span
                          className={`${
                            alert
                              ? "text-red-600 dark:text-red-400"
                              : "text-black dark:text-white"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Event */}
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-800 dark:text-neutral-200 max-w-[200px] truncate">
                        {log.eventTitle || (log.eventId ? `ID: ${log.eventId}` : "—")}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                        {log.actorEmail || log.actorId}
                      </td>

                      {/* Details / Metadata */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {hasMetadata ? (
                          <button
                            onClick={() => setSelectedMetadata(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded text-[11px] font-mono cursor-pointer transition-colors"
                          >
                            <Code size={12} />
                            <span>VIEW JSON</span>
                          </button>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 font-mono text-[11px]">
            <span className="text-neutral-500">
              ENTRIES: {pagination.total} &bull; PAGE {pagination.page} OF {pagination.totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>PREV</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>NEXT</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden transition-colors flex flex-col">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
                  <Terminal size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">
                    Audit Payload Inspector
                  </h3>
                  <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">Raw transaction telemetry</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMetadata(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#555555] dark:text-[#B5B5B5]">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-[11px]">
                <div>
                  <span className="text-[#888888] dark:text-[#808080] uppercase block font-bold text-[10px]">Log ID:</span>
                  <span className="text-[#111111] dark:text-[#F5F5F5] font-mono font-bold">{selectedMetadata.id}</span>
                </div>
                <div>
                  <span className="text-[#888888] dark:text-[#808080] uppercase block font-bold text-[10px]">Action:</span>
                  <span className={`font-bold ${isAlertAction(selectedMetadata.action) ? "text-rose-600 dark:text-rose-400" : "text-[#111111] dark:text-[#F5F5F5]"}`}>
                    {selectedMetadata.action}
                  </span>
                </div>
                <div>
                  <span className="text-[#888888] dark:text-[#808080] uppercase block font-bold text-[10px]">Actor:</span>
                  <span className="text-[#111111] dark:text-[#F5F5F5]">{selectedMetadata.actorEmail}</span>
                </div>
                <div>
                  <span className="text-[#888888] dark:text-[#808080] uppercase block font-bold text-[10px]">Timestamp:</span>
                  <span className="text-[#111111] dark:text-[#F5F5F5]">{formatTimestamp(selectedMetadata.createdAt)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 pt-1">
                  <span className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">
                    Metadata Payload (JSON):
                  </span>
                  <button
                    onClick={() => handleCopyPayload(selectedMetadata.metadata)}
                    className="inline-flex items-center gap-1 text-xs text-[#888888] dark:text-[#808080] hover:text-[#F97316] dark:hover:text-[#FB923C] cursor-pointer transition-colors"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span className="font-bold">{copied ? "COPIED" : "COPY JSON"}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-[#FAFAFA] dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 border border-[#E5E5E5] dark:border-[#303030]">
                  {JSON.stringify(selectedMetadata.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralAuditLogs;
