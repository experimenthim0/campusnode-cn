import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/* ---------- Icons (inline, matching exact brand assets) ---------- */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const CalendarIcon = ({ className = '', ...p }) => (
  <svg viewBox="0 0 24 24" {...stroke} className={className} {...p}>
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    <g fill="currentColor" stroke="none">
      <circle cx="8" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="16" cy="14" r="1" />
      <circle cx="8" cy="18" r="1" />
      <circle cx="12" cy="18" r="1" />
      <circle cx="16" cy="18" r="1" />
    </g>
  </svg>
);

const UsersIcon = ({ className = '', ...p }) => (
  <svg viewBox="0 0 24 24" {...stroke} className={className} {...p}>
    <circle cx="12" cy="7.5" r="3.2" />
    <path d="M6.5 20v-1.5a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V20z" />
    <circle cx="4.8" cy="9.5" r="1.9" />
    <circle cx="19.2" cy="9.5" r="1.9" />
    <path d="M2 17.5a3 3 0 0 1 2.6-2.9M22 17.5a3 3 0 0 0-2.6-2.9" />
  </svg>
);

const MegaphoneIcon = ({ className = '', ...p }) => (
  <svg viewBox="0 0 24 24" {...stroke} className={className} {...p}>
    <path d="M3 10.5l11-5v13l-11-5z" />
    <path d="M14 8.5h1.5a2.5 2.5 0 0 1 0 5H14" />
    <path d="M6 15.5l1.2 4.5h2.6l-.9-3.4" />
    <path d="M18.5 5l1.5-1.5M19.5 11h2M18.5 17l1.5 1.5" />
  </svg>
);

