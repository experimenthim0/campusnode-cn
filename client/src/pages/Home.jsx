import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserEvents } from '../services/eventService';

import { Clock, MapPin, Calendar, Bookmark, Compass, User, Plus, Wallet, Users, Bell, LayoutDashboard, Search } from 'lucide-react';
import EventFeed from './EventFeed';
import Clubspage from './Clubspage';
import ClubLeaderboard from '../components/ClubLeaderboard';
import HomeFooter from '../components/HomeFooter';
import Maintainance from './Maintainance';
import ScrollReveal from '../components/ScrollReveal';
import {ArrowRightIcon} from '../components/ui/arrow-right';
import ShimmerText from '../components/ShimmerText';
import { InstagramIcon } from '@/components/ui/instagram';
import { GithubIcon } from '@/components/ui/github';
import { LinkedinIcon } from '@/components/ui/linkedin';
import { MailIcon, Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';
import { AtSignIcon } from '@/components/ui/at-sign';
import { EarthIcon } from '@/components/ui/earth';
import { ZapIcon } from '@/components/ui/zap';
// Ticker items
const tickerItems = [
  'Workshops', 'Hackathons', 'Cultural Fests', 'Sports Meets',
  'Guest Lectures', 'Club Recruitments', 'Tech Talks', 'Campus Events',
];




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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
        Finished
      </span>
    );
  }

  if (timeLeft.status === 'LIVE') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
        🔴 Live • {timeLeft.text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
      ⏳ {timeLeft.text}
    </span>
  );
};

// ── Reusable section label ──────────────────────────────────────────────────
const SectionLabel = ({ children, light = false }) => (
  <div className="flex items-center gap-2 mb-5 text-orange-600 dark:text-orange-500">
    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{children}</span>
  </div>
);

// ── Primary button ──────────────────────────────────────────────────────────
const BtnPrimary = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white text-[13px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 transition-all hover:-translate-y-px shadow-sm"
  >
    {children}
  </Link>
);

// ── Secondary button ────────────────────────────────────────────────────────
const BtnSecondary = ({ to, children }) => (
  <Link
    to={to}
    className="text-neutral-900 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-all duration-200 ease-in-out font-semibold leading-5 text-sm px-5 py-2.5 inline-flex items-center rounded-full cursor-pointer shadow-xs hover:-translate-y-px"
  >
    {children}
  </Link>
);

const DOMAINS = [
  { id: 'core',     label: 'Core Architecture',     accent: 'var(--domain-core)' },
  { id: 'frontend', label: 'Frontend Engineering',  accent: 'var(--domain-frontend)' },
  { id: 'design',   label: 'Product Design',        accent: 'var(--domain-design)' },
  { id: 'ops',      label: 'Operations & Relations', accent: 'var(--domain-ops)' },
];

const TEAM_MEMBERS = [];
// add team members here

const InitialsAvatar = ({ name }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none bg-zinc-100 dark:bg-zinc-800"
      aria-hidden="true"
    >
      <span
        className="font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500"
        style={{
          fontSize: 'clamp(1.25rem, 4vw, 2rem)',
          letterSpacing: '0.12em',
        }}
      >
        {initials}
      </span>
    </div>
  );
};

