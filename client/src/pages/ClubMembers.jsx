import React, { useState, useEffect, useMemo } from "react";

import { useParams, Link } from "react-router-dom";
import {
  getClubMembers,
  addClubMember,
  updateClubMember,
  removeClubMember,
  transferStudentLead,
  searchStudentsForClub,
} from "../services/clubService";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { ClubMemberRole } from "../types/index.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { invalidateCache } from "../lib/cacheManager";
import {
  Users,
  ShieldCheck,
  Trash2,
  Lock,
  Crown,
  ArrowLeft,
  Search,
  Plus,
  ArrowRightLeft,
  X,
  Loader2,
  Pencil,
  Check,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShimmerText from "../components/ShimmerText";

const POSITION_PRESETS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Technical Head",
  "Joint Technical Head",
  "Event Coordinator",
  "Design Head",
  "Social Media Head",
  "Content & PR Head",
  "Logistics Head",
  "Core Member",
  "Executive Member",
  "Volunteer",
];

const MemberAvatar = ({ name, image }) => {
  if (image) {
    return <img src={image} alt={name || "Member"} className="h-9 w-9 rounded-full object-cover border border-border" />;
  }

  const initials = name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "??";

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 text-xs font-medium border border-brand-200/50 dark:border-brand-900/50">
      {initials}
    </div>
  );
};

const PermissionToggle = ({ active, onToggle, disabled = false, loading = false }) => (
  <button
    type="button"
    onClick={disabled || loading ? null : onToggle}
    disabled={disabled || loading}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      active ? "bg-brand-500" : "bg-neutral-300 dark:bg-neutral-700"
    } ${disabled || loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    title={loading ? "Updating permission..." : active ? "Permission granted" : "Permission revoked"}
  >
    {loading ? (
      <span className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-3 w-3 animate-spin text-white" />
      </span>
    ) : (
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
          active ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    )}
  </button>
);