const SearchBoxIcon = ({ className = '', ...p }) => (
  <svg viewBox="0 0 24 24" {...stroke} className={className} {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.3-4.3" />
    <rect x="8" y="8" width="6" height="6" rx="1.2" />
    <path d="M10 8v2h2V8" />
  </svg>
);

const ClockIcon = ({ className = '', ...p }) => (
  <svg viewBox="0 0 24 24" {...stroke} className={className} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 6.5V12l3.5 2" />
  </svg>
);

function HubLogo({ className = '' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src="/lightthemelogo.png"
        alt="Campusnode Logo"
        className="dark:hidden h-full w-full object-contain select-none pointer-events-none"
      />
      <img
        src="/darkthemelogo.png"
        alt="Campusnode Logo"
        className="hidden dark:block h-full w-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}

/* ---------- Node Definitions ----------
   box  = [left%, top%, width%, height%] of the 1536x1024 canvas
   from = point on hub perimeter, to = connector point on card  */
const NODES = [
  {
    key: 'events',
    title: 'Events',
    desc: 'Discover and join campus events.',
    Icon: CalendarIcon,
    box: [34.96, 6.35, 30.34, 17.3],
    from: [768, 325],
    to: [768, 242],
    href: '/events',
    badge: null,
  },
  {
    key: 'clubs',
    title: 'Clubs',
    desc: 'Explore clubs and connect with communities.',
    Icon: UsersIcon,
    box: [2.8, 28.13, 31.19, 17.48],
    from: [612, 428],
    to: [522, 375],
    href: '/clubs',
    badge: null,
  },
  {
    key: 'announcements',
    title: 'Announcements',
    desc: 'Stay updated with official updates.',
    Icon: MegaphoneIcon,
    box: [66.28, 28.13, 31.38, 17.48],
    from: [924, 428],
    to: [1017, 373],
    href: '/notifications',
    badge: null,
  },
  {
    key: 'lf',
    title: 'Lost & Found (L&F)',
    desc: 'Report and find lost items easily.',
    Icon: SearchBoxIcon,
    box: [2.8, 56.15, 31.19, 18.55],
    from: [612, 590],
    to: [522, 657],
    href: null,
    badge: 'Coming soon',
  },
  {
    key: 'soon-right',
    title: 'Coming soon',
    desc: 'We’re adding more features soon.',
    Icon: ClockIcon,
    box: [66.28, 56.15, 31.12, 18.65],
    from: [920, 592],
    to: [1017, 657],
    href: null,
    badge: 'Coming soon',
  },
  {
    key: 'soon-bottom',
    title: 'Coming soon',
    desc: 'We’re adding more features soon.',
    Icon: ClockIcon,
    box: [35.8, 76.27, 28.45, 17.68],
    from: [768, 669],
    to: [768, 780],
    href: null,
    badge: 'Coming soon',
  },
];

const BLUE = '#0a7cff';

const css = `
@keyframes cn-in {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes cn-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes cn-flow {
  to { stroke-dashoffset: -16; }
}
@keyframes cn-halo {
  0% { transform: scale(1); opacity: 0.35; }
  100% { transform: scale(1.35); opacity: 0; }
}
@keyframes cn-ping {
  0% { transform: scale(1); opacity: 0.65; }
  100% { transform: scale(2.4); opacity: 0; }
}
.cn-in { animation: cn-in 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.cn-fade { animation: cn-fade 0.8s ease-out both; }
.cn-flow { animation: cn-flow 1.1s linear infinite; }
.cn-halo { animation: cn-halo 3s ease-out infinite; }
.cn-ping { transform-box: fill-box; transform-origin: center; animation: cn-ping 2.4s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cn-in, .cn-fade, .cn-flow, .cn-halo, .cn-ping { animation: none; }
}
`;

function Wordmark({ className = '' }) {
  return (
    <span className={`font-black tracking-tight select-none ${className}`}>
      <span className="text-neutral-900 dark:text-white tracking-wider logofont">Campusnode</span>
      
    </span>
  );
}

function NodeCard({ node, isHovered, onHover, onLeave }) {
  const { Icon, title, desc, href, badge } = node;
  const CardWrapper = href ? Link : 'div';
  const wrapperProps = href ? { to: href } : {};

  return (
    <CardWrapper
      {...wrapperProps}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group relative flex h-full items-center gap-[clamp(6px,1.4cqw,14px)] rounded-[clamp(10px,1.5cqw,18px)] border px-[clamp(8px,1.6cqw,18px)] py-[clamp(6px,1.2cqw,12px)] transition-all duration-300 select-none ${
        isHovered
          ? 'border-[#0a7cff] bg-white dark:bg-neutral-900 shadow-[0_12px_32px_-8px_rgba(10,124,255,0.35)] -translate-y-1'
          : 'border-blue-200/80 dark:border-blue-500/20 bg-white/95 dark:bg-neutral-900/90 shadow-[0_6px_20px_-8px_rgba(10,124,255,0.18)] dark:shadow-[0_6px_20px_-8px_rgba(10,124,255,0.12)] hover:-translate-y-0.5 hover:border-blue-400'
      } backdrop-blur-md cursor-pointer`}
    >
      <div className="grid aspect-square w-[clamp(30px,5cqw,50px)] shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0a7cff] dark:text-[#38bdf8] transition-colors group-hover:bg-[#0a7cff] group-hover:text-white">
        <Icon className="h-[clamp(15px,2.5cqw,25px)] w-[clamp(15px,2.5cqw,25px)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-[clamp(10px,1.55cqw,15px)] font-black uppercase tracking-widest text-neutral-950 dark:text-white">
            {title}
          </h3>
          {badge && (
            <span className="text-[clamp(8px,0.95cqw,10px)] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0a7cff] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[clamp(9px,1.15cqw,12.5px)] leading-tight text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {desc}
        </p>
      </div>
    </CardWrapper>
  );
}

export default function CampusNodeDiagram({ className = '' }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  return (
    <div className={`w-full ${className}`}>
      <style>{css}</style>

      {/* ============================================================
          DESKTOP & TABLET: Scalable Radial Diagram (Container Queries)
          ============================================================ */}
      <div
        className="relative mx-auto hidden sm:block w-full max-w-5xl"
        style={{ aspectRatio: '1536 / 1024', containerType: 'inline-size' }}
      >
        {/* Animated Connector Lines */}
        <svg
          viewBox="0 0 1536 1024"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <filter id="cn-beam-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {NODES.map((n, i) => {
            const isHovered = hoveredKey === n.key;
            return (
              <g
                key={n.key}
                className="cn-fade"
                style={{ animationDelay: `${0.35 + i * 0.08}s` }}
              >
                {/* Glow underlay when active */}
                {isHovered && (
                  <line
                    x1={n.from[0]}
                    y1={n.from[1]}
                    x2={n.to[0]}
                    y2={n.to[1]}
                    stroke={BLUE}
                    strokeWidth="8"
                    strokeOpacity="0.4"
                    filter="url(#cn-beam-glow)"
                  />
                )}

                {/* Flowing connector line */}
                <line
                  x1={n.from[0]}
                  y1={n.from[1]}
                  x2={n.to[0]}
                  y2={n.to[1]}
                  stroke={BLUE}
                  strokeWidth={isHovered ? '4' : '3'}
                  strokeDasharray={isHovered ? '6 6' : '8 8'}
                  className="cn-flow"
                  strokeOpacity={isHovered ? '1' : '0.85'}
                />

                {/* Pulsing ring on card edge */}
                <circle
                  cx={n.to[0]}
                  cy={n.to[1]}
                  r={isHovered ? '14' : '11'}
                  fill={BLUE}
                  className="cn-ping"
                  style={{ animationDelay: `${i * 0.35}s` }}
                />

                {/* Solid terminal dot with inner core */}
                <circle cx={n.to[0]} cy={n.to[1]} r="10" fill={BLUE} />
                <circle cx={n.to[0]} cy={n.to[1]} r="3.5" fill="white" />
              </g>
            );
          })}

          {/* Hub perimeter connector anchor dots */}
          {[
            [768, 325],
            [768, 669],
            [598, 503],
            [940, 503],
            [612, 428],
            [924, 428],
            [612, 590],
            [920, 592],
          ].map(([x, y], idx) => (
            <g key={`hub-dot-${x}-${y}-${idx}`}>
              <circle cx={x} cy={y} r="8" fill={BLUE} />
              <circle cx={x} cy={y} r="3" fill="white" />
            </g>
          ))}
        </svg>

        {/* Central Hub Nexus */}
        <div
          className="absolute left-1/2 top-[48.54%] w-[22.6%] -translate-x-1/2 -translate-y-1/2"
          style={{ aspectRatio: '1 / 1' }}
        >
          <div className="cn-in relative h-full w-full">
            {/* Animated expanding aura halo */}
            <span className="cn-halo absolute inset-0 rounded-full border-[0.35cqw] border-[#0a7cff] pointer-events-none" />

            {/* Central hub disk */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full border-[0.6cqw] border-[#0a7cff] bg-white dark:bg-neutral-950 shadow-[0_0_4cqw_rgba(10,124,255,0.22)] dark:shadow-[0_0_4.5cqw_rgba(10,124,255,0.4)] transition-colors duration-300">
              <HubLogo className="h-[clamp(28px,7.8cqw,84px)] w-[clamp(28px,7.8cqw,84px)]" />
              <Wordmark className="mt-[clamp(3px,0.8cqw,10px)] text-[clamp(10px,2.2cqw,22px)]" />
            </div>
          </div>
        </div>

        {/* Satellite Feature Cards */}
        {NODES.map((n, i) => (
          <div
            key={n.key}
            className="absolute"
            style={{
              left: `${n.box[0]}%`,
              top: `${n.box[1]}%`,
              width: `${n.box[2]}%`,
              height: `${n.box[3]}%`,
            }}
          >
            <div className="cn-in h-full" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <NodeCard
                node={n}
                isHovered={hoveredKey === n.key}
                onHover={() => setHoveredKey(n.key)}
                onLeave={() => setHoveredKey(null)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================
          MOBILE: Structured, Connected Ecosystem Layout (< 640px)
          ============================================================ */}
      <div className="w-full sm:hidden flex flex-col items-center">
        {/* Central Hub */}
        <div className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full border-[4px] border-[#0a7cff] bg-white dark:bg-neutral-950 shadow-[0_0_28px_rgba(10,124,255,0.25)] dark:shadow-[0_0_36px_rgba(10,124,255,0.4)]">
          <span className="cn-halo absolute inset-0 rounded-full border-2 border-[#0a7cff] pointer-events-none" />
          <HubLogo className="h-12 w-12" />
          <Wordmark className="mt-1 text-sm" />
        </div>

        {/* Flowing Connector Spine */}
        <div className="relative h-8 w-1 flex items-center justify-center my-1.5">
          <div className="w-0.5 h-full border-l-2 border-dashed border-[#0a7cff] cn-flow" />
          <div className="absolute bottom-0 w-2.5 h-2.5 rounded-full bg-[#0a7cff] ring-4 ring-[#0a7cff]/20" />
        </div>

        {/* Feature Cards Grid */}
        <div className="w-full grid grid-cols-1 gap-3 px-1">
          {NODES.map((n, i) => {
            const CardWrapper = n.href ? Link : 'div';
            const wrapperProps = n.href ? { to: n.href } : {};
            const Icon = n.Icon;

            return (
              <CardWrapper
                key={n.key}
                {...wrapperProps}
                className="cn-in group flex items-center gap-3.5 p-3.5 rounded-2xl border border-blue-200/90 dark:border-blue-500/25 bg-white/95 dark:bg-neutral-900/95 shadow-[0_4px_16px_-4px_rgba(10,124,255,0.15)] dark:shadow-[0_4px_20px_-4px_rgba(10,124,255,0.1)] active:scale-[0.98] transition-all cursor-pointer"
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#0a7cff] dark:text-[#38bdf8] group-hover:bg-[#0a7cff] group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-950 dark:text-white">
                      {n.title}
                    </h3>
                    {n.badge ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0a7cff] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                        {n.badge}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#0a7cff] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        View &rarr;
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {n.desc}
                  </p>
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}
