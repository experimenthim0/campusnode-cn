import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedbackPrompt } from '../context/FeedbackPromptContext';
import { getUserEvents } from '../services/eventService';
import { isStudentLeadRole, isCoordinatorRole, hasPermission, PERMISSIONS } from '../utils/rbac';

import { Clock, MapPin, Calendar, Bookmark, Compass, User, Plus, Wallet, Users, Bell, LayoutDashboard, Search } from 'lucide-react';
import EventFeed from './EventFeed';
import FeaturedEventsSection from '../components/FeaturedEventsSection';
import Clubspage from './Clubspage';
import ClubLeaderboard from '../components/ClubLeaderboard';
import HomeFooter from '../components/HomeFooter';
import ScrollReveal from '../components/ScrollReveal';
import Section from '../components/layout/Section';
import { ArrowRightIcon } from '../components/ui/arrow-right';
import ShimmerText from '../components/ShimmerText';
import { InstagramIcon } from '@/components/ui/instagram';
import { GithubIcon } from '@/components/ui/github';
import { LinkedinIcon } from '@/components/ui/linkedin';
import { MailIcon, Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';
import { AtSignIcon } from '@/components/ui/at-sign';
import { EarthIcon } from '@/components/ui/earth';
import { ZapIcon } from '@/components/ui/zap';
import { InsetModernTeamCard, TEAM_MEMBERS } from './Team';




// Icons are handled by Remix Icons (ri-)

const studentItems = [
  {
    icon: <i className="ri-chat-1-line" />,
    problem: "Cluttered WhatsApp groups",
    solution: "One clean feed for all technical, cultural, and sports events.",
  },
  {
    icon: <i className="ri-time-line" />,
    problem: "Missed registration deadlines",
    solution: "Instant alerts and one-click registration before seats fill.",
  },
  {
    icon: <i className="ri-user-line" />,
    problem: "Zero track record",
    solution: "Auto-build your profile with every event you participate in.",
  },
];

const clubFeatures = [
  { icon: <i className="ri-broadcast-line" />, title: "Reach everyone", desc: "Push to students interested in your domain." },
  { icon: <i className="ri-file-text-line" />, title: "E-certificates", desc: "Auto-generated for every participant." },
  { icon: <i className="ri-bar-chart-line" />, title: "Real-time analytics", desc: "See registrations by branch, live." },
  { icon: <i className="ri-award-line" />, title: "Club showcase", desc: "Dedicated profile for your past achievements." },
];

const CountdownTimer = ({ startTime, endTime }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (now > end) {
      return { status: 'PAST', text: 'Ended' };
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      return {
        status: 'LIVE',
        text: `Ends in ${hours}h ${mins}m ${secs}s`,
        hours, mins, secs
      };
    } else {
      const diff = start - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      let text = '';
      if (days > 0) {
        text = `${days}d ${hours}h ${mins}m`;
      } else {
        text = `${hours}h ${mins}m ${secs}s`;
      }
      return {
        status: 'UPCOMING',
        text: `Starts in ${text}`,
        days, hours, mins, secs
      };
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  if (timeLeft.status === 'PAST') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
        Finished
      </span>
    );
  }

  if (timeLeft.status === 'LIVE') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 animate-pulse">
        🔴 Live • {timeLeft.text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
      ⏳ {timeLeft.text}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-2 mb-5 text-brand-600 dark:text-brand-500">
    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{children}</span>
  </div>
);

const BtnPrimary = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white text-[13px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-md shadow-black/15 dark:shadow-white/10 hover:shadow-lg"
  >
    {children}
  </Link>
);

const BtnSecondary = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 border border-neutral-300 dark:border-neutral-700 transition-all duration-200 font-semibold text-sm rounded-full cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 touch-manipulation hover:border-cn-blue-500/50"
  >
    {children}
  </Link>
);