const ClubMembers = () => {
  const { clubId } = useParams();
  const { user: authUser } = useAuth();
  const role = localStorage.getItem("role") || authUser?.role;
  const isAdmin = Boolean(
    role === "admin" ||
    role === "SUPER_ADMIN" ||
    authUser?.role === "admin" ||
    authUser?.role === "SUPER_ADMIN" ||
    authUser?.userType === "admin" ||
    authUser?.principalType === "ADMIN"
  );

  const isStudent = Boolean(
    authUser?.principalType === "STUDENT" ||
    authUser?.userType === "student" ||
    authUser?.rollNo
  );

  const isFacultyCoordinator = Boolean(
    !isStudent &&
    (role === "facultyCoordinator" ||
      role === "faculty" ||
      authUser?.role === "facultyCoordinator" ||
      authUser?.role === "faculty" ||
      authUser?.userType === "faculty" ||
      authUser?.principalType === "FACULTY" ||
      authUser?.memberships?.some(
        (m) => m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || m.role === "FACULTY"
      )) &&
    (String(authUser?.clubId) === String(clubId) ||
      authUser?.memberships?.some((m) => String(m.clubId) === String(clubId)))
  );

  const canManageLead = !isStudent && (isAdmin || isFacultyCoordinator);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState(ClubMemberRole.MEMBER);
  const [invitePosition, setInvitePosition] = useState("");
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [tempPosition, setTempPosition] = useState("");
  const [savingPositionId, setSavingPositionId] = useState(null);
  const [updatingIds, setUpdatingIds] = useState({});

  // Student search / autocomplete state
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewLeadId, setSelectedNewLeadId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const handleSearchStudents = async (q) => {
    setInviteEmail(q);
    setSelectedStudent(null);
    if (!q || q.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await searchStudentsForClub(clubId, q.trim());
      setStudentSearchResults(res.data.students || []);
    } catch {
      // non-fatal
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (st) => {
    setInviteEmail(st.email);
    setSelectedStudent(st);
    setStudentSearchResults([]);
  };

  const isCurrentMemberSelf = (member) => {
    if (!authUser || !member) return false;
    const authId = authUser.id || authUser._id || authUser.userId;
    const studentId = member.studentId || member.student?.id || member.student?._id;
    if (authId && studentId && String(authId) === String(studentId)) return true;
    const authEmail = (authUser.email || "").trim().toLowerCase();
    const studentEmail = (member.student?.email || member.email || "").trim().toLowerCase();
    if (authEmail && studentEmail && authEmail === studentEmail) return true;
    return false;
  };

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

  const activeStudentLead = members.find((m) => m.role === ClubMemberRole.CLUB_HEAD && !m.isClubAccount);
  const coordinatorCount = members.filter((m) => m.role === ClubMemberRole.COORDINATOR && !m.isClubAccount).length;
  const isCoordinatorLimitReached = coordinatorCount >= 5;

  const ROLE_ORDER = { CLUB_HEAD: 0, COORDINATOR: 1, MEMBER: 2 };
  const sortedMembers = useMemo(() =>
    [...members].sort((a, b) => {
      const ra = ROLE_ORDER[a.role] ?? 3;
      const rb = ROLE_ORDER[b.role] ?? 3;
      if (ra !== rb) return ra - rb;
      // secondary: alphabetical by name within same role
      return (a.student?.name || "").localeCompare(b.student?.name || "");
    }),
    [members]
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.endsWith("@nitj.ac.in")) {
      toast.error("Only @nitj.ac.in emails allowed");
      return;
    }
    if (selectedRole === ClubMemberRole.COORDINATOR && isCoordinatorLimitReached) {
      toast.error("Maximum limit of 5 active coordinators reached for this club.");
      return;
    }
    if (selectedRole === ClubMemberRole.CLUB_HEAD) {
      if (!canManageLead) {
        toast.error("Only administrators and faculty coordinators can assign the Student Lead role.");
        return;
      }
      if (activeStudentLead) {
        toast.error("This club already has an active Student Lead.");
        return;
      }
      if (selectedStudent?.currentHeadClub) {
        toast.error(`${selectedStudent.name} is already a lead of another club ("${selectedStudent.currentHeadClub.clubName}"). A student can be the Student Lead of only one club or society at a time.`);
        return;
      }
    }
    const toastId = toast.loading("Adding member...");
    try {
      setInviting(true);
      await addClubMember(clubId, {
        email: inviteEmail,
        role: selectedRole,
        position: invitePosition.trim() || undefined,
      });
      toast.success("Member added successfully", { id: toastId });
      setInviteEmail("");
      setInvitePosition("");
      setSelectedStudent(null);
      await invalidateCache(['/api/clubs*', '/api/users/*']);
      fetchMembers(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member", { id: toastId });
    } finally {
      setInviting(false);
    }
  };

  const handleTransferLeadership = async (e) => {
    e?.preventDefault();
    if (!canManageLead) {
      toast.error("Only faculty coordinators and administrators can transfer the Student Lead role.");
      return;
    }
    if (!selectedNewLeadId) {
      toast.error("Please select a member to transfer Student Lead role to.");
      return;
    }
    const targetMember = members.find((m) => (m.id || m._id) === selectedNewLeadId);
    if (targetMember?.currentHeadClub) {
      toast.error(`${targetMember.student?.name || "Member"} is already a lead of another club ("${targetMember.currentHeadClub.clubName}"). A student can be the Student Lead of only one club or society at a time.`);
      return;
    }
    const toastId = toast.loading(`Transferring leadership to ${targetMember?.student?.name || "selected member"}...`);
    try {
      setTransferring(true);
      const res = await transferStudentLead(clubId, { targetMembershipId: selectedNewLeadId });
      toast.success(res.data?.message || "Leadership successfully transferred!", { id: toastId });
      setIsTransferModalOpen(false);
      setSelectedNewLeadId("");
      await invalidateCache(['/api/clubs*', '/api/users/*']);
      fetchMembers(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to transfer leadership", { id: toastId });
    } finally {
      setTransferring(false);
    }
  };

  const togglePermission = async (membershipId, field, currentValue) => {
    if (updatingIds[membershipId]) return;

    const member = members.find((m) => (m.id || m._id) === membershipId);
    if (!member) return;

    if (isCurrentMemberSelf(member)) {
      toast.error("You cannot modify your own permissions.");
      return;
    }

    const fieldLabel = field === "canEditEvents" ? "Events" : "Attendance";
    const newPermValue = !currentValue;
    const actionLabel = newPermValue ? "Granting" : "Revoking";
    const toastId = toast.loading(`${actionLabel} '${fieldLabel}' permission for ${member.student?.name || "member"}...`);

    setUpdatingIds((prev) => ({ ...prev, [membershipId]: field }));

    const previousMembers = [...members];
    const permissions = {
      canTakeAttendance: field === "canTakeAttendance" ? newPermValue : member.canTakeAttendance,
      canEditEvents: field === "canEditEvents" ? newPermValue : member.canEditEvents,
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
      await invalidateCache(['/api/clubs*', '/api/users/*']);
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

  const handleSavePosition = async (membershipId) => {
    try {
      setSavingPositionId(membershipId);
      const trimmed = tempPosition.trim();
      await updateClubMember(membershipId, { position: trimmed || null });
      setMembers((prev) =>
        prev.map((m) =>
          (m.id || m._id) === membershipId ? { ...m, position: trimmed || null } : m
        )
      );
      toast.success("Designation updated successfully");
      setEditingPositionId(null);
      await invalidateCache(['/api/clubs*', '/api/users/*']);
      fetchMembers(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update designation");
    } finally {
      setSavingPositionId(null);
    }
  };

  const changeRole = async (membershipId, newRole) => {
    if (updatingIds[membershipId]) return;

    const member = members.find((m) => (m.id || m._id) === membershipId);
    if (!member) return;

    if (isCurrentMemberSelf(member)) {
      toast.error("You cannot change your own role.");
      return;
    }

    if (member.role === ClubMemberRole.CLUB_HEAD && !canManageLead) {
      toast.error("Student Lead role can only be changed by an administrator or faculty coordinator.");
      return;
    }

    if (newRole === ClubMemberRole.CLUB_HEAD) {
      if (!canManageLead) {
        toast.error("Only administrators and faculty coordinators can assign the Student Lead role.");
        return;
      }
      if (member.currentHeadClub) {
        toast.error(`${member.student?.name || "Member"} is already a lead of another club ("${member.currentHeadClub.clubName}"). A student can be the Student Lead of only one club or society at a time.`);
        return;
      }
      if (activeStudentLead && (activeStudentLead.id || activeStudentLead._id) !== membershipId) {
        setSelectedNewLeadId(membershipId);
        setIsTransferModalOpen(true);
        return;
      }
    }

    if (newRole === ClubMemberRole.COORDINATOR && member.role !== ClubMemberRole.COORDINATOR && isCoordinatorLimitReached) {
      toast.error("Maximum limit of 5 active coordinators reached for this club.");
      return;
    }

    const roleLabels = {
      [ClubMemberRole.CLUB_HEAD]: "Student Lead (Head)",
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
      await invalidateCache(['/api/clubs*', '/api/users/*']);
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

    if (isCurrentMemberSelf(member)) {
      toast.error("You cannot remove yourself from the club.");
      return;
    }

    if (!window.confirm(`Remove ${member.student?.name || "this member"} from the club?`)) return;

    const toastId = toast.loading(`Removing ${member.student?.name || "member"}...`);
    setUpdatingIds((prev) => ({ ...prev, [membershipId]: "remove" }));

    const previousMembers = [...members];
    setMembers((prev) => prev.filter((m) => (m.id || m._id) !== membershipId));

    try {
      await removeClubMember(membershipId);
      toast.success(`Member ${member.student?.name || ""} removed successfully`, { id: toastId });
      await invalidateCache(['/api/clubs*', '/api/users/*']);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <ShimmerText text="Loading members..." className="text-sm font-medium tracking-wide" />
      </div>
    );
  }

  const canManageTeam = hasPermission(authUser, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId });

  if (!canManageTeam) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Card className="border-border p-8 bg-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Team Management Restricted
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Team Management (adding members, managing roles, assigning event & attendance permissions) is reserved for the <strong>Student Lead (Club Head)</strong> and Club Administrators.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="sm" className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5">
              <Link to={`/club-events/${clubId}`}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Club Events
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">
                Go to Profile
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/club-events/${clubId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-brand-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Club Events
          </Link>
          <h1 className="text-2xl md:text-3xl font-medium text-foreground tracking-tight">Team Management</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage club members, leadership designations, and event editing permissions.
          </p>
        </div>
        {canManageLead && activeStudentLead && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedNewLeadId("");
              setIsTransferModalOpen(true);
            }}
            className="gap-1.5 text-xs font-medium border-brand-200 dark:border-brand-900/60 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Leadership
          </Button>
        )}
      </div>

      {/* Role Quota Indicators */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 border-border bg-card shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground">Student Lead</p>
            <Badge variant="outline" className="text-[9px] font-medium text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
              Faculty Designated
            </Badge>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground truncate">
              {activeStudentLead?.student?.name || "Not assigned"}
            </span>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {activeStudentLead ? "1 / 1" : "0 / 1"}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground truncate">
            {activeStudentLead ? "Appointed by Faculty Coordinator" : "Pending appointment by Faculty Coordinator"}
          </p>
        </Card>

        <Card className="p-3.5 border-border bg-card shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Coordinators</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {coordinatorCount} Active
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium ${
                isCoordinatorLimitReached
                  ? "border-destructive text-destructive bg-destructive/10"
                  : "border-sky-200 text-sky-600 bg-sky-50 dark:bg-sky-950/30"
              }`}
            >
              {coordinatorCount} / 5
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Maximum limit: 5 coordinators</p>
        </Card>

        <Card className="p-3.5 border-border bg-card shadow-2xs">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Team</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {members.filter((m) => !m.isClubAccount).length} Members
            </span>
            <Badge variant="secondary" className="text-[10px] font-medium">
              Active
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Active roster</p>
        </Card>
      </div>

      {/* Add Member Card */}
      <Card className="mb-6 p-5 sm:p-6 border-border bg-card shadow-xs">
        <div className="mb-4">
          <p className="text-sm font-medium tracking-wider text-foreground">
            Add New Team Member
          </p>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Input
                type="text"
                placeholder="Search student by name, email or roll number..."
                value={inviteEmail}
                onChange={(e) => handleSearchStudents(e.target.value)}
                required
                className="h-10 text-xs sm:text-xs bg-background border-input focus-visible:ring-brand-300"
              />

              {searchingStudents && (
                <div className="absolute right-3 top-2.5 text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </div>
              )}

              {studentSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 z-30 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl divide-y divide-border">
                  {studentSearchResults.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={st.isAlreadyMember}
                      onClick={() => handleSelectStudent(st)}
                      className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors ${
                        st.isAlreadyMember
                          ? "opacity-50 cursor-not-allowed bg-muted/50"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{st.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {st.email} {st.rollNo ? `• ${st.rollNo}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{st.branch || "Branch N/A"} • Year {st.year || "N/A"}</span>
                          {st.currentHeadClub && (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              • Lead of {st.currentHeadClub.clubName}
                            </span>
                          )}
                        </p>
                      </div>
                      {st.isAlreadyMember ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Already in team
                        </Badge>
                      ) : (
                        <span className="text-[11px] font-medium text-brand-600">
                          Select
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-[180px] flex-1">
              <Input
                type="text"
                placeholder="Designation (e.g. Technical Head)"
                value={invitePosition}
                onChange={(e) => setInvitePosition(e.target.value)}
                list="club-position-presets"
                className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-300"
              />
              <datalist id="club-position-presets">
                {POSITION_PRESETS.map((pos) => (
                  <option key={pos} value={pos} />
                ))}
              </datalist>
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground focus:border-brand-500 focus:outline-none cursor-pointer"
            >
              <option value={ClubMemberRole.MEMBER}>Member</option>
              <option value={ClubMemberRole.COORDINATOR} disabled={isCoordinatorLimitReached}>
                Coordinator {isCoordinatorLimitReached ? "(Max 5 reached)" : ""}
              </option>
              {canManageLead && (
                <option value={ClubMemberRole.CLUB_HEAD} disabled={!!activeStudentLead}>
                  Student Lead {activeStudentLead ? "(Already Assigned)" : ""}
                </option>
              )}
            </select>

            <Button
              type="submit"
              disabled={inviting || (selectedRole === ClubMemberRole.CLUB_HEAD && !!selectedStudent?.currentHeadClub)}
              className="h-10 bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {inviting ? "Adding…" : "Add Member"}
            </Button>
          </div>

          {/* Selected Student Confirmation Pill */}
          {selectedStudent && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                <span className="font-medium text-emerald-800 dark:text-emerald-300">Selected Student:</span>
                <span className="text-foreground font-medium">{selectedStudent.name}</span>
                <span className="text-muted-foreground">({selectedStudent.email})</span>
                {selectedStudent.currentHeadClub && (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                    Lead of {selectedStudent.currentHeadClub.clubName}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setInviteEmail("");
                  }}
                  className="ml-auto text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {selectedStudent.currentHeadClub && selectedRole === ClubMemberRole.CLUB_HEAD && (
                <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>{selectedStudent.name}</strong> is already a lead of another club (&ldquo;{selectedStudent.currentHeadClub.clubName}&rdquo;). A student can be the Student Lead of only one club or society at a time.
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </Card>

    

      {/* Members Table */}
      <Card className="overflow-hidden border-border bg-card shadow-xs">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No team members added yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30">
                <TableHead className="text-xs font-medium tracking-wider text-muted-foreground">Member</TableHead>
                <TableHead className="text-xs font-medium tracking-wider text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs font-medium tracking-wider text-muted-foreground">Designation</TableHead>
                <TableHead className="text-center text-xs font-medium tracking-wider text-muted-foreground">Attendance</TableHead>
                <TableHead className="text-center text-xs font-medium tracking-wider text-muted-foreground">Events</TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => {
                const id = member._id || member.id;
                const updatingType = updatingIds[id];
                const isUpdating = Boolean(updatingType);
                const isSelf = isCurrentMemberSelf(member);

                return (
                  <TableRow
                    key={id}
                    className={`transition-colors hover:bg-muted/40 ${isUpdating ? "bg-brand-50/20 dark:bg-brand-950/10" : ""} ${
                      member.isClubAccount ? "bg-brand-50/10 dark:bg-brand-950/20" : ""
                    }`}
                  >
                    {/* Member info */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={member.student?.name} image={member.student?.profileImage} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-medium text-foreground">
                              {member.student?.name}
                            </span>
                            {member.currentHeadClub && (
                              <Badge variant="outline" className="text-[10px] font-light py-0 px-1.5 text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                                Lead of {member.currentHeadClub.clubName}
                              </Badge>
                            )}
                            {isSelf && (
                              <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                You
                              </Badge>
                            )}
                            {member.isClubAccount && (
                              <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5 text-brand-600 border-brand-200">
                                Primary Owner
                              </Badge>
                            )}
                            {isUpdating && (
                              <Badge variant="outline" className="text-[10px] font-medium animate-pulse text-brand-600">
                                Updating…
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {member.student?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="py-3.5">
                      {member.isClubAccount ? (
                        <Badge variant="outline" className="gap-1 text-xs font-medium text-brand-600 border-brand-200 bg-brand-50/50 dark:bg-brand-950/30">
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" /> Official Club Account
                        </Badge>
                      ) : member.role === ClubMemberRole.CLUB_HEAD ? (
                        <div className="flex items-center gap-1.5" title="Student Lead role is designated by Institute Administration">
                          <Badge variant="outline" className="gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                            <Crown className="w-3.5 h-3.5 text-amber-500" /> Student Lead
                          </Badge>
                          {!canManageLead && (
                            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                              (Designated)
                            </span>
                          )}
                        </div>
                      ) : isSelf ? (
                        <Badge variant="secondary" className="text-xs font-medium">
                          {member.role === ClubMemberRole.COORDINATOR ? "Coordinator" : "Member"}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => changeRole(id, e.target.value)}
                            disabled={isUpdating}
                            className={`h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground focus:border-brand-500 focus:outline-none ${
                              isUpdating ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                            }`}
                          >
                            <option value={ClubMemberRole.COORDINATOR}>Coordinator</option>
                            <option value={ClubMemberRole.MEMBER}>Member</option>
                            {canManageLead && (
                              <option
                                value={ClubMemberRole.CLUB_HEAD}
                                disabled={!!member.currentHeadClub}
                              >
                                Student Lead (Head) {member.currentHeadClub ? `(Lead of ${member.currentHeadClub.clubName})` : ""}
                              </option>
                            )}
                          </select>
                          {updatingType === "role" && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 shrink-0" />
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Designation / Position */}
                    <TableCell className="py-3.5">
                      {member.isClubAccount ? (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      ) : editingPositionId === id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="text"
                            value={tempPosition}
                            onChange={(e) => setTempPosition(e.target.value)}
                            placeholder="e.g. Technical Head"
                            list="club-position-presets"
                            className="h-8 text-xs min-w-[130px] max-w-[190px] bg-background"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePosition(id);
                              if (e.key === "Escape") setEditingPositionId(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-0 cursor-pointer"
                            onClick={() => handleSavePosition(id)}
                            disabled={savingPositionId === id}
                            title="Save designation"
                          >
                            {savingPositionId === id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted p-0 cursor-pointer"
                            onClick={() => setEditingPositionId(null)}
                            disabled={savingPositionId === id}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          {member.position ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium py-0.5 px-2 bg-muted/40 border-border text-foreground truncate max-w-[170px]"
                              title={member.position}
                            >
                              {member.position}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None</span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0 cursor-pointer"
                            onClick={() => {
                              setEditingPositionId(id);
                              setTempPosition(member.position || "");
                            }}
                            title="Edit designation"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>

                    {/* Attendance Permission */}
                    <TableCell className="py-3.5 text-center">
                      {member.isClubAccount || isSelf || member.role === ClubMemberRole.CLUB_HEAD ? (
                        <div title={
                          member.role === ClubMemberRole.CLUB_HEAD
                            ? "Student Lead has full attendance management permissions"
                            : isSelf
                            ? "You cannot modify your own permissions"
                            : "Fixed permissions for official club account"
                        }>
                          <PermissionToggle
                            active={member.canTakeAttendance}
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
                    </TableCell>

                    {/* Events Permission */}
                    <TableCell className="py-3.5 text-center">
                      {member.isClubAccount || isSelf || member.role === ClubMemberRole.CLUB_HEAD ? (
                        <div title={
                          member.role === ClubMemberRole.CLUB_HEAD
                            ? "Student Lead has full event editing permissions"
                            : isSelf
                            ? "You cannot modify your own permissions"
                            : "Fixed permissions for official club account"
                        }>
                          <PermissionToggle
                            active={member.canEditEvents}
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
                    </TableCell>

                    {/* Remove Action */}
                    <TableCell className="py-3.5 text-right">
                      {member.isClubAccount || isSelf || (member.role === ClubMemberRole.CLUB_HEAD && !canManageLead) ? (
                        <span
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground/40 cursor-not-allowed"
                          title={
                            member.role === ClubMemberRole.CLUB_HEAD
                              ? "Student Lead can only be removed or changed by an Administrator or Faculty Coordinator"
                              : isSelf
                              ? "You cannot remove yourself from the club"
                              : "Official Club Account is permanent and cannot be removed"
                          }
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember(id)}
                          disabled={isUpdating}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Remove member"
                        >
                          {updatingType === "remove" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Transfer Leadership Modal */}
      {canManageLead && isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Transfer Leadership</h3>
                  <p className="text-xs text-muted-foreground">Select a club member to become the new Student Lead</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeStudentLead && (
              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                Current Lead: <span className="font-medium">{activeStudentLead.student?.name}</span> ({activeStudentLead.student?.email}) will revert to member status.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">New Student Lead</label>
              <select
                value={selectedNewLeadId}
                onChange={(e) => setSelectedNewLeadId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- Choose Member --</option>
                {members
                  .filter((m) => !m.isClubAccount && m.role !== ClubMemberRole.CLUB_HEAD)
                  .map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id} disabled={!!m.currentHeadClub}>
                      {m.student?.name || m.email} ({m.student?.rollNo || m.role}) {m.currentHeadClub ? `[Already Lead of ${m.currentHeadClub.clubName}]` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(false)}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleTransferLeadership}
                disabled={!selectedNewLeadId || transferring}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
              >
                {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{transferring ? "Transferring..." : "Confirm Transfer"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubMembers;