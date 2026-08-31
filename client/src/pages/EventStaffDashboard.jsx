import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Users,
  Calendar,
  MapPin,
  AlertCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import ShimmerText from "../components/ShimmerText";

const EventStaffDashboard = () => {
  const [activeStaff, setActiveStaff] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pastStaff, setPastStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get('/api/event-staff/my-assignments');
      setActiveStaff(res.data.active || []);
      setPendingInvitations(res.data.pending || []);
      setPastStaff(res.data.past || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load event staff assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAccept = async (staffId) => {
    try {
      setProcessingId(staffId);
      setError("");
      setSuccess("");
      const res = await api.post(`/api/event-staff/invitations/${staffId}/accept`);
      setSuccess(res.data.message || "Invitation accepted! Your staff role is now active.");
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept invitation.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (staffId) => {
    if (!window.confirm("Are you sure you want to reject this event staff invitation?")) {
      return;
    }

    try {
      setProcessingId(staffId);
      setError("");
      setSuccess("");
      await api.post(`/api/event-staff/invitations/${staffId}/reject`);
      setSuccess("Invitation rejected.");
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject invitation.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="text-orange-600 dark:text-orange-500" size={24} />
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50">
              My Event Staff Portal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            View your event staff assignments, accept new invitations, and access focused tools like attendance scanning and attendee verification.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl flex items-center gap-3">
            <CheckCircle size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <ShimmerText text="Loading your event staff assignments..." className="text-sm font-medium" />
          </div>
        ) : (
          <div className="space-y-8">
            {pendingInvitations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={18} />
                  <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">
                    Pending Invitations ({pendingInvitations.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-xs space-y-4"
                    >
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded">
                          Staff Invitation
                        </span>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                          {inv.event?.title}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Invited by: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{inv.invitedBy?.name}</span> ({inv.invitedBy?.email})
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <p className="flex items-center gap-2">
                          <MapPin size={13} className="text-orange-500 shrink-0" />
                          <span>{inv.event?.venue}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock size={13} className="text-blue-500 shrink-0" />
                          <span>{new Date(inv.event?.startTime).toLocaleString()}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Assigned Permissions:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {inv.permissions.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 rounded"
                            >
                              {p.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                        <button
                          onClick={() => handleAccept(inv.id)}
                          disabled={processingId === inv.id}
                          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          {processingId === inv.id ? "Accepting..." : "Accept Invitation"}
                        </button>
                        <button
                          onClick={() => handleReject(inv.id)}
                          disabled={processingId === inv.id}
                          className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">
                Active Staff Assignments ({activeStaff.length})
              </h2>

              {activeStaff.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-10 text-center rounded-2xl">
                  <Shield className="mx-auto text-neutral-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                    No Active Staff Assignments
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    When a Central Organizer invites you to help run an event, the invitation will appear here for you to accept.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeStaff.map((staff) => {
                    const hasAttendance = staff.permissions.includes("ATTENDANCE_OPERATOR");
                    const hasRegistration = staff.permissions.includes("REGISTRATION_OPERATOR");

                    return (
                      <div
                        key={staff.id}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                                Active Staff
                              </span>
                              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1.5">
                                {staff.event?.title}
                              </h3>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                            <p className="flex items-center gap-2">
                              <MapPin size={13} className="text-orange-500 shrink-0" />
                              <span>{staff.event?.venue}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Clock size={13} className="text-blue-500 shrink-0" />
                              <span>{new Date(staff.event?.startTime).toLocaleString()}</span>
                            </p>
                            {staff.expiresAt && (
                              <p className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <Clock size={13} className="shrink-0" />
                                <span>Expires: {new Date(staff.expiresAt).toLocaleString()}</span>
                              </p>
                            )}
                          </div>

                          <div className="mt-4">
                            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              Your Assigned Roles:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {staff.permissions.map((p) => (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded"
                                >
                                  {p.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons strictly based on assigned permissions */}
                        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                          {hasAttendance && (
                            <Link
                              to={`/event-staff/${staff.event?.id}/attendance`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                            >
                              <QrCode size={14} />
                              Open Attendance Scanner
                            </Link>
                          )}
                          {hasRegistration && (
                            <Link
                              to={`/event/${staff.event?.id}/registrations`}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-colors"
                            >
                              <Users size={14} />
                              Registrations
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {pastStaff.length > 0 && (
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Past / Revoked Assignments ({pastStaff.length})
                </h3>
                <div className="space-y-2">
                  {pastStaff.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-xs flex items-center justify-between text-neutral-500"
                    >
                      <span className="font-semibold">{p.event?.title}</span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventStaffDashboard;
