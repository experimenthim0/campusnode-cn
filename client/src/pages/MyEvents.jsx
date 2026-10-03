import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  getUserEvents,
  cancelRegistration,
} from '../services/eventService';
import { searchUsers } from '../services/userService';
import {
  Clock,
  MapPin,
  Users,
  QrCode,
  Shield,
  Download,
  FileText,
  Award,
  X,
  Star,
  MessageSquare,
  Check,
  ArrowLeft,
  AlertTriangle,
  Edit2,
  Info,
  Loader2,
  Calendar,
  Ticket,
  CheckCircle2,
  Search
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DownloadIcon } from '@/components/ui/download';
import { downloadTicketPdf, downloadTicketImage, generateTicketQrUrl } from '../services/ticketService';
import { invalidateCache } from '../lib/cacheManager';
import { getMyFeedbackHistory, getPendingFeedback } from '../services/feedbackService';
import { EventFeedbackModal } from '../components/EventFeedbackModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import ShimmerText from '../components/ShimmerText';
import { useTheme } from '../context/ThemeContext';
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
  onOpenFeedback,
  hasSubmittedFeedback,
  clubWantsFeedback,
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

  const posterImage = event.imageUrl || '/fallback-img.jpg';
  const isPaidEvent = event.paymentMethod && event.paymentMethod !== 'FREE';
  const isTeam = Boolean(reg.team || reg.teamId);
  const isTeamLeader = isTeam && (reg.team?.leaderId === (user?.id || user?._id));
  const isTeamMember = isTeam && !isTeamLeader;
  const isPaymentSuccess = isTeamMember || ['APPROVED', 'SUCCESS'].includes(reg.paymentStatus);
  const isPaymentRejected = reg.paymentStatus === 'REJECTED';
  const isPaymentPending = isPaidEvent && reg.paymentStatus === 'PENDING';
  const isWaitlisted = reg.status === 'WAITLISTED';
  const canShowTicket = (!isPaidEvent || isTeamMember || isPaymentSuccess) && !isWaitlisted;
  const isAttended = reg.status === 'ATTENDED' || reg.attended;
  const { isDark } = useTheme();
