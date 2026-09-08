import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { FrostedTeamCard, TEAM_MEMBERS } from '../components/FrostedTeamCard';

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TEAM PAGE
// ══════════════════════════════════════════════════════════════════════════════
const Team = () => {
  return (
    <div className="w-full bg-cn-bg text-cn-text min-h-screen relative overflow-hidden transition-colors duration-300">
      {/* Subtle Background Radial Atmosphere */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[600px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.12) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-24 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <ScrollReveal direction="up" delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>CampusNode Builders</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-cn-text mb-3 sm:mb-4">
              The Minds Behind{' '}
              <span className="logofont font-light">
                Campus<span className="text-brand-500 dark:text-brand-400">Node</span>
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <p className="text-cn-text-muted text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl px-2">
              Student creators, architects, and designers crafting the next-generation digital ecosystem for NIT Jalandhar.
            </p>
          </ScrollReveal>
        </div>

        {/* Team Grid: Light Frosted Glass Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 max-w-6xl mx-auto">
          {TEAM_MEMBERS.map((member, idx) => (
            <ScrollReveal key={member.id} direction="up" delay={0.05 * idx}>
              <FrostedTeamCard member={member} />
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom Community Banner */}
        <ScrollReveal direction="up" delay={0.2} className="mt-14 sm:mt-24 text-center">
          <div className="max-w-2xl mx-auto p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-cn-surface border border-cn-border shadow-sm">
            <h3 className="text-xl sm:text-2xl font-bold text-cn-text mb-2 sm:mb-3">
              Want to build with us?
            </h3>
            <p className="text-xs sm:text-sm text-cn-text-muted leading-relaxed mb-5 sm:mb-6 max-w-md mx-auto">
              CampusNode is an open, student-driven initiative across NIT Jalandhar. We welcome new developers, designers, and organizers.
            </p>
            <a
              href="/contribute"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <span>Join the Team & Contribute</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Team;