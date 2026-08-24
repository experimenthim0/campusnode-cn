import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getClubMembers, addClubMember, updateClubMember, removeClubMember } from "../services/clubService";
import { toast } from "react-hot-toast";
import { ClubMemberRole } from "../types/index.js";

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({ name }) => {
  const initials = name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "??";

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-medium text-blue-500">
      {initials}
    </div>
  );
};

// ── Role Badge ─────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const map = {
    [ClubMemberRole.CLUB_HEAD]:   { style: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400", label: "Student Lead" },
    [ClubMemberRole.COORDINATOR]: { style: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",       label: "Coordinator" },
    [ClubMemberRole.MEMBER]:      { style: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300", label: "Member" },
  };
  const { style, label } = map[role] ?? map[ClubMemberRole.MEMBER];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style}`}>
      {label}
    </span>
  );
};

// ── Permission Toggle ──────────────────────────────────────────────────────────
const PermissionToggle = ({ active, onToggle, disabled = false, loading = false }) => (
  <button
    type="button"
    onClick={disabled || loading ? null : onToggle}
    disabled={disabled || loading}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      active ? "bg-neutral-800" : "bg-neutral-200"
    } ${disabled || loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    title={loading ? "Updating permission..." : active ? "Permission granted" : "Permission revoked"}
  >
    {loading ? (
      <span className="flex h-full w-full items-center justify-center">
        <svg className="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </span>
    ) : (
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          active ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    )}
  </button>
);

// ── Table Header Cell ──────────────────────────────────────────────────────────
const Th = ({ children, center = false }) => (
  <th
    className={`px-4 py-3 text-[11px] font-medium tracking-wide text-neutral-400 ${
      center ? "text-center" : "text-left"
    }`}
  >
    {children}
  </th>
);

// ── Trash Icon ─────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
  </svg>
);

// ── Empty State Icon ───────────────────────────────────────────────────────────
const PeopleIcon = () => (
  <svg
    className="h-10 w-10 text-neutral-200"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
    />
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const ClubMembers = () => {
  const { clubId } = useParams();
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [inviting, setInviting]     = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState(ClubMemberRole.MEMBER);
  const [updatingIds, setUpdatingIds]   = useState({});

  useEffect(() => {
    fetchMembers();
  }, [clubId]);

  const fetchMembers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getClubMembers(clubId);
      setMembers(res.data);
    } catch {
      if (!silent) toast.error("Failed to fetch members");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.endsWith("@nitj.ac.in")) {
      toast.error("Only @nitj.ac.in emails allowed");
      return;
    }
    const toastId = toast.loading("Adding member...");
    try {
      setInviting(true);
      await addClubMember(clubId, {
        email: inviteEmail,
        role: selectedRole,
      });
      toast.success("Member added successfully", { id: toastId });
      setInviteEmail("");
      fetchMembers(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member", { id: toastId });
    } finally {
      setInviting(false);
    }
  };

  const togglePermission = async (membershipId, field, currentValue) => {
    if (updatingIds[membershipId]) return;

    const member = members.find((m) => (m.id || m._id) === membershipId);
    if (!member) return;

    const fieldLabel = field === "canEditEvents" ? "Events" : "Attendance";
    const newPermValue = !currentValue;
    const actionLabel = newPermValue ? "Granting" : "Revoking";
    const toastId = toast.loading(`${actionLabel} '${fieldLabel}' permission for ${member.student?.name || "member"}...`);

    setUpdatingIds((prev) => ({ ...prev, [membershipId]: field }));

    const previousMembers = [...members];
    const permissions = {
      canTakeAttendance: field === "canTakeAttendance" ? newPermValue : member.canTakeAttendance,
      canEditEvents:     field === "canEditEvents"     ? newPermValue : member.canEditEvents,
    };

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        (m.id || m._id) === membershipId ? { ...m, ...permissions } : m
      )
    );

    try {
      const res = await updateClubMember(membershipId, { permissions });
      toast.success(
        res.data.message || `'${fieldLabel}' permission ${newPermValue ? "granted to" : "revoked from"} ${member.student?.name || "member"}!`,
        { id: toastId }
      );
      fetchMembers(true);
    } catch (err) {
      setMembers(previousMembers);
      toast.error(err.response?.data?.message || "Failed to update permission", { id: toastId });
    } finally {
      setUpdatingIds((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
    }
  };

  const changeRole = async (membershipId, newRole) => {
    if (updatingIds[membershipId]) return;

    const member = members.find((m) => (m.id || m._id) === membershipId);
    if (!member) return;

    const roleLabels = {
      [ClubMemberRole.CLUB_HEAD]: "Club Head",
      [ClubMemberRole.COORDINATOR]: "Coordinator",
      [ClubMemberRole.MEMBER]: "Member",
    };
    const targetRoleLabel = roleLabels[newRole] || newRole;
    const toastId = toast.loading(`Updating role to '${targetRoleLabel}' for ${member.student?.name || "member"}...`);

    setUpdatingIds((prev) => ({ ...prev, [membershipId]: "role" }));

    const previousMembers = [...members];
    const derived = newRole === "CLUB_HEAD" || newRole === "COORDINATOR"
      ? { canTakeAttendance: true, canEditEvents: true }
      : { canTakeAttendance: true, canEditEvents: false };

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        (m.id || m._id) === membershipId ? { ...m, role: newRole, ...derived } : m
      )
    );

    try {
      const res = await updateClubMember(membershipId, { role: newRole });
      toast.success(
        res.data.message || `Role updated to ${targetRoleLabel} for ${member.student?.name || "member"}!`,
        { id: toastId }
      );
      fetchMembers(true);
    } catch (err) {
      setMembers(previousMembers);
      toast.error(err.response?.data?.message || "Failed to update role", { id: toastId });
    } finally {
      setUpdatingIds((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
    }
  };

  const removeMember = async (membershipId) => {
    if (updatingIds[membershipId]) return;

    const member = members.find((m) => (m.id || m._id) === membershipId);
    if (!member) return;

    if (!window.confirm(`Remove ${member.student?.name || "this member"} from the club?`)) return;

    const toastId = toast.loading(`Removing ${member.student?.name || "member"}...`);
    setUpdatingIds((prev) => ({ ...prev, [membershipId]: "remove" }));

    const previousMembers = [...members];
    setMembers((prev) => prev.filter((m) => (m.id || m._id) !== membershipId));

    try {
      await removeClubMember(membershipId);
      toast.success(`Member ${member.student?.name || ""} removed successfully`, { id: toastId });
      fetchMembers(true);
    } catch (err) {
      setMembers(previousMembers);
      toast.error(err.response?.data?.message || "Failed to remove member", { id: toastId });
    } finally {
      setUpdatingIds((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
        Loading members…
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Team Management</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Manage club members, leadership designations, and event editing permissions.
        </p>
      </div>

      {/* ── Invite section ──────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-xs">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Add New Team Member
        </p>
        <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            placeholder="student@nitj.ac.in"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none transition-colors"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 text-sm font-medium text-neutral-700 dark:text-neutral-200 focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value={ClubMemberRole.MEMBER}>Member</option>
            <option value={ClubMemberRole.COORDINATOR}>Coordinator</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 px-5 text-sm font-bold text-white transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            {inviting ? "Adding…" : "Add Member"}
          </button>
        </form>
      </div>

      {/* ── Members table ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <PeopleIcon />
            <p className="text-sm font-medium text-neutral-400">No team members added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <Th>Member</Th>
                  <Th>Role</Th>
                  <Th center>Attendance</Th>
                  <Th center>Events</Th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {members.map((member) => {
                  const id = member._id || member.id;
                  const updatingType = updatingIds[id];
                  const isUpdating = Boolean(updatingType);

                  return (
                    <tr
                      key={id}
                      className={`transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 ${
                        isUpdating ? "bg-orange-50/30 dark:bg-orange-950/20" : ""
                      } ${member.isClubAccount ? "bg-orange-500/5 dark:bg-orange-500/10" : ""}`}
                    >
                      {/* Member info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.student?.name} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                                {member.student?.name}
                              </p>
                              {member.isClubAccount && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 text-[10px] font-bold">
                                  Primary Owner
                                </span>
                              )}
                              {isUpdating && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400 animate-pulse">
                                  Updating…
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-neutral-400">
                              {member.student?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        {member.isClubAccount ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 text-xs font-bold whitespace-nowrap shadow-2xs">
                            <i className="ri-shield-star-fill text-orange-500 text-xs" /> Official Club Account
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => changeRole(id, e.target.value)}
                              disabled={isUpdating}
                              className={`h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 focus:border-orange-500 focus:outline-none ${
                                isUpdating ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                              }`}
                            >
                              {member.role === ClubMemberRole.CLUB_HEAD && (
                                <option value={ClubMemberRole.CLUB_HEAD}>Student Lead (Head)</option>
                              )}
                              <option value={ClubMemberRole.MEMBER}>Member</option>
                              <option value={ClubMemberRole.COORDINATOR}>Coordinator</option>
                            </select>
                            {updatingType === "role" && (
                              <svg
                                className="h-3.5 w-3.5 animate-spin text-orange-600 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="px-4 py-3.5 text-center">
                        {member.isClubAccount ? (
                          <div title="Fixed permissions for official club account">
                            <PermissionToggle
                              active={true}
                              disabled={true}
                              loading={false}
                              onToggle={null}
                            />
                          </div>
                        ) : (
                          <PermissionToggle
                            active={member.canTakeAttendance}
                            disabled={isUpdating}
                            loading={updatingType === "canTakeAttendance"}
                            onToggle={() =>
                              togglePermission(id, "canTakeAttendance", member.canTakeAttendance)
                            }
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {member.isClubAccount ? (
                          <div title="Fixed permissions for official club account">
                            <PermissionToggle
                              active={true}
                              disabled={true}
                              loading={false}
                              onToggle={null}
                            />
                          </div>
                        ) : (
                          <PermissionToggle
                            active={member.canEditEvents}
                            disabled={isUpdating}
                            loading={updatingType === "canEditEvents"}
                            onToggle={() =>
                              togglePermission(id, "canEditEvents", member.canEditEvents)
                            }
                          />
                        )}
                      </td>

                      {/* Remove */}
                      <td className="px-5 py-3.5 text-right">
                        {member.isClubAccount ? (
                          <span
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                            title="Official Club Account is permanent and cannot be removed"
                          >
                            <i className="ri-lock-2-line text-sm" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeMember(id)}
                            disabled={isUpdating}
                            className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                              isUpdating
                                ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                                : "text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            }`}
                            title="Remove member"
                          >
                            {updatingType === "remove" ? (
                              <svg className="h-4 w-4 animate-spin text-red-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubMembers;