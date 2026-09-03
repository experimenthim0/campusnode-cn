import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { UserPlus, Trash2, Shield, Clock, AlertCircle, CheckCircle, XCircle, ExternalLink } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "ATTENDANCE_OPERATOR", label: "Attendance Operator" },
  { id: "REGISTRATION_OPERATOR", label: "Registration Operator" },
  { id: "CERTIFICATE_OPERATOR", label: "Certificate Operator" },
  { id: "ANNOUNCEMENT_OPERATOR", label: "Announcement Operator" },
  { id: "EVENT_ANALYTICS_VIEWER", label: "Analytics Viewer" },
  { id: "EVENT_MANAGER", label: "Event Manager" },
];

const EventStaffManager = ({ eventId, eventTitle }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState(["ATTENDANCE_OPERATOR"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [inviting, setInviting] = useState(false);

  // Student search / autocomplete state
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSearchStudents = async (q) => {
    setEmail(q);
    setSelectedStudent(null);
    if (!q || q.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await api.get("/api/central-organizer/students/search", {
        params: { q: q.trim() },
      });
      setStudentSearchResults(res.data.students || []);
    } catch {
      // non-fatal
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (st) => {
    setEmail(st.email);
    setSelectedStudent(st);
    setStudentSearchResults([]);
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/central-organizer/events/${eventId}/staff`);
      const activeStaff = (res.data.staff || []).filter((s) => s.status !== "REVOKED");
      setStaffList(activeStaff);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load event staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchStaff();
  }, [eventId]);

  const handlePermissionToggle = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter a student email.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setError("Select at least one permission.");
      return;
    }

    try {
      setInviting(true);
      setError("");
      setSuccess("");

      const res = await api.post(`/api/central-organizer/events/${eventId}/staff`, {
        email: email.trim(),
        permissions: selectedPermissions,
        expiresAt: expiresAt || null,
      });

      setSuccess(`Invitation sent to ${res.data.student?.name || email}. Status is PENDING until accepted.`);
      setEmail("");
      setSelectedStudent(null);
      setStudentSearchResults([]);
      setSelectedPermissions(["ATTENDANCE_OPERATOR"]);
      setExpiresAt("");
      setShowInviteModal(false);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to invite staff.");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeStaff = async (staffId, studentName) => {
    if (!window.confirm(`Revoke event staff access for ${studentName}? They will immediately lose all assigned permissions.`)) {
      return;
    }

    try {
      setError("");
      await api.delete(`/api/central-organizer/events/${eventId}/staff/${staffId}`);
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      setSuccess(`Revoked event staff access for ${studentName}. Recorded in Audit Logs.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke staff access.");
      fetchStaff();
    }
  };

  const getStatusBadge = (status, expiresAtDate) => {
    const isExpired = expiresAtDate && new Date() > new Date(expiresAtDate);
    const effectiveStatus = isExpired && status === "ACTIVE" ? "EXPIRED" : status;

    switch (effectiveStatus) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle size={12} /> Active
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock size={12} /> Pending
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <XCircle size={12} /> Revoked
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
            <AlertCircle size={12} /> Expired
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return <span className="text-xs text-neutral-500">{status}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-orange-600 dark:text-orange-500" size={18} />
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Event Staff
            </h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Delegate operator roles to students.{" "}
            <Link
              to="/central-organizer/guide"
              className="text-orange-600 dark:text-orange-400 hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              Read Guide <ExternalLink size={10} />
            </Link>
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus size={14} />
          Invite Staff
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-xs text-neutral-400">Loading staff members...</div>
      ) : staffList.length === 0 ? (
        <div className="py-10 text-center">
          <Shield className="mx-auto text-neutral-300 dark:text-neutral-700 mb-2" size={32} />
          <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            No Staff Assigned
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Click "Invite Staff" to assign scanning and check-in roles to students.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Student</th>
                <th className="px-4 py-2.5">Assigned Roles</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Expiry</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-[11px]">
                        {staff.user?.name ? staff.user.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">{staff.user?.name || "Unknown"}</p>
                        <p className="text-[11px] text-neutral-400">{staff.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {staff.permissions.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md"
                        >
                          {p.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(staff.status, staff.expiresAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500">
                    {staff.expiresAt ? (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {new Date(staff.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      "Event Duration"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {staff.status === "ACTIVE" || staff.status === "PENDING" ? (
                      <button
                        onClick={() => handleRevokeStaff(staff.id, staff.user?.name || staff.user?.email)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                        title="Revoke access"
                      >
                        <Trash2 size={12} />
                        Revoke
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">
                  Invite Event Staff
                </h3>
                <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">
                  {eventTitle} •{" "}
                  <Link
                    to="/central-organizer/guide"
                    target="_blank"
                    className="text-[#F97316] dark:text-[#FB923C] hover:underline font-bold"
                  >
                    View Guide
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteStaff} className="p-6 space-y-4 text-[#555555] dark:text-[#B5B5B5]">
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                  Student Account <span className="text-[#F97316]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search student by name, email, or roll no..."
                    value={email}
                    onChange={(e) => handleSearchStudents(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] focus:outline-none transition-colors"
                  />

                  {searchingStudents && (
                    <span className="absolute right-3.5 top-3 text-[10px] text-[#888888] dark:text-[#808080]">
                      Searching...
                    </span>
                  )}

                  {studentSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 z-30 max-h-48 overflow-y-auto rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-white dark:bg-[#181818] shadow-xl divide-y divide-[#F0F0F0] dark:divide-[#2A2A2A]">
                      {studentSearchResults.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectStudent(st)}
                          className="w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-[#FFF7ED] dark:hover:bg-[#2A1A0F] transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">{st.name}</p>
                            <p className="text-[11px] text-[#888888] dark:text-[#808080]">
                              {st.email} {st.rollNo ? `• ${st.rollNo}` : ""}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-[#F97316] dark:text-[#FB923C]">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">Selected:</span>
                    <span className="font-semibold text-[#111111] dark:text-[#F5F5F5] text-[11px] truncate">{selectedStudent.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setEmail("");
                      }}
                      className="ml-auto text-[11px] text-[#888888] hover:text-[#111111] dark:hover:text-white underline shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions Grid */}
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                  Roles & Permissions <span className="text-[#F97316]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isSelected = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[#F97316] dark:border-[#FB923C] bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C]"
                            : "border-[#E5E5E5] dark:border-[#303030] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#FAFAFA] dark:hover:bg-[#222222]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(perm.id)}
                          className="h-4 w-4 accent-[#F97316] rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold leading-tight">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                  Access Expiry (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] focus:border-[#F97316] dark:focus:border-[#FB923C] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#303030] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                >
                  {inviting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventStaffManager;

