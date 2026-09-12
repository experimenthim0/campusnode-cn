import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { searchUsers, updateProfile } from '../services/userService';
import { getUserEvents, registerForEvent } from '../services/eventService';
import DOMPurify from 'dompurify';
import { markdownToHtml } from '../utils/htmlMarkdownConverter';
import '../components/WysiwygMarkdownEditor.css';
import { useNotification } from '../context/NotificationContext';
import CalendarDropdown from '../components/CalendarDropdown';
import PaymentModal from '../components/PaymentModal';
import { getPublicJson } from '../lib/publicDataCache';
import { cachedFetch, getEventTTL, invalidateCache } from '../lib/cacheManager';
import { prefetchClubDetail } from '../lib/prefetchManager';
import { InstagramIcon } from "@/components/ui/instagram";
import { LinkedinIcon } from "@/components/ui/linkedin";
import { TwitterIcon } from "@/components/ui/twitter";
import { GithubIcon } from "@/components/ui/github";
import { MessageCircleIcon } from "@/components/ui/message-circle";
import { EarthIcon } from "@/components/ui/earth";
import { hasPermission, PERMISSIONS } from '../utils/rbac';
import ShimmerText from '../components/ShimmerText';
import ImageZoomModal from '../components/ImageZoomModal';
import { formatAcademicYear } from '../utils/academicProgress';
import { PROGRAM_OPTIONS, PROGRAM_LABELS } from '../constants/academicConstants';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop";

const CATEGORY_EMOJI={}


const getCategoryEmoji = (category) => {
  if (!category) return '🎉';
  return CATEGORY_EMOJI[category.toLowerCase()] || '🎉';
};

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
            ? 'rotate-180 bg-cn-blue-500/10 text-cn-blue-600 dark:text-cn-blue-400'
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


const EventDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user, role, setSession } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [missingFieldsModalOpen, setMissingFieldsModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [modalInputs, setModalInputs] = useState({});
  const [customFormModalOpen, setCustomFormModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [customFormResponses, setCustomFormResponses] = useState({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationPaymentStatus, setRegistrationPaymentStatus] = useState(null);
  const [postRegMessage, setPostRegMessage] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(null);

  // Team Registration States
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamChoiceModalOpen, setTeamChoiceModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teammates, setTeammates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Flexible Payment System States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // 'MANUAL_TRANSACTION' | 'COLLEGE_PAYMENT'
  const [paymentPayload, setPaymentPayload] = useState({});

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
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(searchQuery);
        const currentUser = user;
        const filtered = res.data.filter(s => s.id !== currentUser?.id && !teammates.some(t => t.id === s.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, teammates]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const url = `/api/events/${slug}`;
        
        // Initial fetch with default 10min TTL or cached data
        let eventData = await getPublicJson(url);
        
        // Adjust cache TTL dynamically based on event status (LIVE: 30s, UPCOMING: 10m, ENDED: 24h)
        const eventStatusTTL = getEventTTL(eventData?.status);
        if (eventStatusTTL) {
          // Trigger a status-adjusted cachedFetch in case status changed
          eventData = await cachedFetch(url, { ttlMs: eventStatusTTL, eventStatus: eventData?.status });
        }
        
        setEvent(eventData);

        // Idle prefetch associated club details if present
        if (eventData?.club?.slug || eventData?.club?.id) {
          prefetchClubDetail(eventData.club.slug || eventData.club.id);
        }

        if (user && (role === 'member' || role === 'student')) {
          try {
            const regRes = await getUserEvents(user.id || user._id);
            const eventId = eventData.id || eventData._id;
            const isAlreadyReg = regRes.data.some(r => r.eventId && (r.eventId.id === eventId || r.eventId._id === eventId));
            if (isAlreadyReg) {
              setAlreadyRegistered(true);
            }
          } catch (regErr) {
            console.error('Failed to check user registration status:', regErr);
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event');
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    if (event) {
      const cleanTitle = event.title?.trim() || "Event Details";
      const formattedTitle = /campusnode/i.test(cleanTitle) ? cleanTitle : `${cleanTitle} | CampusNode`;
      document.title = formattedTitle;

      const setMetaTag = (selector, propertyAttr, propertyVal, content) => {
        let element = document.querySelector(selector);
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(propertyAttr, propertyVal);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };

      const cleanDesc =
        (event.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ||
        `Join ${cleanTitle} on CampusNode. View schedule, details, and register online.`;

      const socialImage = event.imageUrl || `${window.location.origin}/campusnode-og-fallback.png`;

      setMetaTag("meta[property='og:title']", 'property', 'og:title', formattedTitle);
      setMetaTag("meta[property='og:description']", 'property', 'og:description', cleanDesc);
      setMetaTag("meta[property='og:image']", 'property', 'og:image', socialImage);
      setMetaTag("meta[property='og:url']", 'property', 'og:url', window.location.href);
      setMetaTag("meta[property='og:type']", 'property', 'og:type', "website");
      setMetaTag("meta[name='twitter:card']", 'name', 'twitter:card', "summary_large_image");
      setMetaTag("meta[name='twitter:title']", 'name', 'twitter:title', formattedTitle);
      setMetaTag("meta[name='twitter:description']", 'name', 'twitter:description', cleanDesc);
      setMetaTag("meta[name='twitter:image']", 'name', 'twitter:image', socialImage);
    }
  }, [event]);

  const submitRegistrationWithPayment = async (txId, pName, remarks) => {
    setIsRegistering(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (paymentPayload.isTeam) {
        const res = await api.post('/api/teams', {
          eventId: event.id || event._id,
          teamName: paymentPayload.teamName,
          members: paymentPayload.members,
          formResponses: paymentPayload.formResponses,
          transactionId: txId,
          payerName: pName,
          paymentRemarks: remarks
        });
        
        if (res.data.status === 'WAITLISTED') {
          showNotification('Your team has been added to the waitlist.', 'info');
        } else {
          showNotification(`Successfully registered team ${paymentPayload.teamName}!`, 'success');
        }
        setPaymentModalOpen(false);
        setRegistrationPaymentStatus(res.data.paymentStatus || 'PENDING');
        setPostRegMessage(res.data.postRegistrationMessage || event.postRegistrationMessage || null);
        setShowSuccessModal(true);
      } else {
        // Individual registration
        const registerBody = {
          studentId: paymentPayload.studentId || null,
          formResponses: paymentPayload.formResponses || {},
          transactionId: txId,
          payerName: pName,
          paymentRemarks: remarks
        };
        
        const res = await registerForEvent(event.id || event._id, registerBody);
        await invalidateCache([
          '/api/events',
          `/api/events/${event.id || event._id}`,
          ...(user ? [`/api/events/user/${user.id || user._id}`] : []),
        ]);
        setAlreadyRegistered(true);
        
        if (res.data.status === 'WAITLISTED') {
          showNotification('You have been added to the waitlist.', 'info');
        } else if (res.data.status === 'REGISTERED') {
          setRegistrationId(res.data.qrCode);
          setRegistrationPaymentStatus(res.data.paymentStatus || 'SUCCESS');
          setPostRegMessage(res.data.postRegistrationMessage || event.postRegistrationMessage || null);
          setShowSuccessModal(true);
          showNotification('Successfully registered!', 'success');
        } else {
          showNotification(res.data.message || 'Successfully registered!', 'success');
        }
        setPaymentModalOpen(false);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSelectRegisterAsTeam = () => {
    setTeamChoiceModalOpen(false);
    setTeamName('');
    setTeammates([]);
    setSearchQuery('');
    setSearchResults([]);
    setCustomFormResponses({});
    setTeamModalOpen(true);
  };

  const processDirectRegistration = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setIsRegistering(true);
    setConfirmModalOpen(false);

    try {
      const registerBody = {
        studentId: user?.id || user?._id,
      };

      const res = await registerForEvent(event.id || event._id, registerBody);
      await invalidateCache([
        '/api/events',
        `/api/events/${event.id || event._id}`,
        ...(user ? [`/api/events/user/${user.id || user._id}`] : []),
      ]);
      setAlreadyRegistered(true);

      if (res.data.status === 'WAITLISTED') {
        showNotification('You have been added to the waitlist.', 'info');
      } else if (res.data.status === 'REGISTERED') {
        setRegistrationId(res.data.qrCode);
        setRegistrationPaymentStatus(res.data.paymentStatus || 'SUCCESS');
        setPostRegMessage(res.data.postRegistrationMessage || event.postRegistrationMessage || null);
        setShowSuccessModal(true);
        showNotification('Successfully registered!', 'success');
      } else {
        showNotification(res.data.message || 'Successfully registered!', 'success');
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.message === 'Already registered for this event.') {
        setAlreadyRegistered(true);
      } else {
        showNotification(err.response?.data?.message || 'Registration failed', 'error');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleIndividualRegister = async () => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Authenticated path (both internal students and external users)
    if (user) {
      if (event.customFields && event.customFields.length > 0) {
        setCustomFormResponses({});
        setCustomFormModalOpen(true);
        return;
      }
      if (event.paymentMethod && event.paymentMethod !== 'FREE') {
        setPaymentPayload({
          isTeam: false,
          studentId: user.id || user._id,
          formResponses: {}
        });
        setPaymentType(event.paymentMethod);
        setPaymentModalOpen(true);
        return;
      }
      setConfirmModalOpen(true);
      return;
    }

    // Unauthenticated path
    showNotification('Please login first to register for events', 'warning');
    navigate('/login');
  };

  const handleRegister = async () => {
    if (isEnded || isLive || isDeadlinePassed) return;
    const user = JSON.parse(localStorage.getItem('user'));
    const role = localStorage.getItem('role');

    // Unauthenticated path
    if (!user) {
      handleIndividualRegister();
      return;
    }

    const isStudentOrExternal = role === 'member' || role === 'student' || role === 'external' || user?.role === 'external' || user?.isExternal || Boolean(user?.rollNo || user?.collegeName);

    if (!isStudentOrExternal) {
      showNotification('Please login as a student or participant to register.', 'warning');
      navigate('/login');
      return;
    }

    const isExternalUser = role === 'external' || user?.role === 'external' || user?.isExternal || user?.principalType === 'EXTERNAL';
    if (isExternalUser && event.allowExternal === false) {
      showNotification('This event is exclusive to internal NITJ students only. External participation is not allowed.', 'error');
      return;
    }

    if (event.requiredFields && event.requiredFields.length > 0) {
      const missing = event.requiredFields.filter(field => !user[field]);
      if (missing.length > 0) {
        setMissingFields(missing);
        setMissingFieldsModalOpen(true);
        return;
      }
    }

    if (event.registrationType === 'team') {
      handleSelectRegisterAsTeam();
      return;
    }

    if (event.registrationType === 'both') {
      setTeamChoiceModalOpen(true);
      return;
    }

    handleIndividualRegister();
  };

  const handleTeamSubmit = async (e) => {
    if (e) e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    if (!teamName.trim()) {
      showNotification('Please enter a team name.', 'warning');
      return;
    }

    const teamSize = teammates.length + 1;
    const minSize = event.minTeamSize || 1;
    const maxSize = event.maxTeamSize || 1;

    if (teamSize < minSize || teamSize > maxSize) {
      showNotification(`Team size must be between ${minSize} and ${maxSize} members. Current: ${teamSize}`, 'warning');
      return;
    }

    // Validate required custom fields
    if (event.customFields && event.customFields.length > 0) {
      for (const field of event.customFields) {
        if (field.required && !customFormResponses[field.label]?.trim()) {
          showNotification(`Please fill out the required field: ${field.label}`, 'warning');
          return;
        }
      }
    }

    // Paid path for Team
    if (event.paymentMethod && event.paymentMethod !== 'FREE') {
      setPaymentPayload({
        isTeam: true,
        teamName,
        members: teammates.map(t => t.id),
        formResponses: customFormResponses || {}
      });
      setPaymentType(event.paymentMethod);
      setTeamModalOpen(false);
      setPaymentModalOpen(true);
      return;
    }

    // Free path for Team
    setIsRegistering(true);
    try {
      const res = await api.post('/api/teams', {
        eventId: event.id || event._id,
        teamName: teamName,
        members: teammates.map(t => t.id),
        formResponses: customFormResponses || {},
      });
      if (res.data.status === 'WAITLISTED') {
        showNotification('Your team has been added to the waitlist.', 'info');
      } else {
        showNotification(`Successfully registered team ${teamName}!`, 'success');
      }
      setTeamModalOpen(false);
      setRegistrationPaymentStatus('SUCCESS');
      setPostRegMessage(res.data.postRegistrationMessage || event.postRegistrationMessage || null);
      setShowSuccessModal(true);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Team registration failed', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSaveAndRegister = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = localStorage.getItem('role');
    setIsRegistering(true);
    try {
      const res = await updateProfile(role, user.id || user._id, modalInputs);
      const updatedUser = res.data.user;
      setSession(updatedUser, role);
      setMissingFieldsModalOpen(false);
      showNotification('Profile updated successfully!', 'success');
      if (event.customFields && event.customFields.length > 0) { setCustomFormResponses({}); setCustomFormModalOpen(true); return; }
      if (event.paymentMethod && event.paymentMethod !== 'FREE') {
        setPaymentPayload({
          isTeam: false,
          studentId: updatedUser.id || updatedUser._id || user.id || user._id,
          formResponses: {}
        });
        setPaymentType(event.paymentMethod);
        setPaymentModalOpen(true);
        return;
      }
      setConfirmModalOpen(true);
    } catch (err) { showNotification(err.response?.data?.message || 'Failed to update profile', 'error'); }
    finally { setIsRegistering(false); }
  };

  const handleCustomFormSubmit = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setIsRegistering(true);
    if (event.customFields) {
      for (const field of event.customFields) {
        if (field.required && !customFormResponses[field.label]) {
          showNotification(`"${field.label}" is required.`, 'error');
          setIsRegistering(false);
          return;
        }
      }
    }
    if (event.paymentMethod && event.paymentMethod !== 'FREE') {
      setPaymentPayload({
        isTeam: false,
        studentId: user?.id || user?._id,
        formResponses: customFormResponses
      });
      setPaymentType(event.paymentMethod);
      setCustomFormModalOpen(false);
      setPaymentModalOpen(true);
      setIsRegistering(false);
      return;
    }
    try {
      const res = await registerForEvent(event.id || event._id, { studentId: user.id || user._id, formResponses: customFormResponses });
      await invalidateCache([
        '/api/events',
        `/api/events/${event.id || event._id}`,
        `/api/events/user/${user.id || user._id}`,
      ]);
      setAlreadyRegistered(true);
      showNotification(res.data.message, 'success');
      setCustomFormModalOpen(false);
      setTimeout(() => navigate('/my-events'), 1500);
    } catch (err) { showNotification(err.response?.data?.message || 'Registration failed', 'error'); }
    finally { setIsRegistering(false); }
  };

  const getShareText = () => {
    if (!event) return '';
    const organizer = (event.organizerType === 'CENTRAL' || event.centralOrganizerId)
      ? 'Office of DSW'
      : (event.club?.clubName || event.createdBy?.clubName || '');
    return organizer ? `${event.title} by ${organizer}` : event.title;
  };

  const handleShare = () => {
    const message = getShareText();
    if (navigator.share) {
      navigator.share({ title: message, text: message, url: window.location.href }).catch((error) => console.error('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(`${message} - ${window.location.href}`).then(() => showNotification('Event details copied to clipboard', 'success')).catch((error) => console.error('Clipboard error:', error));
    }
  };

  const handleWhatsAppShare = () => {
    const message = `${getShareText()} - ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleXShare = () => {
    const text = getShareText();
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showNotification('Link copied to clipboard!', 'success'))
      .catch(() => showNotification('Failed to copy link', 'error'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <ShimmerText text="Loading event..." className="text-sm font-bold uppercase tracking-[0.2em]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
        <div className="border-2 border-black dark:border-neutral-700 rounded-sm p-10 text-center max-w-sm bg-white dark:bg-neutral-900">
          <div className="w-14 h-14 bg-brand-600 rounded-sm flex items-center justify-center text-white text-2xl mx-auto mb-5">
            <i className="ri-error-warning-line" />
          </div>
          <h2 className="font-black text-xl text-black dark:text-white mb-2">Oops!</h2>
          <p className="text-neutral-500 text-[14px] mb-6">{error || 'Event not found'}</p>
          <button onClick={() => navigate('/events')} className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-widest rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg border border-black dark:border-white">
            <i className="ri-arrow-left-line" /> Back to Events
          </button>
        </div>
      </div>
    );
  }

  const { title, description, venue, startTime, endTime, totalSeats, registeredCount, views, status, registrationDeadline, entryFee } = event;
  const isUnlimited = !totalSeats || totalSeats === 0;
  const isFull = !isUnlimited && registeredCount >= totalSeats;
  const isLive = status === 'LIVE';
  const isEnded = status === 'ENDED';
  const deadline = registrationDeadline || startTime;
  const isDeadlinePassed = new Date() > new Date(deadline);
  const fillPct = isUnlimited ? 0 : Math.min(100, Math.round((registeredCount / totalSeats) * 100));
  const winners = (event.winners || []).filter(w => w.name);
  const showWinners = isEnded && event.showWinner && winners.length > 0;
  const medalConfig = {
    1: { badgeBg: 'bg-tier-gold/80 text-black', icon: 'ri-trophy-fill', label: '1st' },
    2: { badgeBg: 'bg-tier-silver text-black dark:bg-neutral-700 dark:text-white', icon: 'ri-medal-fill', label: '2nd' },
    3: { badgeBg: 'bg-tier-bronze text-white', icon: 'ri-award-fill', label: '3rd' },
  };

  const isCentralEvent = event.organizerType === 'CENTRAL' || !!event.centralOrganizerId || (!event.club && !event.clubId && (!!event.centralOrganizer || !!event.participatingClubs));
  const clubCategory = isCentralEvent ? 'College-Wide' : (event.club?.category || null);
  const clubSlugOrId = isCentralEvent ? null : (event.club?.slug || event.club?._id || event.club?.id || event.createdBy?.slug || event.createdBy?._id || event.createdBy?.id);
  const displayName = isCentralEvent ? 'Office of DSW' : (event.club?.clubName || event.createdBy?.clubName || '—');

  const isOpenEvent = event.registrationType === 'none';
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentRole = localStorage.getItem('role');
  const isExternalUser = Boolean(
    currentRole === 'external' ||
    currentUser?.role === 'external' ||
    currentUser?.isExternal ||
    currentUser?.principalType === 'EXTERNAL'
  );
  const isExternalRestricted = isExternalUser && event.allowExternal === false;
  const allowWaitlist = event.allowWaitlist !== false;
  const waitlistCount = (event.waitingListIds || event.waitingList || []).length;
  const isWaitlistFull = isFull && allowWaitlist && waitlistCount >= 5;

  const btnConfig = isOpenEvent
    ? { label: 'Open Entry', cls: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 border-emerald-600 dark:border-emerald-500 cursor-default shadow-xs shadow-emerald-600/20', disabled: true }
    : isEnded
    ? { label: showWinners ? 'View Results' : 'Event Ended', cls: showWinners ? 'bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-700 backdrop-blur-md shadow-2xs hover:shadow-xs cursor-pointer' : 'bg-neutral-200/80 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 opacity-80 cursor-not-allowed', disabled: !showWinners }
    : isLive
    ? { label: 'Event is Live', cls: 'bg-brand-600 dark:bg-brand-500 text-white dark:text-neutral-950 border-brand-600 dark:border-brand-500 shadow-xs shadow-brand-600/20 cursor-not-allowed', disabled: true }
    : isDeadlinePassed
    ? { label: 'Deadline Passed', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700', disabled: true }
    : isExternalRestricted
    ? { label: 'NITJ Students Only', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700', disabled: true }
    : alreadyRegistered
    ? { label: 'Already Registered', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700', disabled: true }
    : isFull && !allowWaitlist
    ? { label: 'Event Full', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700 shadow-2xs', disabled: true }
    : isWaitlistFull
    ? { label: 'Waitlist Full', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700 shadow-2xs', disabled: true }
    : isFull
    ? { label: `Join Waitlist (${5 - waitlistCount} left)`, cls: 'bg-amber-500 hover:bg-amber-600 text-white dark:text-neutral-950 border-amber-500 shadow-xs shadow-amber-500/20 hover:shadow-sm cursor-pointer', disabled: false }
    : { label: entryFee > 0 ? `Pay ₹${entryFee} & Register` : 'Register Now', cls: 'bg-brand-600 hover:bg-brand-700 text-white border-brand-600 shadow-sm shadow-brand-600/25 hover:shadow-md cursor-pointer', disabled: false };

  const isUpcoming = !isEnded && !isLive && !isDeadlinePassed && !isExternalRestricted;
  const showMobileCTA = isUpcoming && !alreadyRegistered && !isOpenEvent;

  const isAllPrograms = !event.allowedPrograms || 
    !Array.isArray(event.allowedPrograms) ||
    event.allowedPrograms.length === 0 || 
    event.allowedPrograms.length >= PROGRAM_OPTIONS.length || 
    (PROGRAM_OPTIONS.length > 0 && PROGRAM_OPTIONS.every(p => event.allowedPrograms.includes(p)));

  const programDisplay = isAllPrograms
    ? 'All'
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
    { icon: 'ri-coin-line', label: 'Entry Fee', value: entryFee > 0 ? `₹${entryFee}` : 'Free Entry' },
    {
      icon: event.registrationType === 'team' || event.registrationType === 'both' ? 'ri-team-line' : 'ri-user-line',
      label: 'Registration',
      value: getRegistrationTypeDisplay(),
    },
    { icon: 'ri-time-line', label: 'Duration', value: (() => {
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
          <strong className="font-bold text-black dark:text-white">
            {new Date(startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })} at {new Date(startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
          </strong>{' '}
          and ends on{' '}
          <strong className="font-bold text-black dark:text-white">
            {new Date(endTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })} at {new Date(endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
          </strong>
          . It will be held at{' '}
          <strong className="font-bold text-black dark:text-white">
            {venue}
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
              <strong className="font-bold text-black dark:text-white">
                {new Date(registrationDeadline).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })} at {new Date(registrationDeadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
              </strong>.{' '}
            </>
          ) : (
            <>There is no separate registration deadline — registrations remain open until the event starts. </>
          )}
          {(event.registrationFee > 0 || entryFee > 0) ? (
            <>
              The entry fee is{' '}
              <strong className="font-bold text-black dark:text-white">
                ₹{event.registrationFee || entryFee}
              </strong>{' '}
              (non-refundable), payable securely via the event's designated payment method.{' '}
            </>
          ) : (
            <>
              This event is{' '}
              <strong className="font-bold text-black dark:text-white">
                Completely Free
              </strong>{' '}
              to attend!{' '}
            </>
          )}
          {user ? (
            event.customFields && event.customFields.length > 0 ? (
              'Click the "Get Tickets" button to complete the required custom fields and submit your registration.'
            ) : (
              'Simply click the "Get Tickets" button to register instantly.'
            )
          ) : (
            'Please log in with your student account first to submit your registration.'
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
              <strong className="font-bold text-black dark:text-white">
                Unlimited Seats
              </strong>.{' '}
            </>
          ) : isFull ? (
            !allowWaitlist ? (
              <>
                All{' '}
                <strong className="font-bold text-black dark:text-white">
                  {totalSeats} seats
                </strong>{' '}
                are filled. Registration is currently closed.{' '}
              </>
            ) : isWaitlistFull ? (
              <>
                All{' '}
                <strong className="font-bold text-black dark:text-white">
                  {totalSeats} seats
                </strong>{' '}
                and all 5 waitlist spots are filled. Registration is currently closed.{' '}
              </>
            ) : (
              <>
                All{' '}
                <strong className="font-bold text-black dark:text-white">
                  {totalSeats} seats
                </strong>{' '}
                are filled. However, you can register to join the waitlist ({5 - waitlistCount} spots left).{' '}
              </>
            )
          ) : (
            <>
              There are{' '}
              <strong className="font-bold text-black dark:text-white">
                {Math.max(0, totalSeats - registeredCount)} spots remaining
              </strong>{' '}
              out of {totalSeats} total seats.{' '}
            </>
          )}
          {!isAllPrograms && event.allowedPrograms && event.allowedPrograms.length > 0 ? (
            <>
              Eligibility is open to programs:{' '}
              <strong className="font-bold text-black dark:text-white">
                {programDisplay}
              </strong>.{' '}
            </>
          ) : (
            <>All academic programs are welcome to register.{' '}</>
          )}
          {event.allowedBranches && event.allowedBranches.length > 0 && (
            <>
              Allowed branches:{' '}
              <strong className="font-bold text-black dark:text-white">
                {event.allowedBranches.join(', ')}
              </strong>.{' '}
            </>
          )}
          {event.allowedYears && event.allowedYears.length > 0 && (
            <>
              Eligible batches:{' '}
              <strong className="font-bold text-black dark:text-white">
                Year {event.allowedYears.map(y => isNaN(parseInt(y, 10)) ? y : formatAcademicYear(y)).join(', ')}
              </strong>.{' '}
            </>
          )}
          {event.provideCertificate ? (
            <>
              <strong className="font-bold text-black dark:text-white">
                Digital certificates
              </strong>{' '}
              will be issued to participants after the event closes.
            </>
          ) : (
            <>No certificates will be provided for this event.</>
          )}
        </span>
      ),
    },
    {
      question: 'Who is organizing this event and can I cancel my ticket?',
      answer: (
        <span>
          {isCentralEvent ? (
            <>
              This event is organized centrally by the{' '}
              <strong className="font-bold text-black dark:text-white">
                Office of DSW (Dean Student Welfare)
              </strong>.
            </>
          ) : (
            <>
              This event is organized by{' '}
              <strong className="font-bold text-black dark:text-white">
                {displayName}
              </strong>.
              {clubSlugOrId ? ' You can click the organizer name in the sidebar to visit their club page.' : ''}{' '}
            </>
          )}
          {!isOpenEvent ? ' If you need to cancel your registration, you can do so in the "My Events" section on CampusNode before the event begins.' : ''}
        </span>
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 myfont text-neutral-900 dark:text-neutral-100">

      <div className="sticky top-0 z-30 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-neutral-900/70 hover:bg-white dark:hover:bg-neutral-800 text-[11px] font-bold mysans uppercase tracking-[0.15em] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
          >
            <i className="ri-arrow-left-line text-base" /> Back
          </button>
          <span className="text-[15px] font-bold text-neutral-600 dark:text-neutral-400 tracking-wide truncate max-w-[200px] hidden sm:block">Event Details</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-8">
        {/* Rejection Feedback Banner */}
        {event.reviewStatus === 'REJECTED' && (
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
        {event.reviewStatus === 'PENDING' && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <i className="ri-time-line text-amber-600 dark:text-amber-400 text-xl" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              This event proposal is currently <span className="underline">PENDING REVIEW</span> by the faculty coordinator and is not yet public.
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          <div className="w-full lg:w-[65%] min-w-0">

          

            <div 
              onClick={() => openImageModal(event.imageUrl || DEFAULT_IMAGE, event.title, event.title)}
              className="mb-6 rounded-2xl overflow-hidden border-1 border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 relative group cursor-zoom-in transition-all"
              title="Click to view and zoom poster"
            >
              <img
                src={event.imageUrl || DEFAULT_IMAGE}
                alt={title}
                className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                style={{ maxHeight: '560px' }}
                onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
              />

              {/* Share button on top right */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="inline-flex items-center justify-center bg-black/60 hover:bg-black/80 dark:bg-neutral-900/70 dark:hover:bg-neutral-800/80 backdrop-blur-md text-white text-[11px] font-bold w-9 h-9 rounded-full border border-white/25 dark:border-white/15 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 touch-manipulation transition-all duration-200 cursor-pointer"
                  title="Share Event"
                  aria-label="Share Event"
                >
                  <i className="ri-share-forward-line text-sm" />
                </button>
              </div>

              {/* Status badge overlay */}
              <div className="absolute top-2 left-2">
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
            </div>
  <h1 className="font-black text-2xl md:text-3xl text-black dark:text-white leading-tight tracking-tight mb-4">
              {title}
            </h1>
            {/* <div className="flex items-center gap-2 flex-wrap mb-3">
              {isCentralEvent ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/40 border border-cn-blue-200 dark:border-cn-blue-800/50 text-[10px] font-bold uppercase tracking-wider text-cn-blue-700 dark:text-cn-blue-400">
                    <i className="ri-sparkling-line" /> College-Wide Event
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    <i className="ri-building-2-line text-cn-blue-600 dark:text-cn-blue-400" /> Office of DSW
                  </span>
                </>
              ) : (
                clubCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/40 border border-cn-blue-200 dark:border-cn-blue-800/50 text-[10px] font-light uppercase tracking-wider text-cn-blue-700 dark:text-cn-blue-400">
                    {clubCategory}
                  </span>
                )
              )}
              {entryFee === 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-[10px] font-light uppercase tracking-wider text-green-700 dark:text-green-400">
                   Free
                </span>
              )}
              {event.provideCertificate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-[10px] font-light uppercase tracking-wider text-blue-700 dark:text-blue-400">
                   Certificate
                </span>
              )}
            </div> */}

     
          

            <div className="flex items-center gap-4 flex-wrap text-[13px] text-neutral-500 dark:text-neutral-500 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-event-line text-brand-500" />
                {new Date(startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-map-pin-2-line text-brand-500" />
                <span className="truncate max-w-[160px]">{venue}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              {isCentralEvent ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-building-2-line text-brand-500" />
                  <span className="truncate max-w-[140px]">Office of DSW</span>
                </span>
              ) : clubSlugOrId ? (
                <Link to={`/club/${clubSlugOrId}`} className="inline-flex items-center gap-1.5 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors">
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

{/* /////// Winners Section //////*/}

{showWinners && (
              <div id="winners-section" className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-white border border-black/10 rounded-lg flex items-center justify-center text-brand-500 text-lg">
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
                        {/* Medal Rank Badge */}
                        <div
                          className={`w-9 h-9 shrink-0 rounded-lg ${
                            medal ? medal.badgeBg : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          } flex items-center justify-center font-black text-sm`}
                        >
                        
                            <span>#{winner.rank}</span>
                         
                        </div>

                        {/* Winner / Team Name & Members */}
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

                        {/* Rank Label */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md shrink-0">
                          {medal ? `${medal.label} Place` : `#${winner.rank}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )} 


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

            <div className="mb-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-4">
                Event Highlights
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-cn-blue-300 dark:hover:border-cn-blue-700 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cn-blue-50 dark:bg-cn-blue-950/50 flex items-center justify-center shrink-0">
                      <i className={`${h.icon} text-cn-blue-600 dark:text-cn-blue-400 text-base`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-0.5">{h.label}</p>
                      <p className="text-[13px] font-semibold text-black dark:text-white leading-snug">{h.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

           

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

          <div className="w-full lg:w-[30%] lg:sticky lg:top-[80px] shrink-0">
            <div className="bg-white dark:bg-neutral-900 border-1 border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">

              <div className="px-6 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500 mb-3 flex items-center gap-1.5">
                  DATE & TIME
                </p>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Starts</p>
                    <p className="text-[16px] font-bold text-black dark:text-white leading-snug">
                      {new Date(startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                    <p className="text-[14px] font-semibold text-brand-600">
                      {new Date(startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  {/* <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800" /> */}
                  {/* <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Ends</p>
                    <p className="text-[14px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {new Date(endTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                      {' · '}
                      {new Date(endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div> */}
                </div>
              </div>

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
                  {isFull && (
                    !allowWaitlist ? (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">All seats are filled. Registration closed.</p>
                    ) : isWaitlistFull ? (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">All seats and waitlist spots are filled (5/5). Registration closed.</p>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">All regular seats filled — join the waitlist ({5 - waitlistCount} spots left).</p>
                    )
                  )}
                </div>
              )}

              {alreadyRegistered && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-cn-teal-50 dark:bg-cn-teal-950/30 border border-cn-teal-200 dark:border-cn-teal-800/50 rounded-full">
                  <i className="ri-checkbox-circle-line text-cn-teal-600 dark:text-cn-teal-400 text-lg shrink-0" />
                  <p className="text-[13px] font-semibold text-cn-teal-700 dark:text-cn-teal-400">You are already registered for this event.</p>
                </div>
              )}

              {registrationId && (
                <div className="mx-6 mt-4 flex flex-col items-center gap-3.5 px-6 py-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-100/80 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600">
                    <i className="ri-checkbox-circle-fill text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Registration Successful!</p>
                    <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-500 mt-1">Check your dashboard for the ticket QR code</p>
                  </div>
                  
                  <div className="w-full bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850 p-4 rounded-xl text-center shadow-sm">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-1.5">Ticket ID / Ref Number</p>
                    <p className="text-base font-black text-neutral-900 dark:text-neutral-100 tracking-wider font-mono select-all">
                      {registrationId}
                    </p>
                  </div>

                  <Link 
                    to="/my-events" 
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cn-blue-600 hover:text-cn-blue-700 dark:text-cn-blue-400 dark:hover:text-cn-blue-300 hover:underline"
                  >
                    View My Tickets <i className="ri-arrow-right-s-line" />
                  </Link>
                </div>
              )}

              <div className="px-6 py-4">
                {/* Horizontal Metadata Anchor */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500 mb-4 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <i className="ri-map-pin-2-line text-neutral-500 dark:text-neutral-500 text-sm shrink-0" />
                    <span className="truncate font-medium text-gray-600 dark:text-neutral-400">{venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <i className="ri-ticket-2-line text-neutral-500 dark:text-neutral-500 text-sm" />
                    <span className={`font-black text-sm ${entryFee > 0 ? 'text-black dark:text-white' : 'text-green-600 dark:text-green-400'}`}>
                      {entryFee > 0 ? `₹${entryFee}` : 'Free'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={!btnConfig.disabled && !isRegistering
                      ? (isEnded
                        ? () => document.getElementById('winners-section')?.scrollIntoView({ behavior: 'smooth' })
                        : handleRegister)
                      : undefined}
                    disabled={btnConfig.disabled || isRegistering}
                    className={`flex-1 py-3 px-6 text-[13px] font-bold mysans tracking-wide border rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation flex items-center justify-center gap-2 ${btnConfig.cls} ${(btnConfig.disabled || isRegistering) ? 'opacity-50 cursor-not-allowed hover:translate-y-0 active:scale-100' : 'cursor-pointer'}`}
                  >
                    {isRegistering ? (
                      <><i className="ri-loader-4-line animate-spin text-base" /> Processing…</>
                    ) : btnConfig.label}
                  </button>

                  {status === 'UPCOMING' && (
                    <CalendarDropdown
                      event={event}
                      btnClassName="w-12 h-12 flex items-center justify-center border border-neutral-200/80 dark:border-neutral-800 rounded-full bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shrink-0"
                    />
                  )}
                </div>

                {registrationDeadline && !isEnded && (
                  <p className="text-[11px] font-medium text-neutral-550 dark:text-neutral-450 mt-3 text-center">
                    Registration closes: {new Date(registrationDeadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  </p>
                )}

              </div>

              {isCentralEvent ? (
                <div className="px-1 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="px-3 flex items-center gap-3 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-cn-blue-50 dark:bg-cn-blue-950/50 flex items-center justify-center shrink-0 border border-cn-blue-200 dark:border-cn-blue-900/50">
                      <i className="ri-building-2-line text-cn-blue-600 dark:text-cn-blue-400 text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">Organized by</p>
                      <p className="text-[14px] font-black text-black dark:text-white truncate">Office of DSW</p>
                      <p className="text-[11px] font-medium text-cn-blue-600 dark:text-cn-blue-400">Dean Student Welfare</p>
                    </div>
                  </div>

                  {event.participatingClubs?.length > 0 && (
                    <div className="px-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-2">
                        Participating Clubs
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {event.participatingClubs.map((pc) => (
                          <Link
                            key={pc.id}
                            to={`/club/${pc.club?.slug || pc.club?.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-cn-blue-50 dark:hover:bg-cn-blue-950/40 text-neutral-700 dark:text-neutral-300 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 rounded-lg transition-colors"
                          >
                            {pc.club?.clubName}
                          </Link>
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
                        className="w-9 h-9 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/50 flex items-center justify-center shrink-0 hover:bg-cn-blue-100 dark:hover:bg-cn-blue-900/50 transition-colors overflow-hidden"
                      >
                        {event.club?.clubLogo ? (
                          <img src={event.club.clubLogo} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <i className="ri-team-line text-cn-blue-600 dark:text-cn-blue-400 text-sm" />
                        )}
                      </Link>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/50 flex items-center justify-center shrink-0">
                        <i className="ri-team-line text-cn-blue-600 dark:text-cn-blue-400 text-sm" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">Organized by</p>
                      {clubSlugOrId ? (
                        <Link
                          to={`/club/${clubSlugOrId}`}
                          className="text-[13px] font-bold text-black dark:text-white hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors duration-200 truncate block hover:underline"
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-2.5">
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

            {event.sponsors && event.sponsors.length > 0 && (
              <div className="mt-6 mb-8 bg-white dark:bg-neutral-900 border-1 border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-4">
                  Sponsors/Partners
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
                        className="h-7 w-auto object-contain bg-white dark:bg-black"
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

      {showMobileCTA && (
        <div className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
          <button
            onClick={!btnConfig.disabled && !isRegistering ? handleRegister : undefined}
            disabled={btnConfig.disabled || isRegistering}
            className={`pointer-events-auto px-6 py-2.5 text-[13px] font-bold mysans tracking-wide border rounded-full shadow-lg dark:shadow-neutral-950/60 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation flex items-center justify-center gap-2 ${btnConfig.cls} ${(btnConfig.disabled || isRegistering) ? 'opacity-50 cursor-not-allowed hover:translate-y-0 active:scale-100' : 'cursor-pointer'}`}
          >
            {isRegistering ? (
              <><i className="ri-loader-4-line animate-spin text-sm" /> Processing…</>
            ) : (
              <>
                
                {btnConfig.label}
              </>
            )}
          </button>
        </div>
      )}
      {/* Spacer for mobile CTA */}
      {showMobileCTA && <div className="lg:hidden h-24 md:h-16" />}

      {missingFieldsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center shrink-0">
                  <i className="ri-information-line text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                    Complete Your Profile
                  </h3>
                  <p className="text-xs text-cn-text-muted font-normal mt-0.5">
                    Required to continue with registration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setMissingFieldsModalOpen(false); setModalInputs({}); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all duration-200 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-cn-text-secondary">
              <p className="text-xs text-cn-text-muted mb-5 leading-relaxed">
                This event requires the following profile information. Please provide them to continue:
              </p>
              <div className="space-y-4">
                {missingFields.map((field) => {
                  const fieldLabel = field.replace('Profile', '').replace('Url', '');
                  const placeholder = field === 'portfolioUrl' ? 'https://yourportfolio.com' : `https://${fieldLabel.toLowerCase()}.com/yourprofile`;
                  return (
                    <div key={field}>
                      <label className="block text-xs font-bold text-cn-text mb-1.5 capitalize">
                        {fieldLabel} <span className="text-brand-500">*</span>
                      </label>
                      <input type="url" placeholder={placeholder} value={modalInputs[field] || ''} onChange={(e) => setModalInputs({ ...modalInputs, [field]: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-cn-border-subtle bg-cn-surface flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => { setMissingFieldsModalOpen(false); setModalInputs({}); }} className="px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs">
                Cancel
              </button>
              <button onClick={handleSaveAndRegister} disabled={missingFields.some(field => !modalInputs[field]) || isRegistering} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 cursor-pointer shadow-xs shadow-brand-500/20 hover:shadow-sm">
                {isRegistering ? 'Processing...' : 'Save & Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {customFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center shrink-0">
                  <i className="ri-file-list-3-line text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                    Registration Form
                  </h3>
                  <p className="text-xs text-cn-text-muted font-normal mt-0.5">Fill in the details to complete your registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setCustomFormModalOpen(false); setCustomFormResponses({}); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all duration-200 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-cn-text-secondary">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-3">Your Profile (Auto-filled)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Name', value: JSON.parse(localStorage.getItem('user'))?.name },
                    { label: 'Roll No', value: JSON.parse(localStorage.getItem('user'))?.rollNo },
                    { label: 'Email', value: JSON.parse(localStorage.getItem('user'))?.email },
                    { label: 'Branch', value: JSON.parse(localStorage.getItem('user'))?.branch },
                    { label: 'Year', value: JSON.parse(localStorage.getItem('user'))?.year },
                    { label: 'Program', value: JSON.parse(localStorage.getItem('user'))?.program },
                  ].map((item, i) => (
                    <div key={i} className="bg-cn-surface-muted border border-cn-border rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted">{item.label}</p>
                      <p className="text-xs sm:text-[13px] font-semibold text-cn-text truncate">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-cn-border-subtle mb-6" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-3">Additional Information</p>
              <div className="space-y-4">
                {(event.customFields || []).map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      {field.label}{' '}{field.required && <span className="text-brand-500">*</span>}
                    </label>
                    {field.type === 'text' && (
                      <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted" />
                    )}
                    {field.type === 'url' && (
                      <input type="url" placeholder="https://..." value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted" />
                    )}
                    {field.type === 'textarea' && (
                      <textarea rows="3" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors resize-none bg-cn-surface text-cn-text placeholder-cn-text-muted" />
                    )}
                    {field.type === 'select' && (
                      <select value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text">
                        <option value="">Select an option</option>
                        {(field.options || []).map((opt, optIdx) => <option key={optIdx} value={opt}>{opt}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-cn-border-subtle bg-cn-surface flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => { setCustomFormModalOpen(false); setCustomFormResponses({}); }} className="px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 font-bold text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs">
                Cancel
              </button>
              <button onClick={handleCustomFormSubmit} disabled={isRegistering} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-black font-bold text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 shadow-md shadow-brand-500/20 hover:shadow-lg">
                {isRegistering ? 'Processing...' : (event.paymentMethod && event.paymentMethod !== 'FREE' ? 'Pay & Register' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center shrink-0">
                  <i className="ri-question-line text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                    Confirm Registration
                  </h3>
                  <p className="text-xs text-cn-text-muted font-normal mt-0.5">Please review the event details below.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all duration-200 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-cn-text-secondary">
              <p className="text-sm font-bold text-cn-text mb-3">
                Are you sure you want to register for this event?
              </p>
              <div className="bg-cn-surface-muted border border-cn-border rounded-xl p-4 mb-4 space-y-2">
                <p className="text-sm font-bold text-cn-text truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-cn-text-secondary">
                  <i className="ri-calendar-event-line text-brand-500" />
                  <span>{new Date(startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-cn-text-secondary">
                  <i className="ri-map-pin-2-line text-brand-500" />
                  <span className="truncate">{venue}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-cn-text-secondary">
                  <i className="ri-ticket-2-line text-brand-500" />
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{entryFee > 0 ? `₹${entryFee}` : 'Free Entry'}</span>
                </div>
              </div>
              {isFull && allowWaitlist && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  Note: All regular seats are filled. Confirming will place you on the waitlist ({5 - waitlistCount} spots left).
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-cn-border-subtle bg-cn-surface flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                onClick={processDirectRegistration}
                disabled={isRegistering}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 cursor-pointer shadow-xs shadow-brand-500/20 hover:shadow-sm"
              >
                {isRegistering ? 'Registering...' : 'Yes, Register'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (() => {
        const isPendingPayment = registrationPaymentStatus === 'PENDING';
        const isPaymentSuccess = !isPendingPayment;

        const renderWithLinks = (text) => {
          if (!text) return null;
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const parts = text.split(urlRegex);
          return parts.map((part, i) => {
            if (urlRegex.test(part)) {
              const isWhatsApp = part.includes('chat.whatsapp.com') || part.includes('wa.me');
              return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-500 font-semibold underline underline-offset-2 hover:opacity-80 break-all"
                >
                  {isWhatsApp && <i className="ri-whatsapp-line text-green-500" />}
                  {isWhatsApp ? 'Join WhatsApp Group' : 'Open Link'}
                  <i className="ri-external-link-line text-[10px]" />
                </a>
              );
            }
            return <span key={i}>{part}</span>;
          });
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4 py-6 overflow-y-auto ticket-backdrop-animate">
            <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-sm w-full relative overflow-hidden flex flex-col p-6 text-center shadow-2xl ticket-card-animate transition-colors">
              <div className="relative">
                <img src={isPendingPayment ? "/Success popup.svg" : "/Success popup.svg"} alt="Registration Successful" className="w-40 h-40 mx-auto animate-bounce-slow" />
              </div>
              
              <h3 className="text-lg font-bold text-cn-text mt-4">
                {isPendingPayment ? 'Registration Received!' : 'Registration Successful!'}
              </h3>

              {isPendingPayment ? (
                <>
                  <div className="my-4 p-4 bg-cn-surface-muted border border-cn-border rounded-xl text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="ri-time-line text-brand-500 text-base" />
                      <p className="text-xs font-bold text-cn-text">Payment Under Review</p>
                    </div>
                    <p className="text-xs text-cn-text-secondary leading-relaxed">
                      The club is verifying your payment details. Once verified, your ticket will appear in your <strong className="text-cn-text font-semibold">My Events</strong> section.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-cn-text-muted mt-2 leading-relaxed">
                    You are in! Your ticket has been confirmed. You can view your ticket in the My Events section.
                  </p>
                  
                  {registrationId && (
                    <div className="my-4 p-4 bg-cn-surface-muted border border-cn-border rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-1.5">Your Registration ID</p>
                      <p className="text-base font-bold text-cn-text tracking-wider font-mono select-all">
                        {registrationId}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Post-Registration Message from Club */}
              {postRegMessage && (
                <div className="my-3 p-4 bg-cn-surface-muted border border-cn-border rounded-xl text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-2 flex items-center gap-1.5">
                    <i className="ri-information-line text-brand-500 text-xs" />
                    Message from Club
                  </p>
                  <p className="text-xs text-cn-text-secondary leading-relaxed break-words whitespace-pre-wrap">
                    {renderWithLinks(postRegMessage)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowSuccessModal(false); navigate('/my-events'); }}
                  className="w-full bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-black font-bold py-3 px-6 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shadow-md shadow-brand-500/20 hover:shadow-lg border-0 outline-none text-xs cursor-pointer"
                >
                  Go to My Events
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 py-2.5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-800 bg-transparent outline-none cursor-pointer"
                >
                  Stay on this page
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {teamChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-sm w-full shadow-2xl p-6 transition-colors">
            <h3 className="font-bold text-cn-text text-base sm:text-lg mb-1.5">Registration Mode</h3>
            <p className="text-cn-text-muted text-xs mb-6">Choose how you want to participate in this event.</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setTeamChoiceModalOpen(false);
                  handleIndividualRegister();
                }}
                className="w-full px-5 py-3 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs hover:shadow-xs"
              >
                Register as Individual
              </button>
              <button
                type="button"
                onClick={handleSelectRegisterAsTeam}
                className="w-full px-5 py-3 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-xs shadow-brand-500/20 hover:shadow-sm"
              >
                Register as Team
              </button>
              <button
                type="button"
                onClick={() => setTeamChoiceModalOpen(false)}
                className="w-full px-4 py-2 text-xs font-medium mysans text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation border-0 bg-transparent outline-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center shrink-0">
                  <i className="ri-group-line text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                    Create Team
                  </h3>
                  <p className="text-xs text-cn-text-muted font-normal mt-0.5">Form a team to register for {event.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setTeamModalOpen(false); setCustomFormResponses({}); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all duration-200 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleTeamSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-cn-text-secondary">
              {/* Team Name */}
              <div>
                <label className="block text-xs font-bold text-cn-text mb-1.5">Team Name <span className="text-brand-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter a unique team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted"
                />
              </div>

              {/* Members/Teammates selection */}
              <div>
                <label className="block text-xs font-bold text-cn-text mb-1.5">
                  Add Teammates <span className="text-xs text-cn-text-muted font-normal">(Team size: {teammates.length + 1} / min {event.minTeamSize || 1}, max {event.maxTeamSize || 1})</span>
                </label>
                <div className="relative">
                  <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-cn-text-muted" />
                  <input
                    type="text"
                    placeholder="Search by Email or Roll Number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none bg-cn-surface text-cn-text placeholder-cn-text-muted transition-colors"
                  />
                  {searching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <i className="ri-loader-4-line animate-spin text-brand-500" />
                    </div>
                  )}
                </div>

                {/* Autocomplete dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 overflow-y-auto bg-cn-surface border border-cn-border rounded-xl shadow-lg w-[calc(100%-3rem)] max-w-md divide-y divide-cn-border-subtle">
                    {searchResults.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setTeammates([...teammates, s]);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="p-3 text-xs hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div className="text-left">
                          <p className="font-bold text-cn-text">{s.name}</p>
                          <p className="text-cn-text-muted font-mono mt-0.5">{s.rollNo} • {s.email}</p>
                        </div>
                        <span className="text-brand-500 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-lg">Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-cn-surface-muted p-4 border border-cn-border rounded-xl space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted text-left">Team Roster</p>
                <div className="divide-y divide-cn-border-subtle">
                  {/* Leader */}
                  <div className="py-2.5 flex justify-between items-center text-xs">
                    <div className="text-left">
                      <p className="font-bold text-cn-text">{JSON.parse(localStorage.getItem('user'))?.name} <span className="text-brand-500 font-bold">(You)</span></p>
                      <p className="text-cn-text-muted font-mono mt-0.5">{JSON.parse(localStorage.getItem('user'))?.rollNo}</p>
                    </div>
                    <span className="text-xs font-bold text-cn-text-muted uppercase tracking-wider">Leader</span>
                  </div>
                  {/* Members */}
                  {teammates.map((member) => (
                    <div key={member.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="text-left">
                        <p className="font-bold text-cn-text">{member.name}</p>
                        <p className="text-cn-text-muted font-mono mt-0.5">{member.rollNo}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTeammates(teammates.filter(t => t.id !== member.id))}
                        className="px-3 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/40 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation outline-none cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {teammates.length === 0 && (
                    <div className="py-3 text-center text-xs text-cn-text-muted font-medium">
                      No teammates added yet. Search above to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Additional custom fields if any */}
              {event.customFields && event.customFields.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-cn-border-subtle">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-1 text-left">Additional Information</p>
                  {(event.customFields || []).map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-xs font-bold text-cn-text mb-1.5 text-left">
                        {field.label}{' '}{field.required && <span className="text-brand-500">*</span>}
                      </label>
                      {field.type === 'text' && (
                        <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted" required={field.required} />
                      )}
                      {field.type === 'url' && (
                        <input type="url" placeholder="https://..." value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text placeholder-cn-text-muted" required={field.required} />
                      )}
                      {field.type === 'textarea' && (
                        <textarea rows="3" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors resize-none bg-cn-surface text-cn-text placeholder-cn-text-muted" required={field.required} />
                      )}
                      {field.type === 'select' && (
                        <select value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-3.5 py-2.5 border border-cn-border rounded-xl text-xs sm:text-[13px] focus:border-brand-500 focus:outline-none transition-colors bg-cn-surface text-cn-text" required={field.required}>
                          <option value="">Select an option</option>
                          {(field.options || []).map((opt, optIdx) => <option key={optIdx} value={opt}>{opt}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cn-border-subtle shrink-0">
                <button
                  type="button"
                  onClick={() => { setTeamModalOpen(false); setCustomFormResponses({}); }}
                  className="px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans text-xs rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 shadow-xs shadow-brand-500/20 hover:shadow-sm"
                >
                  {isRegistering ? 'Registering...' : (event.entryFee > 0 ? `Pay ₹${event.entryFee} & Create` : 'Create Team')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        paymentType={paymentType}
        event={event}
        onSubmit={submitRegistrationWithPayment}
        isRegistering={isRegistering}
        showNotification={showNotification}
      />

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

export default EventDetails;
