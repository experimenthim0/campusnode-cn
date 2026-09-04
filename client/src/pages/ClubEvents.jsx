import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClubMembers } from '../services/clubService';
import { CLUB_EVENT_EXPORT_COLUMNS, downloadClubEventExport } from '../utils/clubEventExport';
import { getClubManagedEvents, reviewEvent, deleteEvent } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import { Clock, MapPin, Users, QrCode, MoreVertical, Trophy, FileText, Edit, Trash2, Award, Star, Eye } from 'lucide-react';
import { DownloadIcon } from '@/components/ui/download';
import { ClubMemberRole } from '../types/index.js';
import WinnerModal from '../components/WinnerModal';
import ColumnExportModal from '../components/ColumnExportModal';
import EventApprovalPreviewModal from '../components/EventApprovalPreviewModal';

const ClubEvents = () => {
  const { clubId } = useParams();
  const { showNotification } = useNotification();
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportFilters, setExportFilters] = useState({ month: 'all', year: 'all' });
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
  const [previewEvent, setPreviewEvent] = useState(null);
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

      setCanReview(authRole === 'facultyCoordinator');
      if (authRole === 'club' || authRole === 'admin' || authRole === 'SUPER_ADMIN') {
        setCanEdit(true);
        setCanScan(true);
        setCanCheckReg(true);
      }

      getClubMembers(clubId)
        .then(res => {
          const members = Array.isArray(res.data) ? res.data : (res.data?.members || []);
          const userId = String(authUser.id || authUser._id);
          const myMembership = members.find(m =>
            String(m.studentId?._id || m.studentId || m.student?.id || m.student?._id) === userId
          );
          if (myMembership) {
            setClubName(myMembership.clubName || "");
            const r = myMembership.role;
            const isHead = r === ClubMemberRole.CLUB_HEAD;
            const isCoordinator = r === ClubMemberRole.COORDINATOR;
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
      setCreatedEvents(res.data);
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

  const filteredEvents = createdEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    const mMatch = exportFilters.month === 'all' || (eventDate.getMonth() + 1).toString() === exportFilters.month.toString();
    const yMatch = exportFilters.year === 'all' || eventDate.getFullYear().toString() === exportFilters.year.toString();
    return mMatch && yMatch;
  });

  if (!user) return <div className="text-center mt-12 text-neutral-600 font-medium">Please login to view events.</div>;
  if (loading) return <div className="text-center mt-12 text-neutral-600 font-medium">Loading events...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-brand-600 transition-colors mb-2"
          >
            <i className="ri-arrow-left-line text-sm" /> Back to Profile
          </Link>
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            {clubName} Events
          </h2>
        </div>

        {createdEvents.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <select 
                value={exportFilters.month}
                onChange={(e) => setExportFilters({ ...exportFilters, month: e.target.value })}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none hover:cursor-pointer hover:bg-gray-50 transition-all"
              >
                <option value="all">Month</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
                ))}
              </select>
              <select 
                value={exportFilters.year}
                onChange={(e) => setExportFilters({ ...exportFilters, year: e.target.value })}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none hover:cursor-pointer hover:bg-gray-50 transition-all"
              >
                <option value="all">Year</option>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {(exportFilters.month !== 'all' || exportFilters.year !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleExportClubData}
                className="inline-flex items-center justify-center gap-2 px-4 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-all active:translate-y-0.5 hover:shadow-sm hover:cursor-pointer"
              >
                <i className="ri-download-2-line text-sm" /> Export
              </button>
            </div>
          </div>
        )}
      </div>

      {createdEvents.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
          <i className="ri-calendar-event-line text-5xl text-neutral-300 mb-4 inline-block" />
          <p className="text-neutral-500 mb-4 font-medium">No events found for this club.</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-12 text-center shadow-sm">
          <i className="ri-filter-off-line text-5xl text-neutral-300 mb-4 inline-block" />
          <p className="text-neutral-500 mb-2 font-medium">No events match your selected filters.</p>
          <button 
            onClick={clearFilters}
            className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredEvents.map(event => {
            const now = new Date();
            const isPast = new Date(event.endTime) < now;
            const isLive = new Date(event.startTime) <= now && new Date(event.endTime) > now;
            const statusColors = {
                'PENDING': 'bg-amber-50 text-amber-700 border-amber-200',
                'PUBLISHED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'REJECTED': 'bg-rose-50 text-rose-700 border-rose-200',
                'DRAFT': 'bg-neutral-100 text-neutral-600 border-neutral-200'
            };

            const eventIdStr = String(event.id || event._id);
            const userRole = (user?.role || localStorage.getItem('role') || '').toLowerCase();
            const isClubHeadOrAdmin = userRole === 'club' || userRole === 'admin' || canEdit || event.createdById === user?.id || event.createdById === user?._id;
            const canViewReg = canCheckReg || isClubHeadOrAdmin;
            const canScanAttendance = (canScan || isClubHeadOrAdmin) && !isPast;
            const canManageWinners = canEdit || canCheckReg || isClubHeadOrAdmin;
            const canEditEvent = canEdit || isClubHeadOrAdmin;
            const canDeleteEvent = canEdit || isClubHeadOrAdmin;
            const canCert = (canEdit || isClubHeadOrAdmin) && event.provideCertificate;
            const hasAnyMenuActions = canViewReg || canScanAttendance || (canManageWinners && (event.showWinner || isPast)) || canCert || canEditEvent || canDeleteEvent;

            return (
            <div
              key={eventIdStr}
              className={`bg-white border border-neutral-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative ${
                openMenuEventId === eventIdStr ? 'z-30' : 'z-0'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 md:px-6 pt-5 pb-3 border-b border-neutral-100 bg-neutral-50/30 gap-3">
                <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                    <Link to={`/event/${event.slug || eventIdStr}`} className="hover:text-brand-600 transition-colors">
                        {event.title}
                    </Link>
                </h3>
                <div className="flex gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[event.reviewStatus] || 'bg-white border-neutral-200'}`}>
                        {event.reviewStatus}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      isPast ? 'bg-neutral-50 text-neutral-500 border-neutral-200' :
                      isLive ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse-slow' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                        {isPast ? 'Past' : isLive ? 'Live Now' : 'Upcoming'}
                    </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between px-5 md:px-6 py-4 gap-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 shrink-0 text-neutral-400" />
                    {event.venue}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-neutral-500">
                    <Clock className="w-4 h-4 shrink-0 text-brand-600" />
                    {new Date(event.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                    <Users className="w-4 h-4 shrink-0 text-neutral-400" />
                    {event.registeredCount} / {event.totalSeats || '∞'} registered
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canReview && event.reviewStatus?.toUpperCase() === 'PENDING' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPreviewEvent(event)}
                        className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white transition font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                        title="Preview all event and payment details before approving"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-400 dark:text-brand-600" />
                        Preview &amp; Review
                      </button>
                      <button
                        onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) handleReview(eventIdStr, 'REJECTED', reason);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  ) : canReview && event.reviewStatus?.toUpperCase() === 'DELETION_REQUESTED' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPreviewEvent(event)}
                        className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white transition font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-400 dark:text-brand-600" />
                        Inspect
                      </button>
                      <button
                        onClick={() => handleDelete(eventIdStr)}
                        className="px-3.5 py-1.5 bg-rose-650 text-white rounded-lg hover:bg-rose-700 transition font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Approve Deletion
                      </button>
                      <button
                        onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Restore Event
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {canViewReg && (
                        <Link
                          to={`/event/${eventIdStr}/registrations`}
                          className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition font-semibold text-xs cursor-pointer shadow-sm whitespace-nowrap"
                        >
                          Registrations
                        </Link>
                      )}

                      {hasAnyMenuActions && (
                        <div className={`relative event-action-menu ${openMenuEventId === eventIdStr ? 'z-50' : 'z-10'}`}>
                          <button
                            type="button"
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
                            className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuEventId === eventIdStr && (
                            <div 
                              className={`absolute ${menuPlacement.alignRight ? 'right-0' : 'left-0'} ${
                                menuPlacement.openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                              } w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100dvh-60px)] overflow-y-auto`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuEventId(null);
                                  setPreviewEvent(event);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-neutral-400" /> Full Preview &amp; Details
                              </button>
                              {canViewReg && (
                                <Link
                                  to={`/event/${eventIdStr}/registrations`}
                                  onClick={() => setOpenMenuEventId(null)}
                                  className="flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition"
                                >
                                  <FileText className="w-3.5 h-3.5 text-neutral-400" /> View Registrations
                                </Link>
                              )}

                              {canViewReg && (
                                <Link
                                  to={`/event/${eventIdStr}/feedback`}
                                  onClick={() => setOpenMenuEventId(null)}
                                  className="flex items-center gap-2 px-3.5 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium transition"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" /> Event Feedback
                                </Link>
                              )}

                              {canScanAttendance && (
                                <Link
                                  to={`/event/${eventIdStr}/check-in`}
                                  onClick={() => setOpenMenuEventId(null)}
                                  className="flex items-center gap-2 px-3.5 py-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 font-medium transition"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> Scan Attendance
                                </Link>
                              )}

                              {canManageWinners && (event.showWinner || isPast) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuEventId(null);
                                    setWinnerModalEvent(event);
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium transition cursor-pointer"
                                >
                                  <Trophy className="w-3.5 h-3.5" /> Announce Winners
                                </button>
                              )}

                              {canCert && (
                                <Link
                                  to={`/event/${eventIdStr}/design-certificate`}
                                  onClick={() => setOpenMenuEventId(null)}
                                  className="flex items-center gap-2 px-3.5 py-2 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium transition"
                                >
                                  <Award className="w-3.5 h-3.5" /> Design Certificate
                                </Link>
                              )}

                              {canEditEvent && (
                                <Link
                                  to={`/events/edit/${eventIdStr}`}
                                  onClick={() => setOpenMenuEventId(null)}
                                  className="flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition"
                                >
                                  <Edit className="w-3.5 h-3.5 text-neutral-400" /> Edit Event
                                </Link>
                              )}

                              {canDeleteEvent && (
                                <>
                                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEventId(null);
                                      handleDelete(eventIdStr);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition cursor-pointer"
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
                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4 bg-neutral-50/20">
                      {event.reviewStatus === 'REJECTED' && (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 items-start">
                              <i className="ri-error-warning-fill text-rose-600 text-xl animate-bounce-slow" />
                              <div className="text-left">
                                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Rejection Reason</p>
                                  <p className="text-sm text-rose-600 font-semibold">{event.reviewComment || 'No feedback provided. Please contact the faculty coordinator.'}</p>
                              </div>
                          </div>
                      )}
                      {event.reviewStatus === 'DELETION_REQUESTED' && (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 items-start">
                              <i className="ri-delete-bin-fill text-rose-600 text-xl" />
                              <div className="text-left">
                                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Deletion Pending Approval</p>
                                  <p className="text-sm text-rose-600 font-semibold">
                                      {canReview 
                                        ? 'The club has requested to delete this event. Click Approve Deletion to execute, or Restore Event to reject deletion.'
                                        : 'This event is pending deletion approval by the faculty coordinator.'}
                                  </p>
                              </div>
                          </div>
                      )}
                      {canReview && event.reviewStatus === 'PENDING' && (
                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start">
                              <i className="ri-information-fill text-amber-600 text-xl" />
                              <div className="text-left">
                                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Review Required</p>
                                  <p className="text-sm text-amber-600 font-semibold">This event is waiting for your approval before it becomes visible to students.</p>
                              </div>
                          </div>
                      )}
                  </div>
              )}
            </div>
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
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
                  <i className="ri-delete-bin-line" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">Confirm Deletion</h3>
                  <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">Event cancellation & removal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                title="Close"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs sm:text-sm text-[#555555] dark:text-[#B5B5B5] leading-relaxed font-normal text-left">
                {!canReview 
                  ? 'Are you sure you want to request deletion of this event? This will submit a deletion request to the faculty coordinator for approval. All registrations will be lost if approved.' 
                  : 'Are you sure you want to permanently delete this event? All registrations will be lost. This action cannot be undone.'}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
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
      <EventApprovalPreviewModal
        event={previewEvent}
        isOpen={Boolean(previewEvent)}
        onClose={() => setPreviewEvent(null)}
        onApprove={handleReview}
        onReject={(id, reason) => handleReview(id, 'REJECTED', reason)}
        onDeleteApprove={handleDelete}
        onRestore={(id) => handleReview(id, 'PUBLISHED')}
        userRole={authRole}
      />
    </div>
  );
};

export default ClubEvents;
