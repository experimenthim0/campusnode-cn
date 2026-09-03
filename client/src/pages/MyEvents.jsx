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

const MyRegisteredEventCard = ({
  reg,
  user,
  isHighlighted,
  onShowTicket,
  onDeregister,
  onEditPayment,
  onUpdateTeam,
  onDownloadCertificate,
  downloadingCert,
}) => {
  const event = reg.eventId;
  if (!event) return null;
  const regId = reg.id || reg._id;
  const now = new Date();
  const isPast = new Date(event.endTime) < now;
  const isLive = new Date(event.startTime) <= now && new Date(event.endTime) > now;
  const isUpcoming = !isPast && !isLive;

  const eventDate = new Date(event.startTime);
  const isValidDate = !isNaN(eventDate.getTime());
  const monthName = isValidDate
    ? eventDate.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase()
    : '';
  const dayNumber = isValidDate
    ? eventDate.getDate()
    : '';
  const dayName = isValidDate
    ? eventDate.toLocaleString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase()
    : '';

  const formattedTime = new Date(event.startTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const posterImage = event.imageUrl || '/CLUBSETU.png';
  const isPaidEvent = event.paymentMethod && event.paymentMethod !== 'FREE';
  const isTeamMember = reg.team && reg.team.leaderId !== (user?.id || user?._id);
  const isPaymentSuccess = isTeamMember || ['APPROVED', 'SUCCESS'].includes(reg.paymentStatus);
  const isPaymentRejected = reg.paymentStatus === 'REJECTED';
  const isPaymentPending = isPaidEvent && reg.paymentStatus === 'PENDING';
  const canShowTicket = !isPaidEvent || isTeamMember || isPaymentSuccess;

  const clubName = event.club?.clubName || event.createdBy?.clubName;
  const clubLogo = event.club?.clubLogo || event.createdBy?.clubLogo;

  return (
    <div
      id={`reg-card-${regId}`}
      className={`border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md ${
        isHighlighted
          ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20 dark:bg-orange-950/10'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      {/* Top Poster / Banner */}
      <div className="relative w-full aspect-[21/9] overflow-hidden bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <img
          src={posterImage}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/CLUBSETU.png';
          }}
        />

        {/* Top-Left: Timing Status Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 bg-orange-600 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              Live
            </span>
          )}
          {isUpcoming && (
            <span className="inline-flex items-center border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs backdrop-blur-xs">
              Upcoming
            </span>
          )}
          {isPast && (
            <span className="inline-flex items-center bg-neutral-100/95 dark:bg-neutral-800/95 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-xs backdrop-blur-xs">
              Ended
            </span>
          )}
        </div>

        {/* Top-Right: Registration Status Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-md shadow-xs backdrop-blur-xs ${
              reg.status === 'ATTENDED' || reg.attended
                ? 'bg-blue-600 text-white'
                : reg.status === 'WAITLISTED'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {reg.status === 'ATTENDED' || reg.attended
              ? '✓ Attended'
              : reg.status === 'WAITLISTED'
              ? 'Waitlisted'
              : '✓ Registered'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-3 flex flex-col flex-1 gap-2.5">
        {/* Club line */}
        {clubName && (
          <div className="flex items-center min-w-0">
            {clubLogo ? (
              <img
                src={clubLogo}
                alt={clubName}
                className="w-4 h-4 rounded-full object-cover mr-1.5 border border-neutral-200 dark:border-neutral-700"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/lightthemelogo.png';
                }}
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center mr-1.5 text-orange-600 text-[9px] font-bold">
                <i className="ri-team-line" />
              </div>
            )}
            <span className="text-[11px] font-bold text-orange-600 truncate">{clubName}</span>
          </div>
        )}

        {/* Event Title */}
        <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2">
          <Link to={`/event/${event.slug || event.id || event._id}`} className="hover:text-orange-600 transition-colors">
            {event.title}
          </Link>
        </h3>

        {/* Middle Info & Calendar Date Box */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Left Info Column */}
          <div className="flex-1 min-w-0 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-1.5 min-w-0 font-medium text-neutral-700 dark:text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="truncate">{event.venue || 'Campus Venue'}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 text-neutral-500 dark:text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{formattedTime}</span>
            </div>

            {/* Payment badge if paid event */}
            {isPaidEvent && (
              <div className="pt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    isPaymentSuccess
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                      : isPaymentRejected
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                  }`}
                >
                  {isPaymentSuccess ? 'Payment: Paid' : `Payment: ${reg.paymentStatus || 'Pending'}`}
                </span>
              </div>
            )}
          </div>

          {/* Right Calendar Date Box */}
          {isValidDate && (
            <div className="shrink-0 self-center">
              <div className="flex flex-col items-center justify-center min-w-[50px] bg-neutral-50 dark:bg-neutral-800/80 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                <div className="w-full bg-red-500 dark:bg-red-600 text-white text-[9px] font-black uppercase tracking-wider text-center py-0.5 px-1.5 leading-none">
                  {monthName}
                </div>
                <div className="text-base font-black text-neutral-900 dark:text-white leading-tight px-2 pt-0.5">
                  {dayNumber}
                </div>
                <div className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider pb-1">
                  {dayName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Details (if team registration) */}
        {reg.team && (
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 rounded-xl text-xs space-y-1 text-left">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <Users className="w-3.5 h-3.5 text-orange-600" />
                <span>Team: <span className="text-orange-600 dark:text-orange-500 font-extrabold">{reg.team.teamName}</span></span>
              </div>
              {!isPast && (user?.id === reg.team.leaderId || user?._id === reg.team.leaderId) && (
                <button
                  type="button"
                  onClick={() => onUpdateTeam(reg)}
                  className="px-2 py-0.5 text-[10px] font-bold text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-200 hover:border-orange-600 rounded-lg transition-all cursor-pointer bg-transparent"
                >
                  Update
                </button>
              )}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Leader: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{reg.team.leader?.name}</span>
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px] line-clamp-1">
              Members: <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {(reg.team.members || []).map(m => m.user?.name).filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {(!reg.team || reg.team.leaderId === (user?.id || user?._id)) && (reg.paymentStatus === 'NEED_MORE_DETAILS' || reg.paymentStatus === 'REJECTED') && (
              <button
                type="button"
                onClick={() => onEditPayment(reg)}
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 dark:text-orange-350 transition-colors shadow-2xs cursor-pointer border-0 outline-none whitespace-nowrap"
              >
                <i className="ri-edit-2-line mr-1" /> Edit Payment Info
              </button>
            )}

            {canShowTicket && (
              <button
                type="button"
                onClick={() => onShowTicket(reg)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-black text-white hover:bg-orange-600 dark:bg-white dark:text-black dark:hover:bg-orange-600 dark:hover:text-white transition-all shadow-xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show Ticket</span>
              </button>
            )}

            {isPaidEvent && isPaymentPending && (
              <span className="flex-1 text-center px-3 py-2 text-[10px] font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 whitespace-nowrap">
                <i className="ri-time-line mr-1" /> Ticket after approval
              </span>
            )}

            {isPaidEvent && isPaymentRejected && (
              <span className="flex-1 text-center px-3 py-2 text-[10px] font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 whitespace-nowrap">
                <i className="ri-close-circle-line mr-1" /> Payment rejected
              </span>
            )}

            {!isPast && (
              isPaidEvent ? (
                <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 rounded-xl cursor-not-allowed whitespace-nowrap">
                  <i className="ri-lock-2-line mr-1" /> Paid
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeregister(reg)}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer border-0 outline-none rounded-xl whitespace-nowrap"
                >
                  Deregister
                </button>
              )
            )}
          </div>

          {/* Certificate Download Button */}
          {isPast && (reg.status === 'ATTENDED' || reg.attended) && event.provideCertificate && (
            <button
              type="button"
              onClick={() => onDownloadCertificate(event.id || event._id)}
              disabled={downloadingCert === (event.id || event._id)}
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 w-full px-4 py-2 text-neutral-800 dark:text-neutral-200 transition border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <DownloadIcon size={14} />
              {downloadingCert === (event.id || event._id) ? 'Downloading...' : 'Download E-Certificate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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

  const handleShowTicket = async (reg) => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {registrations.map(reg => {
              const event = reg.eventId;
              if (!event) return null;
              const regId = reg.id || reg._id;
              const isHighlighted = highlightedRegId === regId;

              return (
                <MyRegisteredEventCard
                  key={regId}
                  reg={reg}
                  user={user}
                  isHighlighted={isHighlighted}
                  onShowTicket={handleShowTicket}
                  onDeregister={handleDeregister}
                  onEditPayment={openEditPaymentModal}
                  onUpdateTeam={(r) => {
                    setTeamToUpdate(r);
                    setUpdateTeamModalOpen(true);
                  }}
                  onDownloadCertificate={handleDownloadCertificate}
                  downloadingCert={downloadingCert}
                />
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
            className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
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
              bg-white dark:bg-[#181818]
              border border-[#E5E5E5] dark:border-[#303030]
              rounded-2xl
              max-w-sm w-full
              p-5
              shadow-2xl
              transition-colors
            "
          >
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2 pr-8">
                <span
                  className="
                    text-[10px] font-bold uppercase tracking-wider
                    text-[#F97316] dark:text-[#FB923C]
                    bg-[#FFF7ED] dark:bg-[#2A1A0F]
                    border border-orange-200/60 dark:border-orange-900/40
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
                      text-[10px] font-bold
                      text-[#555555] dark:text-[#B5B5B5]
                      bg-[#FAFAFA] dark:bg-[#222222]
                      border border-[#E5E5E5] dark:border-[#303030]
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
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
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
              className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center transition-colors"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <i className="ri-alert-line text-2xl" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#111111] dark:text-[#F5F5F5] mb-1.5">Cancel Registration?</h3>
              <p className="text-xs text-[#888888] dark:text-[#808080] mb-6 leading-relaxed">
                Are you sure you want to cancel your registration for this event? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
                  className="flex-1 px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Keep Registration
                </button>
                <button
                  type="button"
                  onClick={confirmDeregister}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
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
              className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#111111] dark:text-[#F5F5F5] leading-tight">
                      Manage Team
                    </h3>
                    <p className="text-xs text-[#888888] dark:text-[#808080] font-normal truncate max-w-xs mt-0.5">
                      {teamToUpdate.team?.teamName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left overflow-y-auto flex-1 text-[#555555] dark:text-[#B5B5B5]">
                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] uppercase tracking-wider mb-2">
                    Current Team Members
                  </label>
                  <div className="divide-y divide-[#F0F0F0] dark:divide-[#2A2A2A] text-xs">
                    <div className="py-2.5 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#111111] dark:text-[#F5F5F5]">{teamToUpdate.team?.leader?.name} <span className="text-[#F97316] dark:text-[#FB923C] font-bold">(Leader)</span></p>
                        <p className="text-[#888888] dark:text-[#808080] font-mono mt-0.5">{teamToUpdate.team?.leader?.rollNo || teamToUpdate.team?.leader?.email}</p>
                      </div>
                    </div>
                    {(teamToUpdate.team?.members || [])
                      .filter(m => m.userId !== teamToUpdate.team?.leaderId)
                      .map(m => (
                        <div key={m.id || m.userId} className="py-2.5 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-[#111111] dark:text-[#F5F5F5]">
                              {m.user?.name || "Pending Invitation"}
                            </p>
                            <p className="text-[#888888] dark:text-[#808080] font-mono mt-0.5">{m.user?.rollNo || m.user?.email || "Teammate"}</p>
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
                      <div className="bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-orange-200/80 dark:border-orange-900/40 p-4 rounded-xl text-xs text-[#F97316] dark:text-[#FB923C] font-semibold">
                        <i className="ri-information-fill mr-1" />
                        Your team has reached the maximum size of {maxLimit} members.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">
                        Invite Teammate <span className="text-xs text-[#888888] dark:text-[#808080] font-normal">(Size: {currentCount} / max {maxLimit})</span>
                      </label>
                      <div className="relative">
                        <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888] dark:text-[#808080]" />
                        <input
                          type="text"
                          placeholder="Search by Email or Roll Number..."
                          value={updateTeamSearchQuery}
                          onChange={(e) => setUpdateTeamSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] focus:border-[#F97316] dark:focus:border-[#FB923C] focus:outline-none bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] transition-colors"
                        />
                        {updateTeamSearching && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            <i className="ri-loader-4-line animate-spin text-[#F97316]" />
                          </div>
                        )}
                      </div>

                      {updateTeamSearchResults.length > 0 && (
                        <div className="mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-xl shadow-lg divide-y divide-[#F0F0F0] dark:divide-[#2A2A2A]">
                          {updateTeamSearchResults.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handleInviteTeammate(s)}
                              className="p-3 text-xs hover:bg-[#FFF7ED] dark:hover:bg-[#2A1A0F] cursor-pointer flex justify-between items-center transition-colors"
                            >
                              <div className="text-left">
                                <p className="font-bold text-[#111111] dark:text-[#F5F5F5]">{s.name}</p>
                                <p className="text-[#888888] dark:text-[#808080] font-mono mt-0.5">{s.rollNo} • {s.email}</p>
                              </div>
                              <span className="text-[#F97316] dark:text-[#FB923C] font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-orange-200/60 dark:border-orange-900/40 rounded-lg cursor-pointer">Invite</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] shrink-0">
                <button
                  type="button"
                  onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                  className="w-full px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
              className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transition-colors"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
                    <i className="ri-edit-box-line text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#111111] dark:text-[#F5F5F5] leading-tight">
                      Edit Payment Information
                    </h3>
                    <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">
                      Update your transaction details for verification.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={submitPaymentEdit}>
                <div className="p-6 space-y-4 text-left text-[#555555] dark:text-[#B5B5B5]">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      UTR / Transaction ID <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTxId}
                      onChange={(e) => setEditTxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl focus:outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] font-mono transition-colors"
                      placeholder="Enter 12-digit UPI/UTR Transaction ID"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Payer Name
                    </label>
                    <input
                      type="text"
                      value={editPayerName}
                      onChange={(e) => setEditPayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl focus:outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] transition-colors"
                      placeholder="Name of account owner"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Payment Remarks
                    </label>
                    <textarea
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl focus:outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] resize-none h-20 transition-colors"
                      placeholder="Add remarks or notes..."
                    />
                  </div>

                  {editingReg.paymentReviewMessage && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl">
                      <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
                        Reviewer Message
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-semibold">
                        {editingReg.paymentReviewMessage}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
                    className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#303030] text-[#111111] dark:text-[#F5F5F5] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
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
