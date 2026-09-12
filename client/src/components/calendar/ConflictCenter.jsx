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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur transition-all">
      <div className="w-full max-w-2xl bg-cn-surface border border-cn-border rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col transition-colors">
        <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-cn-text leading-tight">
                Conflict Center
              </h3>
              <p className="text-xs text-cn-text-muted font-normal mt-0.5">
                Operational status report of venue double-bookings, blackout overlaps, & capacity warnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConflicts}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
              title="Refresh Conflicts"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 text-cn-text-secondary">
          {loading ? (
            <div className="py-16 text-center text-cn-text-muted text-xs font-semibold">
              Analyzing active bookings & blackouts...
            </div>
          ) : issues.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-cn-text">No Active Conflicts Found</p>
              <p className="text-xs text-cn-text-muted max-w-sm mx-auto">
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
                  className={`p-4 rounded-xl border space-y-3 transition-all ${
                    isBlackout
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                      : isVenueOverlap
                      ? "bg-brand-50 dark:bg-brand-950/40 border-brand-200/80 dark:border-brand-900/60"
                      : "bg-cn-surface-muted border-cn-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isBlackout
                          ? "bg-rose-600 text-white"
                          : isVenueOverlap
                          ? "bg-brand-500 text-white"
                          : "bg-neutral-600 text-white"
                      }`}
                    >
                      {issue.type}
                    </span>

                    <span className="text-xs font-bold text-cn-text-muted flex items-center gap-1">
                      <Building2 size={13} />
                      {issue.venue}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-cn-text">
                    {issue.message}
                  </p>

                  {/* Context Details */}
                  {issue.event1 && issue.event2 && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-cn-border-subtle">
                      <div className="p-2.5 rounded-xl bg-cn-surface border border-cn-border">
                        <p className="font-bold text-cn-text truncate">{issue.event1.title}</p>
                        <p className="text-xs text-cn-text-muted">{issue.event1.clubName}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-cn-surface border border-cn-border">
                        <p className="font-bold text-cn-text truncate">{issue.event2.title}</p>
                        <p className="text-xs text-cn-text-muted">{issue.event2.clubName}</p>
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
