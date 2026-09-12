import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  EXPORT_DATASETS,
  ACADEMIC_SESSIONS,
  SEMESTERS,
} from "../config/exportDatasets";
import { useNotification } from "../context/NotificationContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, History, Filter, Columns3, Loader2 } from "lucide-react";


const ExportCenter = () => {
  const { showNotification } = useNotification();

  const [selectedDatasetId, setSelectedDatasetId] = useState("events");
  const activeDataset = EXPORT_DATASETS[selectedDatasetId] || EXPORT_DATASETS.events;

  // Session, Semester & Scope state
  const [session, setSession] = useState("2026–27");
  const [semester, setSemester] = useState("Odd");
  const [clubId, setClubId] = useState("all");
  const [eventId, setEventId] = useState("all");

  const [datasetFilters, setDatasetFilters] = useState({});

  // Column selection state (array of selected column ids)
  const [selectedColumns, setSelectedColumns] = useState(
    activeDataset.defaultColumns
  );
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // Clubs and Events list state
  const [clubs, setClubs] = useState([]);
  const [eventsList, setEventsList] = useState([]);

  const [previewData, setPreviewData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [exportHistory, setExportHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Authorized Datasets list from backend
  const [authorizedDatasets, setAuthorizedDatasets] = useState(
    Object.keys(EXPORT_DATASETS)
  );

  useEffect(() => {
    api
      .get('/api/admin/clubs-list')
      .then((res) => {
        setClubs(res.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (clubId && clubId !== "all") {
      api
        .get('/api/export-center/events-list', { params: { clubId } })
        .then((res) => {
          if (res.data?.success) {
            setEventsList(res.data.events || []);
          }
        })
        .catch(() => {
          setEventsList([]);
        });
    } else {
      setEventsList([]);
      setEventId("all");
    }
  }, [clubId]);

  useEffect(() => {
    api
      .get('/api/export-center/datasets')
      .then((res) => {
        if (res.data?.datasets) {
          const authorizedIds = res.data.datasets.map((d) => d.id);
          setAuthorizedDatasets(authorizedIds);
          if (authorizedIds.length > 0 && !authorizedIds.includes(selectedDatasetId)) {
            setSelectedDatasetId(authorizedIds[0]);
          }
        }
      })
      .catch(() => {});
  }, [selectedDatasetId]);

  // Reset columns and dynamic filters when dataset changes
  useEffect(() => {
    const ds = EXPORT_DATASETS[selectedDatasetId];
    if (ds) {
      setSelectedColumns(ds.defaultColumns);
      const initialFilters = {};
      (ds.filterFields || []).forEach((field) => {
        initialFilters[field.id] = field.options[0]?.value || "all";
      });
      setDatasetFilters(initialFilters);
      setEventId("all");
      setPage(1);
    }
  }, [selectedDatasetId]);

  // Fetch server-side preview records
  const fetchPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const params = {
        dataset: selectedDatasetId,
        session,
        semester,
        clubId,
        eventId,
        page,
        limit: 50,
        ...datasetFilters,
      };

      const res = await api.get('/api/export-center/preview', { params });
      if (res.data?.success) {
        setPreviewData(res.data.records || []);
        setTotalCount(res.data.totalCount || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to load data preview.",
        "error"
      );
      setPreviewData([]);
      setTotalCount(0);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedDatasetId, session, semester, clubId, eventId, datasetFilters, page, showNotification]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    if (totalCount === 0) {
      showNotification("No matching records found to export.", "warning");
      return;
    }

    setIsExporting(true);
    try {
      const payload = {
        dataset: selectedDatasetId,
        session,
        semester,
        clubId,
        columns: selectedColumns,
        filters: { eventId, ...datasetFilters },
      };

      const res = await api.post('/api/export-center/export', payload, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `campusnode_${selectedDatasetId}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification(
        `Successfully exported ${totalCount} ${activeDataset.label} record(s).`,
        "success"
      );

      if (isHistoryOpen) {
        fetchHistory();
      }
    } catch (err) {
      showNotification("Failed to generate CSV export file.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch Export History
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/api/export-center/history');
      if (res.data?.success) {
        setExportHistory(res.data.history || []);
      }
    } catch (err) {
      // Non-fatal notice
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    if (!isHistoryOpen) {
      fetchHistory();
    }
    setIsHistoryOpen((prev) => !prev);
  };

  // Column checkbox toggling
  const toggleColumn = (colId) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length === 1) {
        showNotification("At least one column must be selected.", "warning");
        return;
      }
      setSelectedColumns(selectedColumns.filter((c) => c !== colId));
    } else {
      setSelectedColumns([...selectedColumns, colId]);
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(activeDataset.allColumns.map((c) => c.id));
  };

  const handleClearAllColumns = () => {
    setSelectedColumns(activeDataset.defaultColumns);
  };

  const columnLabelMap = new Map(
    activeDataset.allColumns.map((c) => [c.id, c.label])
  );

  return (
    <div className="min-h-full bg-cn-bg myfont text-black dark:text-white p-5 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-black dark:text-white">
              Export Center
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-900/50">
              Data Management
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Export and download structured CampusNode administrative data into clean CSV files.
          </p>
        </div>

        {/* Global Academic Session Context Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50 text-xs">
            <i className="ri-building-line text-brand-500" />
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">
              Active Context:
            </span>
            <span className="font-bold text-black dark:text-white">
              {session} · {semester} Semester
            </span>
          </div>

          <button
            onClick={toggleHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <i className="ri-history-line text-neutral-400" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Select Dataset
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.values(EXPORT_DATASETS).map((ds) => {
            const isAuthorized = authorizedDatasets.includes(ds.id);
            const isSelected = ds.id === selectedDatasetId;

            return (
              <button
                key={ds.id}
                disabled={!isAuthorized}
                onClick={() => setSelectedDatasetId(ds.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm"
                    : isAuthorized
                    ? "bg-cn-surface text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-zinc-800 hover:border-neutral-400 dark:hover:border-zinc-700"
                    : "opacity-40 cursor-not-allowed border-neutral-200 dark:border-zinc-900 bg-neutral-100 dark:bg-zinc-900/30"
                }`}
              >
                <div>
                  <i className={`${ds.icon} text-lg ${isSelected ? "text-brand-400 dark:text-brand-600" : "text-neutral-400"}`} />
                  <p className="text-xs font-bold mt-2 truncate">{ds.label}</p>
                </div>
                {!isAuthorized && (
                  <span className="text-[9px] font-semibold text-rose-500 mt-1">Restricted</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/30 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <i className="ri-filter-3-line text-brand-500" />
            Filters & Scope ({activeDataset.label})
          </h2>
          <button
            onClick={() => {
              setSession("2026–27");
              setSemester("Odd");
              setClubId("all");
              setEventId("all");
              const reset = {};
              (activeDataset.filterFields || []).forEach((f) => (reset[f.id] = f.options[0]?.value || "all"));
              setDatasetFilters(reset);
              setPage(1);
            }}
            className="text-[11px] font-semibold text-neutral-400 hover:text-brand-500 cursor-pointer border-0 bg-transparent"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Academic Session */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Academic Session
            </label>
            <select
              value={session}
              onChange={(e) => {
                setSession(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-zinc-800 rounded-lg bg-cn-surface text-black dark:text-white outline-none focus:border-brand-500 transition-colors"
            >
              {ACADEMIC_SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-zinc-800 rounded-lg bg-cn-surface text-black dark:text-white outline-none focus:border-brand-500 transition-colors"
            >
              {SEMESTERS.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Club Scope */}
          {["events", "registrations", "transactions", "payouts"].includes(
            selectedDatasetId
          ) && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Club Scope
              </label>
              <select
                value={clubId}
                onChange={(e) => {
                  setClubId(e.target.value);
                  setEventId("all");
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-zinc-800 rounded-lg bg-cn-surface text-black dark:text-white outline-none focus:border-brand-500 transition-colors"
              >
                <option value="all">All Clubs</option>
                {clubs.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.clubName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Particular Event Selector — Rendered ONLY after a specific club is selected */}
          {["events", "registrations", "transactions", "payouts"].includes(
            selectedDatasetId
          ) &&
            clubId !== "all" && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  Particular Event
                </label>
                <select
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-zinc-800 rounded-lg bg-cn-surface text-black dark:text-white outline-none focus:border-brand-500 transition-colors font-semibold text-brand-600 dark:text-brand-400"
                >
                  <option value="all">All Events in Club</option>
                  {eventsList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Dynamic Dataset Filters */}
          {(activeDataset.filterFields || []).map((field) => (
            <div key={field.id}>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                {field.label}
              </label>
              <select
                value={datasetFilters[field.id] || field.options[0]?.value || "all"}
                onChange={(e) => {
                  setDatasetFilters({ ...datasetFilters, [field.id]: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-zinc-800 rounded-lg bg-cn-surface text-black dark:text-white outline-none focus:border-brand-500 transition-colors"
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsColumnModalOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-semibold hover:border-black dark:hover:border-white transition-all cursor-pointer"
          >
            <Columns3 className="size-3.5 text-neutral-400" />
            <span>Columns ({selectedColumns.length}/{activeDataset.allColumns.length})</span>
            <i className={`ri-chevron-${isColumnModalOpen ? "up" : "down"}-line text-xs opacity-60`} />
          </button>

          <span className="text-xs text-neutral-400">
            Exporting as <strong>CSV</strong>
          </span>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting || totalCount === 0}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating CSV...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Export CSV ({totalCount} records)
            </>
          )}
        </button>
      </div>

      {/* Column Picker Modal / Drawer */}
      {isColumnModalOpen && (
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Select Export Columns
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllColumns}
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer border-0 bg-transparent"
              >
                Select All
              </button>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <button
                onClick={handleClearAllColumns}
                className="text-[11px] font-bold text-neutral-400 hover:underline cursor-pointer border-0 bg-transparent"
              >
                Reset Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
            {activeDataset.allColumns.map((col) => {
              const isChecked = selectedColumns.includes(col.id);
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                    isChecked
                      ? "bg-cn-surface border-neutral-400 dark:border-zinc-700 text-black dark:text-white font-semibold"
                      : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleColumn(col.id)}
                    className="w-3.5 h-3.5 accent-brand-600 rounded cursor-pointer"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Preview {totalCount > 0 ? `(Showing ${(page - 1) * 50 + 1}–${Math.min(page * 50, totalCount)} of ${totalCount})` : ""}
          </p>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1 || isLoadingPreview}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 rounded border border-neutral-200 dark:border-zinc-800 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs font-mono text-neutral-400">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages || isLoadingPreview}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 rounded border border-neutral-200 dark:border-zinc-800 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {isLoadingPreview ? (
          <div className="p-12 text-center border border-neutral-200 dark:border-zinc-800 rounded-xl bg-cn-surface">
            <Loader2 className="size-6 animate-spin text-brand-500 mx-auto" />
            <p className="text-xs text-neutral-400 mt-2 font-medium">Fetching dataset preview...</p>
          </div>
        ) : previewData.length === 0 ? (
          <div className="p-12 text-center border border-neutral-200 dark:border-zinc-800 rounded-xl bg-cn-surface space-y-2">
            <i className="ri-inbox-line text-3xl text-neutral-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              No records found
            </p>
            <p className="text-[11px] text-neutral-400">
              Try adjusting the scope or academic filters above to inspect data.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-neutral-50 dark:bg-zinc-900/60 hover:bg-neutral-50 dark:hover:bg-zinc-900/60">
                  <TableHead className="w-12 text-[10px] font-bold uppercase tracking-wider text-neutral-400">#</TableHead>
                  {selectedColumns.map((colId) => (
                    <TableHead key={colId} className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {columnLabelMap.get(colId) || colId}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow
                    key={row.id || row.transactionId || idx}
                    className="hover:bg-neutral-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <TableCell className="text-neutral-400 font-mono">
                      {(page - 1) * 50 + idx + 1}
                    </TableCell>
                    {selectedColumns.map((colId) => (
                      <TableCell key={colId} className="text-neutral-700 dark:text-neutral-300">
                        {row[colId] !== undefined && row[colId] !== null
                          ? String(row[colId])
                          : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {isHistoryOpen && (
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
              <i className="ri-history-line text-brand-500" />
              Recent Export Audit Log
            </h3>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer border-0 bg-transparent text-sm"
            >
              <i className="ri-close-line" />
            </button>
          </div>

          {isLoadingHistory ? (
            <p className="text-xs text-neutral-400">Loading audit history...</p>
          ) : exportHistory.length === 0 ? (
            <p className="text-xs text-neutral-400">No exports logged in history yet.</p>
          ) : (
            <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-neutral-50 dark:bg-zinc-900/60 hover:bg-neutral-50 dark:hover:bg-zinc-900/60">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dataset</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Records</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Exported By</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Role</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-neutral-50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <TableCell className="font-bold text-black dark:text-white uppercase">
                        {item.dataset}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-brand-600 dark:text-brand-400">
                        {item.recordCount}
                      </TableCell>
                      <TableCell>{item.actorEmail || item.actorId}</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase text-neutral-400">
                        {item.actorRole}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportCenter;
