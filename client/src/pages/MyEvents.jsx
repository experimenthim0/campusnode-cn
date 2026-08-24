import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  getUserEvents,
  getClubManagedEvents,
  reviewEvent,
  cancelRegistration,
  deleteEvent
} from '../services/eventService';
import { searchUsers } from '../services/userService';
import { Clock, MapPin, Users, QrCode, MoreVertical, Trophy, FileText, Edit, Trash2, Award } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DownloadIcon } from '@/components/ui/download';
import QRCode from 'qrcode';
import { invalidateCache } from '../lib/cacheManager';
import WinnerModal from '../components/WinnerModal';
import { ClubMemberRole } from '../types/index.js';
import { CLUB_EVENT_EXPORT_COLUMNS, downloadClubEventExport } from '../utils/clubEventExport';
import ColumnExportModal from '../components/ColumnExportModal';

const MyEvents = () => {
  const location = useLocation();
  const targetEventId = new URLSearchParams(location.search).get('eventId');
  const { showNotification } = useNotification();
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const [registrations, setRegistrations] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [eventToDeregister, setEventToDeregister] = useState(null);
  const [regToDeregister, setRegToDeregister] = useState(null);
  const [updateTeamModalOpen, setUpdateTeamModalOpen] = useState(false);
  const [teamToUpdate, setTeamToUpdate] = useState(null);
  const [updateTeamSearchQuery, setUpdateTeamSearchQuery] = useState('');
  const [updateTeamSearchResults, setUpdateTeamSearchResults] = useState([]);
  const [updateTeamSearching, setUpdateTeamSearching] = useState(false);
  const [exportFilters, setExportFilters] = useState({ month: 'all', year: 'all' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState(null);
  const [editTxId, setEditTxId] = useState('');
  const [editPayerName, setEditPayerName] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [highlightedRegId, setHighlightedRegId] = useState(null);

  const [downloadingCert, setDownloadingCert] = useState(null);
  const [openMenuEventId, setOpenMenuEventId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState({ openUpward: false, alignRight: true });
  const [winnerModalEvent, setWinnerModalEvent] = useState(null);
  const [eventExportModalOpen, setEventExportModalOpen] = useState(false);
  const [selectedEventExportColumns, setSelectedEventExportColumns] = useState(CLUB_EVENT_EXPORT_COLUMNS.map(column => column.key));
  const [eventExporting, setEventExporting] = useState(false);
  const [eventExportError, setEventExportError] = useState('');

  const [canEdit, setCanEdit] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [canCheckReg, setCanCheckReg] = useState(false);
  const [userMemberships, setUserMemberships] = useState([]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.event-action-menu')) {
        setOpenMenuEventId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

 const handleDownloadTicket = async () => {
  if (!selectedTicket || !qrDataUrl) return;

  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn("Fonts not loaded yet", e);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // --- 1. BACKGROUND WITH SECURITY PATTERN ---
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle Diagonal Stripe Pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.02)';
  ctx.lineWidth = 1;
  for (let i = -400; i < 1000; i += 15) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 400, 400);
    ctx.stroke();
  }

  // Ghost Watermark (Refined transparency)
  ctx.save();
  ctx.font = 'bold 160px "logofont"';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.025)'; 
  ctx.textAlign = 'center';
  ctx.translate(350, 240);
  ctx.rotate(-Math.PI / 12);
  ctx.fillText('CAMPUSNODE', 0, 0);
  ctx.restore();

  // --- 2. BLACK STUB & ACCENTS ---
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(700, 0, 300, canvas.height);

  // Orange Accent with Gradient
  const accentGrad = ctx.createLinearGradient(0, 0, 15, 400);
  accentGrad.addColorStop(0, '#ea580c');
  accentGrad.addColorStop(1, '#9a3412');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, 15, canvas.height);

  // --- 3. PERFORATION & NOTCHES ---
  ctx.fillStyle = '#f3f4f6'; // Match your site background
  ctx.beginPath(); ctx.arc(700, 0, 25, 0, Math.PI, false); ctx.fill();
  ctx.beginPath(); ctx.arc(700, 400, 25, Math.PI, 0, false); ctx.fill();

  // Perforation Dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  for (let i = 40; i < 370; i += 25) {
    ctx.beginPath(); ctx.arc(700, i, 3, 0, Math.PI * 2); ctx.fill();
  }

  // --- 4. BRANDING & TEXT ---
  const brandX = 60;
  const brandY = 65;
  ctx.letterSpacing = "4px"; 
  ctx.font = 'bold 30px "logofont"'; 
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText('CAMPUS', brandX, brandY);
  const clubWidth = ctx.measureText('CAMPUS').width;
  ctx.fillStyle = '#ea580c';
  ctx.fillText('NODE', brandX + clubWidth, brandY);
  ctx.letterSpacing = "0px";

  // Event Name
  ctx.font = 'bold 44px "myfont"';
  ctx.fillStyle = '#171717';
  const eventName = (selectedTicket.eventId?.title || 'EVENT TICKET')
  ctx.fillText(eventName.length > 20 ? eventName.substring(0, 20) + '...' : eventName, 60, 145);

  const drawData = (label, value, x, y) => {
    ctx.font = 'bold 12px "myfont"';
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.font = 'bold 22px "myfont"';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(value, x, y + 28);
  };

  const eventDate = new Date(selectedTicket.eventId?.startTime);
  drawData('Attendee', user?.name || 'Guest User', 60, 215);
  drawData('Date', eventDate.toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }), 60, 305);
  drawData('Time', eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }), 280, 305);
  drawData('Venue', selectedTicket.eventId?.venue || 'TBA', 460, 305);

  // --- 5. STUB CONTENT ---
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "myfont"';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Event Pass', 850, 55);

  const qrImage = new Image();
  qrImage.crossOrigin = "anonymous";
  qrImage.onload = () => {
    // QR Box with a very subtle Orange "Frame"
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(748, 93, 204, 204); // The "border"
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(750, 95, 200, 200);
    ctx.drawImage(qrImage, 750, 95, 200, 200);

    ctx.font = '12px "myfont"';
    ctx.fillStyle = '#737373';
    ctx.fillText('SERIAL NUMBER', 850, 325);
    
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ea580c';
    ctx.fillText(selectedTicket.qrCode, 850, 350);

    // DOWNLOAD
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `CampusNode-Ticket-${selectedTicket.qrCode}.png`;
    link.click();
  };
  qrImage.src = qrDataUrl;
};

  const handleDownloadCertificate = async (eventId) => {
    try {
      setDownloadingCert(eventId);
      const res = await api.get(`/api/certificates/${eventId}/download`, {
        params: { studentId: user.id || user._id },
        responseType: 'blob'
      });
      
      const contentDisposition = res.headers['content-disposition'];
      let filename = 'certificate.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Certificate download error:', err);
      let message = 'Failed to download certificate.';
      if (err.response?.data) {
        try {
          const raw = err.response.data instanceof Blob ? await err.response.data.text() : JSON.stringify(err.response.data);
          const parsed = JSON.parse(raw);
          if (parsed.message) message = parsed.message;
        } catch (e) {
          // Fallback to default message
        }
      }
      showNotification(message, 'error');
    } finally {
      setDownloadingCert(null);
    }
  };

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setRole(authRole);

      if (authRole === 'facultyCoordinator') {
        fetchFacultyEvents(authUser.clubId);
      } else if (authRole === 'club') {
        fetchCreatedEvents(authUser.clubId);
        if (authUser.clubId) {
          api.get(`/api/club-members/${authUser.clubId}/members`)
            .then(res => {
              const members = Array.isArray(res.data) ? res.data : (res.data?.members || []);
              const userId = String(authUser.id || authUser._id);
              const myMembership = members.find(m =>
                String(m.studentId?._id || m.studentId || m.student?.id || m.student?._id) === userId
              );
              if (myMembership) {
                const r = myMembership.role;
                const isHead = r === ClubMemberRole.CLUB_HEAD;
                const isCoordinator = r === ClubMemberRole.COORDINATOR;
                setCanEdit(isHead || isCoordinator || Boolean(myMembership.canEditEvents ?? myMembership.permissions?.canEditEvents));
                setCanScan(isHead || isCoordinator || Boolean(myMembership.canTakeAttendance ?? myMembership.permissions?.canTakeAttendance));
                setCanCheckReg(isHead || isCoordinator || Boolean(myMembership.canEditEvents ?? myMembership.permissions?.canEditEvents));
              } else {
                setCanEdit(true); setCanScan(true); setCanCheckReg(true);
              }
            })
            .catch(() => { setCanEdit(true); setCanScan(true); setCanCheckReg(true); });
        }
      } else {
        fetchRegistrations(authUser.id || authUser._id);
        const memberships = authUser.memberships || authUser.clubMemberships || [];
        setUserMemberships(memberships);
        const canManageAny = memberships.some(m =>
          m.role === ClubMemberRole.CLUB_HEAD ||
          m.role === ClubMemberRole.COORDINATOR ||
          m.canTakeAttendance ||
          m.canEditEvents ||
          m.permissions?.canTakeAttendance ||
          m.permissions?.canEditEvents
        );
        if (canManageAny) {
          const clubIds = memberships.map(m => m.clubId?._id || m.clubId).filter(Boolean);
          if (clubIds.length > 0) {
            clubIds.forEach(id => fetchCreatedEvents(id));
          }
        }
      }
    } else {
      setLoading(false);
    }
  }, [authUser, authRole]);

  useEffect(() => {
    if (!targetEventId || registrations.length === 0) return;

    const targetReg = registrations.find(r => {
      const eId = r.eventId?.id || r.eventId?._id || r.eventId;
      return eId === targetEventId;
    });

    if (targetReg) {
      const regId = targetReg.id || targetReg._id;
      setHighlightedRegId(regId);

      setTimeout(() => {
        const elem = document.getElementById(`reg-card-${regId}`);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      if (targetReg.paymentStatus === 'NEED_MORE_DETAILS' || targetReg.paymentStatus === 'REJECTED') {
        openEditPaymentModal(targetReg);
      }
    }
  }, [targetEventId, registrations]);

  const fetchRegistrations = async (userId) => {
    try {
      const res = await getUserEvents(userId);
      setRegistrations(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load your registrations', 'error');
      setLoading(false);
    }
  };

  const fetchCreatedEvents = async (clubId) => {
    try {
      if (!clubId) {
          setLoading(false);
          return;
      }
      const res = await getClubManagedEvents(clubId);
      setCreatedEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch events', err);
      showNotification('Failed to load your events', 'error');
      setLoading(false);
    }
  };

  const fetchFacultyEvents = async (clubId) => {
    try {
        if (!clubId) {
            setLoading(false);
            return;
        }
        const res = await getClubManagedEvents(clubId);
        setCreatedEvents(res.data);
        setLoading(false);
    } catch (err) {
        console.error('Faculty fetch error:', err);
        showNotification('Failed to load events for review', 'error');
        setLoading(false);
    }
  };

  const handleReview = async (eventId, status, comment = '') => {
    try {
        await reviewEvent(eventId, { status, comment });
        showNotification(`Event ${status === 'PUBLISHED' ? 'Approved' : 'Rejected'} successfully`, 'success');
        
        await invalidateCache(['/api/events', '/api/admin/*']);

        // Refresh list
        if (role === 'facultyCoordinator') {
            fetchFacultyEvents(user?.clubId);
        } else if (user?.clubId) {
            fetchCreatedEvents(user.clubId);
        }
    } catch (err) {
        showNotification(err.response?.data?.message || 'Review failed', 'error');
    }
  };

  const handleDeregister = async (reg) => {
    setRegToDeregister(reg);
    setEventToDeregister(reg.eventId?.id || reg.eventId?._id);
    setConfirmModalOpen(true);
  };

  const confirmDeregister = async () => {
    if (!eventToDeregister) return;

    try {
      await cancelRegistration(eventToDeregister, {
        studentId: user.id || user._id,
        registrationId: regToDeregister
      });
      await invalidateCache([
        '/api/events',
        `/api/events/${eventToDeregister}`,
        `/api/events/user/${user.id || user._id}`,
      ]);

      setRegistrations(registrations.filter(r => (r.eventId?.id || r.eventId?._id) !== eventToDeregister));
      showNotification('Successfully deregistered from the event', 'success');
      setConfirmModalOpen(false);
      setEventToDeregister(null);
      setRegToDeregister(null);
    } catch (err) {
      console.error('Deregister error:', err);
      showNotification(err.response?.data?.message || 'Failed to deregister. Please try again.', 'error');
      setConfirmModalOpen(false);
      setEventToDeregister(null);
      setRegToDeregister(null);
    }
  };

  useEffect(() => {
    if (updateTeamSearchQuery.length < 2) {
      setUpdateTeamSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setUpdateTeamSearching(true);
      try {
        const res = await searchUsers(updateTeamSearchQuery);
        const currentMembers = teamToUpdate?.team?.members || [];
        const filtered = res.data.filter(
          s => s.id !== teamToUpdate?.team?.leaderId && !currentMembers.some(m => m.userId === s.id)
        );
        setUpdateTeamSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setUpdateTeamSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [updateTeamSearchQuery, teamToUpdate]);

  const handleInviteTeammate = async (student) => {
    if (!teamToUpdate?.team?.id) return;
    const updatedMembers = [...(teamToUpdate.team.members || []), { userId: student.id, name: student.name }];

    try {
      const res = await api.post(
        `/api/teams/${teamToUpdate.id || teamToUpdate._id}/manage-members`,
        { memberIds: updatedMembers.map(m => m.userId || m.id || m._id) }
      );
      showNotification(res.data.message || 'Invitation sent successfully!', 'success');
      setUpdateTeamModalOpen(false);
      setUpdateTeamSearchQuery('');
      setUpdateTeamSearchResults([]);

      fetchRegistrations(user.id || user._id);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to send invitation', 'error');
    }
  };

  const openEditPaymentModal = (reg) => {
    setEditingReg(reg);
    setEditTxId(reg.transactionId || '');
    setEditPayerName(reg.payerName || '');
    setEditRemarks(reg.paymentRemarks || '');
    setEditPaymentModalOpen(true);
  };

  const submitPaymentEdit = async (e) => {
    e.preventDefault();
    if (!editTxId.trim()) {
      showNotification('Transaction ID / UTR is required', 'error');
      return;
    }
    setSubmittingEdit(true);
    try {
      const res = await api.put(`/api/payment/${editingReg.id || editingReg._id}/update-details`, {
        transactionId: editTxId.trim(),
        payerName: editPayerName.trim(),
        paymentRemarks: editRemarks.trim()
      });
      showNotification(res.data.message || 'Payment details updated successfully!', 'success');
      setEditPaymentModalOpen(false);
      setEditingReg(null);
      // Refresh registrations
      if (user) {
        fetchRegistrations(user.id || user._id);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update payment details', 'error');
    } finally {
      setSubmittingEdit(false);
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

  const filteredEvents = createdEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    const mMatch = exportFilters.month === 'all' || (eventDate.getMonth() + 1).toString() === exportFilters.month.toString();
    const yMatch = exportFilters.year === 'all' || eventDate.getFullYear().toString() === exportFilters.year.toString();
    return mMatch && yMatch;
  });

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
      const exported = await downloadClubEventExport(authUser?.clubId, exportFilters, selectedEventExportColumns);
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

  if (!user) return <div className="text-center mt-10">Please login to view your events.</div>;
  if (loading) return <div className="text-center mt-10">Loading events...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-12">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-orange-600 transition-colors"
        >
          <i className="ri-arrow-left-line text-sm" /> Back to Profile
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">My Events</h1>
      </div>

      {/* ── STUDENT VIEW ── */}
      {(role === 'member' || role === 'student') && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-6">Your Event History</h2>

          {registrations.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <i className="ri-calendar-line text-5xl text-neutral-300 mb-4 inline-block" />
              <p className="text-neutral-500 font-medium">No registered events found.</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 mt-4 px-5 py-2 bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-orange-700 transition-all shadow-sm"
              >
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map(reg => {
                const event = reg.eventId;
                if (!event) return null;
                const regId = reg.id || reg._id;
                const isHighlighted = highlightedRegId === regId;
                const now = new Date();
                const isPast = new Date(event.endTime) < now;
                const isLive = new Date(event.startTime) <= now && new Date(event.endTime) > now;

                return (
                  <div
                    id={`reg-card-${regId}`}
                    key={regId}
                    className={`bg-white dark:bg-neutral-900 border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-4 flex flex-col gap-2.5 ${
                      isHighlighted
                        ? 'border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/30 dark:bg-orange-950/10'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    {/* Top Row: Title + Past/Live Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                          <Link to={`/event/${event.slug || event.id || event._id}`} className="hover:text-orange-600 transition-colors">
                            {event.title}
                          </Link>
                        </h3>
                        {isPast && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-neutral-50 text-neutral-500 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 shrink-0">
                            Past Event
                          </span>
                        )}
                        {isLive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30 animate-pulse-slow shrink-0">
                            Live Now
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta Info Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1 font-medium"><MapPin className="w-3.5 h-3.5" /> {event.venue}</span>
                      <span className="text-neutral-300 dark:text-neutral-700">|</span>
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-500 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>

                    {/* Team Details (if team registration) */}
                    {reg.team && (
                      <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 rounded-xl text-xs space-y-1 text-left">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                            <Users className="w-3.5 h-3.5 text-orange-605" />
                            <span>Team: <span className="text-orange-605 dark:text-orange-500 font-extrabold">{reg.team.teamName}</span></span>
                          </div>
                          {!isPast && user?.id === reg.team.leaderId && (
                            <button
                              onClick={() => {
                                setTeamToUpdate(reg);
                                setUpdateTeamModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-200 hover:border-orange-600 rounded-lg transition-all cursor-pointer bg-transparent"
                            >
                              Update Team
                            </button>
                          )}
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400">
                          Leader: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{reg.team.leader?.name}</span>
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400">
                          Members: <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                            {(reg.team.members || []).map(m => m.user?.name).filter(Boolean).join(', ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="flex items-center gap-2 mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-0 ${
                        reg.status === 'CONFIRMED' || reg.status === 'REGISTERED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400'
                          : 'bg-orange-50 text-orange-700 dark:bg-orange-950/25 dark:text-orange-450'
                      }`}>
                        ✓ {reg.status === 'CONFIRMED' || reg.status === 'REGISTERED' ? 'Registered' : reg.status}
                      </span>

                      {event.paymentMethod && event.paymentMethod !== 'FREE' && (() => {
                        const isTeamMember = reg.team && reg.team.leaderId !== (user?.id || user?._id);
                        const isSuccess = isTeamMember || ['APPROVED', 'SUCCESS'].includes(reg.paymentStatus);
                        const isRejected = reg.paymentStatus === 'REJECTED';

                        return (
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse-slow'
                          }`}>
                            Payment: {isSuccess ? 'Successful' : reg.paymentStatus}
                          </span>
                        );
                      })()}
                      
                      <div className="ml-auto flex gap-2">
                        {(!reg.team || reg.team.leaderId === (user?.id || user?._id)) && (reg.paymentStatus === 'NEED_MORE_DETAILS' || reg.paymentStatus === 'REJECTED') && (
                          <button
                            onClick={() => openEditPaymentModal(reg)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 dark:text-orange-350 transition-colors shadow-sm cursor-pointer border-0 outline-none whitespace-nowrap"
                          >
                            <i className="ri-edit-2-line mr-1" /> Edit Payment Info
                          </button>
                        )}
                        {(() => {
                          const isPaidEvent = event.paymentMethod && event.paymentMethod !== 'FREE';
                          const isTeamMember = reg.team && reg.team.leaderId !== (user?.id || user?._id);
                          const canShowTicket = !isPaidEvent || isTeamMember || ['APPROVED', 'SUCCESS'].includes(reg.paymentStatus);

                          if (canShowTicket) {
                            return (
                              <button
                                onClick={async () => { 
                                  setSelectedTicket(reg); 
                                  setTicketModalOpen(true);
                                  try {
                                    const payloadToEncode = reg.qrPayload || reg.qrCode;
                                    if (!payloadToEncode) {
                                      showNotification('Ticket data is unavailable. Please refresh your registrations and try again.', 'error');
                                      setTicketModalOpen(false);
                                      return;
                                    }
                                    const url = await QRCode.toDataURL(payloadToEncode, { width: 400, margin: 2 });
                                    setQrDataUrl(url);
                                  } catch (err) {
                                    console.error(err);
                                    setTicketModalOpen(false);
                                    showNotification('Unable to generate this ticket. Please refresh and try again.', 'error');
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm cursor-pointer border-0 outline-none"
                              >
                                Show Ticket
                              </button>
                            );
                          }

                          if (isPaidEvent && reg.paymentStatus === 'PENDING') {
                            return (
                              <span className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 whitespace-nowrap">
                                <i className="ri-time-line mr-1" />Ticket after payment approval
                              </span>
                            );
                          }

                          if (isPaidEvent && reg.paymentStatus === 'REJECTED') {
                            return (
                              <span className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 whitespace-nowrap">
                                <i className="ri-close-circle-line mr-1" />Payment rejected — update details
                              </span>
                            );
                          }

                          return null;
                        })()}
 
                        {!isPast && (
                          (event.paymentMethod && event.paymentMethod !== 'FREE') ? (
                            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-850 px-3 py-1.5 rounded-full cursor-not-allowed whitespace-nowrap">
                              <i className="ri-lock-2-line mr-1" /> Paid Entry
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeregister(reg)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer border-0 outline-none rounded-full whitespace-nowrap"
                            >
                              Deregister
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Prominent Certificate Button for Past Events */}
                  {isPast && reg.status === 'ATTENDED' && event.provideCertificate && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleDownloadCertificate(event.id || event._id)}
                          disabled={downloadingCert === (event.id || event._id)}
                          className="inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 w-full px-4 py-2 text-neutral-800 dark:text-neutral-250 transition border border-neutral-200 dark:border-neutral-700 rounded-full font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <DownloadIcon size={16} />
                          {downloadingCert === (event.id || event._id) ? 'Downloading...' : 'Download E-Certificate'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLUB / MEMBER / FACULTY VIEW ── */}
      {(role === 'club' || (role === 'member' && user?.clubId) || role === 'facultyCoordinator' || role === 'admin') && (
        <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 my-10">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                {role === 'facultyCoordinator' ? 'Club Events Review' : 
                 role === 'member' ? 'Assigned Club Events' : 'Events You Organized'}
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {(role === 'club' || role === 'facultyCoordinator') && createdEvents.length > 0 && (
                    <div className="flex items-center gap-2">
                        <select 
                            value={exportFilters.month}
                            onChange={(e) => setExportFilters({ ...exportFilters, month: e.target.value })}
                            className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none hover:cursor-pointer hover:bg-gray-55 transition-all"
                        >
                            <option value="all">Month</option>
                            {[...Array(12)].map((_, i) => (
                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select 
                            value={exportFilters.year}
                            onChange={(e) => setExportFilters({ ...exportFilters, year: e.target.value })}
                            className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none hover:cursor-pointer hover:bg-gray-55 transition-all"
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
                )}
                {role === 'club' && (
                    <Link
                      to="/create"
                      className="inline-flex items-center justify-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <i className="ri-add-line text-sm mr-1" /> Create New Event
                    </Link>
                )}
            </div>
          </div>

          {createdEvents.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <i className="ri-calendar-event-line text-5xl text-neutral-300 mb-4 inline-block" />
              <p className="text-neutral-500 mb-4 font-medium">No events found.</p>
              {role === 'club' && (
                  <Link
                    to="/create"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-750 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <i className="ri-add-line" /> Create Your First Event
                  </Link>
              )}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-12 text-center shadow-sm">
              <i className="ri-filter-off-line text-5xl text-neutral-300 mb-4 inline-block" />
              <p className="text-neutral-500 mb-2 font-medium">No events match your selected filters.</p>
              <button 
                onClick={clearFilters}
                className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
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
                const eventClubId = event.clubId || (event.club && (event.club.id || event.club._id)) || user?.clubId;
                const membership = userMemberships.find(m => String(m.clubId?._id || m.clubId) === String(eventClubId));

                const currentCanEdit = membership ? Boolean(membership.canEditEvents ?? membership.permissions?.canEditEvents) : canEdit;
                const currentCanScan = membership ? Boolean(membership.canTakeAttendance ?? membership.permissions?.canTakeAttendance) : canScan;
                const isClubLeader = membership ? (
                  membership.role === ClubMemberRole.CLUB_HEAD || 
                  membership.role === ClubMemberRole.COORDINATOR || 
                  membership.role === 'CLUB_HEAD' || 
                  membership.role === 'COORDINATOR'
                ) : false;
                const currentCanCheckReg = isClubLeader || currentCanEdit || canCheckReg;

                const userRole = (user?.role || role || localStorage.getItem('role') || '').toLowerCase();
                const isCreator = Boolean(user && (event.createdById === user.id || event.createdById === user._id));
                const isClubHeadOrAdmin = userRole === 'club' || userRole === 'admin' || currentCanEdit || isCreator;

                const canViewReg = currentCanCheckReg || isClubHeadOrAdmin;
                const canScanAttendance = (currentCanScan || isClubHeadOrAdmin) && !isPast;
                const canManageWinners = currentCanEdit || currentCanCheckReg || isClubHeadOrAdmin;
                const canEditEvent = currentCanEdit || isClubHeadOrAdmin;
                const canDeleteEvent = currentCanEdit || isClubHeadOrAdmin;
                const canCert = (currentCanEdit || isClubHeadOrAdmin) && event.provideCertificate;

                const hasAnyMenuActions = canViewReg || canScanAttendance || (canManageWinners && (event.showWinner || isPast)) || canCert || canEditEvent || canDeleteEvent;

                return (
                <div
                  key={eventIdStr}
                  className={`bg-white border border-neutral-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative ${
                    openMenuEventId === eventIdStr ? 'z-30' : 'z-0'
                  }`}
                >
                  {/* Top stripe: title */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 md:px-6 pt-5 pb-3 border-b border-neutral-100 bg-neutral-50/30 gap-3">
                    <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                        <Link to={`/event/${event.slug || eventIdStr}`} className="hover:text-orange-600 transition-colors">
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

                  {/* Bottom row: meta left | actions right */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between px-5 md:px-6 py-4 gap-4">
                    {/* Left — venue, date, seats */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 shrink-0 text-neutral-400" />
                        {event.venue}
                      </span>
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <Clock className="w-4 h-4 shrink-0 text-orange-600" />
                        {new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                        <Users className="w-4 h-4 shrink-0 text-neutral-400" />
                        {event.registeredCount} / {event.totalSeats || '∞'} registered
                      </span>
                    </div>

                    {/* Right — action buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(role?.toLowerCase() === 'facultycoordinator' || user?.role === 'facultyCoordinator') && 
                       event.reviewStatus?.toUpperCase() === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold text-xs cursor-pointer shadow-sm animate-pulse-slow"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) handleReview(eventIdStr, 'REJECTED', reason);
                            }}
                            className="px-4 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-bold text-xs cursor-pointer shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (role?.toLowerCase() === 'facultycoordinator' || user?.role === 'facultyCoordinator') && 
                       event.reviewStatus?.toUpperCase() === 'DELETION_REQUESTED' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(eventIdStr)}
                            className="px-4 py-1.5 bg-rose-650 text-white rounded-lg hover:bg-rose-700 transition font-bold text-xs cursor-pointer shadow-sm"
                          >
                            Approve Deletion
                          </button>
                          <button
                            onClick={() => handleReview(eventIdStr, 'PUBLISHED')}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold text-xs cursor-pointer shadow-sm"
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
                                  {canViewReg && (
                                    <Link
                                      to={`/event/${eventIdStr}/registrations`}
                                      onClick={() => setOpenMenuEventId(null)}
                                      className="flex items-center gap-2 px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> View Registrations
                                    </Link>
                                  )}

                                  {canScanAttendance && (
                                    <Link
                                      to={`/event/${eventIdStr}/check-in`}
                                      onClick={() => setOpenMenuEventId(null)}
                                      className="flex items-center gap-2 px-3.5 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium transition"
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
                    </div>  {/* closes action buttons div */}
                  </div>  

                  {/* Context Block for special states */}
                  {(event.reviewStatus === 'REJECTED' || 
                    event.reviewStatus === 'DELETION_REQUESTED' ||
                    (role === 'facultyCoordinator' && event.reviewStatus === 'PENDING')) && (
                      <div className="px-5 pb-5">
                          {event.reviewStatus === 'REJECTED' && (
                              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 items-start">
                                  <i className="ri-error-warning-fill text-rose-600 text-xl" />
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
                                          {role === 'facultyCoordinator' || role === 'admin' 
                                            ? 'The club has requested to delete this event. Click Approve Deletion below to execute, or Restore Event to reject deletion.'
                                            : 'This event is pending deletion approval by the faculty coordinator.'}
                                      </p>
                                  </div>
                              </div>
                          )}
                          {role === 'facultyCoordinator' && event.reviewStatus === 'PENDING' && (
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
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DEREGISTER MODAL ── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-orange-600 px-6 py-4 border-b border-orange-700">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <i className="ri-error-warning-line" /> Confirm Deregistration
              </h3>
            </div>
            <div className="p-6 text-left">
              {regToDeregister?.team ? (
                user?.id === regToDeregister.team.leaderId ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-rose-600 flex items-center gap-1.5">
                      <i className="ri-alert-fill text-lg animate-pulse" /> WARNING: Team Leader Action Required
                    </p>
                    <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                      You are the team leader of the team <strong className="text-neutral-900">"{regToDeregister.team.teamName}"</strong>.
                    </p>
                    <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                      Deregistering will completely dissolve the team and deregister <strong className="text-rose-600">ALL team members</strong> from this event. This action cannot be undone.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                    Are you sure you want to leave team <strong className="text-neutral-900">"{regToDeregister.team.teamName}"</strong> and deregister from this event? This action cannot be undone.
                  </p>
                )
              ) : (
                <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                  Are you sure you want to deregister from this event? This action cannot be undone.
                </p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
                className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-semibold text-xs rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeregister}
                className="flex-1 px-4 py-2.5 bg-rose-600 border border-rose-700 text-white font-semibold text-xs rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Deregister
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-orange-600 px-6 py-4 border-b border-orange-700">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <i className="ri-delete-bin-line" /> Confirm Deletion
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-600 leading-relaxed font-medium text-left">
                {role === 'club' 
                  ? 'Are you sure you want to request deletion of this event? This will submit a deletion request to the faculty coordinator for approval. All registrations will be lost if approved.' 
                  : 'Are you sure you want to permanently delete this event? All registrations will be lost. This action cannot be undone.'}
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-semibold text-xs rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 border border-rose-700 text-white font-semibold text-xs rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── TICKET MODAL ── */}
      {ticketModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6 overflow-y-auto ticket-backdrop-animate">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full relative overflow-hidden flex flex-col my-auto shadow-2xl ticket-card-animate">
            {/* Header / Brand */}
            <div className="bg-orange-600 p-4 border-b border-orange-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg tracking-tight">Event Ticket</h3>
              </div>
              <button 
                onClick={() => { setTicketModalOpen(false); setSelectedTicket(null); }}
                className="text-white hover:bg-black/25 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <div className="p-0 flex-1">
              <div className="h-2 bg-black/5" />

              <div className="p-6">
                {/* Event Name */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Event</p>
                  <h4 className="text-lg font-bold text-neutral-900 leading-tight">
                    {selectedTicket.eventId?.title}
                  </h4>
                </div>

                {/* Grid for Student & ID, Venue & Time */}
                <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Student</span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate block">{user?.name}</span>
                    <span className="block text-[10px] text-neutral-500 font-mono truncate">{user?.rollNo || user?.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Registration ID</span>
                    <span className="inline-block text-[11px] font-mono font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded-md mt-0.5">
                      {selectedTicket.qrCode}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Location</span>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                      <span className="truncate">{selectedTicket.eventId?.venue}</span>
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date & Time</span>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                      <span className="truncate">
                        {new Date(selectedTicket.eventId?.startTime).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                          timeZone: 'Asia/Kolkata'
                        })}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Perforation Line & Ticket Notches */}
                <div className="relative border-t-2 border-dashed border-neutral-200 dark:border-neutral-800 my-5 -mx-6">
                  {/* Left Notch */}
                  <div className="absolute -left-2.5 -top-2.5 w-5 h-5 bg-black/90 dark:bg-black rounded-full shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)]" />
                  {/* Right Notch */}
                  <div className="absolute -right-2.5 -top-2.5 w-5 h-5 bg-black/90 dark:bg-black rounded-full shadow-[inset_2px_0_4px_rgba(0,0,0,0.2)]" />
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center gap-3.5 py-4 px-6 bg-neutral-50 dark:bg-neutral-900/30 -mx-6 -mb-6">
                  <div className="bg-white p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="Ticket QR Code" 
                        className="w-40 h-40 max-w-[160px] object-contain"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-neutral-400">
                        <i className="ri-loader-4-line animate-spin text-2xl" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-medium text-neutral-400 italic mb-0.5">Valid for one-time entry only</p>
                    <p className="text-[9px] font-light text-neutral-400 italic cursor-pointer" onClick={() => navigate('/')}>
                      Powered by <span className='text-neutral-900 dark:text-neutral-200 logofont tracking-widest font-light'>Campus</span><span className="text-orange-600 logofont font-light tracking-widest">Node</span>
                    </p>
                  </div>
                  
                  {qrDataUrl && (
                    <button
                      onClick={handleDownloadTicket}
                      className="mt-1 w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer border-0 outline-none text-xs"
                    >
                      <i className="ri-download-line text-sm" /> Download Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE TEAM MODAL ── */}
      {updateTeamModalOpen && teamToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-orange-600 px-6 py-4 border-b border-orange-700 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <i className="ri-group-line" /> Update Team
              </h3>
              <button 
                onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                className="text-white hover:bg-black/25 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border-none outline-none bg-transparent"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 text-left text-neutral-800 dark:text-neutral-100">
              <div>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">Team Name</p>
                <p className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">{teamToUpdate.team?.teamName}</p>
              </div>

              {/* Roster list */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-200 dark:border-neutral-800/80 rounded-xl space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Team Roster</p>
                <div className="divide-y divide-neutral-150 dark:divide-neutral-800 text-xs">
                  {/* Leader */}
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{teamToUpdate.team?.leader?.name} <span className="text-orange-600 font-bold">(Leader)</span></p>
                      <p className="text-neutral-400 font-mono mt-0.5">{teamToUpdate.team?.leader?.rollNo || teamToUpdate.team?.leader?.email}</p>
                    </div>
                  </div>
                  {/* Members */}
                  {(teamToUpdate.team?.members || [])
                    .filter(m => m.userId !== teamToUpdate.team?.leaderId)
                    .map(m => (
                      <div key={m.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {m.user?.name || "Pending Invitation"}
                          </p>
                          <p className="text-neutral-400 font-mono mt-0.5">{m.user?.rollNo || m.user?.email || "Teammate"}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add Teammate Selector */}
              {(() => {
                const currentCount = teamToUpdate.team?.members?.length || 1;
                const maxLimit = teamToUpdate.eventId?.maxTeamSize || 1;
                
                if (currentCount >= maxLimit) {
                  return (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 p-4 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-medium">
                      <i className="ri-information-fill mr-1" />
                      Your team has reached the maximum size of {maxLimit} members.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Invite Teammate <span className="text-[10px] text-neutral-400 font-medium">(Size: {currentCount} / max {maxLimit})</span>
                    </label>
                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search by Email or Roll Number..."
                        value={updateTeamSearchQuery}
                        onChange={(e) => setUpdateTeamSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:border-orange-500 focus:outline-none bg-white dark:bg-neutral-800 text-black dark:text-white"
                      />
                      {updateTeamSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <i className="ri-loader-4-line animate-spin text-orange-600" />
                        </div>
                      )}
                    </div>

                    {/* Autocomplete dropdown */}
                    {updateTeamSearchResults.length > 0 && (
                      <div className="absolute z-50 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg w-[calc(100%-3rem)] max-w-sm divide-y divide-neutral-100 dark:divide-neutral-800">
                        {updateTeamSearchResults.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleInviteTeammate(s)}
                            className="p-3 text-xs hover:bg-orange-50 dark:hover:bg-neutral-800 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div className="text-left">
                              <p className="font-bold text-neutral-800 dark:text-neutral-200">{s.name}</p>
                              <p className="text-neutral-400 font-mono mt-0.5">{s.rollNo} • {s.email}</p>
                            </div>
                            <span className="text-orange-600 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 rounded cursor-pointer">Invite</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="px-6 pb-6 shrink-0">
              <button
                onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                className="w-full px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer border-0 outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── EDIT PAYMENT DETAILS MODAL ── */}
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
      {editPaymentModalOpen && editingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-orange-600 px-6 py-4 border-b border-orange-700">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <i className="ri-edit-box-line" /> Edit Payment Information
              </h3>
            </div>
            
            <form onSubmit={submitPaymentEdit}>
              <div className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    UTR / Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTxId}
                    onChange={(e) => setEditTxId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200 font-mono"
                    placeholder="Enter 12-digit UPI/UTR Transaction ID"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Payer Name
                  </label>
                  <input
                    type="text"
                    value={editPayerName}
                    onChange={(e) => setEditPayerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200"
                    placeholder="Name of account owner"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Payment Remarks
                  </label>
                  <textarea
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200 resize-none h-20"
                    placeholder="Add remarks or notes..."
                  />
                </div>

                {editingReg.paymentReviewMessage && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-450 uppercase tracking-wider mb-1">
                      Reviewer Message
                    </p>
                    <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                      {editingReg.paymentReviewMessage}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 px-4 py-2.5 bg-orange-600 border border-orange-700 text-white font-semibold text-xs rounded-lg hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50 border-0"
                >
                  {submittingEdit ? 'Submitting...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── WINNER ANNOUNCEMENT MODAL ── */}
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

export default MyEvents;
