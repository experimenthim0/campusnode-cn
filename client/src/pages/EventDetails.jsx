import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { searchUsers, updateProfile } from '../services/userService';
import { getUserEvents, registerForEvent } from '../services/eventService';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';
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

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop";

// ── Category emoji mapping ──────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  'sports': '🏃',
  'sports & fitness': '🏃',
  'fitness': '💪',
  'tech': '💻',
  'technology': '💻',
  'cultural': '🎭',
  'arts': '🎨',
  'music': '🎵',
  'wellness': '🧘',
  'wellness & yoga': '🧘',
  'academic': '📚',
  'social': '🤝',
  'gaming': '🎮',
  'photography': '📸',
  'dance': '💃',
  'debate': '🎤',
  'literary': '📖',
  'science': '🔬',
  'business': '💼',
  'environment': '🌱',
};

const getCategoryEmoji = (category) => {
  if (!category) return '🎉';
  return CATEGORY_EMOJI[category.toLowerCase()] || '🎉';
};

// ── FAQ Accordion Item ──────────────────────────────────────────────────────
const FAQItem = ({ question, answer, isOpen, onToggle }) => (
  <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden transition-all duration-200">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
    >
      <span className="text-[14px] font-semibold text-neutral-800 dark:text-neutral-200 pr-4">{question}</span>
      <i className={`ri-arrow-down-s-line text-lg text-neutral-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="px-5 pb-4 text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
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

        // Check if the user is already registered for this event
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
      document.title = `${event.title} - CampusNode`;
      const setMetaTag = (selector, propertyAttr, propertyVal, content) => {
        let element = document.querySelector(selector);
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(propertyAttr, propertyVal);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };
      setMetaTag("meta[property='og:title']", 'property', 'og:title', `${event.title} | CampusNode`);
      setMetaTag("meta[property='og:description']", 'property', 'og:description', event.description || "Join this amazing event on CampusNode!");
      setMetaTag("meta[property='og:image']", 'property', 'og:image', event.imageUrl || DEFAULT_IMAGE);
      setMetaTag("meta[property='og:url']", 'property', 'og:url', window.location.href);
      setMetaTag("meta[property='og:type']", 'property', 'og:type', "website");
      setMetaTag("meta[name='twitter:card']", 'name', 'twitter:card', "summary_large_image");
      setMetaTag("meta[name='twitter:title']", 'name', 'twitter:title', `${event.title} | CampusNode`);
      setMetaTag("meta[name='twitter:description']", 'name', 'twitter:description', event.description || "Join this amazing event on CampusNode!");
      setMetaTag("meta[name='twitter:image']", 'name', 'twitter:image', event.imageUrl || DEFAULT_IMAGE);
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
          externalEmail: paymentPayload.externalEmail || null,
          externalName: paymentPayload.externalName || null,
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
      const registerBody = user
        ? { studentId: user.id }
        : { externalEmail, externalName };

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
    const role = localStorage.getItem('role');

    // Authenticated path
    if (user && role === 'member') {
      if (event.customFields && event.customFields.length > 0) {
        setCustomFormResponses({});
        setCustomFormModalOpen(true);
        return;
      }
      if (event.paymentMethod && event.paymentMethod !== 'FREE') {
        setPaymentPayload({
          isTeam: false,
          studentId: user.id,
          formResponses: {}
        });
        setPaymentType(event.paymentMethod);
        setPaymentModalOpen(true);
        return;
      }
      setConfirmModalOpen(true);
      return;
    }

    // Unauthenticated (external) path
    if (!user) {
      if (!externalEmail || !externalName) {
        showNotification('Please Login first to register for events', 'warning');
        return;
      }
      if (event.paymentMethod && event.paymentMethod !== 'FREE') {
        setPaymentPayload({
          isTeam: false,
          externalEmail,
          externalName,
          formResponses: {}
        });
        setPaymentType(event.paymentMethod);
        setPaymentModalOpen(true);
        return;
      }
      setConfirmModalOpen(true);
      return;
    }
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

    if (role !== 'member') {
      showNotification('Please login as a student to register.', 'warning');
      navigate('/login');
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
          studentId: updatedUser.id,
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
        studentId: user.id,
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

  // ── Share handlers ──────────────────────────────────────────────────────────
  const getShareText = () => {
    if (!event) return '';
    return `*_Event Alert 🚨_*\n\n*${event.title}*\n*Venue*: ${event.venue}\n*Date*: ${new Date(event.startTime).toLocaleDateString('en-IN')}\n*Time*: ${new Date(event.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n*Entry Fee*: ${event.entryFee ? `₹${event.entryFee}` : 'Free'}\n*Event By*: ${event.club?.clubName || event.createdBy?.clubName}\n*Hosted On*: *_CampusNode_*\n\n*More Info*: `;
  };

  const handleShare = () => {
    const message = getShareText();
    if (navigator.share) {
      navigator.share({ title: `${event.title} - CampusNode`, text: message, url: window.location.href }).catch((error) => console.error('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(message + window.location.href).then(() => showNotification('Event details copied to clipboard', 'success')).catch((error) => console.error('Clipboard error:', error));
    }
  };

  const handleWhatsAppShare = () => {
    const message = getShareText() + window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleXShare = () => {
    const text = `Check out "${event.title}" on CampusNode! 🎉`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showNotification('Link copied to clipboard!', 'success'))
      .catch(() => showNotification('Failed to copy link', 'error'));
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <ShimmerText text="Loading event..." className="text-sm font-bold uppercase tracking-[0.2em]" />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (error || !event) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
        <div className="border-2 border-black dark:border-neutral-700 rounded-sm p-10 text-center max-w-sm bg-white dark:bg-neutral-900">
          <div className="w-14 h-14 bg-orange-600 rounded-sm flex items-center justify-center text-white text-2xl mx-auto mb-5">
            <i className="ri-error-warning-line" />
          </div>
          <h2 className="font-black text-xl text-black dark:text-white mb-2">Oops!</h2>
          <p className="text-neutral-500 text-[14px] mb-6">{error || 'Event not found'}</p>
          <button onClick={() => navigate('/events')} className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-[12px] font-bold uppercase tracking-widest rounded-sm hover:bg-orange-600 transition-colors cursor-pointer border-2 border-black">
            <i className="ri-arrow-left-line" /> Back to Events
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
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
    1: { badgeBg: 'bg-yellow-400 text-black', icon: 'ri-trophy-fill', label: '1st' },
    2: { badgeBg: 'bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white', icon: 'ri-medal-fill', label: '2nd' },
    3: { badgeBg: 'bg-amber-600 text-white', icon: 'ri-award-fill', label: '3rd' },
  };

  const isCentralEvent = event.organizerType === 'CENTRAL' || !!event.centralOrganizerId || (!event.club && !event.clubId && (!!event.centralOrganizer || !!event.participatingClubs));
  const clubCategory = isCentralEvent ? 'College-Wide' : (event.club?.category || null);
  const clubSlugOrId = isCentralEvent ? null : (event.club?.slug || event.club?._id || event.club?.id || event.createdBy?.slug || event.createdBy?._id || event.createdBy?.id);
  const displayName = isCentralEvent ? 'Office of DSW' : (event.club?.clubName || event.createdBy?.clubName || '—');

  const isOpenEvent = event.registrationType === 'none';

  const btnConfig = isOpenEvent
    ? { label: 'Open Entry', cls: 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 cursor-default', disabled: true }
    : isEnded
    ? { label: showWinners ? 'View Results' : 'Event Ended', cls: showWinners ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white border-neutral-300 dark:border-white hover:bg-neutral-300 dark:hover:bg-neutral-700 cursor-pointer' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 opacity-80 cursor-not-allowed', disabled: !showWinners }
    : isLive
    ? { label: 'Event is Live', cls: 'bg-orange-600 text-white border-orange-600 cursor-not-allowed', disabled: true }
    : isDeadlinePassed
    ? { label: 'DeadlinePassed', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700', disabled: true }
    : alreadyRegistered
    ? { label: 'Already Registered', cls: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-200 dark:border-neutral-700', disabled: true }
    : isFull
    ? { label: 'Join Waitlist', cls: 'bg-yellow-400 text-black border-black hover:bg-yellow-300 cursor-pointer', disabled: false }
    : { label: entryFee > 0 ? `Pay ₹${entryFee} & Register` : 'Get Tickets', cls: 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white hover:bg-orange-600 hover:border-orange-600 hover:text-white cursor-pointer', disabled: false };

  const isUpcoming = !isEnded && !isLive && !isDeadlinePassed;
  const showMobileCTA = isUpcoming && !alreadyRegistered && !isOpenEvent;

  // ── Auto-generated highlights ──────────────────────────────────────────────
  const highlights = [
    { icon: 'ri-group-line', label: 'Capacity', value: isUnlimited ? 'Unlimited Seats' : `${totalSeats} Seats` },
    { icon: 'ri-coin-line', label: 'Entry Fee', value: entryFee > 0 ? `₹${entryFee}` : 'Free Entry' },
    { icon: 'ri-time-line', label: 'Duration', value: (() => {
      const diff = new Date(endTime) - new Date(startTime);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
    })() },
    ...(event.provideCertificate ? [{ icon: 'ri-award-line', label: 'Certificate', value: 'Provided' }] : []),
    ...(event.showWinner ? [{ icon: 'ri-trophy-line', label: 'Competition', value: 'Winners Announced' }] : []),
    ...(event.allowedPrograms && event.allowedPrograms.length > 0 && event.allowedPrograms.length <= 3
      ? [{ icon: 'ri-graduation-cap-line', label: 'Open To', value: event.allowedPrograms.join(', ') }]
      : event.allowedPrograms && event.allowedPrograms.length > 3
      ? [{ icon: 'ri-graduation-cap-line', label: 'Open To', value: `${event.allowedPrograms.length} Programs` }]
      : [{ icon: 'ri-graduation-cap-line', label: 'Open To', value: 'All Programs' }]),
    ...(event.allowedBranches && event.allowedBranches.length > 0 && event.allowedBranches.length <= 3
      ? [{ icon: 'ri-git-branch-line', label: 'Branches', value: event.allowedBranches.join(', ') }]
      : event.allowedBranches && event.allowedBranches.length > 3
      ? [{ icon: 'ri-git-branch-line', label: 'Branches', value: `${event.allowedBranches.length} Branches Allowed` }]
      : []),
    ...(event.allowedYears && event.allowedYears.length > 0 && event.allowedYears.length < 4
      ? [{ icon: 'ri-calendar-check-line', label: 'Eligible Year', value: `${event.allowedYears.join(', ')}` }]
      : []),
  ];

  // ── Auto-generated FAQ with bold dynamic event information ──────────────────
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
            <>
              All{' '}
              <strong className="font-bold text-black dark:text-white">
                {totalSeats} seats
              </strong>{' '}
              are filled. However, you can register to join the waitlist.{' '}
            </>
          ) : (
            <>
              There are{' '}
              <strong className="font-bold text-black dark:text-white">
                {totalSeats - registeredCount} spots remaining
              </strong>{' '}
              out of {totalSeats} total seats.{' '}
            </>
          )}
          {event.allowedPrograms && event.allowedPrograms.length > 0 ? (
            <>
              Eligibility is open to programs:{' '}
              <strong className="font-bold text-black dark:text-white">
                {event.allowedPrograms.join(', ')}
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
                Year {event.allowedYears.join(', ')}
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

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ──
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-black dark:text-white hover:text-orange-600 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-base" /> Back
          </button>
          <span className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wide truncate max-w-[200px] hidden sm:block">Event Details</span>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8">
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

          {/* ═══════════════ LEFT COLUMN: Context & Narrative (65%) ═══════════════ */}
          <div className="w-full lg:w-[65%] min-w-0">

            {/* ── Breadcrumb Navigation ── */}
            <nav className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 mb-5 flex-wrap">
              <Link to="/" className="hover:text-orange-600 transition-colors">Home</Link>
              <i className="ri-arrow-right-s-line text-[10px]" />
              <Link to="/events" className="hover:text-orange-600 transition-colors">Events</Link>
              {clubCategory && (
                <>
                  <i className="ri-arrow-right-s-line text-[10px]" />
                  <span className="text-neutral-500 dark:text-neutral-400">{clubCategory}</span>
                </>
              )}
              <i className="ri-arrow-right-s-line text-[10px]" />
              <span className="text-neutral-600 dark:text-neutral-300 font-medium truncate max-w-[180px]">{title}</span>
            </nav>

            {/* ── Event Poster ── */}
            <div className="mb-6 rounded-2xl overflow-hidden border-1 border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 relative">
              <img
                src={event.imageUrl || DEFAULT_IMAGE}
                alt={title}
                className="w-full object-contain"
                style={{ maxHeight: '560px' }}
                onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
              />
              {/* Status badge overlay */}
              <div className="absolute top-4 left-4">
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse shadow-lg">
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
  <h1 className="font-black text-3xl md:text-4xl text-black dark:text-white leading-tight tracking-tight mb-4">
              {title}
            </h1>
            {/* ── Category & Status Badges ── */}
            {/* <div className="flex items-center gap-2 flex-wrap mb-3">
              {isCentralEvent ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/50 text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                    <i className="ri-sparkling-line" /> College-Wide Event
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    <i className="ri-building-2-line text-orange-600" /> Office of DSW
                  </span>
                </>
              ) : (
                clubCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/50 text-[10px] font-light uppercase tracking-wider text-orange-700 dark:text-orange-400">
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

     
          

            {/* ── Quick-Scan Inline Metadata ── */}
            <div className="flex items-center gap-4 flex-wrap text-[13px] text-neutral-500 dark:text-neutral-400 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-event-line text-orange-500" />
                {new Date(startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-map-pin-2-line text-orange-500" />
                <span className="truncate max-w-[160px]">{venue}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              {isCentralEvent ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-building-2-line text-orange-500" />
                  <span className="truncate max-w-[140px]">Office of DSW</span>
                </span>
              ) : clubSlugOrId ? (
                <Link to={`/club/${clubSlugOrId}`} className="inline-flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                  <i className="ri-team-line text-orange-500" />
                  <span className="truncate max-w-[140px]">{displayName}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-team-line text-orange-500" />
                  <span className="truncate max-w-[140px]">{displayName}</span>
                </span>
              )}
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-user-line text-orange-500" />
                {registeredCount} Registered
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5" title="Total event views">
                <i className="ri-eye-line text-orange-500" />
                {views || 0} Views
              </span>
            </div>

            {/* ── Rich Text Description ── */}
            {description && (
              <div className="mb-8">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-3">
                  About this Event
                </h2>
                <div 
                  className="text-[15px] text-neutral-700 dark:text-neutral-300  leading-relaxed event-description ql-editor px-0 whitespace-pre-wrap [&_*]:!text-inherit [&_*]:!bg-transparent" 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description, { ADD_ATTR: ['target'], FORBID_ATTR: ['style'] }) }}
                />
              </div>
            )}

            {/* ── Event Highlights Matrix ── */}
            <div className="mb-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4">
                Event Highlights
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                      <i className={`${h.icon} text-orange-600 dark:text-orange-400 text-base`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-0.5">{h.label}</p>
                      <p className="text-[13px] font-semibold text-black dark:text-white leading-snug">{h.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sponsors Section ── */}
            {event.sponsors && event.sponsors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4">
                  Sponsors
                </h3>
                <div className="flex flex-wrap gap-5 items-center ">
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
                      <span className="text-[11px] font-medium text-black dark:text-white tracking-wide text-center">
                        {sponsor.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Gallery Section ── */}
            {event.media && event.media.filter(m => m.type !== 'SPONSOR_LOGO').length > 0 && (
              <div className="mb-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4">
                  Gallery
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {event.media.filter(m => m.type !== 'SPONSOR_LOGO').map((item, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 relative group">
                      {item.type === 'IMAGE' ? (
                        <div className="w-full h-full cursor-zoom-in" onClick={() => window.open(item.url, '_blank')}>
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

            {/* ── Winners Section ── */}
            {showWinners && (
              <div id="winners-section" className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-yellow-400 border border-black/10 rounded-lg flex items-center justify-center text-black text-lg">
                    <i className="ri-trophy-fill" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Event Results</p>
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
                          {medal ? (
                            <i className={`${medal.icon} text-base`} />
                          ) : (
                            <span>#{winner.rank}</span>
                          )}
                        </div>

                        {/* Winner / Team Name & Members */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-black dark:text-white truncate">
                              {winner.name}
                            </p>
                            {isTeamWinner && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/40 px-2 py-0.5 rounded-full">
                                <i className="ri-team-line text-[10px]" /> Team
                              </span>
                            )}
                          </div>

                          {/* Render Team Members if present */}
                          {memberList && memberList.length > 0 && (() => {
                            const namesArr = Array.isArray(memberList)
                              ? memberList.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean)
                              : [typeof memberList === 'string' ? memberList : memberList?.name].filter(Boolean);
                            const uniqueNames = Array.from(new Set(namesArr));
                            if (uniqueNames.length === 0) return null;
                            return (
                              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Members:</span>{' '}
                                {uniqueNames.join(', ')}
                              </p>
                            );
                          })()}
                        </div>

                        {/* Rank Label */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md shrink-0">
                          {medal ? `${medal.label} Place` : `#${winner.rank}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FAQ Accordion ── */}
            <div className="mb-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-2">
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

          {/* ═══════════════ RIGHT COLUMN: Transactional Widget (35%) ═══════════════ */}
          <div className="w-full lg:w-[35%] lg:sticky lg:top-[80px] shrink-0">
            <div className="bg-white dark:bg-neutral-900 border-1 border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">

              {/* ── Date & Time Module ── */}
              <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-1.5">
                  <i className="ri-calendar-event-line text-orange-500 text-xs font-medium" /> DATE & TIME
                </p>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Starts</p>
                    <p className="text-[16px] font-bold text-black dark:text-white leading-snug">
                      {new Date(startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                    <p className="text-[14px] font-semibold text-orange-600">
                      {new Date(startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  {/* <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800" /> */}
                  {/* <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Ends</p>
                    <p className="text-[14px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {new Date(endTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                      {' · '}
                      {new Date(endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div> */}
                </div>
              </div>

              {/* ── Seat Progress ── */}
              {!isUnlimited && (
                <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Availability</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">{fillPct}% Full</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    {registeredCount} / {totalSeats} seats filled
                  </p>
                  {isFull && (
                    <p className="text-[11px] text-orange-600 font-semibold mt-1">All seats filled — registering adds you to the waitlist.</p>
                  )}
                </div>
              )}

              {/* ── Already Registered / Registration ID ── */}
              {alreadyRegistered && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-full">
                  <i className="ri-checkbox-circle-line text-orange-600 text-lg shrink-0" />
                  <p className="text-[13px] font-semibold text-orange-700 dark:text-orange-400">You are already registered for this event.</p>
                </div>
              )}

              {registrationId && (
                <div className="mx-6 mt-4 flex flex-col items-center gap-3.5 px-6 py-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-100/80 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600">
                    <i className="ri-checkbox-circle-fill text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Registration Successful!</p>
                    <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mt-1">Check your dashboard for the ticket QR code</p>
                  </div>
                  
                  <div className="w-full bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850 p-4 rounded-xl text-center shadow-sm">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5">Ticket ID / Ref Number</p>
                    <p className="text-base font-black text-neutral-900 dark:text-neutral-100 tracking-wider font-mono select-all">
                      {registrationId}
                    </p>
                  </div>

                  <Link 
                    to="/my-events" 
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 hover:underline"
                  >
                    View My Tickets <i className="ri-arrow-right-s-line" />
                  </Link>
                </div>
              )}

              {/* ── Primary CTA ── */}
              <div className="px-6 py-5">
                {/* Horizontal Metadata Anchor */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-4 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <i className="ri-map-pin-2-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                    <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <i className="ri-ticket-2-line text-neutral-400 dark:text-neutral-500 text-sm" />
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
                    className={`flex-1 py-3 px-6 text-[13px] font-black uppercase tracking-[0.15em] border-2 rounded-full transition-all flex items-center justify-center gap-2 ${btnConfig.cls} ${(btnConfig.disabled || isRegistering) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isRegistering ? (
                      <><i className="ri-loader-4-line animate-spin text-base" /> Processing…</>
                    ) : btnConfig.label}
                  </button>

                  {status === 'UPCOMING' && (
                    <CalendarDropdown
                      event={event}
                      btnClassName="w-12 h-12 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400 cursor-pointer shadow-sm transition-colors shrink-0"
                    />
                  )}
                </div>

                {registrationDeadline && !isEnded && (
                  <p className="text-[11px] font-medium text-neutral-550 dark:text-neutral-450 mt-3 text-center">
                    Registration closes: {new Date(registrationDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  </p>
                )}
              </div>

              {/* ── Organizer ── */}
              {isCentralEvent ? (
                <div className="px-1 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="px-3 flex items-center gap-3 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-900/50">
                      <i className="ri-building-2-line text-orange-600 text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Organized by</p>
                      <p className="text-[14px] font-black text-black dark:text-white truncate">Office of DSW</p>
                      <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Dean Student Welfare</p>
                    </div>
                  </div>

                  {event.participatingClubs?.length > 0 && (
                    <div className="px-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">
                        Participating Clubs
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {event.participatingClubs.map((pc) => (
                          <Link
                            key={pc.id}
                            to={`/club/${pc.club?.slug || pc.club?.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 rounded-lg transition-colors"
                          >
                            {pc.club?.clubName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-1 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <div className="px-3 flex items-center gap-3 pb-4">
                    {clubSlugOrId ? (
                      <Link
                        to={`/club/${clubSlugOrId}`}
                        className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors overflow-hidden"
                      >
                        {event.club?.clubLogo ? (
                          <img src={event.club.clubLogo} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <i className="ri-team-line text-orange-600 text-sm" />
                        )}
                      </Link>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                        <i className="ri-team-line text-orange-600 text-sm" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Organized by</p>
                      {clubSlugOrId ? (
                        <Link
                          to={`/club/${clubSlugOrId}`}
                          className="text-[13px] font-bold text-black dark:text-white hover:text-orange-600 transition-colors duration-200 truncate block hover:underline"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <p className="text-[13px] font-bold text-black dark:text-white truncate">{displayName}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Club Social Media / Contact Links ── */}
                  {event?.club?.socialLinks && event.club.socialLinks.length > 0 && (
                    <div className="px-6 pb-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2.5">
                        Connect with {displayName}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.club.socialLinks.map((link, i) => {
                          const platform = link.platform?.toLowerCase() || "website";
                          const iconProps = { className: "w-5 h-5" };

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
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
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

              {/* ── Social Sharing Row ── */}
              <div className="px-6 pb-5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">Share Event</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer"
                    title="Share on WhatsApp"
                  >
                    <i className="ri-whatsapp-line text-lg" />
                  </button>
                  <button
                    onClick={handleXShare}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Share on X"
                  >
                    <i className="ri-twitter-x-line text-lg" />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Copy link"
                  >
                    <i className="ri-link text-lg" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer"
                    title="More sharing options"
                  >
                    <i className="ri-share-forward-line text-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Floating Bottom CTA (Upcoming & Not Registered Only) ── */}
      {showMobileCTA && (
        <div className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
          <button
            onClick={!btnConfig.disabled && !isRegistering ? handleRegister : undefined}
            disabled={btnConfig.disabled || isRegistering}
            className={`pointer-events-auto px-5 py-2 text-[13px] font-black  tracking-[0.12em] border-2 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 ${btnConfig.cls} ${(btnConfig.disabled || isRegistering) ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* ── Missing Fields Modal ── */}
      {missingFieldsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-xl max-w-md w-full shadow-2xl">
            <div className="bg-orange-600 px-6 py-4 rounded-t-xl border-b-2 border-black dark:border-neutral-700">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <i className="ri-information-line" /> Complete Your Profile
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
                This event requires the following profile information. Please add them to continue with registration:
              </p>
              <div className="space-y-4">
                {missingFields.map((field) => {
                  const fieldLabel = field.replace('Profile', '').replace('Url', '');
                  const placeholder = field === 'portfolioUrl' ? 'https://yourportfolio.com' : `https://${fieldLabel.toLowerCase()}.com/yourprofile`;
                  return (
                    <div key={field}>
                      <label className="block text-sm font-bold text-black dark:text-white mb-1.5 capitalize">
                        {fieldLabel} <span className="text-orange-600">*</span>
                      </label>
                      <input type="url" placeholder={placeholder} value={modalInputs[field] || ''} onChange={(e) => setModalInputs({ ...modalInputs, [field]: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setMissingFieldsModalOpen(false); setModalInputs({}); }} className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSaveAndRegister} disabled={missingFields.some(field => !modalInputs[field]) || isRegistering} className="flex-1 px-4 py-3 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {isRegistering ? 'Processing...' : 'Save & Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Form Modal ── */}
      {customFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-orange-600 px-6 py-4 rounded-t-xl border-b-2 border-black dark:border-neutral-700 shrink-0">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <i className="ri-file-list-3-line" /> Registration Form
              </h3>
              <p className="text-white/80 text-xs mt-1">Fill in the details to complete your registration</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Your Profile (Auto-filled)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Name', value: JSON.parse(localStorage.getItem('user'))?.name },
                    { label: 'Roll No', value: JSON.parse(localStorage.getItem('user'))?.rollNo },
                    { label: 'Email', value: JSON.parse(localStorage.getItem('user'))?.email },
                    { label: 'Branch', value: JSON.parse(localStorage.getItem('user'))?.branch },
                    { label: 'Year', value: JSON.parse(localStorage.getItem('user'))?.year },
                    { label: 'Program', value: JSON.parse(localStorage.getItem('user'))?.program },
                  ].map((item, i) => (
                    <div key={i} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{item.label}</p>
                      <p className="text-sm font-medium text-black dark:text-white truncate">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t-2 border-neutral-100 dark:border-neutral-800 mb-6" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Additional Information</p>
              <div className="space-y-4">
                {(event.customFields || []).map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-bold text-black dark:text-white mb-1.5">
                      {field.label}{' '}{field.required && <span className="text-orange-600">*</span>}
                    </label>
                    {field.type === 'text' && (
                      <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" />
                    )}
                    {field.type === 'url' && (
                      <input type="url" placeholder="https://..." value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" />
                    )}
                    {field.type === 'textarea' && (
                      <textarea rows="3" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors resize-none bg-white dark:bg-neutral-800 text-black dark:text-white" />
                    )}
                    {field.type === 'select' && (
                      <select value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white">
                        <option value="">Select an option</option>
                        {(field.options || []).map((opt, optIdx) => <option key={optIdx} value={opt}>{opt}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button onClick={() => { setCustomFormModalOpen(false); setCustomFormResponses({}); }} className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCustomFormSubmit} disabled={isRegistering} className="flex-1 px-4 py-3 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {isRegistering ? 'Processing...' : (event.paymentMethod && event.paymentMethod !== 'FREE' ? 'Pay & Register' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Registration Modal ── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border-2  dark:border-neutral-700 rounded-xl max-w-md w-full shadow-2xl">
            <div className="bg-orange-600 px-6 py-4 rounded-t-xl border-b-2  dark:border-neutral-700">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <i className="ri-question-line font-medium" /> Confirm Registration
              </h3>
            </div>
            <div className="p-6">
              <p className="text-base font-bold text-black dark:text-white mb-3">
                Are you sure you want to register for this event?
              </p>
              <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-sm font-extrabold text-black dark:text-white truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <i className="ri-calendar-event-line text-orange-500" />
                  <span>{new Date(startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <i className="ri-map-pin-2-line text-orange-500" />
                  <span className="truncate">{venue}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <i className="ri-ticket-2-line text-orange-500" />
                  <span className="font-bold text-green-600 dark:text-green-400">{entryFee > 0 ? `₹${entryFee}` : 'Free Entry'}</span>
                </div>
              </div>
              {isFull && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  Note: All regular seats are filled. Confirming will place you on the waitlist.
                </p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={processDirectRegistration}
                disabled={isRegistering}
                className="flex-1 px-4 py-3 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold text-sm uppercase tracking-widest rounded-full hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRegistering ? 'Registering...' : 'Yes, Register'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Registration Success Modal ── */}
      {showSuccessModal && (() => {
        const isPendingPayment = registrationPaymentStatus === 'PENDING';
        const isPaymentSuccess = !isPendingPayment;

        // Helper to auto-link URLs in text
        const renderWithLinks = (text) => {
          if (!text) return null;
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const parts = text.split(urlRegex);
          return parts.map((part, i) => {
            if (urlRegex.test(part)) {
              const isWhatsApp = part.includes('chat.whatsapp.com') || part.includes('wa.me');
              return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-500 font-semibold underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-400 break-all"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6 overflow-y-auto ticket-backdrop-animate">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-sm w-full relative overflow-hidden flex flex-col p-6 text-center shadow-2xl ticket-card-animate">
              <div className="relative">
                <img src={isPendingPayment ? "/Success popup.svg" : "/Success popup.svg"} alt="Registration Successful" className="w-48 h-48 mx-auto animate-bounce-slow" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              </div>
              
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-4">
                {isPendingPayment ? 'Registration Received!' : 'Registration Successful!'}
              </h3>

              {isPendingPayment ? (
                <>
                  <div className="my-4 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <i className="ri-time-line text-orange-600 dark:text-orange-500 text-base" />
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Payment Under Review</p>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      The club is verifying your payment details. Once verified, your ticket will appear in your <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">My Events</strong> section.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                    You are in! Your ticket has been confirmed. You can view your ticket in the My Events section.
                  </p>
                  
                  {registrationId && (
                    <div className="my-5 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5">Your Registration ID</p>
                      <p className="text-lg font-black text-neutral-900 dark:text-neutral-100 tracking-wider font-mono select-all">
                        {registrationId}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Post-Registration Message from Club */}
              {postRegMessage && (
                <div className="my-3 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 flex items-center gap-1.5">
                    <i className="ri-information-line text-orange-600 dark:text-orange-500 text-xs" />
                    Next Steps from Club
                  </p>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed break-words whitespace-pre-wrap">
                    {renderWithLinks(postRegMessage)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => { setShowSuccessModal(false); navigate('/my-events'); }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full transition shadow-sm border-0 outline-none text-xs uppercase tracking-wider cursor-pointer"
                >
                  Go to My Events
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 py-2 transition-colors border-0 bg-transparent outline-none cursor-pointer"
                >
                  Stay on this page
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Team Registration Choice Modal ── */}
      {teamChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-black text-black dark:text-white text-lg mb-2">Registration Mode</h3>
            <p className="text-neutral-500 text-xs mb-6">Choose how you want to participate in this event.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setTeamChoiceModalOpen(false);
                  handleIndividualRegister();
                }}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Register as Individual
              </button>
              <button
                onClick={handleSelectRegisterAsTeam}
                className="w-full px-4 py-3 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors cursor-pointer"
              >
                Register as Team
              </button>
              <button
                onClick={() => setTeamChoiceModalOpen(false)}
                className="w-full px-4 py-2 mt-2 text-xs text-neutral-400 hover:text-black dark:hover:text-white transition-colors border-0 bg-transparent outline-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team Registration Modal ── */}
      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-orange-600 px-6 py-4 rounded-t-xl border-b-2 border-black dark:border-neutral-700 shrink-0">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <i className="ri-group-line" /> Create Team
              </h3>
              <p className="text-white/80 text-xs mt-1">Form a team to register for {event.title}</p>
            </div>
            
            <form onSubmit={handleTeamSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-bold text-black dark:text-white mb-1.5 font-sans">Team Name <span className="text-orange-600">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter a unique team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white"
                />
              </div>

              {/* Members/Teammates selection */}
              <div>
                <label className="block text-sm font-bold text-black dark:text-white mb-1.5">
                  Add Teammates <span className="text-xs text-neutral-400 font-medium">(Team size: {teammates.length + 1} / min {event.minTeamSize || 1}, max {event.maxTeamSize || 1})</span>
                </label>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by Email or Roll Number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none bg-white dark:bg-neutral-800 text-black dark:text-white"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <i className="ri-loader-4-line animate-spin text-orange-600" />
                    </div>
                  )}
                </div>

                {/* Autocomplete dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg w-[calc(100%-3rem)] max-w-md divide-y divide-neutral-100 dark:divide-neutral-800">
                    {searchResults.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setTeammates([...teammates, s]);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="p-3 text-xs hover:bg-orange-50 dark:hover:bg-neutral-800 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div className="text-left">
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">{s.name}</p>
                          <p className="text-neutral-400 font-mono mt-0.5">{s.rollNo} • {s.email}</p>
                        </div>
                        <span className="text-orange-600 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 rounded">Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Roster list */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-xl space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-left">Team Roster</p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Leader */}
                  <div className="py-2.5 flex justify-between items-center text-xs">
                    <div className="text-left">
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{JSON.parse(localStorage.getItem('user'))?.name} <span className="text-orange-600 font-extrabold">(You)</span></p>
                      <p className="text-neutral-400 font-mono mt-0.5">{JSON.parse(localStorage.getItem('user'))?.rollNo}</p>
                    </div>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Leader</span>
                  </div>
                  {/* Members */}
                  {teammates.map((member) => (
                    <div key={member.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="text-left">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">{member.name}</p>
                        <p className="text-neutral-400 font-mono mt-0.5">{member.rollNo}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTeammates(teammates.filter(t => t.id !== member.id))}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-transparent border-0 outline-none cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {teammates.length === 0 && (
                    <div className="py-3 text-center text-xs text-neutral-400 font-medium">
                      No teammates added yet. Search above to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Additional custom fields if any */}
              {event.customFields && event.customFields.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 text-left">Additional Information</p>
                  {(event.customFields || []).map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-bold text-black dark:text-white mb-1.5 text-left">
                        {field.label}{' '}{field.required && <span className="text-orange-600">*</span>}
                      </label>
                      {field.type === 'text' && (
                        <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" required={field.required} />
                      )}
                      {field.type === 'url' && (
                        <input type="url" placeholder="https://..." value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" required={field.required} />
                      )}
                      {field.type === 'textarea' && (
                        <textarea rows="3" placeholder={`Enter ${field.label.toLowerCase()}`} value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors resize-none bg-white dark:bg-neutral-800 text-black dark:text-white" required={field.required} />
                      )}
                      {field.type === 'select' && (
                        <select value={customFormResponses[field.label] || ''} onChange={(e) => setCustomFormResponses({ ...customFormResponses, [field.label]: e.target.value })} className="w-full px-4 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-neutral-800 text-black dark:text-white" required={field.required}>
                          <option value="">Select an option</option>
                          {(field.options || []).map((opt, optIdx) => <option key={optIdx} value={opt}>{opt}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                <button
                  type="button"
                  onClick={() => { setTeamModalOpen(false); setCustomFormResponses({}); }}
                  className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer border-0 outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 px-4 py-3 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none"
                >
                  {isRegistering ? 'Registering...' : (event.entryFee > 0 ? `Pay ₹${event.entryFee} & Create` : 'Create Team')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dynamic/Manual Payment Modal ── */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        paymentType={paymentType}
        event={event}
        onSubmit={submitRegistrationWithPayment}
        isRegistering={isRegistering}
        showNotification={showNotification}
      />
    </div>
  );
};

export default EventDetails;