const fallbackLogo = isDark ? "/darkthemelogo.png" : "/lightthemelogo.png";
    const rawClubLogo = event.club?.clubLogo || event.createdBy?.clubLogo;
    const [clubLogoSrc, setClubLogoSrc] = useState(fallbackLogo);

    useEffect(() => {
        if (!rawClubLogo) {
            setClubLogoSrc(fallbackLogo);
            return;
        }
        setClubLogoSrc(fallbackLogo);
        const img = new Image();
        img.src = rawClubLogo;
        img.onload = () => setClubLogoSrc(rawClubLogo);
        img.onerror = () => setClubLogoSrc(fallbackLogo);
    }, [rawClubLogo, fallbackLogo]);

  // Only allow feedback when club explicitly wants to collect feedback, event has ended or user attended, and not yet submitted
  const canGiveFeedback = Boolean(clubWantsFeedback) && (isPast || isAttended) && !hasSubmittedFeedback;

  // Certificate download is only available if added or selected to provide, event is past, and user attended
  const isCertificateAvailable = Boolean(
    event.provideCertificate ||
    (event.certificateTemplate &&
      (typeof event.certificateTemplate === 'string'
        ? event.certificateTemplate.length > 0
        : (event.certificateTemplate.imageUrl || Object.keys(event.certificateTemplate).length > 0)))
  );

  const clubName = event.club?.clubName || event.organizers?.[0]?.club?.clubName || event.createdBy?.clubName;
  const clubLogo = event.club?.clubLogo || event.organizers?.[0]?.club?.clubLogo || event.createdBy?.clubLogo;

  return (
    <div
      id={`reg-card-${regId}`}
      className={`group relative flex flex-col h-full bg-white dark:bg-neutral-900 rounded-2xl border transition-all duration-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 ${
        isHighlighted
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
          : 'border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs'
      }`}
    >
      {/* Top Poster Banner */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200/80 dark:border-neutral-800">
        <img
          src={posterImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/CLUBSETU.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 pointer-events-none" />

        {/* Top-Left: Timing Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-600 text-white shadow-xs animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              Live
            </span>
          )}
          {isUpcoming && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-black/70 text-white backdrop-blur-md border border-white/10 shadow-xs">
              Upcoming
            </span>
          )}
          {isPast && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-black/60 text-neutral-300 backdrop-blur-md border border-white/10 shadow-xs">
              Ended
            </span>
          )}
        </div>

        {/* Top-Right: Registration Status Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {isAttended ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-black/75 text-white backdrop-blur-md border border-white/15 shadow-xs">
              <span className="text-emerald-400">✓</span> Attended
            </span>
          ) : isWaitlisted ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-black/70 text-amber-300 backdrop-blur-md border border-white/10 shadow-xs">
              Waitlisted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-600 text-white shadow-xs">
              ✓ Registered
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Club line & Payment pill */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {clubName ? (
            <div className="flex items-center min-w-0 gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={clubLogoSrc}
                  alt={clubName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/lightthemelogo.png';
                  }}
                />
              </div>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate hover:text-neutral-900 dark:hover:text-white transition-colors">{clubName}</span>
            </div>
          ) : <div />}

          {/* Payment badge if paid event */}
          {isPaidEvent && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                isPaymentSuccess
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  : isPaymentRejected
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                  : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {isPaymentSuccess ? 'Paid' : reg.paymentStatus || 'Pending'}
            </span>
          )}
        </div>

        {/* Event Title */}
        <h3 className="text-base sm:text-lg font-medium leading-snug line-clamp-2">
          <Link
            to={`/event/${event.slug || event.id || event._id}`}
            className="text-neutral-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {event.title}
          </Link>
        </h3>

        {/* Middle Info & Calendar Date Box */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          {/* Left Info Column */}
          <div className="flex-1 min-w-0 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-1.5 min-w-0 font-medium text-neutral-800 dark:text-neutral-200">
              <MapPin className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <span className="truncate">{event.venue || 'Campus Venue'}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 text-neutral-500 dark:text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
              <span className="truncate">{formattedTime}</span>
            </div>
          </div>

          {/* Right Calendar Date Box - Minimal black/white */}
          {isValidDate && (
            <div className="shrink-0 self-center">
              <div className="flex flex-col items-center justify-center min-w-[50px] bg-white dark:bg-neutral-800/90 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700/80 shadow-2xs">
                <div className="w-full bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 text-[8px] font-bold uppercase tracking-wider text-center py-0.5 px-1 leading-none border-b border-neutral-200/80 dark:border-neutral-700/60">
                  {monthName}
                </div>
                <div className="text-base font-semibold text-neutral-900 dark:text-white leading-tight px-2 pt-0.5 font-mono">
                  {dayNumber}
                </div>
                <div className="text-[8px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider pb-0.5">
                  {dayName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Details (if team registration) */}
        {reg.team && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                <Users className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                <span>Team: <span className="text-brand-600 dark:text-brand-400">{reg.team.teamName}</span></span>
              </div>
              {!isPast && (user?.id === reg.team.leaderId || user?._id === reg.team.leaderId) && (
                <button
                  type="button"
                  onClick={() => onUpdateTeam(reg)}
                  className="h-6 px-2.5 rounded-full text-[10px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500 transition-all cursor-pointer shadow-2xs"
                >
                  Update
                </button>
              )}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Leader: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{reg.team.leader?.name}</span>
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px] line-clamp-1">
              Members: <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {(reg.team.members || []).map(m => m.user?.name).filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="mt-auto pt-3 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {(!reg.team || isTeamLeader) && (reg.paymentStatus === 'NEED_MORE_DETAILS' || reg.paymentStatus === 'REJECTED') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditPayment(reg)}
                className="h-9 rounded-full text-xs font-semibold gap-1.5 border-neutral-300 dark:border-neutral-700 hover:border-brand-500"
              >
                <Edit2 className="w-3 h-3 text-black dark:text-white" />
                <span>Edit Payment Info</span>
              </Button>
            )}

            {/* Upcoming or Live events: show ticket and deregulation */}
            {!isPast && (
              <>
                {canShowTicket && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onShowTicket(reg)}
                    className="flex-1 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-white dark:text-black" />
                    <span>Show Ticket</span>
                  </Button>
                )}

                {isWaitlisted && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 truncate">
                    On Waitlist — Ticket available when cleared
                  </span>
                )}

                {isPaidEvent && isPaymentPending && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 truncate">
                    Ticket after approval
                  </span>
                )}

                {isPaidEvent && isPaymentRejected && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 truncate">
                    Payment rejected
                  </span>
                )}

                {isPaidEvent ? (
                  <span className="h-9 px-3 inline-flex items-center rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    Paid
                  </span>
                ) : isTeamMember ? (
                  <span className="h-9 px-3 inline-flex items-center rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0" title="Only the team leader can cancel the team registration.">
                    Team Member
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeregister(reg)}
                    className="h-9 px-3 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 cursor-pointer"
                  >
                    {isTeamLeader ? 'Deregister Team' : 'Deregister'}
                  </Button>
                )}
              </>
            )}

            {/* Completed events (isPast) */}
            {isPast && (
              <>
                {canGiveFeedback ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenFeedback(event)}
                    className="flex-1 h-9 rounded-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </Button>
                ) : (
                  <span className="flex-1 h-9 inline-flex items-center justify-center text-xs font-normal text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-850 rounded-full border border-neutral-200 dark:border-neutral-800">
                    Event Ended
                  </span>
                )}

                {/* Secondary pass view button for participants */}
                {canShowTicket && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onShowTicket(reg)}
                    title="View Digital Pass"
                    className="h-9 w-9 rounded-full border-neutral-300 dark:border-neutral-700 hover:border-brand-500 shrink-0 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-black dark:text-white" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Certificate Download Button */}
          {isPast && isAttended && isCertificateAvailable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDownloadCertificate(event.id || event._id)}
              disabled={downloadingCert === (event.id || event._id)}
              className="w-full h-9 rounded-full text-xs font-semibold gap-2 border-neutral-300 dark:border-neutral-700 hover:border-brand-500 text-neutral-800 dark:text-neutral-200 hover:text-brand-600 transition-all cursor-pointer"
            >
              <DownloadIcon size={14} />
              <span>{downloadingCert === (event.id || event._id) ? 'Downloading...' : 'Download E-Certificate'}</span>
            </Button>
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
  const [filter, setFilter] = useState('all'); // 'all' | 'upcoming' | 'past' | 'pending_feedback'
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [pendingFeedbackEventIds, setPendingFeedbackEventIds] = useState(new Set());

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
  const [downloadingTicket, setDownloadingTicket] = useState(false);

  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState(null);
  const [editTxId, setEditTxId] = useState('');
  const [editPayerName, setEditPayerName] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [highlightedRegId, setHighlightedRegId] = useState(null);
  const [downloadingCert, setDownloadingCert] = useState(null);
  const [feedbackModalEvent, setFeedbackModalEvent] = useState(null);

  // Check if account is a dedicated ClubAccount without student identity
  const isClubAccount = authUser?.principalType === 'CLUB' || (!user?.rollNo && authRole === 'club');

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      const userId = authUser.id || authUser._id;
      if (userId && !isClubAccount) {
        fetchRegistrations(userId);
        fetchFeedbackHistory();
        fetchPendingFeedbackEvents();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [authUser, authRole, isClubAccount]);

  const submittedFeedbackEventIds = React.useMemo(() => {
    return new Set(
      feedbacks.map((fb) => fb.eventId || fb.event?.id || fb.event?._id).filter(Boolean)
    );
  }, [feedbacks]);

  // Sort registrations: active/upcoming events first (earliest start time first), followed by past events (most recent first)
  const sortedRegistrations = React.useMemo(() => {
    const now = Date.now();
    return [...registrations].sort((a, b) => {
      const eventA = a.eventId;
      const eventB = b.eventId;
      if (!eventA && !eventB) return 0;
      if (!eventA) return 1;
      if (!eventB) return -1;

      const endA = eventA.endTime ? new Date(eventA.endTime).getTime() : (eventA.startTime ? new Date(eventA.startTime).getTime() : 0);
      const endB = eventB.endTime ? new Date(eventB.endTime).getTime() : (eventB.startTime ? new Date(eventB.startTime).getTime() : 0);
      
      const isPastA = endA < now;
      const isPastB = endB < now;

      // Active (upcoming/live) events come before past events
      if (!isPastA && isPastB) return -1;
      if (isPastA && !isPastB) return 1;

      // Both are active: sort ascending by startTime (happening earliest/soonest at the top)
      if (!isPastA && !isPastB) {
        const startA = eventA.startTime ? new Date(eventA.startTime).getTime() : endA;
        const startB = eventB.startTime ? new Date(eventB.startTime).getTime() : endB;
        return startA - startB;
      }

      // Both are past: sort descending by endTime (most recently ended on top)
      return endB - endA;
    });
  }, [registrations]);

  // Dynamic counts for filter pills (strictly respects club feedback preference)
  const counts = React.useMemo(() => {
    const now = Date.now();
    let upcoming = 0;
    let past = 0;
    let pendingFeedback = 0;

    registrations.forEach((r) => {
      const ev = r.eventId;
      if (!ev) return;
      const end = ev.endTime ? new Date(ev.endTime).getTime() : (ev.startTime ? new Date(ev.startTime).getTime() : 0);
      const isPast = end < now;
      const isAttended = r.status === 'ATTENDED' || r.attended;
      const hasFeedback = submittedFeedbackEventIds.has(ev.id || ev._id);
      const clubWantsFeedback = (ev.feedbackEnabled === true || pendingFeedbackEventIds.has(ev.id || ev._id)) && ev.feedbackEnabled !== false;

      if (isPast) {
        past++;
      } else {
        upcoming++;
      }

      if (clubWantsFeedback && (isPast || isAttended) && !hasFeedback) {
        pendingFeedback++;
      }
    });

    return { all: registrations.length, upcoming, past, pendingFeedback };
  }, [registrations, submittedFeedbackEventIds, pendingFeedbackEventIds]);

  // Filtered registrations based on current active filter
  const filteredRegistrations = React.useMemo(() => {
    const now = Date.now();
    if (filter === 'all') return sortedRegistrations;

    return sortedRegistrations.filter((r) => {
      const ev = r.eventId;
      if (!ev) return false;
      const end = ev.endTime ? new Date(ev.endTime).getTime() : (ev.startTime ? new Date(ev.startTime).getTime() : 0);
      const isPast = end < now;
      const isAttended = r.status === 'ATTENDED' || r.attended;
      const hasFeedback = submittedFeedbackEventIds.has(ev.id || ev._id);
      const clubWantsFeedback = (ev.feedbackEnabled === true || pendingFeedbackEventIds.has(ev.id || ev._id)) && ev.feedbackEnabled !== false;

      if (filter === 'upcoming') return !isPast;
      if (filter === 'past') return isPast;
      if (filter === 'pending_feedback') return clubWantsFeedback && (isPast || isAttended) && !hasFeedback;
      return true;
    });
  }, [sortedRegistrations, filter, submittedFeedbackEventIds, pendingFeedbackEventIds]);

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

  const fetchPendingFeedbackEvents = async () => {
    try {
      const res = await getPendingFeedback();
      const list = res.data?.pendingEvents || [];
      setPendingFeedbackEventIds(new Set(list.map((e) => e.id || e.eventId || e._id)));
    } catch (err) {
      console.error('Failed to fetch pending feedback events:', err);
    }
  };

  const handleDownloadTicket = async () => {
    if (!selectedTicket || downloadingTicket) return;

    try {
      setDownloadingTicket(true);
      await downloadTicketPdf({
        ticket: selectedTicket,
        user,
      });
      showNotification('Ticket PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download ticket PDF:', err);
      showNotification('Failed to download ticket PDF. Please try again.', 'error');
    } finally {
      setDownloadingTicket(false);
    }
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
      const url = await generateTicketQrUrl(payloadToEncode);
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generating ticket QR:', err);
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
        } catch {
          // Ignore parsing error fallback
        }
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

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Card className="p-8">
          <p className="text-sm text-muted-foreground">Please log in to view your events.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <ShimmerText text="Loading your events..." className="text-sm font-semibold tracking-wider" />
      </div>
    );
  }

  // Dedicated Official Club Account Notice
  if (isClubAccount) {
    const clubTargetId = user.clubId || user.id || user._id;
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Card className="max-w-lg mx-auto p-8 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Shield size={28} />
          </div>
          <CardTitle className="text-xl mb-2">Club Management Portal</CardTitle>
          <CardDescription className="text-sm mb-6">
            You are currently signed in as an Official Club Account. To manage, create, and review events organized by your club, visit your Club Events dashboard.
          </CardDescription>
          <Button asChild className="font-semibold">
            <Link to={`/club-events/${clubTargetId}`}>Open Club Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all events you have registered for, view digital tickets, and download participation certificates.
          </p>
        </div>
       
      </div>

      {/* Modern Filter Navigation */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-200 dark:hover:!bg-neutral-700'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>All Events</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === 'all' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            filter === 'upcoming'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-200 dark:hover:!bg-neutral-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Upcoming & Live</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === 'upcoming' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
            {counts.upcoming}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            filter === 'past'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-200 dark:hover:!bg-neutral-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Past Events</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === 'past' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
            {counts.past}
          </span>
        </button>

        {counts.pendingFeedback > 0 && (
          <button
            type="button"
            onClick={() => setFilter('pending_feedback')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              filter === 'pending_feedback'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-200 dark:hover:!bg-neutral-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Needs Feedback</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${filter === 'pending_feedback' ? 'bg-white/20 text-white' : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'}`}>
              {counts.pendingFeedback}
            </span>
          </button>
        )}
      </div>

      {/* Events Grid / Empty States */}
      {registrations.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-base mb-1">No Registered Events Found</CardTitle>
          <CardDescription className="text-xs mb-6 max-w-md mx-auto">
            You haven't registered for any campus events yet. Explore upcoming hackathons, workshops, and fests!
          </CardDescription>
          <Button asChild className="font-semibold">
            <Link to="/events">Browse Events</Link>
          </Button>
        </Card>
      ) : filteredRegistrations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-6 h-6" />
          </div>
          <CardTitle className="text-base mb-1">No events in this category</CardTitle>
          <CardDescription className="text-xs mb-4 max-w-md mx-auto">
            {filter === 'upcoming'
              ? 'You have no upcoming or live events right now.'
              : filter === 'past'
              ? 'You have no past events.'
              : 'You have submitted feedback for all attended and ended events!'}
          </CardDescription>
          <Button variant="outline" size="sm" onClick={() => setFilter('all')} className="rounded-full text-xs font-semibold cursor-pointer">
            View All Events ({counts.all})
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRegistrations.map((reg) => {
            const event = reg.eventId;
            if (!event) return null;
            const regId = reg.id || reg._id;
            const isHighlighted = highlightedRegId === regId;
            const clubWantsFeedback = (event.feedbackEnabled === true || pendingFeedbackEventIds.has(event.id || event._id)) && event.feedbackEnabled !== false;

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
                onOpenFeedback={(ev) => setFeedbackModalEvent(ev)}
                hasSubmittedFeedback={submittedFeedbackEventIds.has(event.id || event._id)}
                clubWantsFeedback={clubWantsFeedback}
              />
            );
          })}
        </div>
      )}

      {/* Ticket Modal */}
      <AnimatePresence>
        {ticketModalOpen && selectedTicket && (() => {
          const ev = selectedTicket.eventId || selectedTicket.event || {};
          const organizerName =
            ev.club?.clubName ||
            ev.club?.name ||
            ev.organizers?.[0]?.club?.clubName ||
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
            user?.name ||
            "Participant";

          const attendeeRoll =
            selectedTicket.student?.rollNo ||
            user?.rollNo ||
            null;

          const passId = selectedTicket.qrCode || selectedTicket.id;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setTicketModalOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 max-w-sm w-full"
              >
                <Card className="p-5 shadow-2xl">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-2 pr-8">
                      <Badge className="text-[10px] font-semibold tracking-wider">
                        Digital Event Pass
                      </Badge>

                      {selectedTicket.team?.teamName && (
                        <Badge variant="secondary" className="text-[10px] truncate">
                          Team: {selectedTicket.team.teamName}
                        </Badge>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setTicketModalOpen(false)}
                        className="absolute top-4 right-4 h-7 w-7 text-muted-foreground"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <h3 className="text-base font-medium leading-tight line-clamp-2">
                      {ev.title || "Event Pass"}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      Organized by <span className="font-medium text-foreground">{organizerName}</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 overflow-hidden mb-4 divide-y divide-border">
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-2.5">
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Date</p>
                        <p className="text-xs font-medium mt-0.5">{formattedDate}</p>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Time</p>
                        <p className="text-xs font-medium mt-0.5">{formattedTime}</p>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Venue</p>
                      <p className="text-xs font-medium mt-0.5 truncate">{ev.venue || "Venue not specified"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Ticket QR" className="w-44 h-44" />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-muted-foreground">
                          Loading QR...
                        </div>
                      )}
                    </div>

                    <div className="w-full mt-3">
                      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Participant</p>
                          <p className="text-xs font-medium text-primary truncate mt-0.5">
                            {attendeeName}
                          </p>
                        </div>
                        {attendeeRoll && (
                          <div className="shrink-0 text-right">
                            <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Roll No.</p>
                            <p className="text-xs font-medium mt-0.5 tracking-wider">{attendeeRoll}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 mb-4 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Pass ID: <span className="font-bold text-primary">{passId}</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketModalOpen(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDownloadTicket}
                      disabled={downloadingTicket}
                      className="flex-1 font-semibold"
                    >
                      {downloadingTicket ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Deregister Confirmation Modal */}
      <AnimatePresence>
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-w-sm w-full"
            >
              <Card className="p-6 text-center shadow-2xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <CardTitle className="text-base mb-1.5">
                  {regToDeregister?.team ? 'Cancel Team Registration?' : 'Cancel Registration?'}
                </CardTitle>
                <CardDescription className="text-xs mb-6 leading-relaxed">
                  {regToDeregister?.team
                    ? `Are you sure you want to cancel the registration for team "${regToDeregister.team.teamName}"? As the team leader, cancelling will deregister all team members from this event. This action cannot be undone.`
                    : 'Are you sure you want to cancel your registration for this event? This action cannot be undone.'}
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setConfirmModalOpen(false); setEventToDeregister(null); setRegToDeregister(null); }}
                    className="flex-1"
                  >
                    Keep Registration
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={confirmDeregister}
                    className="flex-1 font-semibold"
                  >
                    {regToDeregister?.team ? 'Yes, Deregister Team' : 'Yes, Deregister'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Team Modal */}
      <AnimatePresence>
        {updateTeamModalOpen && teamToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-w-md w-full"
            >
              <Card className="shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <CardHeader className="py-4 px-5 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users size={16} />
                    </div>
                    <div>
                      <CardTitle className="text-base">Manage Team</CardTitle>
                      <CardDescription className="text-xs truncate max-w-[240px]">
                        {teamToUpdate.team?.teamName}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <X size={16} />
                  </Button>
                </CardHeader>

                <CardContent className="p-5 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Current Team Members
                    </label>
                    <div className="divide-y divide-border text-xs border border-border rounded-lg overflow-hidden">
                      <div className="p-2.5 flex justify-between items-center bg-muted/20">
                        <div>
                          <p className="font-semibold">{teamToUpdate.team?.leader?.name} <span className="text-primary font-bold">(Leader)</span></p>
                          <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{teamToUpdate.team?.leader?.rollNo || teamToUpdate.team?.leader?.email}</p>
                        </div>
                      </div>
                      {(teamToUpdate.team?.members || [])
                        .filter(m => m.userId !== teamToUpdate.team?.leaderId)
                        .map(m => (
                          <div key={m.id || m.userId} className="p-2.5 flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{m.user?.name || "Pending Invitation"}</p>
                              <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{m.user?.rollNo || m.user?.email || "Teammate"}</p>
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
                        <div className="bg-muted/50 border border-border p-3 rounded-lg text-xs text-muted-foreground font-medium flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary shrink-0" />
                          <span>Your team has reached the maximum size of {maxLimit} members.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold">
                          Invite Teammate <span className="text-muted-foreground font-normal">(Size: {currentCount} / max {maxLimit})</span>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Search by Email or Roll Number..."
                            value={updateTeamSearchQuery}
                            onChange={(e) => setUpdateTeamSearchQuery(e.target.value)}
                            className="pl-9 pr-9 text-xs"
                          />
                          {updateTeamSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                          )}
                        </div>

                        {updateTeamSearchResults.length > 0 && (
                          <div className="mt-1 max-h-44 overflow-y-auto border border-border rounded-lg shadow-sm divide-y divide-border">
                            {updateTeamSearchResults.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => handleInviteTeammate(s)}
                                className="p-2.5 text-xs hover:bg-muted/50 cursor-pointer flex justify-between items-center transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-semibold truncate">{s.name}</p>
                                  <p className="text-muted-foreground font-mono text-[11px] truncate">{s.rollNo} • {s.email}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-primary border-primary/30 shrink-0">
                                  Invite
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>

                <CardFooter className="py-3 px-5 border-t border-border bg-muted/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setUpdateTeamModalOpen(false); setTeamToUpdate(null); setUpdateTeamSearchQuery(''); }}
                    className="w-full"
                  >
                    Close
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {editPaymentModalOpen && editingReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-w-md w-full"
            >
              <Card className="shadow-2xl overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Edit2 size={16} />
                    </div>
                    <div>
                      <CardTitle className="text-base">Edit Payment Information</CardTitle>
                      <CardDescription className="text-xs">
                        Update transaction details for review.
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <X size={16} />
                  </Button>
                </CardHeader>
                
                <form onSubmit={submitPaymentEdit}>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">
                        UTR / Transaction ID <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={editTxId}
                        onChange={(e) => setEditTxId(e.target.value)}
                        className="font-mono text-xs"
                        placeholder="Enter 12-digit UPI/UTR Transaction ID"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">
                        Payer Name
                      </label>
                      <Input
                        type="text"
                        value={editPayerName}
                        onChange={(e) => setEditPayerName(e.target.value)}
                        className="text-xs"
                        placeholder="Name of account owner"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">
                        Payment Remarks
                      </label>
                      <Textarea
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        className="text-xs resize-none h-20"
                        placeholder="Add remarks or notes..."
                      />
                    </div>

                    {editingReg.paymentReviewMessage && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-[11px] font-bold text-destructive uppercase tracking-wider mb-1">
                          Reviewer Note
                        </p>
                        <p className="text-xs text-destructive leading-relaxed font-medium">
                          {editingReg.paymentReviewMessage}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="py-3 px-5 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditPaymentModalOpen(false); setEditingReg(null); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingEdit}
                      className="font-semibold"
                    >
                      {submittingEdit ? 'Submitting...' : 'Update Details'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Event Feedback Modal */}
      <EventFeedbackModal
        isOpen={Boolean(feedbackModalEvent)}
        onClose={() => setFeedbackModalEvent(null)}
        pendingEvents={feedbackModalEvent ? [feedbackModalEvent] : []}
        onFeedbackSubmitted={async () => {
          await fetchFeedbackHistory();
          await fetchPendingFeedbackEvents();
          showNotification('Feedback submitted successfully! Thank you.', 'success');
        }}
      />
    </div>
  );
};

export default MyEvents;
