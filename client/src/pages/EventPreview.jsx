import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Send,
  Loader2,
  Check,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { markdownToHtml } from '../utils/htmlMarkdownConverter';
import '../components/WysiwygMarkdownEditor.css';
import { getEventById, reviewEvent, submitEventForReview } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import CalendarDropdown from '../components/CalendarDropdown';
import ImageZoomModal from '../components/ImageZoomModal';
import { PROGRAM_OPTIONS, PROGRAM_LABELS } from '../constants/academicConstants';
import { InstagramIcon } from "@/components/ui/instagram";
import ShimmerText from '../components/ShimmerText';
import { LinkedinIcon } from "@/components/ui/linkedin";
import { TwitterIcon } from "@/components/ui/twitter";
import { GithubIcon } from "@/components/ui/github";
import { MessageCircleIcon } from "@/components/ui/message-circle";
import { EarthIcon } from "@/components/ui/earth";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop";

const FAQItem = ({ question, answer, isOpen, onToggle }) => (
  <div
    className={`rounded-2xl transition-all duration-200 border overflow-hidden backdrop-blur-md ${
      isOpen
        ? 'bg-white/95 dark:bg-zinc-900/90 border-cn-blue-300/30 dark:border-cn-blue-300/30 shadow-md'
        : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer select-none"
      aria-expanded={isOpen}
    >
      <span className="text-[14px] font-semibold text-neutral-800 dark:text-neutral-200 pr-4 leading-snug">{question}</span>
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
          isOpen
            ? 'rotate-180 bg-brand-500/10 text-brand-600 dark:text-brand-400'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
        }`}
      >
        <i className="ri-arrow-down-s-line text-lg" />
      </div>
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="px-5 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
        {answer}
      </div>
    </div>
  </div>
);

const EventPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(null);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState({ src: '', title: '', alt: '' });

  const openImageModal = (src, titleText, altText) => {
    setActiveModalImage({
      src: src || DEFAULT_IMAGE,
      title: titleText || event?.title || 'Event Poster',
      alt: altText || event?.title || 'Poster',
    });
    setImageModalOpen(true);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await getEventById(id);
        setEvent(res.data);
      } catch (err) {
        console.error('Failed to load event for preview:', err);
        showNotification(
          err.response?.data?.message || 'Could not load event for preview.',
          'error'
        );
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id, navigate, showNotification]);

  // Role evaluations
  const isFacultyCoordinator = Boolean(
    user?.role === 'facultyCoordinator' ||
    user?.principalType === 'FACULTY' ||
    user?.memberships?.some(m =>
      m.role === 'FACULTY_COORDINATOR' ||
      m.role === 'facultyCoordinator' ||
      m.role === 'FACULTY'
    )
  );

  const isStudentLeadOrCoordinator = Boolean(
    !isFacultyCoordinator && (
      user?.role === 'admin' ||
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'CLUB_HEAD' ||
      user?.role === 'COORDINATOR' ||
      user?.memberships?.some(m =>
        (String(m.clubId || m.club?.id) === String(event?.clubId) ||
         String(m.clubId || m.club?.id) === String(event?.club?.id)) &&
        (m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR' || m.canEditEvents)
      ) ||
      (event && (
        event.createdById === user?.id ||
        event.createdById === user?._id ||
        (event.createdBy && (event.createdBy.id === user?.id || event.createdBy.id === user?._id))
      ))
    )
  );

  const handleClosePreview = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/club-events/${event?.clubId || ''}`);
    }
  };

  const handleReview = async (status, reason = null) => {
    if (!event) return;
    try {
      setSubmitting(true);
      await reviewEvent(event.id || event._id, { status, reason });
      showNotification(`Event ${status === 'PUBLISHED' ? 'approved' : 'rejected'} successfully!`, 'success');
      // Refresh event
      const res = await getEventById(id);
      setEvent(res.data);
    } catch (err) {
      console.error('Review failed:', err);
      showNotification(err.response?.data?.message || 'Failed to update review status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!event) return;
    try {
      setSubmitting(true);
      const res = await submitEventForReview(event.id || event._id, { directPublish: false });
      showNotification(res.data?.message || 'Event submitted for faculty approval!', 'success');
      const updated = res.data?.event || res.data;
      setEvent(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Submission failed:', err);
      showNotification(err.response?.data?.message || 'Failed to submit event.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center">
        <ShimmerText text="Loading event preview..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center max-w-sm bg-white dark:bg-neutral-900 shadow-sm">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 rounded-xl flex items-center justify-center text-rose-600 mx-auto mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">Event Not Found</h2>
          <p className="text-neutral-500 text-sm mb-6">The requested event preview is unavailable or has been removed.</p>
          <button
            onClick={handleClosePreview}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl transition hover:opacity-90 cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    venue,
    startTime,
    endTime,
    totalSeats,
    registeredCount = 0,
    views = 0,
    status,
    reviewStatus,
    registrationDeadline,
    entryFee = 0,
    registrationFee
  } = event;

  const effectiveFee = registrationFee ?? entryFee ?? 0;
  const isUnlimited = !totalSeats || totalSeats === 0;
  const isFull = !isUnlimited && registeredCount >= totalSeats;
  const isLive = status === 'LIVE';
  const isEnded = status === 'ENDED';
  const fillPct = isUnlimited ? 0 : Math.min(100, Math.round((registeredCount / totalSeats) * 100));

  const isDraft = reviewStatus === 'DRAFT';
  const isPending = reviewStatus === 'PENDING';
  const isRejected = reviewStatus === 'REJECTED';
  const isPublished = reviewStatus === 'PUBLISHED';

  const winners = (event.winners || []).filter(w => w.name);
  const showWinners = isEnded && event.showWinner && winners.length > 0;
  const medalConfig = {
    1: { badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300', label: '1st' },
    2: { badgeBg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300', label: '2nd' },
    3: { badgeBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300', label: '3rd' },
  };

  const isCentralEvent = event.organizerType === 'CENTRAL' || !!event.centralOrganizerId || (!event.club && !event.clubId && (!!event.centralOrganizer || !!event.participatingClubs));
  const clubSlugOrId = isCentralEvent ? null : (event.club?.slug || event.club?._id || event.club?.id || event.createdBy?.slug || event.createdBy?._id || event.createdBy?.id);
  const displayName = isCentralEvent ? 'Office of DSW' : (event.club?.clubName || event.createdBy?.clubName || 'Organizer Club');

  const isAllPrograms = !event.allowedPrograms ||
    !Array.isArray(event.allowedPrograms) ||
    event.allowedPrograms.length === 0 ||
    event.allowedPrograms.length >= PROGRAM_OPTIONS.length ||
    (PROGRAM_OPTIONS.length > 0 && PROGRAM_OPTIONS.every(p => event.allowedPrograms.includes(p)));

  const programDisplay = isAllPrograms
    ? 'All Programs'
    : event.allowedPrograms.map(p => PROGRAM_LABELS[p] || p).join(', ');

  const getRegistrationTypeDisplay = () => {
    const type = event.registrationType;
    if (type === 'none') return 'Open Entry';
    if (type === 'team') {
      const min = event.minTeamSize;
      const max = event.maxTeamSize;
      if (min && max && min === max) return `Team (${min})`;
      if (min && max) return `Team (${min}-${max})`;
      return 'Team';
    }
    if (type === 'both') {
      const min = event.minTeamSize;
      const max = event.maxTeamSize;
      if (min && max) return `Solo / Team (${min}-${max})`;
      return 'Solo / Team';
    }
    return 'Individual';
  };

  const highlights = [
    { icon: 'ri-group-line', label: 'Capacity', value: isUnlimited ? 'Unlimited Seats' : `${totalSeats} Seats` },
    { icon: 'ri-coin-line', label: 'Entry Fee', value: effectiveFee > 0 ? `₹${effectiveFee}` : 'Free Entry' },
    {
      icon: event.registrationType === 'team' || event.registrationType === 'both' ? 'ri-team-line' : 'ri-user-line',
      label: 'Registration',
      value: getRegistrationTypeDisplay(),
    },
    { icon: 'ri-time-line', label: 'Duration', value: (() => {
      if (!startTime || !endTime) return 'TBA';
      const diff = new Date(endTime) - new Date(startTime);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
    })() },
    ...(event.provideCertificate ? [{ icon: 'ri-award-line', label: 'Certificate', value: 'Provided' }] : []),
    ...(event.showWinner ? [{
      icon: 'ri-trophy-line',
      label: 'Competition',
      value: showWinners ? 'Winners Announced' : 'Winners will be announced',
    }] : []),
    { icon: 'ri-graduation-cap-line', label: 'Open To', value: programDisplay },
    ...(event.allowedBranches && event.allowedBranches.length > 0
      ? [{ icon: 'ri-git-branch-line', label: 'Branches', value: event.allowedBranches.join(', ') }]
      : []),
    ...(event.allowedYears && event.allowedYears.length > 0
      ? [{ icon: 'ri-calendar-check-line', label: 'Eligible Year', value: event.allowedYears.map(y => isNaN(parseInt(y, 10)) ? y : formatAcademicYear(y)).join(', ') }]
      : []),
  ];

  const faqItems = [
    {
      question: 'When and where is the event scheduled?',
      answer: (
        <span>
          The event starts on{' '}
          <strong className="font-bold text-neutral-900 dark:text-white">
            {startTime ? new Date(startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'TBA'} at {startTime ? new Date(startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : ''}
          </strong>{' '}
          and ends on{' '}
          <strong className="font-bold text-neutral-900 dark:text-white">
            {endTime ? new Date(endTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'TBA'} at {endTime ? new Date(endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : ''}
          </strong>
          . It will be held at{' '}
          <strong className="font-bold text-neutral-900 dark:text-white">
            {venue || 'Campus Venue'}
          </strong>.
        </span>
      ),
    },
    {
      question: 'What are the registration details, deadline, and entry fees?',
      answer: (
        <span>
          {registrationDeadline ? (
            <>
              Registration closes on{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                {new Date(registrationDeadline).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })} at {new Date(registrationDeadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
              </strong>.{' '}
            </>
          ) : (
            <>There is no separate registration deadline — registrations remain open until the event starts. </>
          )}
          {effectiveFee > 0 ? (
            <>
              The entry fee is{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                ₹{effectiveFee}
              </strong>{' '}
              (non-refundable), payable securely via the event's designated payment method.{' '}
            </>
          ) : (
            <>
              This event is{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                Completely Free
              </strong>{' '}
              to attend!{' '}
            </>
          )}
        </span>
      ),
    },
    {
      question: 'What is the seat capacity, program eligibility, and are certificates provided?',
      answer: (
        <span>
          {isUnlimited ? (
            <>
              This event has{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                Unlimited Seats
              </strong>.{' '}
            </>
          ) : (
            <>
              Total capacity is{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                {totalSeats} seats
              </strong>.{' '}
            </>
          )}
          {!isAllPrograms && event.allowedPrograms && event.allowedPrograms.length > 0 ? (
            <>
              Eligibility is open to programs:{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                {programDisplay}
              </strong>.{' '}
            </>
          ) : (
            <>All academic programs are welcome to register.{' '}</>
          )}
          {event.provideCertificate && (
            <>
              {' '}Certificates of participation/achievement will be provided to verified attendees.
            </>
          )}
        </span>
      ),
    },
    {
      question: 'Who is organizing this event?',
      answer: (
        <span>
          {isCentralEvent ? (
            <>
              This event is organized centrally by the{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                Office of DSW (Dean Student Welfare)
              </strong>.
            </>
          ) : (
            <>
              This event is organized by{' '}
              <strong className="font-bold text-neutral-900 dark:text-white">
                {displayName}
              </strong>.
            </>
          )}
        </span>
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 myfont text-neutral-900 dark:text-neutral-100">

      {/* Top Sticky Preview Bar matching EventDetails styling */}
      <div className="sticky top-0 z-30 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between gap-3">
          
          {/* Left: Back / Close button */}
          <div className="flex items-center gap-3">
            {isStudentLeadOrCoordinator ? (
              <Link
                to={`/events/edit/${event.id || event._id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 text-[11px] font-bold mysans uppercase tracking-[0.15em] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
                title="Return to editing this event"
              >
                <i className="ri-arrow-left-line text-base" /> Back to Edit
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleClosePreview}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 text-[11px] font-bold mysans uppercase tracking-[0.15em] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
                title="Close this preview tab and return to dashboard"
              >
                <i className="ri-close-line text-base" /> Close Preview
              </button>
            )}

            {/* Status pill */}
            {isDraft && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mr-1" />
                Draft Preview
              </span>
            )}
            {isPending && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                Pending Faculty Review
              </span>
            )}
            {isRejected && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                Changes Requested
              </span>
            )}
            {isPublished && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Published &amp; Live
              </span>
            )}
          </div>

          {/* Center: Title indicator */}
          <span className="text-[13px] font-bold text-neutral-500 dark:text-neutral-400 tracking-wide truncate max-w-[240px] hidden md:block">
            Event Preview (Read-Only)
          </span>

          {/* Right: Faculty review or student submit actions */}
          <div className="flex items-center gap-2">
            {isFacultyCoordinator && isPending && (
              <>
                <button
                  type="button"
                  onClick={() => handleReview('PUBLISHED')}
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg transition font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <i className="ri-check-line text-sm font-bold" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:');
                    if (reason) handleReview('REJECTED', reason);
                  }}
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-lg transition font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <i className="ri-close-line text-sm font-bold" />
                  Reject
                </button>
              </>
            )}

            {isStudentLeadOrCoordinator && isDraft && (
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-lg transition font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-8">

        {/* Rejection Feedback Banner */}
        {isRejected && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900 rounded-xl p-5 shadow-xs flex items-start gap-4">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
              <i className="ri-error-warning-fill text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2.5 py-0.5 rounded-full">
                  Event Proposal Rejected
                </span>
                {event.reviewedBy?.name && (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Reviewed by: {event.reviewedBy.name}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200 mt-1">
                <span className="font-bold">Feedback: </span>
                {event.reviewComment || "No specific feedback comment provided. Please contact the faculty coordinator."}
              </p>
            </div>
          </div>
        )}

        {/* Pending Review Banner */}
        {isPending && (
          <div className="mb-6 bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                This event proposal is currently <span className="underline font-black">PENDING REVIEW</span> by the faculty coordinator and is not yet public.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left Column (65%) */}
          <div className="w-full lg:w-[65%] min-w-0">

            {/* Poster Container matching EventDetails */}
            <div
              onClick={() => openImageModal(event.imageUrl || DEFAULT_IMAGE, event.title, event.title)}
              className="mb-6 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 relative group cursor-zoom-in transition-all"
              title="Click to view and zoom poster"
            >
              <img
                src={event.imageUrl || DEFAULT_IMAGE}
                alt={title}
                className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                style={{ maxHeight: '560px' }}
                onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
              />

              {/* Status badge overlay */}
              <div className="absolute top-3 left-3">
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> Live Now
                  </span>
                )}
                {isEnded && (
                  <span className="inline-flex items-center gap-1.5 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    <i className="ri-check-line" /> Ended
                  </span>
                )}
                {!isLive && !isEnded && (
                  <span className="inline-flex items-center gap-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    <i className="ri-time-line" /> Upcoming
                  </span>
                )}
              </div>

              {/* Zoom hint badge */}
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <i className="ri-zoom-in-line" /> Click to Zoom
              </div>
            </div>

            {/* Event Title */}
            <h1 className="font-black text-2xl md:text-3xl text-black dark:text-white leading-tight tracking-tight mb-4">
              {title}
            </h1>

            {/* Metadata bar */}
            <div className="flex items-center gap-4 flex-wrap text-[13px] text-neutral-500 dark:text-neutral-500 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-event-line text-brand-500" />
                {startTime ? new Date(startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-map-pin-2-line text-brand-500" />
                <span className="truncate max-w-[160px]">{venue || 'Venue TBA'}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              {isCentralEvent ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-building-2-line text-brand-500" />
                  <span className="truncate max-w-[140px]">Office of DSW</span>
                </span>
              ) : clubSlugOrId ? (
                <Link to={`/club/${clubSlugOrId}`} className="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  <i className="ri-team-line text-brand-500" />
                  <span className="truncate max-w-[140px]">{displayName}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-team-line text-brand-500" />
                  <span className="truncate max-w-[140px]">{displayName}</span>
                </span>
              )}
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-user-line text-brand-500" />
                {registeredCount} Registered
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5" title="Total event views">
                <i className="ri-eye-line text-brand-500" />
                {views || 0} Views
              </span>
            </div>

            {/* Winners Section if applicable */}
            {showWinners && (
              <div id="winners-section" className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center text-brand-500 text-lg">
                    <i className="ri-trophy-fill" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Event Results</p>
                    <p className="text-[15px] font-black text-black dark:text-white">
                      {event.registrationType === 'team' ? 'Winning Teams' : 'Winners'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[...winners].sort((a, b) => a.rank - b.rank).map((winner, i) => {
                    const medal = medalConfig[winner.rank];
                    const memberList = winner.members || winner.teamMembers || winner.students || [];
                    const isTeamWinner = event.registrationType === 'team' || (memberList && memberList.length > 0);

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl transition-all shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        <div
                          className={`w-9 h-9 shrink-0 rounded-lg ${
                            medal ? medal.badgeBg : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          } flex items-center justify-center font-black text-sm`}
                        >
                          <span>#{winner.rank}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-black dark:text-white truncate">
                              {winner.name}
                            </p>
                            {isTeamWinner && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 px-2 py-0.5 rounded-full">
                                <i className="ri-team-line text-[10px]" /> Team
                              </span>
                            )}
                          </div>

                          {memberList && memberList.length > 0 && (() => {
                            const namesArr = Array.isArray(memberList)
                              ? memberList.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean)
                              : [typeof memberList === 'string' ? memberList : memberList?.name].filter(Boolean);
                            const uniqueNames = Array.from(new Set(namesArr));
                            if (uniqueNames.length === 0) return null;
                            return (
                              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-500 mt-0.5 truncate">
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Members:</span>{' '}
                                {uniqueNames.join(', ')}
                              </p>
                            );
                          })()}
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md shrink-0">
                          {medal ? `${medal.label} Place` : `#${winner.rank}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About this Event */}
            {description && (
              <div className="mb-8">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-3">
                  About this Event
                </h2>
                <div
                  className="text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed event-description campusnode-markdown-preview px-0"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(description) }}
                />
              </div>
            )}

            {/* Event Highlights Grid */}
            <div className="mb-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-4">
                Event Highlights
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center shrink-0">
                      <i className={`${h.icon} text-brand-600 dark:text-brand-400 text-base`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-0.5">{h.label}</p>
                      <p className="text-[13px] font-semibold text-black dark:text-white leading-snug">{h.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery */}
            {event.media && event.media.filter(m => m.type !== 'SPONSOR_LOGO').length > 0 && (
              <div className="mb-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-4">
                  Gallery
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {event.media.filter(m => m.type !== 'SPONSOR_LOGO').map((item, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 relative group">
                      {item.type === 'IMAGE' ? (
                        <div
                          className="w-full h-full cursor-zoom-in"
                          onClick={() => openImageModal(item.url, `${title} - Gallery Image ${i + 1}`, `Gallery ${i + 1}`)}
                        >
                          <img
                            src={item.url}
                            alt={`Gallery ${i}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                          />
                        </div>
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full flex flex-col items-center justify-center bg-black gap-1.5"
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="opacity-80">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <span className="text-[9px] text-white font-medium uppercase tracking-widest opacity-50">Watch</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs Accordion */}
            <div className="mb-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <FAQItem
                    key={i}
                    question={item.question}
                    answer={item.answer}
                    isOpen={openFAQ === i}
                    onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (35% Sticky Sidebar) */}
          <div className="w-full lg:w-[35%] lg:sticky lg:top-[80px] shrink-0">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">

              {/* Date & Time */}
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500 mb-3 flex items-center gap-1.5">
                  DATE &amp; TIME
                </p>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Starts</p>
                    <p className="text-[16px] font-bold text-black dark:text-white leading-snug">
                      {startTime ? new Date(startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'TBA'}
                    </p>
                    <p className="text-[14px] font-semibold text-brand-600">
                      {startTime ? new Date(startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : ''}
                    </p>
                  </div>
                  {endTime && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Ends</p>
                      <p className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
                        {new Date(endTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })} · {new Date(endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Progress */}
              {!isUnlimited && (
                <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">Availability</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">{fillPct}% Full</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    {Math.min(registeredCount, totalSeats)} / {totalSeats} seats filled
                  </p>
                </div>
              )}

              {/* Venue, Fee & Disabled Preview CTA */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500 mb-4 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <i className="ri-map-pin-2-line text-neutral-500 dark:text-neutral-500 text-sm shrink-0" />
                    <span className="truncate font-medium text-neutral-600 dark:text-neutral-400">{venue || 'Venue TBA'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <i className="ri-ticket-2-line text-neutral-500 dark:text-neutral-500 text-sm" />
                    <span className={`font-black text-sm ${effectiveFee > 0 ? 'text-black dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {effectiveFee > 0 ? `₹${effectiveFee}` : 'Free'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3 px-4 text-[12px] font-bold mysans tracking-wide rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed text-center select-none flex items-center justify-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    Preview Mode — Registrations Disabled
                  </button>

                  <CalendarDropdown
                    event={event}
                    btnClassName="w-11 h-11 flex items-center justify-center border border-neutral-200/80 dark:border-neutral-800 rounded-full bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shrink-0"
                  />
                </div>

                {registrationDeadline && (
                  <p className="text-[11px] font-medium text-neutral-500 mt-3 text-center">
                    Registration deadline: {new Date(registrationDeadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  </p>
                )}
              </div>

              {/* Organized by Section */}
              {isCentralEvent ? (
                <div className="px-1 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="px-3 flex items-center gap-3 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-900/50">
                      <i className="ri-building-2-line text-brand-600 dark:text-brand-400 text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Organized by</p>
                      <p className="text-[14px] font-black text-black dark:text-white truncate">Office of DSW</p>
                      <p className="text-[11px] font-medium text-brand-600 dark:text-brand-400">Dean Student Welfare</p>
                    </div>
                  </div>

                  {event.participatingClubs?.length > 0 && (
                    <div className="px-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
                        Participating Clubs
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {event.participatingClubs.map((pc) => (
                          <span
                            key={pc.id || pc._id}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg"
                          >
                            {pc.club?.clubName || pc.clubName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-1 pb-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="px-3 flex items-center gap-3 pb-4">
                    {clubSlugOrId ? (
                      <Link
                        to={`/club/${clubSlugOrId}`}
                        className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center shrink-0 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors overflow-hidden"
                      >
                        {event.club?.clubLogo ? (
                          <img src={event.club.clubLogo} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <i className="ri-team-line text-brand-600 dark:text-brand-400 text-sm" />
                        )}
                      </Link>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center shrink-0">
                        <i className="ri-team-line text-brand-600 dark:text-brand-400 text-sm" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Organized by</p>
                      {clubSlugOrId ? (
                        <Link
                          to={`/club/${clubSlugOrId}`}
                          className="text-[13px] font-bold text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 truncate block hover:underline"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <p className="text-[13px] font-bold text-black dark:text-white truncate">{displayName}</p>
                      )}
                    </div>
                  </div>

                  {event?.club?.socialLinks && event.club.socialLinks.length > 0 && (
                    <div className="px-6 pb-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2.5">
                        Connect with {displayName}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.club.socialLinks.map((link, i) => {
                          const platform = link.platform?.toLowerCase() || "website";
                          const iconProps = { className: "w-6 h-6" };

                          const getIcon = () => {
                            if (platform.includes("instagram")) return <InstagramIcon {...iconProps} size={28} />;
                            if (platform.includes("linkedin")) return <LinkedinIcon {...iconProps} size={28} />;
                            if (platform.includes("twitter") || platform.includes("x")) return <TwitterIcon {...iconProps} size={28} />;
                            if (platform.includes("github")) return <GithubIcon {...iconProps} size={28} />;
                            if (platform.includes("whatsapp")) return <MessageCircleIcon {...iconProps} size={28} />;
                            if (platform.includes("website")) return <EarthIcon {...iconProps} size={28} />;
                            return <i className="ri-links-line text-sm" />;
                          };

                          const href = platform === "whatsapp"
                            ? `https://wa.me/${link.url.replace(/\s+/g, "")}`
                            : link.url;

                          return (
                            <a
                              key={link._id || link.id || i}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                              title={link.platform}
                            >
                              {getIcon()}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sponsors / Partners */}
            {event.sponsors && event.sponsors.length > 0 && (
              <div className="mt-6 mb-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-4">
                  Sponsors / Partners
                </h3>
                <div className="flex flex-wrap gap-5 items-center">
                  {event.sponsors.map((sponsor, i) => (
                    <a
                      key={i}
                      href={sponsor.websiteUrl || '#'}
                      target={sponsor.websiteUrl ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center gap-1.5 transition-opacity justify-center ${
                        sponsor.websiteUrl ? 'cursor-pointer hover:opacity-100 opacity-80' : 'cursor-default opacity-80'
                      }`}
                    >
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        className="h-7 w-auto object-contain bg-white dark:bg-black rounded-sm"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/28?text=' + sponsor.name[0]; }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Image Zoom Modal for posters and gallery */}
      <ImageZoomModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        src={activeModalImage.src}
        alt={activeModalImage.alt}
        title={activeModalImage.title}
      />
    </div>
  );
};

export default EventPreview;
