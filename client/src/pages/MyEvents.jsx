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
import QRCode from 'qrcode';
import { invalidateCache } from '../lib/cacheManager';
import { getMyFeedbackHistory } from '../services/feedbackService';
import { EventFeedbackModal } from '../components/EventFeedbackModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import ShimmerText from '../components/ShimmerText';

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
  const isTeam = Boolean(reg.team || reg.teamId);
  const isTeamLeader = isTeam && (reg.team?.leaderId === (user?.id || user?._id));
  const isTeamMember = isTeam && !isTeamLeader;
  const isPaymentSuccess = isTeamMember || ['APPROVED', 'SUCCESS'].includes(reg.paymentStatus);
  const isPaymentRejected = reg.paymentStatus === 'REJECTED';
  const isPaymentPending = isPaidEvent && reg.paymentStatus === 'PENDING';
  const isWaitlisted = reg.status === 'WAITLISTED';
  const canShowTicket = (!isPaidEvent || isTeamMember || isPaymentSuccess) && !isWaitlisted;
  const isAttended = reg.status === 'ATTENDED' || reg.attended;

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
    <Card
      id={`reg-card-${regId}`}
      className={`overflow-hidden flex flex-col h-full transition-all duration-200 ${
        isHighlighted
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'hover:border-border/80 hover:shadow-sm'
      }`}
    >
      {/* Top Poster Banner */}
      <div className="relative w-full aspect-[21/9] overflow-hidden bg-muted border-b border-border">
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
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isLive && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 gap-1.5 animate-pulse border-none">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              Live
            </Badge>
          )}
          {isUpcoming && (
            <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 backdrop-blur-md bg-background/80">
              Upcoming
            </Badge>
          )}
          {isPast && (
            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 backdrop-blur-md bg-background/80 text-muted-foreground">
              Ended
            </Badge>
          )}
        </div>

        {/* Top-Right: Registration Status Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {isAttended ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 border-none">
              ✓ Attended
            </Badge>
          ) : isWaitlisted ? (
            <Badge variant="outline" className="bg-amber-500/90 text-white border-none text-[10px] font-bold px-2 py-0.5">
              Waitlisted
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 backdrop-blur-md bg-background/90 text-foreground">
              ✓ Registered
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Club line */}
        {clubName && (
          <div className="flex items-center min-w-0">
            {clubLogo ? (
              <img
                src={clubLogo}
                alt={clubName}
                className="w-4 h-4 rounded-full object-cover mr-1.5 border border-border"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/lightthemelogo.png';
                }}
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 text-primary text-[9px] font-bold">
                <Users className="w-2.5 h-2.5" />
              </div>
            )}
            <span className="text-xs font-semibold text-primary truncate">{clubName}</span>
          </div>
        )}

        {/* Event Title */}
        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
          <Link to={`/event/${event.slug || event.id || event._id}`} className="hover:text-primary transition-colors">
            {event.title}
          </Link>
        </h3>

        {/* Middle Info & Calendar Date Box */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Left Info Column */}
          <div className="flex-1 min-w-0 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-0 font-medium text-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{event.venue || 'Campus Venue'}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{formattedTime}</span>
            </div>

            {/* Payment badge if paid event */}
            {isPaidEvent && (
              <div className="pt-0.5">
                <Badge
                  variant={isPaymentSuccess ? 'default' : isPaymentRejected ? 'destructive' : 'outline'}
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 ${
                    isPaymentSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : isPaymentRejected
                      ? ''
                      : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {isPaymentSuccess ? 'Payment: Paid' : `Payment: ${reg.paymentStatus || 'Pending'}`}
                </Badge>
              </div>
            )}
          </div>

          {/* Right Calendar Date Box */}
          {isValidDate && (
            <div className="shrink-0 self-center">
              <div className="flex flex-col items-center justify-center min-w-[48px] bg-muted/50 rounded-lg overflow-hidden border border-border">
                <div className="w-full bg-destructive text-destructive-foreground text-[8px] font-bold uppercase tracking-wider text-center py-0.5 px-1 leading-none">
                  {monthName}
                </div>
                <div className="text-sm font-black leading-tight px-2 pt-0.5 font-mono">
                  {dayNumber}
                </div>
                <div className="text-[8px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
                  {dayName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Details (if team registration) */}
        {reg.team && (
          <div className="p-2.5 bg-muted/40 border border-border rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Team: <span className="text-primary font-bold">{reg.team.teamName}</span></span>
              </div>
              {!isPast && (user?.id === reg.team.leaderId || user?._id === reg.team.leaderId) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateTeam(reg)}
                  className="h-6 text-[10px] font-semibold px-2 py-0"
                >
                  Update
                </Button>
              )}
            </div>
            <div className="text-muted-foreground text-[11px]">
              Leader: <span className="font-medium text-foreground">{reg.team.leader?.name}</span>
            </div>
            <div className="text-muted-foreground text-[11px] line-clamp-1">
              Members: <span className="font-medium text-foreground">
                {(reg.team.members || []).map(m => m.user?.name).filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="mt-auto pt-3 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {(!reg.team || isTeamLeader) && (reg.paymentStatus === 'NEED_MORE_DETAILS' || reg.paymentStatus === 'REJECTED') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditPayment(reg)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Edit2 className="w-3 h-3 text-primary" />
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
                    className="flex-1 h-8 text-xs font-semibold uppercase tracking-wider gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Show Ticket</span>
                  </Button>
                )}

                {isWaitlisted && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 truncate">
                    On Waitlist — Ticket available when cleared
                  </span>
                )}

                {isPaidEvent && isPaymentPending && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 truncate">
                    Ticket after approval
                  </span>
                )}

                {isPaidEvent && isPaymentRejected && (
                  <span className="flex-1 text-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-destructive/10 text-destructive border border-destructive/20 truncate">
                    Payment rejected
                  </span>
                )}

                {isPaidEvent ? (
                  <Badge variant="secondary" className="h-8 px-2.5 text-xs font-medium text-muted-foreground shrink-0">
                    Paid
                  </Badge>
                ) : isTeamMember ? (
                  <Badge variant="secondary" className="h-8 px-2.5 text-xs font-medium text-muted-foreground shrink-0" title="Only the team leader can cancel the team registration.">
                    Team Member
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeregister(reg)}
                    className="h-8 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    {isTeamLeader ? 'Deregister Team' : 'Deregister'}
                  </Button>
                )}
              </>
            )}

            {/* Completed events (isPast) */}
            {isPast && (
              <>
                {isAttended ? (
                  hasSubmittedFeedback ? (
                    <Badge variant="secondary" className="flex-1 h-8 justify-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" />
                      <span>Feedback Submitted</span>
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenFeedback(event)}
                      className="flex-1 h-8 text-xs font-semibold uppercase tracking-wider gap-1.5 bg-primary"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Submit Feedback</span>
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary" className="flex-1 h-8 justify-center text-xs font-medium text-muted-foreground">
                    Event Ended
                  </Badge>
                )}

                {/* Secondary pass view button for participants */}
                {canShowTicket && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onShowTicket(reg)}
                    title="View Digital Pass"
                    className="h-8 w-8 shrink-0"
                  >
                    <QrCode className="w-4 h-4" />
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
              className="w-full h-8 text-xs font-semibold gap-2"
            >
              <DownloadIcon size={14} />
              <span>{downloadingCert === (event.id || event._id) ? 'Downloading...' : 'Download E-Certificate'}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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

    const computedTheme = getComputedStyle(document.documentElement);
    const brandColor = computedTheme.getPropertyValue('--cn-brand').trim() || '#0094FF';
    const brandDark = computedTheme.getPropertyValue('--color-brand-800').trim() || '#064f89';
    const textColor = computedTheme.getPropertyValue('--cn-primary').trim() || '#0a0a0a';

    ctx.fillStyle = textColor;
    ctx.fillRect(700, 0, 300, canvas.height);

    const accentGrad = ctx.createLinearGradient(0, 0, 15, 400);
    accentGrad.addColorStop(0, brandColor);
    accentGrad.addColorStop(1, brandDark);
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
    ctx.fillStyle = textColor;
    ctx.fillText('CAMPUS', brandX, brandY);
    const clubWidth = ctx.measureText('CAMPUS').width;
    ctx.fillStyle = brandColor;
    ctx.fillText('NODE', brandX + clubWidth, brandY);
    ctx.letterSpacing = "0px";

    // Event Name
    ctx.font = 'bold 44px "myfont"';
    ctx.fillStyle = textColor;
    const eventName = (selectedTicket.eventId?.title || 'EVENT TICKET');
    ctx.fillText(eventName.length > 20 ? eventName.substring(0, 20) + '...' : eventName, 60, 145);

    const drawData = (label, value, x, y) => {
      ctx.font = 'bold 12px "myfont"';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.font = 'bold 22px "myfont"';
      ctx.fillStyle = textColor;
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
      ctx.fillStyle = brandColor;
      ctx.fillRect(748, 93, 204, 204);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(750, 95, 200, 200);
      ctx.drawImage(qrImage, 750, 95, 200, 200);

      ctx.font = '12px "myfont"';
      ctx.fillStyle = '#737373';
      ctx.fillText('SERIAL NUMBER', 850, 325);
      
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = brandColor;
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all events you have registered for, view digital tickets, and download participation certificates.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/profile">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-border pb-3">
        <Button
          type="button"
          variant={activeTab === 'events' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('events')}
          className="gap-2 font-semibold"
        >
          <Ticket className="w-4 h-4" />
          <span>Tickets & Registrations ({registrations.length})</span>
        </Button>
        <Button
          type="button"
          variant={activeTab === 'feedback' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('feedback');
            fetchFeedbackHistory();
          }}
          className="gap-2 font-semibold"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>My Feedback</span>
        </Button>
      </div>

      {/* Feedback Tab Content */}
      {activeTab === 'feedback' && (
        <div>
          {loadingFeedbacks ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <ShimmerText text="Loading your feedback history..." className="text-xs font-semibold tracking-wider" />
            </div>
          ) : feedbacks.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6" />
              </div>
              <CardTitle className="text-base mb-1">No Feedback Submitted Yet</CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto">
                After attending events, you'll be automatically invited to share your ratings and reviews here.
              </CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <Card key={fb.id} className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {(fb.event?.club?.clubName || fb.event?.organizers?.[0]?.club?.clubName) && (
                          <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                            {fb.event?.club?.clubName || fb.event?.organizers?.[0]?.club?.clubName}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          Submitted on {new Date(fb.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold">
                        <Link to={`/event/${fb.event?.slug || fb.eventId}`} className="hover:text-primary transition-colors">
                          {fb.event?.title || 'Campus Event'}
                        </Link>
                      </h3>
                    </div>

                    {/* Overall Rating Badge */}
                    <Badge variant="outline" className="px-3 py-1.5 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 self-start sm:self-auto">
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                      <span className="text-sm font-bold font-mono">{fb.overallRating} / 5</span>
                      <span className="text-[10px] font-medium uppercase tracking-wider">Overall</span>
                    </Badge>
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
                      <div key={i} className="p-2 rounded-lg bg-muted/40 border border-border text-center">
                        <p className="text-[10px] text-muted-foreground font-medium truncate">{item.label}</p>
                        <p className="font-bold mt-0.5 flex items-center justify-center gap-1">
                          <span className="font-mono">{item.val}</span>
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation & Comments */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Would attend again:</span>
                      <Badge variant={fb.attendSimilar === 'YES' ? 'default' : fb.attendSimilar === 'MAYBE' ? 'outline' : 'destructive'} className="text-[11px]">
                        {fb.attendSimilar === 'YES' ? 'Yes' : fb.attendSimilar === 'MAYBE' ? 'Maybe' : 'No'}
                      </Badge>
                    </div>

                    {(fb.liked || fb.improvements || fb.comments) && (
                      <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 border border-border">
                        {fb.liked && (
                          <p><strong className="text-foreground">Liked:</strong> <span className="text-muted-foreground">{fb.liked}</span></p>
                        )}
                        {fb.improvements && (
                          <p><strong className="text-foreground">Improvements:</strong> <span className="text-muted-foreground">{fb.improvements}</span></p>
                        )}
                        {fb.comments && (
                          <p><strong className="text-foreground">Comments:</strong> <span className="text-muted-foreground">{fb.comments}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab Content */}
      {activeTab === 'events' && (
        <div>
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
                    onOpenFeedback={(ev) => setFeedbackModalEvent(ev)}
                    hasSubmittedFeedback={submittedFeedbackEventIds.has(event.id || event._id)}
                  />
                );
              })}
            </div>
          )}
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
                      <Badge className="text-[10px] font-bold uppercase tracking-wider">
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

                    <h3 className="text-base font-bold leading-tight line-clamp-2">
                      {ev.title || "Event Pass"}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      Organized by <span className="font-semibold text-foreground">{organizerName}</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 overflow-hidden mb-4 divide-y divide-border">
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-2.5">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Date</p>
                        <p className="text-xs font-semibold mt-0.5">{formattedDate}</p>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Time</p>
                        <p className="text-xs font-semibold mt-0.5">{formattedTime}</p>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Venue</p>
                      <p className="text-xs font-semibold mt-0.5 truncate">{ev.venue || "Venue not specified"}</p>
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
                          <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Participant</p>
                          <p className="text-xs font-bold text-primary truncate mt-0.5">
                            {attendeeName}
                          </p>
                        </div>
                        {attendeeRoll && (
                          <div className="shrink-0 text-right">
                            <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Roll No.</p>
                            <p className="text-xs font-mono font-bold mt-0.5">{attendeeRoll}</p>
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
                      className="flex-1 font-semibold"
                    >
                      Save Ticket
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
          showNotification('Feedback submitted successfully! Thank you.', 'success');
        }}
      />
    </div>
  );
};

export default MyEvents;
