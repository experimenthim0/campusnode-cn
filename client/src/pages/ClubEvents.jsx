import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClubMembers, getClubById } from '../services/clubService';
import { CLUB_EVENT_EXPORT_COLUMNS, downloadClubEventExport } from '../utils/clubEventExport';
import { getClubManagedEvents, reviewEvent, deleteEvent } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import {
  Clock,
  MapPin,
  Users,
  QrCode,
  MoreVertical,
  Trophy,
  Edit,
  Trash2,
  Award,
  Star,
  Eye,
  Handshake,
  ArrowLeft,
  Plus,
  Check,
  X,
  RotateCcw,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  FilterX,
  Download,
} from 'lucide-react';
import { ClubMemberRole } from '../types/index.js';
import WinnerModal from '../components/WinnerModal';
import ColumnExportModal from '../components/ColumnExportModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ShimmerText from '../components/ShimmerText';

const ClubEvents = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportFilters, setExportFilters] = useState({ month: 'all', year: 'all' });
  const [statusTab, setStatusTab] = useState('ALL');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [clubName, setClubName] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [canCheckReg, setCanCheckReg] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [openMenuEventId, setOpenMenuEventId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState({ openUpward: false, alignRight: true });
  const [winnerModalEvent, setWinnerModalEvent] = useState(null);

  const [eventExportModalOpen, setEventExportModalOpen] = useState(false);
  const [selectedEventExportColumns, setSelectedEventExportColumns] = useState(CLUB_EVENT_EXPORT_COLUMNS.map(column => column.key));
  const [eventExporting, setEventExporting] = useState(false);
  const [eventExportError, setEventExportError] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.event-action-menu')) {
        setOpenMenuEventId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setRole(authRole);
      fetchClubEvents(clubId);

      const isFac = Boolean(
        authRole === 'facultyCoordinator' ||
        authUser?.role === 'facultyCoordinator' ||
        authUser?.principalType === 'FACULTY' ||
        authUser?.memberships?.some(
          (m) => m.role === 'FACULTY_COORDINATOR' || m.role === 'facultyCoordinator' || m.role === 'FACULTY'
        )
      );

      setCanReview(isFac || authRole === 'admin' || authRole === 'SUPER_ADMIN');
      if (authRole === 'club' || authRole === 'admin' || authRole === 'SUPER_ADMIN') {
        setCanEdit(true);
        setCanScan(true);
        setCanCheckReg(true);
      }

      // Check immediate membership in authUser
      const myAuthMem = authUser.memberships?.find(
        (m) => String(m.clubId || m.club?.id) === String(clubId)
      );
      if (myAuthMem) {
        if (myAuthMem.club?.clubName || myAuthMem.clubName) {
          setClubName(myAuthMem.club?.clubName || myAuthMem.clubName);
        }
        const r = myAuthMem.role;
        const isHead = r === 'CLUB_HEAD' || r === ClubMemberRole.CLUB_HEAD;
        const isCoordinator = r === 'COORDINATOR' || r === ClubMemberRole.COORDINATOR;
        if (isHead || isCoordinator || myAuthMem.canEditEvents) {
          setCanEdit(true);
          setCanCheckReg(true);
        }
        if (isHead || isCoordinator || myAuthMem.canTakeAttendance) {
          setCanScan(true);
        }
      }

      // Fetch official club details
      getClubById(clubId)
        .then((res) => {
          if (res.data?.clubName) {
            setClubName(res.data.clubName);
          }
        })
        .catch(() => {});

      getClubMembers(clubId)
        .then((res) => {
          const members = Array.isArray(res.data) ? res.data : (res.data?.members || []);
          if (members.length > 0 && members[0]?.clubName) {
            setClubName((prev) => prev || members[0].clubName);
          }
          const userId = String(authUser.id || authUser._id);
          const myMembership = members.find((m) =>
            String(m.studentId?._id || m.studentId || m.student?.id || m.student?._id) === userId
          );
          if (myMembership) {
            if (myMembership.clubName) setClubName(myMembership.clubName);
            const r = myMembership.role;
            const isHead = r === 'CLUB_HEAD' || r === ClubMemberRole.CLUB_HEAD;
            const isCoordinator = r === 'COORDINATOR' || r === ClubMemberRole.COORDINATOR;
            setCanEdit(isHead || isCoordinator || Boolean(myMembership.canEditEvents ?? myMembership.permissions?.canEditEvents));
            setCanScan(isHead || isCoordinator || Boolean(myMembership.canTakeAttendance ?? myMembership.permissions?.canTakeAttendance));
            setCanCheckReg(isHead || isCoordinator || Boolean(myMembership.canEditEvents ?? myMembership.permissions?.canEditEvents));
          }
        })
        .catch(() => {});
    } else {
      setLoading(false);
    }
  }, [clubId, authUser?.id, authRole]);

  const fetchClubEvents = async (id) => {
    try {
      const res = await getClubManagedEvents(id);
      const events = Array.isArray(res.data) ? res.data : [];
      setCreatedEvents(events);
      if (events.length > 0) {
        const firstEventClub = events[0].club?.clubName || events[0].organizers?.[0]?.club?.clubName;
        if (firstEventClub) setClubName((prev) => prev || firstEventClub);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch events', err);
      showNotification(err.response?.data?.message || 'Failed to load club events', 'error');
      setLoading(false);
    }
  };

  const handleReview = async (eventId, status, comment = '') => {
    try {
      await reviewEvent(eventId, { status, comment });
      showNotification(`Event ${status === 'PUBLISHED' ? 'Approved' : 'Rejected'} successfully`, 'success');
      fetchClubEvents(clubId);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Review failed', 'error');
    }
  };

  const handleDelete = (eventId) => {
    setEventToDelete(eventId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      const res = await deleteEvent(eventToDelete);
      if (res.data.message && (res.data.message.includes('submitted') || res.data.message.includes('request'))) {
        showNotification('Deletion request sent for faculty approval', 'success');
        setCreatedEvents(createdEvents.map(e => {
          if ((e.id || e._id) === eventToDelete) {
            return { ...e, reviewStatus: 'DELETION_REQUESTED' };
          }
          return e;
        }));
      } else {
        setCreatedEvents(createdEvents.filter(e => (e.id || e._id) !== eventToDelete));
        showNotification('Event deleted successfully', 'success');
      }
      setDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      showNotification(err.response?.data?.message || 'Failed to delete event. Please try again.', 'error');
      setDeleteModalOpen(false);
      setEventToDelete(null);
    }
  };

  const clearFilters = () => setExportFilters({ month: 'all', year: 'all' });

  const handleExportClubData = () => {
    setEventExportError('');
    setSelectedEventExportColumns(CLUB_EVENT_EXPORT_COLUMNS.map(column => column.key));
    setEventExportModalOpen(true);
  };

  const performClubEventExport = async () => {
    if (selectedEventExportColumns.length === 0) {
      setEventExportError('Select at least one column to export.');
      return;
    }
    setEventExporting(true);
    setEventExportError('');
    try {
      const exported = await downloadClubEventExport(clubId, exportFilters, selectedEventExportColumns);
      if (!exported) {
        setEventExportError('No data to export.');
        return;
      }
      setEventExportModalOpen(false);
      showNotification('Export successful!', 'success');
    } catch (err) {
      console.error('Club event export failed:', err);
      setEventExportError('Failed to export data.');
    } finally {
      setEventExporting(false);
    }
  };

  const isFacultyCoordinator = Boolean(
    authRole === 'facultyCoordinator' ||
    role === 'facultyCoordinator' ||
    authUser?.role === 'facultyCoordinator' ||
    user?.role === 'facultyCoordinator' ||
    authUser?.principalType === 'FACULTY' ||
    user?.principalType === 'FACULTY' ||
    authUser?.memberships?.some(
      (m) => m.role === 'FACULTY_COORDINATOR' || m.role === 'facultyCoordinator' || m.role === 'FACULTY'
    ) ||
    user?.memberships?.some(
      (m) => m.role === 'FACULTY_COORDINATOR' || m.role === 'facultyCoordinator' || m.role === 'FACULTY'
    )
  );

  const canCreateEvent = canEdit && !isFacultyCoordinator;
  const pendingCount = createdEvents.filter(e => e.reviewStatus === 'PENDING' || e.reviewStatus === 'DELETION_REQUESTED').length;

  const filteredEvents = createdEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    const mMatch = exportFilters.month === 'all' || (eventDate.getMonth() + 1).toString() === exportFilters.month.toString();
    const yMatch = exportFilters.year === 'all' || eventDate.getFullYear().toString() === exportFilters.year.toString();
    const sMatch = statusTab === 'ALL'
      ? true
      : statusTab === 'PENDING'
      ? (event.reviewStatus === 'PENDING' || event.reviewStatus === 'DELETION_REQUESTED')
      : statusTab === 'PUBLISHED'
      ? event.reviewStatus === 'PUBLISHED'
      : true;
    return mMatch && yMatch && sMatch;
  });

  if (!user) return <div className="text-center mt-12 text-muted-foreground font-medium">Please login to view events.</div>;
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ShimmerText text="Loading club events..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-brand-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {clubName} Events
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {createdEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <select 
                value={exportFilters.month}
                onChange={(e) => setExportFilters({ ...exportFilters, month: e.target.value })}
                className="h-8 px-2.5 border border-input rounded-lg text-xs font-medium text-foreground bg-background focus:border-brand-500 outline-none hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <option value="all">Month</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
                ))}
              </select>
              <select 
                value={exportFilters.year}
                onChange={(e) => setExportFilters({ ...exportFilters, year: e.target.value })}
                className="h-8 px-2.5 border border-input rounded-lg text-xs font-medium text-foreground bg-background focus:border-brand-500 outline-none hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <option value="all">Year</option>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {(exportFilters.month !== 'all' || exportFilters.year !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 cursor-pointer"
                >
                  Clear
                </Button>
              )}
              {/* Semantic Green Data Export Button */}
              <Button
                size="sm"
                onClick={handleExportClubData}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </div>
          )}

          {canCreateEvent && (
            <Button
              asChild
              size="sm"
              className="h-8 gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs rounded-lg shadow-xs cursor-pointer"
            >
              <Link to={`/create?clubId=${clubId}`}>
                <Plus className="w-3.5 h-3.5" /> Create Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {createdEvents.length > 0 && (
        <div className="flex items-center gap-1.5 pb-4 border-b border-border mb-6 overflow-x-auto">
          <Button
            size="sm"
            variant={statusTab === 'ALL' ? 'default' : 'ghost'}
            onClick={() => setStatusTab('ALL')}
            className={`h-8 text-xs font-medium rounded-lg ${
              statusTab === 'ALL' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Events ({createdEvents.length})
          </Button>
          <Button
            size="sm"
            variant={statusTab === 'PENDING' ? 'default' : 'ghost'}
            onClick={() => setStatusTab('PENDING')}
            className={`h-8 text-xs font-medium rounded-lg gap-1.5 ${
              statusTab === 'PENDING'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Review
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant={statusTab === 'PUBLISHED' ? 'default' : 'ghost'}
            onClick={() => setStatusTab('PUBLISHED')}
            className={`h-8 text-xs font-medium rounded-lg ${
              statusTab === 'PUBLISHED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Approved / Live
          </Button>
        </div>
      )}

      {/* Events List */}
      {createdEvents.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mb-4 mx-auto" />
            <p className="text-muted-foreground mb-4 text-sm max-w-md mx-auto">
              {isFacultyCoordinator 
                ? 'No events have been submitted for this club yet. Once student coordinators create events, they will appear here for your review and approval.' 
                : 'No events found for this club.'}
            </p>
            {canCreateEvent && (
              <Button
                asChild
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs rounded-lg gap-1.5"
              >
                <Link to={`/create?clubId=${clubId}`}>
                  <Plus className="w-3.5 h-3.5" /> Create Event
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="p-12 text-center">
            <FilterX className="w-12 h-12 text-muted-foreground/40 mb-3 mx-auto" />
            <p className="text-muted-foreground mb-3 text-sm">No events match your selected filters.</p>
            <Button 
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map(event => {
            const now = new Date();
            const isPast = new Date(event.endTime) < now;
            const isLive = new Date(event.startTime) <= now && new Date(event.endTime) > now;
            
            const eventIdStr = String(event.id || event._id);
            const userRole = (user?.role || localStorage.getItem('role') || '').toLowerCase();
            const isClubLead = Boolean(user?.memberships?.some(m => String(m.clubId || m.club?.id) === String(clubId) && (m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR')));
            const isClubHeadOrAdmin = userRole === 'club' || userRole === 'admin' || canEdit || isClubLead || event.createdById === user?.id || event.createdById === user?._id;
            const canViewReg = canCheckReg || isClubHeadOrAdmin;
            const canScanAttendance = (canScan || isClubHeadOrAdmin) && !isPast;
            const canEditEvent = !isFacultyCoordinator && (canEdit || isClubHeadOrAdmin);
            const canDeleteEvent = !isFacultyCoordinator && (canEdit || isClubHeadOrAdmin);

            const isFeedbackAllowed = event.feedbackEnabled !== false;
            const canViewFeedback = canViewReg && isFeedbackAllowed;

            const isWinnerAllowed = Boolean(event.showWinner) || (Array.isArray(event.winners) && event.winners.length > 0);
            const canAnnounceWinners = (canEdit || canCheckReg || isClubHeadOrAdmin) && isWinnerAllowed;

            const isCertAllowed = Boolean(event.provideCertificate) || Boolean(event.certificateTemplate);
            const canDesignCert = (canEdit || isClubHeadOrAdmin) && isCertAllowed;

            const hasAnyMenuActions = canViewReg || canScanAttendance || canAnnounceWinners || canDesignCert || canViewFeedback || canEditEvent || canDeleteEvent;
            const isPendingReview = canReview && (event.reviewStatus === 'PENDING' || event.reviewStatus === 'DELETION_REQUESTED');

            return (
              <Card
                key={eventIdStr}
                className={`overflow-visible transition-all duration-200 border-border bg-card ${
                  isPendingReview ? 'border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-500/20' : ''
                } ${openMenuEventId === eventIdStr ? 'z-30' : 'z-0'}`}
              >
                {/* Event Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 md:px-6 pt-4 pb-3 border-b border-border bg-muted/20 gap-3">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    <Link to={`/event/${event.slug || eventIdStr}`} className="hover:text-brand-600 transition-colors">
                      {event.title}
                    </Link>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium ${
                        event.reviewStatus === 'PUBLISHED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : event.reviewStatus === 'PENDING'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : event.reviewStatus === 'REJECTED' || event.reviewStatus === 'DELETION_REQUESTED'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {event.reviewStatus}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium ${
                        isPast
                          ? 'bg-muted text-muted-foreground border-border'
                          : isLive
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 animate-pulse'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                      }`}
                    >
                      {isPast ? 'Past' : isLive ? 'Live Now' : 'Upcoming'}
                    </Badge>

                    {(event.organizers || []).length > 1 && (
                      <Badge variant="outline" className="gap-1 text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60">
                        <Handshake className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Joint Event
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Co-organizers */}
                {(event.organizers || []).length > 1 && (
                  <div className="flex items-center gap-2 px-5 md:px-6 py-2 border-b border-border bg-muted/10">
                    <span className="text-[11px] text-muted-foreground font-medium">With:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {event.organizers
                        .filter(o => String(o.clubId) !== String(clubId))
                        .map((o, i) => (
                          <Link
                            key={o.club?.id || i}
                            to={`/club/${o.club?.slug || o.clubId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            {o.club?.clubLogo && (
                              <img src={o.club.clubLogo} alt="" className="w-4 h-4 rounded-full object-cover border border-border" />
                            )}
                            {o.club?.clubName || 'Partner Club'}
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* Card Main Body */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-5 md:px-6 py-4 gap-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {event.venue}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      {new Date(event.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {event.registeredCount} / {event.totalSeats || '∞'} registered
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canReview && event.reviewStatus?.toUpperCase() === 'PENDING' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/event/${event.slug || eventIdStr}/preview`, '_blank', 'noopener,noreferrer')}
                          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                          title="Preview all event and payment details before approving"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" /> Preview &amp; Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) handleReview(eventIdStr, 'REJECTED', reason);
                          }}
                          className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    ) : canReview && event.reviewStatus?.toUpperCase() === 'DELETION_REQUESTED' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/event/${event.slug || eventIdStr}/preview`, '_blank', 'noopener,noreferrer')}
                          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" /> Inspect
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(eventIdStr)}
                          className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Approve Deletion
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore Event
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {canViewReg && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                          >
                            <Link to={`/event/${eventIdStr}/registrations`}>
                              Registrations
                            </Link>
                          </Button>
                        )}

                        {hasAnyMenuActions && (
                          <div className={`relative event-action-menu ${openMenuEventId === eventIdStr ? 'z-50' : 'z-10'}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openMenuEventId === eventIdStr) {
                                  setOpenMenuEventId(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  const openUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
                                  const alignRight = rect.right > 200;
                                  setMenuPlacement({ openUpward, alignRight });
                                  setOpenMenuEventId(eventIdStr);
                                }
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>

                            {openMenuEventId === eventIdStr && (
                              <div 
                                className={`absolute ${menuPlacement.alignRight ? 'right-0' : 'left-0'} ${
                                  menuPlacement.openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                } w-52 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 py-1 text-xs`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuEventId(null);
                                    window.open(`/event/${event.slug || eventIdStr}/preview`, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-muted font-medium transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-brand-600" /> Full Preview &amp; Details
                                </button>
                                {canEditEvent && (
                                  <Link
                                    to={`/events/edit/${eventIdStr}`}
                                    onClick={() => setOpenMenuEventId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted font-medium transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit Event
                                  </Link>
                                )}
                                {canScanAttendance && (
                                  <Link
                                    to={`/event/${eventIdStr}/check-in`}
                                    onClick={() => setOpenMenuEventId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted font-medium transition-colors"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" /> Scan Attendance
                                  </Link>
                                )}

                                {canViewFeedback && (
                                  <Link
                                    to={`/event/${eventIdStr}/feedback`}
                                    onClick={() => setOpenMenuEventId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-amber-600 dark:text-amber-400 font-medium transition-colors"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" /> Event Feedback
                                  </Link>
                                )}

                                {canAnnounceWinners && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEventId(null);
                                      setWinnerModalEvent(event);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
                                  >
                                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Announce Winners
                                  </button>
                                )}

                                {canDesignCert && (
                                  <Link
                                    to={`/event/${eventIdStr}/design-certificate`}
                                    onClick={() => setOpenMenuEventId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-brand-600 dark:text-brand-400 font-medium transition-colors"
                                  >
                                    <Award className="w-3.5 h-3.5" /> Design Certificate
                                  </Link>
                                )}

                                {canDeleteEvent && (
                                  <>
                                    <div className="my-1 border-t border-border" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuEventId(null);
                                        handleDelete(eventIdStr);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-destructive/10 text-destructive font-medium transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete Event
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Block for special states */}
                {(event.reviewStatus === 'REJECTED' || 
                  event.reviewStatus === 'DELETION_REQUESTED' ||
                  (canReview && event.reviewStatus === 'PENDING')) && (
                  <div className="px-5 pb-4 pt-3 border-t border-border bg-muted/10">
                    {event.reviewStatus === 'REJECTED' && (
                      <div className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0 text-destructive">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-0.5">Rejection Reason</p>
                          <p className="text-xs text-destructive font-medium">{event.reviewComment || 'No feedback provided. Please contact the faculty coordinator.'}</p>
                        </div>
                      </div>
                    )}
                    {event.reviewStatus === 'DELETION_REQUESTED' && (
                      <div className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-0.5">Deletion Pending Approval</p>
                          <p className="text-xs text-destructive font-medium leading-relaxed">
                            {canReview 
                              ? 'The club has requested to delete this event. Click Approve Deletion to execute, or Restore Event to reject deletion.'
                              : 'This event is pending deletion approval by the faculty coordinator.'}
                          </p>
                        </div>
                      </div>
                    )}
                    {canReview && event.reviewStatus === 'PENDING' && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Review Required</p>
                          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">This event is waiting for your approval. Click "Preview & Review" to inspect details, or Approve / Reject directly.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ColumnExportModal
        open={eventExportModalOpen}
        columns={CLUB_EVENT_EXPORT_COLUMNS}
        selectedColumns={selectedEventExportColumns}
        onSelectedColumnsChange={setSelectedEventExportColumns}
        onClose={() => setEventExportModalOpen(false)}
        onExport={performClubEventExport}
        isExporting={eventExporting}
        error={eventExportError}
      />

      {/* Semantic Red Destructive Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <Card className="max-w-md w-full shadow-2xl overflow-hidden border-border bg-card">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    {!canReview ? 'Request Deletion' : 'Confirm Deletion'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!canReview ? 'Submit deletion request to faculty coordinator' : 'Permanent event removal'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {!canReview 
                  ? 'Are you sure you want to request deletion of this event? This will submit a deletion request to the faculty coordinator for approval. All registrations will be lost if approved.' 
                  : 'Are you sure you want to permanently delete this event? All registrations will be lost. This action cannot be undone.'}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                className="font-medium text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                className="font-medium text-xs rounded-xl shadow-xs"
              >
                {!canReview ? 'Request Deletion' : 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <WinnerModal
        isOpen={!!winnerModalEvent}
        onClose={() => setWinnerModalEvent(null)}
        event={winnerModalEvent}
        onWinnersUpdated={(updatedEvent) => {
          setCreatedEvents(prev =>
            prev.map(ev =>
              (ev.id || ev._id) === (updatedEvent.id || updatedEvent._id) ? { ...ev, ...updatedEvent } : ev
            )
          );
        }}
      />
    </div>
  );
};

export default ClubEvents;
