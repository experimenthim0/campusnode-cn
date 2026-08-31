import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Building2, Clock, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import api from "../../services/api";

const ConflictCenter = ({ isOpen, onClose, onSelectEvent }) => {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/events/conflicts');
      setIssues(res.data.issues || []);
      setTotalCount(res.data.totalIssues || 0);
    } catch (err) {
      console.error("Failed to fetch conflict center issues:", err);
      setIssues([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConflicts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-black dark:text-white">
                Conflict Center
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Operational status report of venue double-bookings, blackout overlaps, & capacity warnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConflicts}
              className="p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh Conflicts"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 text-sm">
              Analyzing active bookings & blackouts...
            </div>
          ) : issues.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-base font-black text-black dark:text-white">No Active Conflicts Found</p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                All campus venues and event schedules are properly validated with zero double-bookings.
              </p>
            </div>
          ) : (
            issues.map((issue) => {
              const isBlackout = issue.type === "Blackout Conflict";
              const isVenueOverlap = issue.type === "Venue Conflict";

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isBlackout
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                      : isVenueOverlap
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
                      : "bg-neutral-50 dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isBlackout
                          ? "bg-rose-500 text-white"
                          : isVenueOverlap
                          ? "bg-amber-500 text-white"
                          : "bg-neutral-600 text-white"
                      }`}
                    >
                      {issue.type}
                    </span>

                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Building2 size={13} />
                      {issue.venue}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-black dark:text-white">
                    {issue.message}
                  </p>

                  {/* Context Details */}
                  {issue.event1 && issue.event2 && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-black/5 dark:border-white/5">
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-black/40 border border-neutral-200/60 dark:border-zinc-800">
                        <p className="font-bold text-black dark:text-white truncate">{issue.event1.title}</p>
                        <p className="text-neutral-400">{issue.event1.clubName}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-black/40 border border-neutral-200/60 dark:border-zinc-800">
                        <p className="font-bold text-black dark:text-white truncate">{issue.event2.title}</p>
                        <p className="text-neutral-400">{issue.event2.clubName}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ConflictCenter;
