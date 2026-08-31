import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  getUserEvents,
  cancelRegistration,
} from '../services/eventService';
import { searchUsers } from '../services/userService';
import { Clock, MapPin, Users, QrCode, Shield, Download, FileText, Award, X, Star, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DownloadIcon } from '@/components/ui/download';
import QRCode from 'qrcode';
import { invalidateCache } from '../lib/cacheManager';
import { getMyFeedbackHistory } from '../services/feedbackService';

const MyEvents = () => {
  const location = useLocation();
  const targetEventId = new URLSearchParams(location.search).get('eventId');
  const { showNotification } = useNotification();
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'feedback'
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [eventToDeregister, setEventToDeregister] = useState(null);
  const [regToDeregister, setRegToDeregister] = useState(null);

  const [updateTeamModalOpen, setUpdateTeamModalOpen] = useState(false);
  const [teamToUpdate, setTeamToUpdate] = useState(null);
  const [updateTeamSearchQuery, setUpdateTeamSearchQuery] = useState('');
  const [updateTeamSearchResults, setUpdateTeamSearchResults] = useState([]);
  const [updateTeamSearching, setUpdateTeamSearching] = useState(false);

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

  // Check if account is a dedicated ClubAccount without student identity
  const isClubAccount = authUser?.principalType === 'CLUB' || (!user?.rollNo && authRole === 'club');

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      const userId = authUser.id || authUser._id;
      if (userId && !isClubAccount) {
        fetchRegistrations(userId);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [authUser, authRole, isClubAccount]);

  // Deep-link highlighting
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
      setLoading(true);
      const res = await getUserEvents(userId);
      setRegistrations(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load your participated events', 'error');
      setLoading(false);
    }
  };

  const fetchFeedbackHistory = async () => {
    try {
      setLoadingFeedbacks(true);
      const res = await getMyFeedbackHistory();
      setFeedbacks(res.data?.feedbacks || []);
    } catch (err) {
      console.error('Failed to fetch feedback history:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback' && feedbacks.length === 0) {
      fetchFeedbackHistory();
    }
  }, [activeTab]);

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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0,0,0,0.02)';
    ctx.lineWidth = 1;
    for (let i = -400; i < 1000; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 400, 400);
      ctx.stroke();
    }

    // Ghost Watermark
    ctx.save();
    ctx.font = 'bold 160px "logofont"';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.025)'; 
    ctx.textAlign = 'center';
    ctx.translate(350, 240);
    ctx.rotate(-Math.PI / 12);
    ctx.fillText('CAMPUSNODE', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(700, 0, 300, canvas.height);

    const accentGrad = ctx.createLinearGradient(0, 0, 15, 400);
    accentGrad.addColorStop(0, '#ea580c');
    accentGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, 15, canvas.height);

    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath(); ctx.arc(700, 0, 25, 0, Math.PI, false); ctx.fill();
    ctx.beginPath(); ctx.arc(700, 400, 25, Math.PI, 0, false); ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 40; i < 370; i += 25) {
      ctx.beginPath(); ctx.arc(700, i, 3, 0, Math.PI * 2); ctx.fill();
    }

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
    const eventName = (selectedTicket.eventId?.title || 'EVENT TICKET');
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

    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "myfont"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Event Pass', 850, 55);

    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.onload = () => {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(748, 93, 204, 204);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(750, 95, 200, 200);
      ctx.drawImage(qrImage, 750, 95, 200, 200);

      ctx.font = '12px "myfont"';
      ctx.fillStyle = '#737373';
      ctx.fillText('SERIAL NUMBER', 850, 325);
      
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#ea580c';
      ctx.fillText(selectedTicket.qrCode, 850, 350);

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
      showNotification('Preparing certificate download...', 'info');
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

      showNotification('Downloading started! Check your downloads folder.', 'success');
    } catch (err) {
      console.error('Certificate download error:', err);
      let message = 'Failed to download certificate.';
      if (err.response?.data) {
        try {
          const raw = err.response.data instanceof Blob ? await err.response.data.text() : JSON.stringify(err.response.data);
          const parsed = JSON.parse(raw);
          if (parsed.message) message = parsed.message;
        } catch (e) {}
      }
      showNotification(message, 'error');
    } finally {
      setDownloadingCert(null);
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
        registrationId: regToDeregister?.id || regToDeregister?._id
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
      if (user) {
        fetchRegistrations(user.id || user._id);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update payment details', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (!user) return <div className="text-center mt-10 text-sm text-neutral-500">Please login to view your events.</div>;
  if (loading) return <div className="text-center mt-10 text-sm text-neutral-400">Loading your events...</div>;

  // Dedicated Official Club Account Notice (Guiding to Club Management)
  if (isClubAccount) {
    const clubTargetId = user.clubId || user.id || user._id;
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 shadow-sm max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Shield size={28} />
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Club Management Portal</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            You are currently signed in as an Official Club Account. To manage, create, and review events organized by your club, visit your Club Events dashboard.
          </p>
          <Link
            to={`/club-events/${clubTargetId}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm"
          >
            Open Club Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">My Events</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track all events you have registered for, view digital tickets, and download participation certificates.
          </p>
        </div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hover:text-orange-600 transition-colors"
        >
          <i className="ri-arrow-left-line text-sm" /> Back to Profile
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-transparent'
          }`}
        >
          <i className="ri-ticket-line text-sm" />
          <span>Tickets & Registrations ({registrations.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('feedback');
            fetchFeedbackHistory();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-transparent'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span>My Feedback</span>
        </button>
      </div>

      {activeTab === 'feedback' && (
        <div>
          {loadingFeedbacks ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <i className="ri-loader-4-line animate-spin text-3xl mb-2 text-orange-500" />
              <p className="text-xs font-semibold uppercase tracking-wider">Loading your feedback history...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">No Feedback Submitted Yet</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                After attending events, you'll be automatically invited to share your ratings and reviews here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {fb.event?.club?.clubName && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30">
                            {fb.event.club.clubName}
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-400">
                          Submitted on {new Date(fb.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        <Link to={`/event/${fb.event?.slug || fb.eventId}`} className="hover:text-orange-600 transition-colors">
                          {fb.event?.title || 'Campus Event'}
                        </Link>
                      </h3>
                    </div>

                    {/* Overall Rating Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                      <span className="text-sm font-black">{fb.overallRating} / 5</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Overall</span>
                    </div>
                  </div>

                  {/* 6 Metric Breakdown Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    {[
                      { label: 'Overall', val: fb.overallRating },
                      { label: 'Organization', val: fb.organizationRating },
                      { label: 'Usefulness', val: fb.usefulnessRating },
                      { label: 'Speaker', val: fb.speakerRating },
                      { label: 'Venue', val: fb.venueRating },
                      { label: 'Timing', val: fb.timingRating },
                    ].map((item, i) => (
                      <div key={i} className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-center">
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium truncate">{item.label}</p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-0.5 flex items-center justify-center gap-1">
                          <span>{item.val}</span>
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation & Written Responses */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">Would attend again:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        fb.attendSimilar === 'YES' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' :
                        fb.attendSimilar === 'MAYBE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                        'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        {fb.attendSimilar === 'YES' ? 'Yes' : fb.attendSimilar === 'MAYBE' ? 'Maybe' : 'No'}
                      </span>
                    </div>

                    {(fb.liked || fb.improvements || fb.comments) && (
                      <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl space-y-1.5 border border-neutral-100 dark:border-neutral-800">
                        {fb.liked && (
                          <p><strong className="text-neutral-700 dark:text-neutral-300">Liked:</strong> <span className="text-neutral-600 dark:text-neutral-400">{fb.liked}</span></p>
                        )}
                        {fb.improvements && (
                          <p><strong className="text-neutral-700 dark:text-neutral-300">Improvements:</strong> <span className="text-neutral-600 dark:text-neutral-400">{fb.improvements}</span></p>
                        )}
                        {fb.comments && (
                          <p><strong className="text-neutral-700 dark:text-neutral-300">Comments:</strong> <span className="text-neutral-600 dark:text-neutral-400">{fb.comments}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
      <div>
        {registrations.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center shadow-2xs">
            <i className="ri-calendar-line text-5xl text-neutral-300 dark:text-neutral-700 mb-4 inline-block" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">No Registered Events Found</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              You haven't registered for any campus events yet. Explore upcoming hackathons, workshops, and fests!
            </p>
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
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
                  className={`bg-white dark:bg-neutral-900 border rounded-2xl shadow-2xs hover:shadow-sm transition-all duration-300 p-4 sm:p-5 flex flex-col gap-3 ${
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 animate-pulse-slow shrink-0">
                          Live Now
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Info Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" /> {event.venue || 'Campus Venue'}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">|</span>
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-500 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>

                  {/* Team Details (if team registration) */}
                  {reg.team && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 rounded-xl text-xs space-y-1 text-left">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                          <Users className="w-3.5 h-3.5 text-orange-600" />
                          <span>Team: <span className="text-orange-600 dark:text-orange-500 font-extrabold">{reg.team.teamName}</span></span>
                        </div>
                        {!isPast && (user?.id === reg.team.leaderId || user?._id === reg.team.leaderId) && (
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
                  <div className="flex items-center gap-2 mt-1 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex-wrap">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-0 ${
                      reg.status === 'CONFIRMED' || reg.status === 'REGISTERED' || reg.status === 'ATTENDED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400'
                        : 'bg-orange-50 text-orange-700 dark:bg-orange-950/25 dark:text-orange-400'
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
                    
                    <div className="ml-auto flex items-center gap-2">
                      {(!reg.team || reg.team.leaderId === (user?.id || user?._id)) && (reg.paymentStatus === 'NEED_MORE_DETAILS' || reg.paymentStatus === 'REJECTED') && (
                        <button
                          onClick={() => openEditPaymentModal(reg)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 dark:text-orange-350 transition-colors shadow-2xs cursor-pointer border-0 outline-none whitespace-nowrap"
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
                                    showNotification('Ticket data is unavailable. Please refresh and try again.', 'error');
                                    setTicketModalOpen(false);
                                    return;
                                  }
                                  const url = await QRCode.toDataURL(payloadToEncode, { width: 400, margin: 2 });
                                  setQrDataUrl(url);
                                } catch (err) {
                                  console.error(err);
                                  setTicketModalOpen(false);
                                  showNotification('Unable to generate ticket.', 'error');
                                }
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors shadow-2xs cursor-pointer border-0 outline-none"
                            >
                              Show Ticket
                            </button>
                          );
                        }

                        if (isPaidEvent && reg.paymentStatus === 'PENDING') {
                          return (
                            <span className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 whitespace-nowrap">
                              <i className="ri-time-line mr-1" /> Ticket after payment approval
                            </span>
                          );
                        }

                        if (isPaidEvent && reg.paymentStatus === 'REJECTED') {
                          return (
                            <span className="px-3 py-1.5 text-[10px] font-semibold rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 whitespace-nowrap">
                              <i className="ri-close-circle-line mr-1" /> Payment rejected — update details
                            </span>
                          );
                        }

                        return null;
                      })()}

                      {!isPast && (
                        (event.paymentMethod && event.paymentMethod !== 'FREE') ? (
                          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5 rounded-full cursor-not-allowed whitespace-nowrap">
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
                  {isPast && (reg.status === 'ATTENDED' || reg.attended) && event.provideCertificate && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleDownloadCertificate(event.id || event._id)}
                        disabled={downloadingCert === (event.id || event._id)}
                        className="inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 w-full px-4 py-2 text-neutral-800 dark:text-neutral-200 transition border border-neutral-200 dark:border-neutral-700 rounded-full font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
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

     <AnimatePresence>
  {ticketModalOpen &&
    selectedTicket &&
    (() => {
      const ev = selectedTicket.eventId || selectedTicket.event || {};

      const organizerName =
        ev.club?.clubName ||
        ev.club?.name ||
        ev.centralOrganizer?.name ||
        (ev.organizerType === "CENTRAL_ORGANIZATION"
          ? "Central Student Body"
          : null) ||
        ev.createdBy?.name ||
        "CampusNode";

      const formattedDate = ev.startTime
        ? new Date(ev.startTime).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      const formattedTime = ev.startTime
        ? `${new Date(ev.startTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}${
            ev.endTime
              ? ` - ${new Date(ev.endTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}`
              : ""
          }`
        : "—";

      const attendeeName =
        selectedTicket.student?.name ||
        selectedTicket.externalName ||
        user?.name ||
        "Participant";

      const attendeeRoll =
        selectedTicket.student?.rollNo ||
        user?.rollNo ||
        null;

      const passId = selectedTicket.qrCode || selectedTicket.id;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setTicketModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="
              relative z-10
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded-3xl
              max-w-sm w-full
              p-5
              shadow-2xl
            "
          >
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="
                    text-[9px] font-black uppercase tracking-widest
                    text-orange-600 dark:text-orange-400
                    bg-orange-500/10
                    px-2.5 py-1
                    rounded-full
                    shrink-0
                  "
                >
                  Digital Event Pass
                </span>

                {selectedTicket.team?.teamName && (
                  <span
                    className="
                      text-[9px] font-bold
                      text-neutral-500 dark:text-neutral-400
                      bg-neutral-100 dark:bg-neutral-800
                      px-2.5 py-1
                      rounded-full
                      truncate
                    "
                  >
                    Team: {selectedTicket.team.teamName}
                  </span>
                )}

<button
  type="button"
  onClick={() => setTicketModalOpen(false)}
  className="absolute top-4 right-4 z-20 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
  aria-label="Close ticket modal"
>
  <X size={18} />
</button>

              </div>

              {/* Event title */}
              <h3
                className="
                  text-lg font-extrabold
                  leading-tight
                  text-neutral-900 dark:text-white
                  line-clamp-2
                "
              >
                {ev.title || "Event Pass"}
              </h3>

              {/* Organizer */}
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Organized by{" "}
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {organizerName}
                </span>
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border border-neutral-200 dark:border-neutral-800
                bg-neutral-50 dark:bg-neutral-800/50
                overflow-hidden
                mb-4
              "
            >
              <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-700">
                {/* Date */}
                <div className="px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                    Date
                  </p>

                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formattedDate}
                  </p>
                </div>

                {/* Time */}
                <div className="px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                    Time
                  </p>

                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formattedTime}
                  </p>
                </div>
              </div>

              {/* Venue */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                  Venue
                </p>

                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 truncate">
                  {ev.venue || "Venue not specified"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              {/* QR */}
              <div
                className="
                  bg-white
                  p-3
                  rounded-2xl
                  border border-neutral-200
                  shadow-sm
                "
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR"
                    className="w-48 h-48"
                  />
                ) : (
                  <div
                    className="
                      w-48 h-48
                      flex items-center justify-center
                      text-xs text-neutral-400
                    "
                  >
                    Loading QR...
                  </div>
                )}
              </div>

              <div className="w-full mt-3">
                <div
                  className="
                    flex items-center
                    justify-between
                    gap-3
                    px-3 py-2.5
                    rounded-xl
                    bg-neutral-50 dark:bg-neutral-800/60
                    border border-neutral-100 dark:border-neutral-800
                  "
                >
                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                      Participant
                    </p>

                    <p className="text-xs font-extrabold text-orange-600 dark:text-orange-400 truncate mt-0.5">
                      {attendeeName} <span className="text-neutral-900 dark:text-white">({authUser.branch}, {authUser.year})</span>
                    </p>
                  </div>

                  {/* Roll Number */}
                  {attendeeRoll && (
                    <>
                      <div className="w-px h-7 bg-neutral-200 dark:bg-neutral-700" />

                      <div className="shrink-0 text-right">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                          Roll No.
                        </p>

                        <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                          {attendeeRoll}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 mb-4 text-center">
              <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 mb-1">
                Pass ID : <span className=' text-orange-600 dark:text-orange-400'>{passId}</span>
              </p>

              
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="
                  flex-1
                  px-4 py-2.5
                  bg-neutral-100 hover:bg-neutral-200
                  dark:bg-neutral-800 dark:hover:bg-neutral-700
                  text-neutral-700 dark:text-neutral-300
                  font-semibold text-xs
                  rounded-xl
                  transition-colors
                  cursor-pointer
                  border-0
                "
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleDownloadTicket}
                className="
                  flex-1
                  px-4 py-2.5
                  bg-orange-600 hover:bg-orange-700
                  text-white
                  font-bold text-xs
                  rounded-xl
                  transition-colors
                  cursor-pointer
                  border-0
                  shadow-sm
                "
              >
                Save Ticket
              </button>
            </div>
          </motion.div>
        </div>
      );
    })()}
</AnimatePresence>

      <AnimatePresence>
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
                <i className="ri-alert-line text-2xl" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Cancel Registration?</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
                Are you sure you want to cancel your registration for this event? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
                  className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-200 transition-colors border-0 cursor-pointer"
                >
                  Keep Registration
                </button>
                <button
                  onClick={confirmDeregister}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors border-0 shadow-sm cursor-pointer"
                >
                  Yes, Deregister
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateTeamModalOpen && teamToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-orange-600 px-6 py-4 border-b border-orange-700 shrink-0">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Users size={20} /> Manage Team: {teamToUpdate.team?.teamName}
                </h3>
              </div>
              <div className="p-6 space-y-4 text-left overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Current Team Members
                  </label>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    <div className="py-2.5 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">{teamToUpdate.team?.leader?.name} <span className="text-orange-600 font-bold">(Leader)</span></p>
                        <p className="text-neutral-400 font-mono mt-0.5">{teamToUpdate.team?.leader?.rollNo || teamToUpdate.team?.leader?.email}</p>
                      </div>
                    </div>
                    {(teamToUpdate.team?.members || [])
                      .filter(m => m.userId !== teamToUpdate.team?.leaderId)
                      .map(m => (
                        <div key={m.id || m.userId} className="py-2.5 flex justify-between items-center">
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
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-medium">
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

                      {updateTeamSearchResults.length > 0 && (
                        <div className="mt-1 max-h-48 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg divide-y divide-neutral-100 dark:divide-neutral-800">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editPaymentModalOpen && editingReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
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
                      className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200 font-mono"
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
                      className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200"
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
                      className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-neutral-200 resize-none h-20"
                      placeholder="Add remarks or notes..."
                    />
                  </div>

                  {editingReg.paymentReviewMessage && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
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
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-semibold text-xs rounded-xl hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50 border-0 shadow-sm"
                  >
                    {submittingEdit ? 'Submitting...' : 'Update Details'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyEvents;
