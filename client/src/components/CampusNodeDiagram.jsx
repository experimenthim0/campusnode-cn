import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Megaphone,
  QrCode,
  Search,
  Bus,
  ArrowUpRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Pillars of the CampusNode Ecosystem
   ───────────────────────────────────────────────────────── */
const NODES = [
  {
    id: 'events',
    title: 'Events & Fests',
    icon: Calendar,
    href: '/events',
    isLive: true,
    side: 'left',
    // SVG Connection: from Hub (395, 175) to Card terminal (325, 50)
    path: 'M 395,175 C 360,175 350,50 325,50',
    startDot: [395, 175],
    endDot: [325, 50],
  },
  {
    id: 'clubs',
    title: 'Clubs & Societies',
    icon: Users,
    href: '/clubs',
    isLive: true,
    side: 'left',
    // SVG Connection: from Hub (380, 220) to Card terminal (325, 220)
    path: 'M 380,220 C 355,220 345,220 325,220',
    startDot: [380, 220],
    endDot: [325, 220],
  },
  {
    id: 'tickets',
    title: 'QR Smart Tickets',
    icon: QrCode,
    href: '/my-events',
    isLive: true,
    side: 'left',
    // SVG Connection: from Hub (395, 265) to Card terminal (325, 390)
    path: 'M 395,265 C 360,265 350,390 325,390',
    startDot: [395, 265],
    endDot: [325, 390],
  },
  {
    id: 'updates',
    title: 'Campus Updates',
    icon: Megaphone,
    href: '/campus-updates',
    isLive: true,
    side: 'right',
    // SVG Connection: from Hub (485, 175) to Card terminal (555, 50)
    path: 'M 485,175 C 520,175 530,50 555,50',
    startDot: [485, 175],
    endDot: [555, 50],
  },
  {
    id: 'lostfound',
    title: 'Lost & Found',
    icon: Search,
    href: null,
    isLive: false,
    side: 'right',
    // SVG Connection: from Hub (500, 220) to Card terminal (555, 220)
    path: 'M 500,220 C 525,220 535,220 555,220',
    startDot: [500, 220],
    endDot: [555, 220],
  },
  {
    id: 'transit',
    title: 'Campus Transit',
    icon: Bus,
    href: null,
    isLive: false,
    side: 'right',
    // SVG Connection: from Hub (485, 265) to Card terminal (555, 390)
    path: 'M 485,265 C 520,265 530,390 555,390',
    startDot: [485, 265],
    endDot: [555, 390],
  },
];

/* ─────────────────────────────────────────────────────────
   Custom CSS Keyframes for High-Fidelity Glow & Pulses
   ───────────────────────────────────────────────────────── */
const inlineStyles = `
@keyframes cn-beam-flow {
  0% { stroke-dashoffset: 60; }
  100% { stroke-dashoffset: 0; }
}
@keyframes cn-core-pulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.08); opacity: 0.35; }
}
@keyframes cn-dot-ping {
  0% { transform: scale(1); opacity: 0.9; }
  75%, 100% { transform: scale(2.4); opacity: 0; }
}
.cn-beam-active {
  stroke-dasharray: 8 6;
  animation: cn-beam-flow 1.2s linear infinite;
}
.cn-core-aura {
  animation: cn-core-pulse 3.5s ease-in-out infinite;
}
.cn-ping-dot {
  transform-origin: center;
  transform-box: fill-box;
  animation: cn-dot-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .cn-beam-active, .cn-core-aura, .cn-ping-dot {
    animation: none;
  }
}
`;