const Home = () => {
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const { pendingCount, openFeedbackModal } = useFeedbackPrompt();
  const [registrations, setRegistrations] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [openMapEventId, setOpenMapEventId] = useState(null);
  const [celebrationEvent, setCelebrationEvent] = useState(null);
  const [celebrationWinnerRank, setCelebrationWinnerRank] = useState(null);

  useEffect(() => {
    document.title = "CampusNode | NITJ Clubs & Events";
    if (authUser) {
      setUser(authUser);
      setRole(authRole);
      fetchTimelineEvents(authUser.id || authUser._id);
    }
  }, [authUser, authRole]);

  useEffect(() => {
    if (registrations.length > 0 && user) {
      const acknowledged = JSON.parse(localStorage.getItem('acknowledged_winnings') || '[]');

      const unacknowledgedWin = registrations.find(p => {
        const ev = p.eventId || p.event;
        if (ev && ev.winners && Array.isArray(ev.winners) && !acknowledged.includes(ev.id || ev._id)) {
          const winInfo = ev.winners.find(w =>
            (w.studentId && String(w.studentId) === String(user.id || user._id)) ||
            (w.rollNo && user.rollNo && String(w.rollNo).trim().toLowerCase() === user.rollNo.trim().toLowerCase()) ||
            (w.email && user.email && String(w.email).trim().toLowerCase() === user.email.trim().toLowerCase()) ||
            (w.name && user.name && String(w.name).toLowerCase().includes(user.name.toLowerCase()))
          );
          if (winInfo) {
            p._winnerRank = winInfo.rank;
            return true;
          }
        }
        return false;
      });

      if (unacknowledgedWin) {
        const ev = unacknowledgedWin.eventId || unacknowledgedWin.event;
        setCelebrationEvent(ev);
        setCelebrationWinnerRank(unacknowledgedWin._winnerRank);
      }
    }
  }, [registrations, user]);

  const acknowledgeWin = () => {
    if (celebrationEvent) {
      const eventId = celebrationEvent.id || celebrationEvent._id;
      const acknowledged = JSON.parse(localStorage.getItem('acknowledged_winnings') || '[]');
      acknowledged.push(eventId);
      localStorage.setItem('acknowledged_winnings', JSON.stringify(acknowledged));
      setCelebrationEvent(null);
      setCelebrationWinnerRank(null);
    }
  };

  const fetchTimelineEvents = async (userId) => {
    if (!userId) return;
    setTimelineLoading(true);
    try {
      const res = await getUserEvents(userId);
      const sorted = (res.data || []).sort((a, b) => {
        const timeA = new Date(a.eventId?.startTime || 0).getTime();
        const timeB = new Date(b.eventId?.startTime || 0).getTime();
        return timeB - timeA;
      });
      setRegistrations(sorted);
    } catch (err) {
      console.error("Failed to load registrations for timeline", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // ── Role resolution ────────────────────────────────────────────────────────
  const studentName = user?.name || 'Student';
  const firstName = studentName.split(' ')[0];

  // Specific membership role groups
  const studentLeadMemberships = (user?.memberships || []).filter(
    (m) => isStudentLeadRole(m.role)
  );
  const coordinatorMemberships = (user?.memberships || []).filter(
    (m) => isCoordinatorRole(m.role)
  );
  const operationalMemberships = (user?.memberships || []).filter(
    (m) => isStudentLeadRole(m.role) || isCoordinatorRole(m.role) || m.canEditEvents
  );

  const isStudentLead = studentLeadMemberships.length > 0;
  const isCoordinator = !isStudentLead && coordinatorMemberships.length > 0;
  const isFaculty = role === 'facultyCoordinator';
  const isAdmin = role === 'admin';
  const isStudent = !isFaculty && !isAdmin;

  // External user detection
  const isExternal = role === 'external' || user?.userType === 'external';

  // Role badge label
  const roleBadgeLabel = isAdmin
    ? 'System Admin'
    : isFaculty
    ? 'Faculty Coordinator'
    : isStudentLead
    ? 'Student Lead'
    : isCoordinator
    ? 'Club Coordinator'
    : isExternal
    ? 'External Participant'
    : 'NITJ Student';

  // Quick action shortcuts depend on role context
  const quickActions = isAdmin
    ? [
        { to: '/admin-dashboard', label: 'Admin Panel', icon: LayoutDashboard },
        { to: '/send-notification', label: 'Broadcast', icon: Bell },
        { to: '/events', label: 'Events', icon: Compass },
        { to: '/profile', label: 'Profile', icon: User, primary: true },
      ]
    : isFaculty
    ? [
        { to: '/my-events', label: 'Review Events', icon: Calendar },
        { to: '/clubs', label: 'Clubs', icon: Users },
        { to: '/notifications', label: 'Announcements', icon: Bell },
        { to: '/profile', label: 'Profile', icon: User, primary: true },
      ]
    : isStudentLead
    ? [
        { to: '/create', label: 'Create Event', icon: Plus },
        { to: `/club-events/${studentLeadMemberships[0]?.clubId || ''}`, label: 'Club Events', icon: Calendar },
        { to: '/my-events', label: 'My Tickets', icon: Bookmark },
        { to: '/profile', label: 'Profile', icon: User, primary: true },
      ]
    : isCoordinator
    ? [
        { to: `/club-events/${coordinatorMemberships[0]?.clubId || ''}`, label: 'Club Events', icon: Calendar },
        { to: `/send-notification?clubId=${coordinatorMemberships[0]?.clubId || ''}`, label: 'Broadcast', icon: Bell },
        { to: '/my-events', label: 'My Tickets', icon: Bookmark },
        { to: '/profile', label: 'Profile', icon: User, primary: true },
      ]
    : [
        { to: '/events', label: 'Browse Events', icon: Compass },
        { to: '/clubs', label: 'Explore Clubs', icon: Users },
        { to: '/my-events', label: 'My Tickets', icon: Bookmark },
        { to: '/profile', label: 'Profile', icon: User, primary: true },
      ];

  return (
    <div className="myfont text-cn-text bg-cn-bg transition-colors duration-300 -mt-12">

      {user ? (
        <>
          {/* ── Hero: Welcome Banner ────────────────────────────────────── */}
          <section className="relative pt-24 sm:pt-28 pb-10 bg-cn-surface border-b border-cn-border text-cn-text transition-colors duration-300 overflow-hidden">
            {/* Subtle bg accent */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] via-transparent to-amber-500/[0.03]" aria-hidden="true" />
            <Section className="relative z-10 w-full">
              {/* Top row: greeting + role badge */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col gap-2">
                  {/* Role badge */}
                  <span className={`inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    isAdmin
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60'
                      : isFaculty
                      ? 'bg-cn-blue-50 dark:bg-cn-blue-950/30 text-cn-blue-700 dark:text-cn-blue-400 border-cn-blue-200 dark:border-cn-blue-800/60'
                      : isStudentLead
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                      : isCoordinator
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
                      : isExternal
                      ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60'
                      : 'bg-cn-blue-50 dark:bg-cn-blue-950/30 text-cn-blue-700 dark:text-cn-blue-400 border-cn-blue-200 dark:border-cn-blue-800/60'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {roleBadgeLabel}
                  </span>

                  {/* Greeting — always student's personal name */}
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500 dark:from-brand-400 dark:to-amber-400">{firstName}</span>
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light">
                    {isFaculty
                      ? 'Review club proposals, approve events, and coordinate your assigned clubs.'
                      : isAdmin
                      ? 'Oversee campus events, manage clubs, and broadcast platform-wide announcements.'
                      : isStudentLead
                      ? `You're leading ${studentLeadMemberships.length > 1 ? `${studentLeadMemberships.length} clubs` : studentLeadMemberships[0]?.clubName || 'your club'}. Manage events, teams, and operations below.`
                      : isCoordinator
                      ? `You're coordinating ${coordinatorMemberships.length > 1 ? `${coordinatorMemberships.length} clubs` : coordinatorMemberships[0]?.clubName || 'your club'}. Coordinate events and announcements below.`
                      : isExternal
                      ? 'Welcome! Browse campus events and register for open fests hosted by NITJ clubs.'
                      : 'Explore active club fests, technical hackathons, and sports events!'}
                  </p>

                  {/* Feedback prompt for students */}
                  {isStudent && (
                    <div className="mt-1 flex items-center">
                      {pendingCount > 0 ? (
                        <button
                          type="button"
                          onClick={openFeedbackModal}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-xs hover:shadow-md group"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>FEEDBACK • {pendingCount} {pendingCount === 1 ? 'event needs' : 'events need'} your feedback</span>
                          <i className="ri-arrow-right-s-line text-sm text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800">
                          <i className="ri-checkbox-circle-fill text-green-500 text-xs" />
                          <span>FEEDBACK • You're all caught up</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick action pills */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0">
                  {quickActions.map((action, idx) => {
                    const IconComponent = action.icon;
                    return (
                      <Link
                        key={idx}
                        to={action.to}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer min-w-0 ${action.primary
                          ? 'bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black border border-black dark:border-white shadow-sm hover:shadow-md'
                          : 'bg-white dark:bg-zinc-900/90 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/90 dark:border-zinc-800 shadow-2xs hover:shadow-xs hover:border-brand-500/40'
                        }`}
                      >
                        <IconComponent className={action.primary ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-white dark:text-black shrink-0' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500 shrink-0'} />
                        <span className="truncate">{action.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Section>
          </section>

          {/* ── Section A: My Campus Journey (all students, including leads) ─ */}
          {isStudent && (
            <section className="py-12 sm:py-16 lg:py-20 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
              <Section>
                <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <SectionLabel>My Campus Journey</SectionLabel>
                    <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
                      My Registered Events
                    </h2>
                  </div>
                  <Link
                    to="/my-events"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brand-200 dark:border-brand-900/60 bg-brand-50/60 dark:bg-brand-950/40 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shadow-xs hover:shadow-md self-start sm:self-auto"
                  >
                    Manage Passes & QR Codes <ArrowRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-500 shrink-0" />
                  </Link>
                </div>

                {timelineLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
                    <ShimmerText text="Loading your timeline..." className="text-xs font-semibold tracking-wider uppercase" />
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto">
                    <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-1">Your timeline is empty</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">
                      You haven't registered for any events yet. Check out the latest campus fests and technical sessions below!
                    </p>
                    <Link
                      to="/events"
                      className="inline-flex items-center justify-center px-6 py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg"
                    >
                      Find Events to Join
                    </Link>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-brand-200 dark:border-brand-800/60 pl-6 md:pl-8 ml-4 md:ml-6 space-y-8">
                    {registrations.map((reg) => {
                      const event = reg.eventId;
                      if (!event) return null;
                      const isApproved = reg.paymentStatus === 'APPROVED' || reg.paymentStatus === 'SUCCESS';
                      const isRejected = reg.paymentStatus === 'REJECTED' || reg.paymentStatus === 'FAILED';
                      const isPending = reg.paymentStatus === 'PENDING';

                      return (
                        <div key={reg._id || reg.id} className="relative group">
                          <div className="absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white dark:bg-neutral-900 border-2 border-brand-500 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm z-10 group-hover:scale-110 transition-transform">
                            <Clock className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
                          </div>
                          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-2">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                  <Link to={`/event/${event.slug || event.id || event._id}`}>{event.title}</Link>
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  <span className="font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                                    {new Date(event.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(event.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2">
                                <CountdownTimer startTime={event.startTime} endTime={event.endTime} />
                                {reg.paymentStatus && (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    isApproved
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                      : isRejected
                                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                                  }`}>
                                    {isPending && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                                    )}
                                    {isApproved ? 'Payment Verified' : isPending ? 'Payment Under Review' : 'Payment Rejected'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col items-start gap-1">
                              <button
                                onClick={() => setOpenMapEventId(openMapEventId === event._id ? null : event._id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/80 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs hover:shadow-xs"
                              >
                                <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                                <span>Venue: <strong className="text-neutral-900 dark:text-white">{event.venue}</strong></span>
                                {event.venue !== 'Online' && (
                                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline">
                                    ({openMapEventId === event._id ? 'Close Map' : 'Locate on Map'})
                                  </span>
                                )}
                              </button>
                              {openMapEventId === event._id && event.venue !== 'Online' && (
                                <div className="mt-3 w-full h-[240px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 shadow-sm relative transition-all">
                                  <iframe
                                    title={`Map location for ${event.venue}`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venue + ' NIT Jalandhar')}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </section>
          )}

          {/* ── Section B: Club Operations Desk (Student Leads & Coordinators only) ── */}
          {isStudent && (isStudentLead || isCoordinator || operationalMemberships.length > 0) && (
            <section className="py-12 sm:py-16 lg:py-20 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
              <Section>
                <div className="mb-8 sm:mb-10">
                  {/* Section identity */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 mb-4">
                    <i className="ri-shield-star-line text-amber-600 dark:text-amber-400 text-sm" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      {isStudentLead ? 'Club Operations Desk' : 'Coordinator Desk'}
                    </span>
                  </div>
                  <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
                    {isStudentLead ? 'Your Clubs & Leadership' : 'Your Clubs & Coordination'}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {isStudentLead
                      ? 'Manage events, teams, and communications for the clubs you lead.'
                      : 'Coordinate events and announcements for the clubs you support.'}
                  </p>
                </div>

                {/* Per-club operation cards */}
                <div className="space-y-8">
                  {operationalMemberships.map((m) => {
                    const isLead = isStudentLeadRole(m.role);
                    const isCoord = isCoordinatorRole(m.role);
                    const canManageTeam = isLead || hasPermission(user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: m.clubId });
                    const canReviewPayments = isLead || hasPermission(user, PERMISSIONS.PAYMENT_REVIEW, { clubId: m.clubId });
                    const canBroadcast = isLead || isCoord || hasPermission(user, PERMISSIONS.NOTIFICATION_CREATE, { clubId: m.clubId });
                    const canManageEvents = isLead || isCoord || m.canEditEvents || m.canTakeAttendance;

                    return (
                      <div key={m.clubId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        {/* Club header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                          {m.clubLogo ? (
                            <img src={m.clubLogo} alt={m.clubName} className="w-9 h-9 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 text-base font-black">
                              {(m.clubName || 'C').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-white text-base leading-tight">{m.clubName || 'Your Club'}</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600 dark:text-amber-400">
                              {isLead ? 'Student Lead' : isCoord ? 'Club Coordinator' : 'Team Member'}
                            </p>
                          </div>
                          <Link
                            to={`/club-events/${m.clubId}`}
                            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            View All Events <ArrowRightIcon className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Operation tiles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100 dark:divide-neutral-800">
                          {/* Events & Attendance */}
                          {canManageEvents && (
                            <Link
                              to={`/club-events/${m.clubId}`}
                              className="flex flex-col gap-3 p-5 group hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center transition-colors">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-neutral-900 dark:text-white">Events & Attendance</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                                  {isLead || isCoord || m.canEditEvents ? 'Create & manage events, scan QR tickets' : 'Scan QR tickets and check-in attendees'}
                                </p>
                              </div>
                            </Link>
                          )}

                          {/* Team Management - strictly restricted to Student Leads / club.manage_members */}
                          {canManageTeam && (
                            <Link
                              to={`/club/${m.clubId}/team`}
                              className="flex flex-col gap-3 p-5 group hover:bg-cn-blue-50/50 dark:hover:bg-cn-blue-950/20 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-cn-blue-50 dark:bg-cn-blue-950/30 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center transition-colors">
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-neutral-900 dark:text-white">Team & Members</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">Roster, role assignments, invites</p>
                              </div>
                            </Link>
                          )}

                          {/* Payments - strictly restricted to Student Leads / payment.review */}
                          {canReviewPayments && (
                            <Link
                              to="/payments"
                              className="flex flex-col gap-3 p-5 group hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
                                <Wallet className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-neutral-900 dark:text-white">Finance & Receipts</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">Registration fees, verified payments</p>
                              </div>
                            </Link>
                          )}

                          {/* Broadcasts - strictly restricted to Student Leads / Coordinators / notification.create */}
                          {canBroadcast && (
                            <Link
                              to={`/send-notification?clubId=${m.clubId}`}
                              className="flex flex-col gap-3 p-5 group hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-colors">
                                <Bell className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-neutral-900 dark:text-white">Announcements</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">Send alerts to registrants & campus</p>
                              </div>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </section>
          )}

          {/* ── Section C: Faculty Coordinator Desk ───────────────────────── */}
          {isFaculty && (
            <section className="py-12 sm:py-16 lg:py-20 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
              <Section>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/30 border border-cn-blue-200 dark:border-cn-blue-800/50 mb-4">
                    <i className="ri-government-line text-cn-blue-600 dark:text-cn-blue-400 text-sm" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cn-blue-700 dark:text-cn-blue-400">Faculty Coordinator Desk</span>
                  </div>
                  <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
                    Approvals & Oversight
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-cn-blue-50 dark:bg-cn-blue-950/20 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Event Proposals</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                        Review detailed proposals for upcoming club events. Approve for public release or return with comments.
                      </p>
                    </div>
                    <Link to="/my-events" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-all duration-200 group">
                      Review Proposals <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-cn-blue-50 dark:bg-cn-blue-950/20 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center mb-4">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Club Co-ordination</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                        Oversee student memberships, coordinate schedules, and send urgent notifications.
                      </p>
                    </div>
                    <Link to="/clubs" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-all duration-200 group">
                      View Club Directory <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </Section>
            </section>
          )}

          {/* ── Section D: Admin Command Center ───────────────────────────── */}
          {isAdmin && (
            <section className="py-12 sm:py-16 lg:py-20 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
              <Section>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 mb-4">
                    <i className="ri-shield-keyhole-line text-red-600 dark:text-red-400 text-sm" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">Admin Command Center</span>
                  </div>
                  <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
                    Platform Management
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                        <LayoutDashboard className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Core System Stats</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                        Access platform statistics, manage clubs, review transaction logs, and configure core settings.
                      </p>
                    </div>
                    <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group">
                      Open Admin Panel <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                        <Bell className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Broadcast Announcements</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                        Send campus-wide push notifications and official announcements to all registered accounts.
                      </p>
                    </div>
                    <Link to="/send-notification" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group">
                      Create System Broadcast <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </Section>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="relative pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-32 lg:pb-10 bg-cn-surface overflow-hidden">
            <Section className="w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* Left: Text & CTAs */}
                <div className="flex flex-col gap-6 items-center lg:items-start text-center lg:text-left">
                  <ScrollReveal delay={0.2}>
                    <h1 className="font-black text-[clamp(36px,5.5vw,72px)] leading-[1.08] tracking-tight text-neutral-900 dark:text-white ">
                      Discover What's Happening.
                      <br />
                      <span className="text-cn-blue text-[clamp(39px,5.5vw,78px)] ">Be Part of It.</span>
                    </h1>
                  </ScrollReveal>

                  <ScrollReveal delay={0.3}>
                    <div className="flex flex-col gap-8">
                      <p className="text-base md:text-lg font-normal text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
                        Discover campus events, explore student clubs, receive official announcements,
                        and access secure student services—all from one verified platform built for
                        the NIT Jalandhar community.
                      </p>

                      <div className="flex gap-3 flex-wrap justify-center lg:justify-start">
                        <Link
                          to="/events"
                          className="text-white bg-cn-primary hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all duration-200 font-bold text-sm px-6 py-3 inline-flex items-center rounded-full cursor-pointer shadow-md shadow-black/15 dark:shadow-white/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                        >
                          <i className="ri-calendar-event-line text-lg mr-2 font-light" /> Browse Events
                        </Link>

                        <Link
                          to="/clubs"
                          className="text-neutral-800 dark:text-neutral-200 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 transition-all duration-200 font-semibold text-sm px-6 py-3 inline-flex items-center rounded-full cursor-pointer shadow-xs hover:shadow-md hover:border-brand-500/50 hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                        >
                          <i className="ri-group-line text-lg mr-2 text-brand-500 font-light" /> Explore Clubs
                        </Link>

                        <Link
                          to="/register"
                          className="text-white bg-cn-primary hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all duration-200 font-bold text-sm px-6 py-3 inline-flex items-center rounded-full cursor-pointer shadow-md shadow-black/15 dark:shadow-white/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                        >
                          Get Involved Now! <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 sm:gap-12 pt-2">
                        <div className="flex flex-col items-center lg:items-start">
                          <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white leading-none">5K+</span>
                          <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">Students</span>
                        </div>
                        <div className="flex flex-col items-center lg:items-start">
                          <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white leading-none">25+</span>
                          <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">Clubs & Societies</span>
                        </div>
                        <div className="flex flex-col items-center lg:items-start">
                          <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white leading-none">100+</span>
                          <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">Events Every Year</span>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Right: College Building Image */}
                <ScrollReveal delay={0.4} direction="right">
                  <div className="flex items-center justify-center">
                    <img
                      src="/main-building-svg.svg"
                      alt="NIT Jalandhar Main Building"
                      className="w-full max-w-xl h-auto object-contain"
                    />
                  </div>
                </ScrollReveal>
              </div>
            </Section>
          </section>
        </>
      )}

      {/* NEW Featured Events Section */}
      <FeaturedEventsSection />

      <section className="pt-8 pb-16 sm:pt-10 sm:pb-20 lg:pt-12 lg:pb-24 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <Section>
          <ScrollReveal direction="up">
            <div className="mb-10 sm:mb-12">
              <SectionLabel>Latest Happenings</SectionLabel>
              <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-[1.1] tracking-tight">
                What's Buzzing on Campus
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            {/* Show past events only when user is not logged in */}
            <EventFeed limit={6} hideHeader={true} showFilters={false} onlyActive={!!user} isCarousel={true} />
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex justify-center mt-10 sm:mt-12">
              <BtnSecondary to="/events">
                <ArrowRightIcon size={20}>
                  Browse Events
                </ArrowRightIcon>
              </BtnSecondary>
            </div>
          </ScrollReveal>
        </Section>
      </section>

      <section className="py-16 sm:py-20 lg:py-24 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <Section>
          <ScrollReveal direction="up">
            <div className="mb-10 sm:mb-12">
              <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-[1.1] tracking-tight text-center">
                NITJ Clubs & Societies
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <Clubspage isHome={true} />
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex justify-center mt-10 sm:mt-12">
              <BtnSecondary to="/clubs">
                <ArrowRightIcon size={20}>
                  Explore All
                </ArrowRightIcon>
              </BtnSecondary>
            </div>
          </ScrollReveal>
        </Section>
      </section>

      <section className="py-16 sm:py-20 lg:py-24 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <Section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal direction="left">
                <h2 className="font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white leading-[1.1] tracking-tight mb-6">
                  Club<br /><span className="text-brand-600 dark:text-brand-500 text-5xl sm:text-6xl">Hall of Fame</span>
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                  Recognition for the top student organizations at NITJ. Rankings and points are calculated based on hosted events, student participation, and attendee feedback satisfaction ratings.
                </p>
                <Link
                  to="/leaderboard/how-it-works"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cn-blue-200 dark:border-cn-blue-900/60 bg-cn-blue-50/50 dark:bg-cn-blue-950/30 text-xs font-bold text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation uppercase tracking-wider group mb-8 shadow-xs hover:shadow-md"
                >
                  <span>How Points Are Calculated</span>
                  <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
                </Link>
              </ScrollReveal>
            </div>
            <div className="lg:col-span-8">
              <ScrollReveal delay={0.2} direction="right">
                <ClubLeaderboard />
              </ScrollReveal>
            </div>
          </div>
        </Section>
      </section>

      {!user && (
        <>
          {/* Section 1: For Students */}
          <section className="py-16 sm:py-20 lg:py-24 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <Section>
              <ScrollReveal direction="up">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                  {/* Left: text */}
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-cn-blue-600 dark:text-cn-blue-400 mb-3">
                      For Students
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-neutral-900 dark:text-white mb-6 sm:mb-8">
                      Never miss a<br />campus beat{" "}
                      <span className="text-brand-600 dark:text-brand-500">again.</span>
                    </h2>

                    <div className="flex flex-col gap-4">
                      {studentItems.map((item, i) => (
                        <div key={i} className="flex gap-3.5 items-start">
                          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-cn-blue-50 dark:bg-cn-blue-950/30 border border-cn-blue-100 dark:border-cn-blue-900/40 flex items-center justify-center text-cn-blue-600 dark:text-cn-blue-400 text-base">
                            {item.icon}
                          </div>
                          <div className="pt-0.5">
                            <p className="text-xs text-neutral-400 line-through mb-0.5">{item.problem}</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">{item.solution}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Link to="/register" className="inline-flex items-center gap-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg">
                        Join now
                        <i className="ri-arrow-right-line text-sm" />
                      </Link>
                      <Link to="/events" className="inline-flex items-center gap-2 border border-neutral-300 dark:border-neutral-700 hover:border-cn-blue-500/60 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-xs hover:shadow-md">
                        Browse Events
                      </Link>
                    </div>
                  </div>

                  {/* Right: image */}
                  <div className="relative hidden md:block">
                    <img
                      src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80"
                      alt="Student life"
                      className="w-full h-[380px] object-cover rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
                      style={{ filter: "saturate(0.9)" }}
                    />
                    <div className="absolute -bottom-4 -right-4 bg-amber-400 border-2 border-neutral-800 dark:border-neutral-200 rounded-xl px-4 py-3 shadow-md">
                      <p className="text-lg font-black text-cn-text leading-none">1-Click</p>
                      <p className="text-[11px] text-cn-text mt-0.5 font-bold">Event Registration</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </Section>
          </section>

          {/* Section 2: For Clubs & Societies */}
          <section className="py-16 sm:py-20 lg:py-24 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <Section>
              <ScrollReveal direction="up">
                <div className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-cn-blue-600 dark:text-cn-blue-400 mb-3">
                      For Clubs & Societies
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-neutral-900 dark:text-white">
                      Less logistics,{" "}
                      <span className="text-brand-600 dark:text-brand-500">more impact.</span>
                    </h2>
                  </div>
                  <Link
                    to="/clubs"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cn-blue-200 dark:border-cn-blue-900/60 bg-cn-blue-50/50 dark:bg-cn-blue-950/30 text-xs font-bold uppercase tracking-wider text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shadow-xs hover:shadow-md group self-start md:self-auto"
                  >
                    <span>Explore All Societies</span>
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4">
                  {clubFeatures.map((f, i) => (
                    <div
                      key={i}
                      className="p-5 sm:p-6 border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 rounded-2xl hover:border-cn-blue-500/50 hover:bg-white dark:hover:bg-neutral-900 transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="w-10 h-10 bg-cn-blue-50 dark:bg-cn-blue-950/30 text-cn-blue-600 dark:text-cn-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cn-blue-600 group-hover:text-white transition-colors text-lg">
                        {f.icon}
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-white mb-1">{f.title}</p>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </Section>
          </section>

          <section className="py-16 sm:py-20 lg:py-24 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <Section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <ScrollReveal direction="left">
                  <div>
                    <SectionLabel>OUR VISION</SectionLabel>
                    <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight text-neutral-900 dark:text-white mb-6 sm:mb-8">
                      Find More.<br />
                      <span className="text-brand-600 dark:text-brand-500">Connect More.</span>
                    </h2>
                    <div className="space-y-4 text-neutral-600 dark:text-neutral-300 leading-relaxed text-base sm:text-[17px]">
                      <p>
                        Campus life is full of events, communities, announcements and opportunities—but finding them shouldn't be difficult.
                      </p>
                      <p>
                        CampusNode brings everything together, making it easier to discover what's happening, connect with others and be part of campus life.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="right" delay={0.2}>
                  <div className="flex items-center justify-center lg:justify-end">
                    <img
                      src="/what-cn.png"
                      alt="CampusNode Ecosystem"
                      className="w-full max-w-lg h-auto object-contain"
                    />
                  </div>
                </ScrollReveal>
              </div>
            </Section>
          </section>
        </>
      )}


      <section id="team" className="py-16 sm:py-20 lg:py-24 bg-cn-bg border-b border-neutral-200 dark:border-neutral-800 scroll-mt-20 relative overflow-hidden transition-colors duration-300">
        {/* Glow accent */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[600px] opacity-40 dark:opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.12) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <Section className="relative z-10">
          <div className="flex flex-col items-center mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            <ScrollReveal direction="up" delay={0.1}>
              <span className="text-brand-600 dark:text-brand-500 font-bold tracking-[0.2em] text-xs uppercase block mb-3">
                The Innovators
              </span>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4 sm:mb-6">
                The Minds Behind <span className="logofont font-light tracking-wide">CampusNode</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-light max-w-2xl px-2">
                Student creators, architects, and designers crafting the next-generation digital ecosystem for NIT Jalandhar.
              </p>
            </ScrollReveal>
          </div>

          {/* Frosted Team Cards Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 max-w-6xl mx-auto">
            {TEAM_MEMBERS.map((member, idx) => (
              <ScrollReveal key={member.id} direction="up" delay={0.05 * idx}>
                <InsetModernTeamCard member={member} />
              </ScrollReveal>
            ))}
          </div>

          {/* Link to Full Team Page */}
          <ScrollReveal direction="up" delay={0.25} className="mt-12 sm:mt-16 text-center">
            <Link
              to="/team"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
            >
              <span>Explore Team Page & Join Us</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </ScrollReveal>
        </Section>
      </section>
      {/* ── Bottom Call to Action Section ── */}
      {!user && (
        <section className="py-16 sm:py-20 lg:py-24 bg-cn-surface border-b border-neutral-200 dark:border-neutral-800 relative overflow-hidden transition-colors duration-300">
          {/* Glow accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[320px] bg-brand-500/[0.04] dark:bg-brand-500/[0.07] rounded-full blur-[130px] pointer-events-none" />

          <Section className="relative z-10">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <ScrollReveal direction="up" delay={0.1}>
                <span className="text-brand-600 dark:text-brand-500 font-bold tracking-[0.2em] text-xs uppercase block mb-3">
                  STAY CONNECTED
                </span>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2}>
                <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl leading-[1.12] tracking-tight text-neutral-900 dark:text-white mb-4 sm:mb-6">
                  Something Is Always Happening.
                  <br />
                  <span className="text-brand-500">Don't Miss Out.</span>
                </h2>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <p className="text-base sm:text-lg font-normal text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl mx-auto mb-8">
                  Discover events, explore communities, and stay connected to everything happening around you.
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.35}>
                <Link
                  to="/register"
                  className="text-white bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all duration-200 font-bold text-sm px-7 py-3.5 inline-flex items-center rounded-full cursor-pointer shadow-md shadow-black/15 dark:shadow-white/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                >
                  Be Part of It <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                </Link>
              </ScrollReveal>
            </div>
          </Section>
        </section>
      )}

      {celebrationEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4 py-6 overflow-hidden ticket-backdrop-animate">
          {/* Confetti Animation Background Overlay */}
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
            <img
              src="/Confetti.svg"
              alt="Confetti Celebration"
              className="w-full h-full object-cover opacity-90 select-none animate-pulse-slow scale-105"
            />
          </div>

          <div className="bg-cn-surface border border-cn-border rounded-2xl max-w-sm w-full max-h-[85dvh] overflow-y-auto relative z-10 flex flex-col p-6 text-center shadow-2xl ticket-card-animate transition-colors">
            <div className="relative shrink-0">
              <img src="/Trophy.svg" alt="Trophy" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto animate-bounce-slow" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-cn-text mt-4 leading-tight">Congratulations!</h3>
            <p className="text-sm sm:text-base font-semibold text-brand-500 dark:text-brand-400 mt-1.5 leading-tight">
              You secured Rank #{celebrationWinnerRank} in {celebrationEvent.title}!
            </p>

            <p className="text-xs text-cn-text-muted mt-3 leading-relaxed italic px-2">
              "Hard work pays off! Congratulations to the winners of {celebrationEvent.title}. Keep striving for excellence and inspiring those around you."
            </p>

            <button
              onClick={acknowledgeWin}
              className="mt-6 w-full py-3 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-cn-bg text-white font-bold rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 text-xs cursor-pointer"
            >
              Claim Victory 🏆
            </button>
          </div>
        </div>
      )}

      <HomeFooter />

    </div>
  );
};

export default Home;