const MemberCard = ({ member, domainAccent }) => {
  const [hovered, setHovered] = useState(false);
  const hasImage = Boolean(member.imageUrl);

  return (
    <div
      className="flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <figure
        className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-900"
        style={{
          aspectRatio: '1 / 1',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: hovered
            ? 'rgba(var(--border-hover-rgb), 0.5)'
            : 'rgba(var(--border-base-rgb), 0.15)',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease',
          willChange: 'transform',
          boxShadow: hovered
            ? '0 12px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)'
            : '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: domainAccent,
            opacity: hovered ? 1 : 0.45,
            transition: 'opacity 0.25s ease',
            zIndex: 2,
          }}
        />

        {hasImage ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            style={{
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
            }}
          />
        ) : (
          <InitialsAvatar name={member.name} />
        )}

        <div
          className="absolute inset-0 flex flex-col justify-end p-3"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 55%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.28s ease',
            zIndex: 3,
          }}
        >
          <div className="flex flex-wrap gap-1">
            {(member.techStack || []).map((tech) => (
              <span
                key={tech}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.13)',
                  border: '0.5px solid rgba(255,255,255,0.22)',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </figure>

      <figcaption className="mt-3 flex flex-col gap-2">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
              {member.name}
            </h3>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'var(--batch-bg)',
                color: 'var(--batch-text)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {member.batch}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
            {member.role}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed line-clamp-2 italic">
            {member.contribution}
          </p>
        </div>

        <div className="flex flex-row gap-3 items-center mt-0.5">
          {member.socials.github && (
            <a
              href={member.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              <Github size={14} />
            </a>
          )}
          {member.socials.linkedin && (
            <a
              href={member.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              <Linkedin size={14} />
            </a>
          )}
          {member.socials.twitter && (
            <a
              href={member.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              <Twitter size={14} />
            </a>
          )}
          {member.socials.portfolio && (
            <a
              href={member.socials.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </figcaption>
    </div>
  );
};

const DomainSection = ({ domain, members }) => {
  if (members.length === 0) return null;
  const domainMeta = DOMAINS.find((d) => d.id === domain);
  if (!domainMeta) return null;

  return (
    <div className="mb-16 last:mb-0">
      <ScrollReveal direction="up" delay={0.1}>
        <div className="flex items-center gap-3 mb-8">
          <div
            aria-hidden="true"
            style={{
              width: '18px',
              height: '2px',
              background: domainMeta.accent,
              borderRadius: '1px',
              flexShrink: 0,
            }}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {domainMeta.label}
          </span>
          <div
            aria-hidden="true"
            style={{
              flex: 1,
              height: '0.5px',
              background: 'var(--divider-color)',
            }}
          />
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-8 sm:gap-y-12">
        {members.map((member, idx) => (
          <ScrollReveal
            key={member.id}
            direction="up"
            delay={0.1 + idx * 0.08}
          >
            <MemberCard
              member={member}
              domainAccent={domainMeta.accent}
            />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { user: authUser, role: authRole } = useAuth();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const [registrations, setRegistrations] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [openMapEventId, setOpenMapEventId] = useState(null);
  const [tab, setTab] = useState("students");
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
        if (ev && ev.showWinner && ev.winners && !acknowledged.includes(ev.id || ev._id)) {
          const winInfo = ev.winners.find(w => 
            (w.rollNo && w.rollNo.trim() === user.rollNo?.trim()) ||
            (w.name && w.name.toLowerCase().includes(user.name.toLowerCase()))
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

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--x-px", `${x}px`);
    e.currentTarget.style.setProperty("--y-px", `${y}px`);
  };
  
   const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  if (isMaintenance) {
    return <Maintainance />;
  }
  const bgImages = ["mainbuilding.jpeg"];
  const [bgIndex, setBgIndex] = useState(0);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setBgIndex((prev) => (prev + 1) % bgImages.length);
  //   }, 4000);
  //   return () => clearInterval(interval);
  // }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  const isStudent = !role || role === 'member' || role === 'student';
  const isClub = role === 'club';
  const isFaculty = role === 'facultyCoordinator';
  const isAdmin = role === 'admin' || role === 'lostFoundAdmin' || role === 'paymentAdmin';

  let dashboardTag = 'My Node Panel';
  let greetingName = firstName;
  let greetingSubtext = 'Ready to manage your campus drive today?';
  let quickActions = [];

  if (isStudent) {
    dashboardTag = 'Student Hub';
    greetingSubtext = 'Explore active club fests, technical hackathons, and sports events!';
    quickActions = [
      { to: '/events', label: 'Browse Events', icon: Compass },
      { to: '/lost-found', label: 'Lost & Found', icon: Search },
      { to: '/my-events', label: 'My Tickets', icon: Bookmark },
      { to: '/profile', label: 'My Profile', icon: User, primary: true },
    ];
  } else if (isClub) {
    dashboardTag = 'Club Organizer Portal';
    greetingName = user?.clubName || user?.name || 'Club Organizer';
    greetingSubtext = 'Manage your events, coordinate payouts, and issue certificates.';
    quickActions = [
      { to: '/create', label: 'Create Event', icon: Plus },
      { to: '/my-events', label: 'My Events', icon: Calendar },
      { to: `/club/${user?.clubId || user?.id || 'my-club'}/team`, label: 'Members', icon: Users },
      { to: '/profile', label: 'Club Profile', icon: User, primary: true },
    ];
  } else if (isFaculty) {
    dashboardTag = 'Faculty Coordinator Panel';
    greetingName = user?.name ? `Prof. ${user.name.split(' ')[0]}` : 'Faculty Coordinator';
    greetingSubtext = 'Review club requests, approve pending events, and view logs.';
    quickActions = [
      { to: '/my-events', label: 'Review Events', icon: Calendar },
      { to: '/clubs', label: 'Explore Clubs', icon: Users },
      { to: '/notifications', label: 'Announcements', icon: Bell },
      { to: '/profile', label: 'My Profile', icon: User, primary: true },
    ];
  } else if (isAdmin) {
    dashboardTag = 'Admin Command Center';
    greetingSubtext = 'Oversee campus fests, payouts, moderation queues, and broadcasts.';
    quickActions = [
      { to: '/admin-dashboard', label: 'Admin Panel', icon: LayoutDashboard },
      { to: '/send-notification', label: 'Broadcast Info', icon: Bell },
      { to: '/events', label: 'Browse Events', icon: Compass },
      { to: '/profile', label: 'My Profile', icon: User, primary: true },
    ];
  }

  return (
    <div className="myfont text-neutral-900 bg-[#fafafa] dark:text-neutral-100 dark:bg-[#0a0a0a] transition-colors duration-300">

      {user ? (
        <>
          {/* ── "MY NODE" CONTROL PANEL ─────────────────────────────────────── */}
          <section className="relative pt-28 pb-12 bg-white dark:bg-[#0c0c0c] border-b border-neutral-200 dark:border-neutral-800/80 text-neutral-900 dark:text-white transition-colors duration-300 overflow-hidden">
            {/* Glow Effects */}
            {/* <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.05] dark:bg-orange-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] rounded-full blur-[100px] pointer-events-none" /> */}
            
            <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-neutral-200 dark:border-neutral-800">
                {/* User Greeting Widget */}
                <div className="flex items-center gap-4">
                  <div>
                    {/* <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 ">{dashboardTag}</span>
                    </div> */}
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white mt-1">
                      Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-400 dark:to-amber-400">{greetingName}</span>
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light mt-1">
                      {greetingSubtext}
                    </p>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3">
                  {quickActions.map((action, idx) => {
                    const IconComponent = action.icon;
                    return (
                      <Link
                        key={idx}
                        to={action.to}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition-all hover:-translate-y-0.5 cursor-pointer shadow-sm min-w-0 ${
                          action.primary 
                            ? "bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black border border-black dark:border-white" 
                            : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800"
                        }`}
                      >
                        <IconComponent className={action.primary ? "w-3.5 h-3.5 sm:w-4 sm:h-4 text-white dark:text-black shrink-0" : "w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0"} />
                        <span className="truncate">{action.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ── PERSONALIZED TIMELINE / MANAGEMENT PANEL ─────────────────────── */}
          <section className="py-16 bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
              <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <SectionLabel>{isStudent ? "Your Timeline" : "Management Dashboard"}</SectionLabel>
                  <h2 className="font-black text-[clamp(28px,4vw,40px)] text-neutral-900 dark:text-white leading-tight tracking-tight">
                    {isStudent ? "My Registered Events" : isClub ? "Club Hub" : isFaculty ? "Approvals Dashboard" : "Platform Management"}
                  </h2>
                </div>
                {isStudent && (
                  <Link
                    to="/my-events"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 hover:underline transition-all"
                  >
                    Manage Tickets & QR Codes <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 shrink-0" />
                  </Link>
                )}
              </div>

              {isStudent ? (
                timelineLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
                    <ShimmerText text="Loading your timeline..." className="text-xs font-semibold tracking-wider uppercase" />
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto">
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-1">Your timeline is empty</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">
                      You haven't registered for any events yet. Check out the latest campus fests and technical sessions below!
                    </p>
                    <Link
                      to="/events"
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm"
                    >
                      Find Events to Join
                    </Link>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-orange-100 dark:border-orange-900/40 pl-6 md:pl-8 ml-4 md:ml-6 space-y-8">
                    {registrations.map((reg) => {
                      const event = reg.eventId;
                      if (!event) return null;
                      
                      return (
                        <div key={reg._id} className="relative group">
                          {/* Timeline Node Icon */}
                          <div className="absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white dark:bg-neutral-900 border-2 border-orange-500 flex items-center justify-center text-orange-600 shadow-sm z-10 group-hover:scale-110 transition-transform">
                            <Clock className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
                          </div>

                          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-2">
                                {/* Event Title */}
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-orange-600 transition-colors">
                                  <Link to={`/event/${event.slug || event.id || event._id}`}>
                                    {event.title}
                                  </Link>
                                </h3>
                                
                                {/* DateTime */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  <span className="font-semibold text-orange-600 uppercase tracking-wide">
                                    {new Date(event.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(event.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              {/* Live Countdown Badge */}
                              <div>
                                <CountdownTimer startTime={event.startTime} endTime={event.endTime} />
                              </div>
                            </div>

                            {/* Map trigger and venue */}
                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col items-start gap-1">
                              <button
                                onClick={() => setOpenMapEventId(openMapEventId === event._id ? null : event._id)}
                                className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors"
                              >
                                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>Venue: <strong className="text-neutral-900 dark:text-white">{event.venue}</strong></span>
                                {event.venue !== 'Online' && (
                                  <span className="text-[10px] text-orange-600 hover:underline">
                                    ({openMapEventId === event._id ? 'Close Map' : 'Locate on Map'})
                                  </span>
                                )}
                              </button>

                              {/* Collapsible interactive map */}
                              {openMapEventId === event._id && event.venue !== 'Online' && (
                                <div className="mt-3 w-full h-[240px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm relative transition-all">
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
                )
              ) : (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isClub && (
                    <>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Events & Attendance</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Organize campus fests, hackathons, and technical talks. Use the check-in scanner to verify QR code tickets and record live attendance.
                          </p>
                        </div>
                        <Link to="/my-events" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          Manage Club Events <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <Wallet className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Finance & Payouts</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Track event registrations fees, view verified receipts, update bank details, and monitor payout requests.
                          </p>
                        </div>
                        <Link to="/payments" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          Track Financials & Payments <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </>
                  )}
                  {isFaculty && (
                    <>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Pending Proposals</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Review detailed proposals for upcoming club events. Approve them for public release or send them back with coordinator comments.
                          </p>
                        </div>
                        <Link to="/my-events" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          Review Proposals <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <Users className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Club Co-ordination</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Oversee active student memberships, coordinate schedules, and send urgent notifications or alerts to students.
                          </p>
                        </div>
                        <Link to="/clubs" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          View Club Directory <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <LayoutDashboard className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Core System Stats</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Access system statistics, register or block clubs, review payout requests, and maintain core platform configurations.
                          </p>
                        </div>
                        <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          Open Admin Control Panel <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <Bell className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">Broadcast Announcements</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                            Send direct push notifications and official announcements to all registered student accounts.
                          </p>
                        </div>
                        <Link to="/send-notification" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors mt-auto group">
                          Create System Broadcast <ArrowRightIcon className="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* ── HERO ─────────────────────────────────────────────────────────── */}
          <section className="relative flex flex-col justify-center pt-22 pb-8 lg:pt-36 lg:pb-12 overflow-hidden">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {bgImages.map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt="University Campus" 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${bgIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/20 to-white dark:from-[#0a0a0a]/10 dark:via-[#0a0a0a]/60 dark:to-[#0a0a0a]"></div>
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full">
              {/* Headline */}
              <ScrollReveal delay={0.2}>
                <h1 className="font-black text-[clamp(36px,5.5vw,72px)] leading-[1.08] tracking-tight text-white dark:text-white text-center mx-auto max-w-5xl">
  Everything at <span className="text-orange-500">NIT Jalandhar.</span>
  <br />
  One Platform.
</h1>
              </ScrollReveal>

              {/* Sub + CTAs */}
              <ScrollReveal delay={0.3}>
                <div className="mt-10 flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
                  <div className="max-w-2xl">
                    <p className="text-base md:text-lg font-normal text-white/90 dark:text-neutral-300 leading-relaxed max-w-3xl mx-auto">
  Discover campus events, explore student clubs, receive official announcements,
  and access secure student services—all from one verified platform built for
  the NIT Jalandhar community.
</p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Link
                      to="/events"
                      className="text-white bg-[#0f1419] hover:bg-transparent hover:text-[#0a0a0a] hover:border-[#0a0a0a] dark:bg-[#f5f5f5] dark:text-[#0a0a0a] dark:hover:bg-transparent dark:hover:text-[#f5f5f5] dark:hover:border-[#f5f5f5] transition-all duration-200 ease-in-out focus:ring-4 focus:outline-none focus:ring-[#0f1419]/50 box-border border border-transparent font-medium leading-5 text-sm px-4 py-2.5 inline-flex items-center rounded-4xl cursor-pointer"
                    >
                      <i className="ri-calendar-event-line text-lg mr-2" /> Browse Events
                    </Link>

                    <Link
                      to="/clubs"
                      className="text-white bg-[#0f1419] hover:bg-transparent hover:text-[#0a0a0a] hover:border-[#0a0a0a] dark:bg-[#f5f5f5] dark:text-[#0a0a0a] dark:hover:bg-transparent dark:hover:text-[#f5f5f5] dark:hover:border-[#f5f5f5] transition-all duration-200 ease-in-out focus:ring-4 focus:outline-none focus:ring-[#0f1419]/50 box-border border border-transparent font-medium leading-5 text-sm px-4 py-2.5 inline-flex items-center rounded-4xl cursor-pointer"
                    >
                      <i className="ri-group-line text-lg mr-2" /> Explore Clubs
                    </Link>

                    <Link
                      to="/register"
                      className="text-white bg-[#0f1419] hover:bg-transparent hover:text-[#0a0a0a] hover:border-[#0a0a0a] dark:bg-[#f5f5f5] dark:text-[#0a0a0a] dark:hover:bg-transparent dark:hover:text-[#f5f5f5] dark:hover:border-[#f5f5f5] transition-all duration-200 ease-in-out focus:ring-4 focus:outline-none focus:ring-[#0f1419]/50 box-border border border-transparent font-medium leading-5 text-sm px-4 py-2.5 inline-flex items-center rounded-4xl cursor-pointer"
                    >
                    <ArrowRightIcon size={18}>
                      Join CampusNode
                    </ArrowRightIcon>
                    </Link>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-800 dark:text-white/80 hidden sm:flex ">

  <div className="flex items-center gap-2">
    <i className="ri-shield-check-line text-orange-500" />
    Verified Student Access
  </div>

  <div className="flex items-center gap-2">
    <i className="ri-community-line text-orange-500" />
    Official Club Community
  </div>

  <div className="flex items-center gap-2">
    <i className="ri-lock-line text-orange-500" />
    Secure Campus Services
  </div>

</div>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </>
      )}

      {/* ── LATEST EVENTS (Shared) ────────────────────────────────────────── */}
      <section className="pt-12 pb-16 bg-white dark:bg-[#0c0c0c] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
          <ScrollReveal direction="up">
            <div className="mb-12">
              <SectionLabel>Latest Happenings</SectionLabel>
              <h2 className="font-black text-[clamp(28px,4vw,44px)] text-neutral-900 dark:text-white leading-[1.1] tracking-wide">
                What's Buzzing<br />on Campus
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            {/* Show past events only when user is not logged in */}
            <EventFeed limit={6} hideHeader={true} showFilters={false} onlyActive={!!user} />
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex justify-center mt-12">
              <BtnSecondary to="/events">
                <ArrowRightIcon size={20}>
                  Browse Events 
                </ArrowRightIcon>
              </BtnSecondary>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CLUBS (Shared) ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="mb-12">
              <h2 className="font-black text-[clamp(28px,4vw,44px)] text-neutral-900 dark:text-white leading-[1.1] tracking-wide text-center">
                NITJ Clubs & Societies
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <Clubspage isHome={true} />
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex justify-center mt-12">
              <BtnSecondary to="/clubs">
                <ArrowRightIcon size={20}>
                  Explore All 
                </ArrowRightIcon>
              </BtnSecondary>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── LEADERBOARD (Shared) ──────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-[#0c0c0c] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal direction="left">
                <SectionLabel>Campus Rankings</SectionLabel>
                <h2 className="font-black text-[clamp(28px,4vw,44px)] text-neutral-900 dark:text-white leading-[1.1] tracking-wide mb-6">
                  Club<br /><span className="text-orange-600 dark:text-orange-500 text-6xl">Hall of Fame</span>
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">
                  Recognition for the most active student organizations at NITJ. Rankings are updated automatically based on successfully completed events organized through CampusNode.
                </p>
              </ScrollReveal>
            </div>
            <div className="lg:col-span-8">
              <ScrollReveal delay={0.2} direction="right">
                <ClubLeaderboard />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <>
          {/* ── FOR STUDENTS (Public Only) ─────────────────────────────────── */}
          <section className="py-20 bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-6">
              {/* Tab switcher */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-12">
                {["students", "clubs"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer
                      ${tab === t
                        ? "border-orange-600 text-orange-600 dark:border-orange-500 dark:text-orange-400"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      }`}
                  >
                    {t === "students" ? "For Students" : "For Clubs & Societies"}
                  </button>
                ))}
              </div>

              {/* ── STUDENTS ── */}
              {tab === "students" && (
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  {/* Left: text */}
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-orange-600 dark:text-orange-500 mb-3">
                      Students
                    </p>
                    <h2 className="text-4xl font-black leading-tight tracking-tight text-neutral-900 dark:text-white mb-8">
                      Never miss a<br />campus beat{" "}
                      <span className="text-orange-600 dark:text-orange-500">again.</span>
                    </h2>

                    <div className="flex flex-col gap-4">
                      {studentItems.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            {item.icon}
                          </div>
                          <div className="pt-0.5">
                            <p className="text-xs text-neutral-400 line-through mb-0.5">{item.problem}</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">{item.solution}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Link to="/register" className="mt-8 inline-flex items-center gap-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors text-white dark:text-black text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm">
                      Join now
                      <i className="ri-arrow-right-line" />
                    </Link>
                  </div>

                  {/* Right: image */}
                  <div className="relative hidden md:block">
                    <img
                      src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80"
                      alt="Student life"
                      className="w-full h-[400px] object-cover rounded-xl border border-neutral-200 dark:border-neutral-800"
                      style={{ filter: "saturate(0.9)" }}
                    />
                    <div className="absolute -bottom-4 -right-4 bg-amber-400 border-2 border-neutral-800 dark:border-neutral-200 rounded-lg px-4 py-3 shadow-md">
                      <p className="text-lg font-black text-[#0d1422] leading-none">1-Click</p>
                      <p className="text-[11px] text-[#0d1422] mt-0.5 font-bold">Event Registration</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLUB HEADS ── */}
              {tab === "clubs" && (
                <div>
                  <div className="mb-10">
                    <p className="text-xs font-semibold tracking-widest uppercase text-orange-600 dark:text-orange-500 mb-3">
                      Clubs & Societies
                    </p>
                    <h2 className="text-4xl font-black leading-tight tracking-tight text-neutral-900 dark:text-white">
                      Less logistics,{" "}
                      <span className="text-orange-600 dark:text-orange-500">more impact.</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {clubFeatures.map((f, i) => (
                      <div
                        key={i}
                        className="p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl hover:border-orange-400 dark:hover:border-orange-500 transition-colors group"
                      >
                        <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          {f.icon}
                        </div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{f.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── ABOUT CAMPUSNODE ("Our Vision") (Public Only) ──────────────── */}
          <section className="py-24 bg-white dark:bg-[#0c0c0c] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ScrollReveal direction="left">
                  <div>
                    <SectionLabel>Our Vision</SectionLabel>
                    <h2 className="font-black text-[clamp(32px,4vw,56px)] leading-[1.1] tracking-tight text-neutral-900 dark:text-white mb-8">
                      Creating a Truly<br /><span className="text-orange-600 dark:text-orange-500">Connected Campus.</span>
                    </h2>
                    <div className="space-y-6 text-neutral-700 dark:text-neutral-300 leading-relaxed text-[17px]">
                      <p>
                        CampusNode serves as the central hub for the NIT Jalandhar community. By bringing together events, clubs, announcements, and a structured Lost & Found system, we simplify campus life. We believe that accessing campus resources, engaging with student organizations, and finding opportunities should be simple and seamless.
                      </p>
                      <p>
                        Our vision is to build a vibrant and digitally integrated ecosystem where student groups can reach their audience effectively and students can easily discover their passions, collaborate on ideas, and never miss out on key campus events and opportunities.
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-8 mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="min-w-0">
                        <div className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white">25+</div>
                        <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-neutral-400 mt-1">Active Clubs & Societies</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white">5k+</div>
                        <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-neutral-400 mt-1">Student Base</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white">100%</div>
                        <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-neutral-400 mt-1">NITJ Focused</div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="right" delay={0.2}>
                  <div className="flex gap-4 items-center justify-center lg:justify-end">
                    <div className="w-1/2 max-w-[280px] aspect-[3/4] border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden translate-y-8 shadow-sm">
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <img src="/mainbuilding.jpeg" alt="NITJ Main Building" className="w-full h-full object-cover"/>
                      </div>
                    </div>
                    <div className="w-1/2 max-w-[280px] aspect-[3/4] border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden -translate-y-4 shadow-sm">
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <img src="/itbuilding.jpeg" alt="NITJ IT Building" className="w-full h-full object-cover"/>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── FACULTY & TEAM ────────────────────────────────────────────────── */}
      <style>{`
        :root {
          --domain-core:     #ea580c;
          --domain-frontend: #2563eb;
          --domain-design:   #9333ea;
          --domain-ops:      #059669;

          --avatar-bg:       #f4f4f5;
          --avatar-text:     #71717a;

          --batch-bg:        rgba(234,88,12,0.08);
          --batch-text:      #ea580c;

          --divider-color:   rgba(0,0,0,0.07);
          --border-base-rgb: 0,0,0;
          --border-hover-rgb: 234,88,12;
        }

        .dark {
          --avatar-bg:       #27272a;
          --avatar-text:     #a1a1aa;

          --batch-bg:        rgba(249,115,22,0.12);
          --batch-text:      #fb923c;

          --divider-color:   rgba(255,255,255,0.07);
          --border-base-rgb: 255,255,255;
          --border-hover-rgb: 249,115,22;
        }

        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --avatar-bg:       #27272a;
            --avatar-text:     #a1a1aa;
            --batch-bg:        rgba(249,115,22,0.12);
            --batch-text:      #fb923c;
            --divider-color:   rgba(255,255,255,0.07);
            --border-base-rgb: 255,255,255;
            --border-hover-rgb: 249,115,22;
          }
        }
      `}</style>
      <section id="team" className="py-24 bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-neutral-800 scroll-mt-20 relative overflow-hidden transition-colors duration-300">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-orange-500/[0.02] dark:bg-orange-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center mb-16 text-center max-w-3xl mx-auto">
            <ScrollReveal direction="up" delay={0.1}>
              <span className="text-orange-600 dark:text-orange-500 font-bold tracking-[0.2em] text-xs uppercase block mb-3">
                The Innovators
              </span>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-6">
                The Minds Behind <span className="logofont font-light">Campus<span className="text-orange-600 dark:text-orange-500">Node</span></span>
              </h2>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-light mb-6">
                We are student innovators, creators, and engineers building the digital gateway for NITJ.
              </p>

            </ScrollReveal>
          </div>

          {TEAM_MEMBERS.length > 0 ? (
            <div>
              {DOMAINS.map((domain) => {
                const members = TEAM_MEMBERS.filter((m) => m.department === domain.id);
                return (
                  <DomainSection
                    key={domain.id}
                    domain={domain.id}
                    members={members}
                  />
                );
              })}
            </div>
          ) : (
            <ScrollReveal direction="up" delay={0.2}>
              <div
                className="mx-auto text-center flex items-center justify-center flex-col"
                style={{
                  maxWidth: '480px',
                  padding: '64px 32px',
                  border: '0.5px solid',
                  borderColor: 'rgba(234,88,12,0.18)',
                  borderRadius: '20px',
                  background: 'rgba(234,88,12,0.02)',
                   
                }}
              >
               
                  <ZapIcon style={{ fontSize: '22px' }} className='mb-4' />
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                  Team expansion in progress
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-light">
                  Our roster is being assembled. Check back soon — great things are coming together.
                </p>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ── Celebration Winner Modal with Confetti ── */}
      {celebrationEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-lg px-4 py-6 overflow-hidden ticket-backdrop-animate">
          {/* Confetti Animation Background Overlay */}
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
            <img
              src="/Confetti.svg"
              alt="Confetti Celebration"
              className="w-full h-full object-cover opacity-90 select-none animate-pulse-slow scale-105"
            />
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-sm w-full max-h-[85dvh] overflow-y-auto relative z-10 flex flex-col p-6 text-center shadow-2xl ticket-card-animate">
            <div className="relative shrink-0">
              <img src="/Trophy.svg" alt="Trophy" className="w-28 h-28 sm:w-36 sm:h-36 mx-auto animate-bounce-slow" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
            </div>
            
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-4 uppercase tracking-wider">Congratulations!</h3>
            <p className="text-base font-extrabold text-neutral-900 dark:text-white mt-1 leading-tight">
              You secured Rank #{celebrationWinnerRank} in {celebrationEvent.title}!
            </p>
            
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4 leading-relaxed italic px-2">
              "Hard work pays off! Congratulations to the winners of {celebrationEvent.title}. Keep striving for excellence and inspiring those around you."
            </p>
            
            <button
              onClick={acknowledgeWin}
              className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-full transition shadow-sm border-0 outline-none text-xs uppercase tracking-wider cursor-pointer"
            >
              Claim Victory 🏆
            </button>
          </div>
        </div>
      )}

      {/* Home Footer */}
      <HomeFooter />

    </div>
  );
};

export default Home;