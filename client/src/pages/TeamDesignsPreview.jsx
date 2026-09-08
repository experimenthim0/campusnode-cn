import React, { useState } from 'react';
import {
  User,
  Copy,
  Plus,
  Check,
  Sparkles,
  Github,
  Linkedin,
  Twitter,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Heart
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

// ── Verified Badge SVG Component ──────────────────────────────────────────────
const VerifiedBadge = ({ variant = 'green', className = 'w-4 h-4' }) => {
  const isWhite = variant === 'white';
  return (
    <svg
      className={`${className} inline-block flex-shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified team member"
    >
      <path
        d="M9.707 2.293a1 1 0 011.414 0l1.414 1.414a1 1 0 00.707.293h2a1 1 0 011 1v2a1 1 0 00.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414a1 1 0 00-.293.707v2a1 1 0 01-1 1h-2a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 00-.707-.293h-2a1 1 0 01-1-1v-2a1 1 0 00-.293-.707L2.293 11.12a1 1 0 010-1.414l1.414-1.414a1 1 0 00.293-.707v-2a1 1 0 011-1h2a1 1 0 00.707-.293l1.414-1.414z"
        fill={isWhite ? '#FFFFFF' : '#16A34A'}
      />
      <path
        d="M8.5 11.5L10.5 13.5L15 9"
        stroke={isWhite ? '#09090B' : '#FFFFFF'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ── Default Dummy Data (Exact match from the provided reference) ──────────────
const DEFAULT_SOPHIE = {
  id: 'sophie-bennett',
  name: 'Sophie Bennett',
  role: 'Product Designer',
  bio: 'Product Designer who focuses on simplicity & usability.',
  bioAlt: 'A Product Designer focused on intuitive user experiences.',
  imageUrl: '/sophie-bennett.jpg',
  fallbackUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  stats: {
    followers: 312,
    projects: 48,
  },
  department: 'design',
  batch: "CSE '28",
  socials: {
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
  },
};

// ── Full Team Data for Grid Scalability ───────────────────────────────────────
const TEAM_MEMBERS = [
  {
    id: '1',
    name: 'Sophie Bennett',
    role: 'Product Designer',
    bio: 'Product Designer who focuses on simplicity & usability.',
    bioAlt: 'A Product Designer focused on intuitive user experiences.',
    imageUrl: '/sophie-bennett.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 312, projects: 48 },
    department: 'design',
    batch: "Design '27",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
  {
    id: '2',
    name: 'Himanshu Yadav',
    role: 'Lead Architect & Core Engineer',
    bio: 'Architected the real-time event bus and high-throughput QR ticket engine.',
    bioAlt: 'Building distributed campus infrastructure with micro-latency performance.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 520, projects: 64 },
    department: 'core',
    batch: "CSE '28",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
  {
    id: '3',
    name: 'Aarav Sharma',
    role: 'Frontend Architect',
    bio: 'Designs fluid motion primitives and responsive layout engines for CampusNode.',
    bioAlt: 'Crafting responsive, animation-rich student web experiences.',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 418, projects: 39 },
    department: 'frontend',
    batch: "CSE '27",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
  {
    id: '4',
    name: 'Ananya Patel',
    role: 'Security & Auth Engineer',
    bio: 'Secures OAuth contracts, RBAC tokens, and zero-trust student auth pipelines.',
    bioAlt: 'Specialist in cryptographic ticket signing and RBAC hardening.',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 388, projects: 42 },
    department: 'core',
    batch: "ECE '27",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: '5',
    name: 'Kabir Mehta',
    role: 'DevOps & SRE Specialist',
    bio: 'Orchestrates serverless edge functions and Dockerized cluster deployments.',
    bioAlt: 'Automates zero-downtime CI/CD pipelines across AWS and Vercel.',
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 295, projects: 31 },
    department: 'ops',
    batch: "IT '27",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
  {
    id: '6',
    name: 'Riya Sen',
    role: 'Design Systems Lead',
    bio: 'Builds coherent design tokens, micro-interactions, and design guidelines.',
    bioAlt: 'Creating accessible typography scales and unified dark-mode tokens.',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    stats: { followers: 342, projects: 53 },
    department: 'design',
    batch: "CSE '28",
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CARD DESIGN 1: Inset Solid Card (Left Card in Image)
// Pure solid surface with an inset framed photo container, green verified badge,
// and soft neutral footer.
// ══════════════════════════════════════════════════════════════════════════════
export const TeamCardDesign1 = ({ data = DEFAULT_SOPHIE, isFollowed, onToggleFollow }) => {
  const [internalFollow, setInternalFollow] = useState(false);
  const following = isFollowed !== undefined ? isFollowed : internalFollow;
  const toggle = () => {
    if (onToggleFollow) onToggleFollow();
    else setInternalFollow(!internalFollow);
  };

  const followersCount = (data?.stats?.followers || 312) + (following ? 1 : 0);

  return (
    <div className="w-full max-w-[325px] mx-auto bg-white dark:bg-zinc-900 rounded-[32px] p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] border border-zinc-200/90 dark:border-zinc-800 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] flex flex-col justify-between select-none">
      {/* Top Inset Photo Container */}
      <div className="w-full aspect-[1/1.08] rounded-[24px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative group">
        <img
          src={data.imageUrl}
          alt={data.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (data.fallbackUrl && e.currentTarget.src !== data.fallbackUrl) {
              e.currentTarget.src = data.fallbackUrl;
            }
          }}
        />
      </div>

      {/* Details Section */}
      <div className="pt-4 pb-1 px-1.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {data.name}
            </h3>
            <VerifiedBadge variant="green" className="w-4 h-4" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-snug font-normal">
            {data.bio}
          </p>
        </div>

        {/* Bottom Bar: Stats + Follow Button */}
        <div className="flex items-center justify-between mt-5 pt-1">
          <div className="flex items-center gap-3.5 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>{followersCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{data?.stats?.projects || 48}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={following ? `Unfollow ${data.name}` : `Follow ${data.name}`}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1 ${following
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
              }`}
          >
            {following ? (
              <>
                <Check className="w-3.5 h-3.5" /> Following
              </>
            ) : (
              'Follow +'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CARD DESIGN 2: Light Frosted Glassmorphism (Center Card in Image)
// Full bleed portrait with seamless frosted glass overlay, blurring the subject's
// turtleneck into a translucent milky white panel with green verified badge.
// ══════════════════════════════════════════════════════════════════════════════
export const TeamCardDesign2 = ({ data = DEFAULT_SOPHIE, isFollowed, onToggleFollow }) => {
  const [internalFollow, setInternalFollow] = useState(false);
  const following = isFollowed !== undefined ? isFollowed : internalFollow;
  const toggle = () => {
    if (onToggleFollow) onToggleFollow();
    else setInternalFollow(!internalFollow);
  };

  const followersCount = (data?.stats?.followers || 312) + (following ? 1 : 0);

  return (
    <div className="w-full max-w-[325px] mx-auto aspect-[1/1.55] rounded-[32px] overflow-hidden relative shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-white/80 dark:border-white/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(0,0,0,0.16)] flex flex-col justify-end group select-none">
      {/* Full Bleed Image */}
      <img
        src={data.imageUrl}
        alt={data.name}
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          if (data.fallbackUrl && e.currentTarget.src !== data.fallbackUrl) {
            e.currentTarget.src = data.fallbackUrl;
          }
        }}
      />

      {/* Frosted Glass Overlay (Translucent milky glass with backdrop blur) */}
      <div className="relative z-10 w-full p-4 pt-6 bg-white/70 dark:bg-zinc-900/75 backdrop-blur-xl border-t border-white/60 dark:border-white/10 rounded-b-[32px] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {data.name}
            </h3>
            <VerifiedBadge variant="green" className="w-4 h-4" />
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 leading-snug font-normal">
            {data.bio}
          </p>
        </div>

        {/* Bottom Bar: Stats + Follow Button */}
        <div className="flex items-center justify-between mt-5 pt-1">
          <div className="flex items-center gap-3.5 text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span>{followersCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{data?.stats?.projects || 48}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={following ? `Unfollow ${data.name}` : `Follow ${data.name}`}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-1 ${following
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-white/95 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-white/80 dark:border-zinc-700'
              }`}
          >
            {following ? (
              <>
                <Check className="w-3.5 h-3.5" /> Following
              </>
            ) : (
              'Follow +'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CARD DESIGN 3: Dark Smoky Glass / Obsidian (Right Card in Image)
// High-contrast dark smoky frosted glass with backdrop blur, white text,
// white verified badge, and solid white action pill button.
// ══════════════════════════════════════════════════════════════════════════════
export const TeamCardDesign3 = ({ data = DEFAULT_SOPHIE, isFollowed, onToggleFollow }) => {
  const [internalFollow, setInternalFollow] = useState(false);
  const following = isFollowed !== undefined ? isFollowed : internalFollow;
  const toggle = () => {
    if (onToggleFollow) onToggleFollow();
    else setInternalFollow(!internalFollow);
  };

  const followersCount = (data?.stats?.followers || 312) + (following ? 1 : 0);

  return (
    <div className="w-full max-w-[325px] mx-auto aspect-[1/1.55] rounded-[32px] overflow-hidden relative shadow-[0_14px_45px_rgba(0,0,0,0.28)] dark:shadow-[0_14px_45px_rgba(0,0,0,0.65)] border border-white/25 dark:border-zinc-700/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)] flex flex-col justify-end group select-none">
      {/* Full Bleed Image */}
      <img
        src={data.imageUrl}
        alt={data.name}
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          if (data.fallbackUrl && e.currentTarget.src !== data.fallbackUrl) {
            e.currentTarget.src = data.fallbackUrl;
          }
        }}
      />

      {/* Smoky Dark Frosted Glass Overlay */}
      <div className="relative z-10 w-full p-4 pt-7 bg-gradient-to-t from-black/92 via-black/70 to-black/30 backdrop-blur-md border-t border-white/10 rounded-b-[32px] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-bold text-white tracking-tight">
              {data.name}
            </h3>
            <VerifiedBadge variant="white" className="w-4 h-4" />
          </div>
          <p className="text-sm text-zinc-200/90 mt-1 leading-snug font-normal">
            {data.bioAlt || data.bio}
          </p>
        </div>

        {/* Bottom Bar: Stats + Solid White Button */}
        <div className="flex items-center justify-between mt-5 pt-1">
          <div className="flex items-center gap-3.5 text-zinc-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-zinc-400" />
              <span>{followersCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>{data?.stats?.projects || 48}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={following ? `Unfollow ${data.name}` : `Follow ${data.name}`}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 shadow-md flex items-center gap-1 ${following
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-white hover:bg-zinc-100 text-zinc-950'
              }`}
          >
            {following ? (
              <>
                <Check className="w-3.5 h-3.5" /> Following
              </>
            ) : (
              'Follow +'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TEAM PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const Team = () => {
  // 'compare' (all 3 side-by-side) | 'style1' | 'style2' | 'style3'
  const [activeTab, setActiveTab] = useState('compare');
  const [followedMap, setFollowedMap] = useState({});

  const handleToggleFollow = (id) => {
    setFollowedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="w-full bg-[#f8f9fb] dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Radial Glows */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.12) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <ScrollReveal direction="up" delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Team Card Concepts</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
              Meet The{' '}
              <span className="logofont font-light">
                Campus<span className="text-[#F97316] dark:text-[#FB923C]">Node</span>
              </span>{' '}
              Team
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <p className="text-zinc-600 dark:text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl">
              Compare all 3 card designs generated from your visual reference with Sophie Bennett dummy data, test live interactions, or toggle your favorite aesthetic for the entire team roster.
            </p>
          </ScrollReveal>

          {/* Interactive Style Switcher Bar */}
          <ScrollReveal direction="up" delay={0.2} className="w-full max-w-2xl mt-8">
            <div className="p-1.5 bg-white dark:bg-zinc-900/90 rounded-2xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap sm:flex-nowrap gap-1 justify-center">
              <button
                type="button"
                onClick={() => setActiveTab('compare')}
                className={`flex-1 min-w-[140px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'compare'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
              >
                All 3 Designs
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style1')}
                className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'style1'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
              >
                Style 1: Inset Solid
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style2')}
                className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'style2'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
              >
                Style 2: Light Frosted
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style3')}
                className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'style3'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
              >
                Style 3: Smoky Dark
              </button>
            </div>
          </ScrollReveal>
        </div>

        {/* ── SECTION 1: SIDE-BY-SIDE COMPARISON (Exact Reference Image Recreation) ── */}
        {activeTab === 'compare' && (
          <div className="space-y-16">
            {/* Top Showcase Banner */}
            <div className="bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/50 rounded-3xl p-6 sm:p-10 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
              <div className="text-center mb-10 max-w-xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Reference Comparison
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                  1:1 Visual Exploration
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  All 3 cards use the exact dummy data from your reference photo so you can compare the visual hierarchy and feel.
                </p>
              </div>

              {/* 3 CARDS SIDE BY SIDE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 items-start justify-center max-w-5xl mx-auto">
                {/* Column 1: Design 1 */}
                <ScrollReveal direction="up" delay={0.1} className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-1">
                      Design 1
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Inset Modern Card
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Framed rounded container & neutral base
                    </p>
                  </div>
                  <TeamCardDesign1
                    data={DEFAULT_SOPHIE}
                    isFollowed={followedMap['sophie-1']}
                    onToggleFollow={() => handleToggleFollow('sophie-1')}
                  />
                </ScrollReveal>

                {/* Column 2: Design 2 */}
                <ScrollReveal direction="up" delay={0.2} className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-1">
                      Design 2
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Light Frosted Glass
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Full-bleed image with milky backdrop blur
                    </p>
                  </div>
                  <TeamCardDesign2
                    data={DEFAULT_SOPHIE}
                    isFollowed={followedMap['sophie-2']}
                    onToggleFollow={() => handleToggleFollow('sophie-2')}
                  />
                </ScrollReveal>

                {/* Column 3: Design 3 */}
                <ScrollReveal direction="up" delay={0.3} className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 mb-1">
                      Design 3
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Dark Smoky Obsidian
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      High contrast smoky overlay & white CTA
                    </p>
                  </div>
                  <TeamCardDesign3
                    data={DEFAULT_SOPHIE}
                    isFollowed={followedMap['sophie-3']}
                    onToggleFollow={() => handleToggleFollow('sophie-3')}
                  />
                </ScrollReveal>
              </div>
            </div>

            {/* Quick Summary Comparison Matrix */}
            <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-500" />
                <span>Design Characteristics Overview</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="font-bold text-zinc-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-400"></span> Design 1: Inset
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Safest for varying photo aspect ratios and backgrounds. The solid container guarantees consistent text contrast regardless of photo lighting.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="font-bold text-zinc-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Design 2: Frosted Light
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Ultra-modern Apple / iOS glassmorphic style. Best suited for editorial and studio portraits with lighter clothing and clean neutral backdrops.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="font-bold text-zinc-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Design 3: Smoky Dark
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Dramatic cinematic feel. Maximum text readability via dark gradient scrim, paired with a punchy high-contrast white "Follow +" button.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: FULL ROSTER IN DESIGN 1 ── */}
        {activeTab === 'style1' && (
          <div>
            <div className="text-center mb-10 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Active Style
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                Full Team in Design 1 (Inset Modern)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Clean white cards with framed portrait windows and balanced whitespace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 max-w-6xl mx-auto">
              {TEAM_MEMBERS.map((member, idx) => (
                <ScrollReveal key={member.id} direction="up" delay={0.05 * idx}>
                  <TeamCardDesign1
                    data={member}
                    isFollowed={followedMap[member.id]}
                    onToggleFollow={() => handleToggleFollow(member.id)}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 3: FULL ROSTER IN DESIGN 2 ── */}
        {activeTab === 'style2' && (
          <div>
            <div className="text-center mb-10 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500">
                Active Style
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                Full Team in Design 2 (Light Frosted Glass)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Fluid full-height portrait cards with milky translucent glassmorphic blur.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 max-w-6xl mx-auto">
              {TEAM_MEMBERS.map((member, idx) => (
                <ScrollReveal key={member.id} direction="up" delay={0.05 * idx}>
                  <TeamCardDesign2
                    data={member}
                    isFollowed={followedMap[member.id]}
                    onToggleFollow={() => handleToggleFollow(member.id)}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 4: FULL ROSTER IN DESIGN 3 ── */}
        {activeTab === 'style3' && (
          <div>
            <div className="text-center mb-10 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-500">
                Active Style
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                Full Team in Design 3 (Dark Smoky Obsidian)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Cinematic dark gradient blur overlays with high-contrast white accents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 max-w-6xl mx-auto">
              {TEAM_MEMBERS.map((member, idx) => (
                <ScrollReveal key={member.id} direction="up" delay={0.05 * idx}>
                  <TeamCardDesign3
                    data={member}
                    isFollowed={followedMap[member.id]}
                    onToggleFollow={() => handleToggleFollow(member.id)}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* Footer Join Community CTA */}
        <ScrollReveal direction="up" delay={0.2} className="mt-20 sm:mt-28 text-center">
          <div className="max-w-2xl mx-auto p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
              Want to join the CampusNode Team?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-md mx-auto">
              We are constantly looking for enthusiastic designers, engineers, and community organizers across NIT Jalandhar.
            </p>
            <a
              href="/contribute"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition-all duration-200 active:scale-95"
            >
              <span>Explore Open Roles & Contribute</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Team;