export default function CampusNodeDiagram({ className = '' }) {
  const [activeKey, setActiveKey] = useState(null);

  return (
    <div className={`w-full select-none ${className}`}>
      <style>{inlineStyles}</style>

      {/* ============================================================
          DESKTOP & TABLET: Interactive Orchestrated Nexus Canvas
          ============================================================ */}
      <div className="hidden sm:block relative w-full max-w-4xl mx-auto" style={{ aspectRatio: '880 / 440' }}>
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-96 h-96 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" />
        </div>

        {/* ── Interactive SVG Circuit Routing Layer ── */}
        <svg
          viewBox="0 0 880 440"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <filter id="cn-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
            <linearGradient id="cn-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0094FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {NODES.map((node) => {
            const isHovered = activeKey === node.id;
            const hasAnyHover = Boolean(activeKey);

            return (
              <g key={`beam-${node.id}`} className="transition-opacity duration-300">
                {/* Passive Baseline Circuit Line */}
                <path
                  d={node.path}
                  fill="none"
                  stroke={isHovered ? 'url(#cn-beam-gradient)' : 'currentColor'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className={`${
                    isHovered
                      ? 'cn-beam-active text-brand-500'
                      : hasAnyHover
                      ? 'text-cn-border/40 opacity-30'
                      : 'text-cn-border dark:text-cn-border/60 opacity-80'
                  } transition-all duration-300`}
                />

                {/* Intense Glow Layer on Hover */}
                {isHovered && (
                  <path
                    d={node.path}
                    fill="none"
                    stroke="#0094FF"
                    strokeWidth={5}
                    strokeOpacity={0.35}
                    filter="url(#cn-glow-filter)"
                  />
                )}

                {/* Hub Anchor Point */}
                <circle
                  cx={node.startDot[0]}
                  cy={node.startDot[1]}
                  r={isHovered ? 4.5 : 3}
                  fill={isHovered ? '#0094FF' : '#94A3B8'}
                  className="transition-all duration-200"
                />

                {/* Card Terminal Dot with Ping Halo */}
                {isHovered && (
                  <circle
                    cx={node.endDot[0]}
                    cy={node.endDot[1]}
                    r={8}
                    fill="#0094FF"
                    className="cn-ping-dot"
                  />
                )}
                <circle
                  cx={node.endDot[0]}
                  cy={node.endDot[1]}
                  r={isHovered ? 4.5 : 3.5}
                  fill={isHovered ? '#0094FF' : '#64748B'}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* ── Central Hub Nexus (Center: 50%, 50%) ── */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none"
          style={{ width: '140px', height: '140px' }}
        >
          {/* Subtle Outer Radar Halo */}
          <div className="cn-core-aura absolute inset-0 rounded-full border border-brand-500/30 dark:border-brand-400/40" />
          <div className="absolute -inset-2.5 rounded-full border border-brand-500/10 dark:border-brand-400/15" />

          {/* Core Hub Disc */}
          <div className="relative w-28 h-28 rounded-full border border-cn-border bg-cn-surface-elevated/95 dark:bg-cn-surface-elevated/95 backdrop-blur-xl shadow-lg shadow-brand-500/10 dark:shadow-brand-950/40 flex flex-col items-center justify-center p-3 text-center transition-transform duration-300">
            {/* Logo Emblem */}
            <div className="w-10 h-10 mb-1 flex items-center justify-center">
              <img
                src="/lightthemelogo.png"
                alt="CampusNode Emblem"
                className="dark:hidden w-full h-full object-contain"
              />
              <img
                src="/darkthemelogo.png"
                alt="CampusNode Emblem"
                className="hidden dark:block w-full h-full object-contain"
              />
            </div>

            {/* Core Label */}
            <span className="text-[11px] font-medium tracking-tight text-cn-text">
              CampusNode
            </span>
            
          </div>
        </div>

        {/* ── Satellite Cards (Desktop / Tablet) ── */}
        {/* Left Column Cards (Width: 37%, Left: 0) */}
        <div className="absolute left-0 top-0 bottom-0 w-[37%] flex flex-col justify-between py-6 z-10">
          {NODES.filter((n) => n.side === 'left').map((node) => (
            <SatelliteCard
              key={node.id}
              node={node}
              isActive={activeKey === node.id}
              onHover={() => setActiveKey(node.id)}
              onLeave={() => setActiveKey(null)}
            />
          ))}
        </div>

        {/* Right Column Cards (Width: 37%, Right: 0) */}
        <div className="absolute right-0 top-0 bottom-0 w-[37%] flex flex-col justify-between py-6 z-10">
          {NODES.filter((n) => n.side === 'right').map((node) => (
            <SatelliteCard
              key={node.id}
              node={node}
              isActive={activeKey === node.id}
              onHover={() => setActiveKey(node.id)}
              onLeave={() => setActiveKey(null)}
            />
          ))}
        </div>
      </div>

      {/* ============================================================
          MOBILE: Stacked Connected Ecosystem Layout (< 640px)
          ============================================================ */}
      <div className="sm:hidden w-full space-y-4">
        {/* Central Core Indicator Badge */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-cn-border bg-cn-surface-elevated/90 backdrop-blur-md shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-body-emphasis text-cn-text">CampusNode</span>
              <span className="text-cn-text-muted text-xs">•</span>
              <span className="text-metadata text-brand-600 dark:text-brand-400 font-medium">Unified Hub</span>
            </div>
          </div>
        </div>

        {/* Mobile Pillar Cards Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {NODES.map((node) => {
            const Icon = node.icon;
            const CardWrapper = node.isLive && node.href ? Link : 'div';
            const wrapperProps = node.isLive && node.href ? { to: node.href } : {};

            return (
              <CardWrapper
                key={`mobile-${node.id}`}
                {...wrapperProps}
                className={`group relative flex items-center justify-between p-3 rounded-xl border border-cn-border bg-cn-surface shadow-xs transition-all ${
                  node.isLive
                    ? 'hover:border-brand-500/40 hover:shadow-sm active:scale-[0.99] cursor-pointer'
                    : 'cursor-default opacity-90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <h3 className="text-body-emphasis text-cn-text whitespace-nowrap">
                    {node.title}
                  </h3>
                </div>

                <div className="shrink-0 ml-2">
                  {node.isLive ? (
                    <div className="text-cn-text-muted group-hover:text-brand-600 transition-colors">
                      <ArrowUpRight size={15} />
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/25">
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      Coming soon
                    </span>
                  )}
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Satellite Node Card Component (Desktop & Tablet)
   ───────────────────────────────────────────────────────── */
function SatelliteCard({ node, isActive, onHover, onLeave }) {
  const Icon = node.icon;
  const CardWrapper = node.isLive && node.href ? Link : 'div';
  const wrapperProps = node.isLive && node.href ? { to: node.href } : {};

  return (
    <CardWrapper
      {...wrapperProps}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group relative flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl border transition-all duration-200 select-none ${
        node.isLive ? 'cursor-pointer' : 'cursor-default'
      } ${
        isActive
          ? 'border-brand-500 bg-cn-surface-elevated shadow-md shadow-brand-500/10 -translate-y-0.5'
          : 'border-cn-border bg-cn-surface dark:bg-cn-surface-card hover:border-brand-500/50 shadow-xs hover:shadow-sm'
      }`}
    >
      {/* Icon & Title (Full Text, No Truncation) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
            isActive
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/40'
          }`}
        >
          <Icon size={16} />
        </div>

        <h3 className="text-xs sm:text-[13px] font-medium text-cn-text whitespace-nowrap">
          {node.title}
        </h3>
      </div>

      {/* Action Indicator or Compact Coming Soon Badge */}
      <div className="shrink-0 flex items-center pl-1">
        {node.isLive ? (
          <ArrowUpRight
            size={14}
            className={`text-cn-text-muted transition-transform duration-200 ${
              isActive
                ? 'text-brand-600 translate-x-0.5 -translate-y-0.5'
                : 'opacity-60 group-hover:opacity-100 group-hover:text-brand-600'
            }`}
          />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/25">
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            Coming soon
          </span>
        )}
      </div>
    </CardWrapper>
  );
}
