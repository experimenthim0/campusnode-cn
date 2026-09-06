import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Terminal,
  GitBranch,
  GitPullRequest,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Zap,
  Bug,
  Palette,
  Mail,
  Layers,
  Database,
  Server,
  Users,
  CheckCircle2,
  Linkedin,
  Github,
  Instagram,
  Twitter,
  Code2,
  Cpu,
  HeartHandshake,
  HelpCircle,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

// ── Verified Badge ────────────────────────────────────────────────────────────
const VerifiedBadge = ({ className = 'w-4 h-4' }) => (
  <svg
    className={`${className} inline-block flex-shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Verified maintainer"
  >
    <path
      d="M9.707 2.293a1 1 0 011.414 0l1.414 1.414a1 1 0 00.707.293h2a1 1 0 011 1v2a1 1 0 00.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414a1 1 0 00-.293.707v2a1 1 0 01-1 1h-2a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 00-.707-.293h-2a1 1 0 01-1-1v-2a1 1 0 00-.293-.707L2.293 11.12a1 1 0 010-1.414l1.414-1.414a1 1 0 00.293-.707v-2a1 1 0 011-1h2a1 1 0 00.707-.293l1.414-1.414z"
      fill="#16A34A"
    />
    <path
      d="M8.5 11.5L10.5 13.5L15 9"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Social Link Pill ──────────────────────────────────────────────────────────
const SocialLinkPill = ({ icon: Icon, label, username, href, hoverColor = 'hover:text-brand-600' }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3 p-3.5 bg-white/70 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] touch-manipulation"
  >
    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className={`text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate ${hoverColor} transition-colors`}>
        {username}
      </p>
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-brand-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
  </a>
);

// ── Section Header Component ──────────────────────────────────────────────────
const SectionHeader = ({ badge, title, subtitle }) => (
  <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10 sm:mb-14">
    {badge && (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2.5">
        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span>{badge}</span>
      </div>
    )}
    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2.5">
      {title}
    </h2>
    {subtitle && (
      <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
        {subtitle}
      </p>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRIBUTE PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const Contribute = () => {
  const [activeTab, setActiveTab] = useState('git');
  const [copiedText, setCopiedText] = useState(null);

  useEffect(() => {
    document.title = 'Contribute · Developer Community | CampusNode';
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2200);
  };

  const codeBlocks = {
    git: {
      title: 'git_operations.sh',
      description: 'Clone and configure your development branch',
      commands: [
        '# 1. Once repository access is granted to your GitHub account:',
        'git clone https://github.com/experimenthim0/club-event.git',
        'cd club-event',
        '',
        '# 2. Checkout a new feature or fix branch from main:',
        'git checkout -b feature/your-awesome-feature',
        '',
        '# 3. Verify git status and current branch:',
        'git status'
      ].join('\n'),
    },
    server: {
      title: 'setup_server.sh',
      description: 'Configure Prisma, local PostgreSQL, and run Express API',
      commands: [
        '# 1. Navigate to the backend directory and install dependencies:',
        'cd server && npm install',
        '',
        '# 2. Initialize PostgreSQL schema with Prisma:',
        'npm run prisma:push',
        '',
        '# 3. Launch server in hot-reload development mode:',
        'npm run dev',
        '',
        '# Server API is listening at: http://localhost:5000'
      ].join('\n'),
    },
    client: {
      title: 'run_client.sh',
      description: 'Install client dependencies and launch Vite dev server',
      commands: [
        '# 1. Navigate to the client directory and install packages:',
        'cd client && npm install',
        '',
        '# 2. Spin up the Vite development server:',
        'npm run dev',
        '',
        '# Client SPA is accessible at: http://localhost:5173'
      ].join('\n'),
    },
  };

  const techStack = [
    {
      name: 'React 19',
      role: 'Frontend UI',
      desc: 'Modular components & seamless rendering',
      icon: Layers,
      accent: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    {
      name: 'Vite 7',
      role: 'Build Engine',
      desc: 'Sub-second HMR & optimized production bundles',
      icon: Zap,
      accent: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      name: 'Tailwind CSS',
      role: 'Styling Engine',
      desc: 'Frosted glassmorphism & dual light/dark themes',
      icon: Palette,
      accent: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    },
    {
      name: 'Express 5',
      role: 'Backend API',
      desc: 'High-throughput routes, RBAC & QR tickets',
      icon: Server,
      accent: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
    {
      name: 'PostgreSQL & Prisma',
      role: 'Database & ORM',
      desc: 'Type-safe queries, relations & migrations',
      icon: Database,
      accent: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  const roadmapSteps = [
    {
      step: '01',
      title: 'Join our Community',
      desc: 'Hop onto our official WhatsApp channel and introduce yourself to the core maintainers.',
      icon: Users,
    },
    {
      step: '02',
      title: 'Request Repository Access',
      desc: 'Share your GitHub handle and area of interest (frontend, backend, design, or testing) with the lead.',
      icon: GitBranch,
    },
    {
      step: '03',
      title: 'Launch Workspace Locally',
      desc: 'Clone the repo, push the Prisma schema, and boot up both client and server locally in under 3 minutes.',
      icon: Terminal,
    },
    {
      step: '04',
      title: 'Pick an Issue or Feature',
      desc: 'Choose from curated roadmap tasks, report an edge case bug, or propose a fresh campus enhancement.',
      icon: Code2,
    },
    {
      step: '05',
      title: 'Open a Pull Request',
      desc: 'Push your branch, initiate code review, and see your contributions shipped live for the NITJ community!',
      icon: GitPullRequest,
    },
  ];

  const contributionAreas = [
    {
      title: 'Bug Fixes & Hardening',
      desc: 'Track down edge cases, patch mobile layout regressions, and solve form validation caveats.',
      tag: 'Stability',
      icon: Bug,
      tagColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'UI/UX & Fluid Motion',
      desc: 'Refine micro-interactions, perfect responsive card ergonomics, and implement smooth view transitions.',
      tag: 'Design',
      icon: Palette,
      tagColor: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20',
    },
    {
      title: 'Security, Auth & RBAC',
      desc: 'Audit endpoint permissions, harden student token validation, and protect sensitive event records.',
      tag: 'Security',
      icon: ShieldCheck,
      tagColor: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
    },
    {
      title: 'Performance & Bundle Split',
      desc: 'Improve initial load time, tune database connection pools, and compress heavy visual assets.',
      tag: 'Speed',
      icon: Zap,
      tagColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Notification & Comms Bus',
      desc: 'Build out transactional notifications, event reminders, and real-time WebSocket socket updates.',
      tag: 'Features',
      icon: Mail,
      tagColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Automated Test Suites',
      desc: 'Write robust unit and integration tests using Vitest and browser-level flows with Playwright.',
      tag: 'Testing',
      icon: Cpu,
      tagColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  const guidelines = [
    {
      title: 'Write Clean & Accessible Code',
      desc: 'Adhere to clean component structure, semantic HTML tags, and accessible keyboard navigability.',
    },
    {
      title: 'Respect the Design Language',
      desc: 'Preserve the frosted glass tokens, Google Sans typography, and dual light/dark theme contrast.',
    },
    {
      title: 'Verify Builds Locally',
      desc: 'Always verify your work with npm run build to ensure zero lint or bundler compilation errors.',
    },
    {
      title: 'Document Your Changes',
      desc: 'Provide concise summaries in PR descriptions so reviewers can easily understand your intent.',
    },
  ];

  return (
    <div className="mysans min-h-screen bg-[#f8f9fb] dark:bg-zinc-950 text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* ── Background Ambient Atmosphere ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 relative z-10 space-y-16 sm:space-y-24">
        {/* ══════════════════════════════════════════════════════════════════════
            HERO SECTION
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-2 sm:pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Heading + Pitch + CTAs */}
            <div className="lg:col-span-7 text-left">
              <ScrollReveal direction="up" delay={0.05}>
                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-4 sm:mb-5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Developer Community · Open Initiative</span>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.12] mb-4 sm:mb-5">
                  Build the Future of{' '}
                  <span className="logofont font-light">
                    Campus<span className="text-brand-600 dark:text-brand-500">Node</span>
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.15}>
                <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-6 sm:mb-8 font-normal">
                  CampusNode is crafted by and for NIT Jalandhar students. Whether you engineer backend microservices, design sleek frosted interfaces, or hunt security edge cases, your work impacts thousands of students daily.
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2}>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <a
                    href="https://whatsapp.com/channel/0029VbAhXba7z4kgTBY3nS0Z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#25D366]/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <i className="ri-whatsapp-line text-base" />
                    <span>Join WhatsApp Community</span>
                  </a>

                  <Link
                    to="/team"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm font-semibold shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                  >
                    <span>Meet the Team</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to="/faq"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>FAQ</span>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column: Frosted Project Summary Card */}
            <div className="lg:col-span-5">
              <ScrollReveal direction="up" delay={0.2}>
                <div className="p-6 sm:p-7 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Active Development
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      NIT Jalandhar
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { label: 'Initiative Type', val: 'Student-Driven & Open' },
                      { label: 'Core Mission', val: 'Digital Hub for NITJ Clubs & Fests' },
                      { label: 'Architecture', val: 'Decoupled SPA + REST Backend' },
                      { label: 'Mentorship', val: 'Beginner & Advanced Friendly' },
                      { label: 'Repository Status', val: 'Private · Shared via Community' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs sm:text-sm gap-2"
                      >
                        <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                          {item.label}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-white text-right">
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Looking for new contributors</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      <span>Apply Anytime</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TECH STACK SECTION
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="Modern Foundations"
              title="Built With Modern Industry Standards"
              subtitle="We leverage modern, type-safe, and lightning-fast developer tools so every pull request is a delight to write and review."
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {techStack.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <ScrollReveal key={tech.name} direction="up" delay={0.06 * idx}>
                  <div className="h-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border ${tech.accent} group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                        {tech.role}
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mb-1">
                        {tech.name}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {tech.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          <ScrollReveal direction="up" delay={0.2} className="mt-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong className="text-zinc-900 dark:text-white font-semibold">Decoupled Architecture:</strong> Our backend powers real-time event analytics, QR ticket check-ins, automated attendance reports, and payment status hooks, while the frontend offers a responsive, glassmorphic student feed.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            ROADMAP SECTION
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="Journey"
              title="How to Get Started & Contribute"
              subtitle="From your first message in the community to your first merged pull request — here is the streamlined process."
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-5">
            {roadmapSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <ScrollReveal key={step.step} direction="up" delay={0.06 * idx}>
                  <div className="h-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative group">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold tracking-widest text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full">
                          STEP {step.step}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                          <StepIcon className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            INTERACTIVE TERMINAL / SETUP GUIDE
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="Terminal Cheatsheet"
              title="Local Setup in Seconds"
              subtitle="Quick commands to clone, configure the environment, and spin up both the backend and client development servers."
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-zinc-300/80 dark:border-zinc-800 bg-[#18181b] text-zinc-100 shadow-[0_16px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
              {/* Terminal Titlebar */}
              <div className="px-4 sm:px-6 py-3.5 bg-[#121215] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-semibold text-zinc-400 ml-2 hidden sm:inline">
                    {codeBlocks[activeTab].title}
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800/80 gap-1">
                  {Object.keys(codeBlocks).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-zinc-800 text-brand-400 shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab === 'git' && '1. Git Clone'}
                      {tab === 'server' && '2. Server Setup'}
                      {tab === 'client' && '3. Client App'}
                    </button>
                  ))}
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(codeBlocks[activeTab].commands, activeTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-all active:scale-95 cursor-pointer"
                >
                  {copiedText === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Commands</span>
                    </>
                  )}
                </button>
              </div>

              {/* Terminal Subtitle */}
              <div className="px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60 text-xs text-zinc-400 flex items-center justify-between">
                <span>{codeBlocks[activeTab].description}</span>
                <span className="text-[11px] text-zinc-500 font-mono">bash / zsh</span>
              </div>

              {/* Terminal Body */}
              <div className="p-5 sm:p-7 overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-zinc-200 bg-[#141417]">
                <pre className="whitespace-pre select-text">{codeBlocks[activeTab].commands}</pre>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            AREAS WE NEED HELP WITH
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="Contribution Areas"
              title="Where You Can Make a Difference"
              subtitle="Whether you love frontend animations, database indexing, or security audits, there are exciting challenges waiting for you."
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {contributionAreas.map((area, idx) => {
              const AreaIcon = area.icon;
              return (
                <ScrollReveal key={area.title} direction="up" delay={0.05 * idx}>
                  <div className="h-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:bg-brand-900 group-hover:text-gray-200 transition-colors duration-300">
                          <AreaIcon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${area.tagColor}`}
                        >
                          {area.tag}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
                        {area.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {area.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            FIRST CONTACT / CODEBASE ACCESS
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="First Contact"
              title="Need Repository Access or Have Questions?"
              subtitle="CampusNode is a shared community project built by students across NIT Jalandhar. To request repository access or connect with the team, reach out to our primary contact below."
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 mb-6 border-b border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                    NY
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                        Nikhil Yadav
                      </h3>
                      <VerifiedBadge className="w-4 h-4" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-brand-600 dark:text-brand-400 mt-0.5">
                      First Point of Contact · Repo Access & Onboarding
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Student · NIT Jalandhar
                    </p>
                  </div>
                </div>

                {/* Email Action Buttons */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleCopy('contact.nikhim@gmail.com', 'email')}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{copiedText === 'email' ? 'Email Copied!' : 'Copy Email'}</span>
                  </button>

                  <a
                    href="mailto:contact.nikhim@gmail.com"
                    className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    aria-label="Send direct email"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 max-w-2xl">
                Ready to contribute? Message with your GitHub username and what domain or feature you’d like to work on, or explore our entire team below.
              </p>

              {/* Social Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SocialLinkPill
                  icon={Github}
                  label="GitHub"
                  username="experimenthim0"
                  href="https://github.com/experimenthim0"
                />
                <SocialLinkPill
                  icon={Linkedin}
                  label="LinkedIn"
                  username="Nikhil Yadav"
                  href="https://linkedin.com/in/nikhilydv0148"
                  hoverColor="hover:text-blue-600"
                />
                <SocialLinkPill
                  icon={Twitter}
                  label="X / Twitter"
                  username="@Nikhil0148"
                  href="https://x.com/Nikhil0148"
                />
                <SocialLinkPill
                  icon={Instagram}
                  label="Instagram"
                  username="@nikhim.me"
                  href="https://instagram.com/nikhim.me"
                  hoverColor="hover:text-pink-600"
                />
              </div>

              {/* Team Reminder Banner */}
              <div className="mt-6 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">
                  CampusNode is built and maintained by a growing team of student creators.
                </span>
                <Link
                  to="/team"
                  className="font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>Meet All Team Members</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            CONTRIBUTION GUIDELINES
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <ScrollReveal direction="up" delay={0.1}>
            <SectionHeader
              badge="Standards"
              title="Contribution Best Practices"
              subtitle="Simple principles we follow to keep the codebase reliable, beautiful, and accessible."
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                {guidelines.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BOTTOM NAVIGATION FOOTER
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <Link
            to="/team"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
          >
            <span>Explore CampusNode Builders & Team</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Contribute;