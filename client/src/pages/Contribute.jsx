import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  Palette,
  Bug,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const DEV_COMMUNITY_URL = import.meta.env.VITE_DEV_COMMUNITY_URL || 'https://t.me/+lWss-PdCbGQ0ZDNl';

const CONTRIBUTION_AREAS = [
  {
    title: 'Development',
    description: 'Build features and fix bugs.',
    icon: Code2,
  },
  {
    title: 'Design',
    description: 'Improve the interface and user experience.',
    icon: Palette,
  },
  {
    title: 'Testing',
    description: 'Find bugs and help improve reliability.',
    icon: Bug,
  },
  {
    title: 'Ideas & Improvements',
    description: 'Suggest useful features for students and clubs.',
    icon: Lightbulb,
  },
];

const CONTRIBUTION_STEPS = [
  {
    step: '01',
    title: 'Join the Dev Community',
    description: 'Become part of the Campusnode developer community.',
  },
  {
    step: '02',
    title: 'Find Something to Work On',
    description: 'Explore current tasks, issues, and ideas shared within the community.',
  },
  {
    step: '03',
    title: 'Contribute',
    description: 'Work with the team and help improve Campusnode.',
  },
];

const Contribute = () => {
  useEffect(() => {
    document.title = 'Contribute · Campusnode';
  }, []);

  return (
    <div className="min-h-screen bg-cn-bg text-foreground transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14 sm:space-y-20">
        {/* ══════════════════════════════════════════════════════════════════════
            1. HERO
            ══════════════════════════════════════════════════════════════════════ */}
        <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-6">
          <ScrollReveal direction="up" delay={0.05}>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-4">
              Student Community
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Help Build Campusnode
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mx-auto mb-8 font-normal">
              Campusnode is built by students for NIT Jalandhar. Join the Campusnode Dev Community to learn, discuss, and contribute to the platform.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {DEV_COMMUNITY_URL ? (
                <a
                  href={DEV_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Join Dev Community
                </a>
              ) : (
                <a
                  href="#contribution-flow"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Join Dev Community
                </a>
              )}

              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs sm:text-sm font-medium transition-colors"
              >
                <span>Want to Join the Team? →</span>
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            2. WHAT YOU CAN CONTRIBUTE
            ══════════════════════════════════════════════════════════════════════ */}
        <section>
          <ScrollReveal direction="up">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                What You Can Contribute
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTRIBUTION_AREAS.map((area, idx) => {
              const Icon = area.icon;
              return (
                <ScrollReveal key={area.title} direction="up" delay={0.05 * idx}>
                  <div className="h-full p-5 rounded-xl bg-card border border-border flex flex-col justify-start">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {area.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                      {area.description}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            3. CONTRIBUTION FLOW
            ══════════════════════════════════════════════════════════════════════ */}
        <section id="contribution-flow" className="scroll-mt-16">
          <ScrollReveal direction="up">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                Contribution Flow
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {CONTRIBUTION_STEPS.map((step, idx) => (
              <ScrollReveal key={step.step} direction="up" delay={0.05 * idx}>
                <div className="h-full p-5 rounded-xl bg-card border border-border flex flex-col justify-start">
                  <span className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400 block mb-2">
                    {step.step}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal direction="up" delay={0.2}>
            <p className="text-center text-xs text-muted-foreground font-normal">
              All contribution discussions and coordination happen within the{' '}
              <a
                href={DEV_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Campusnode Dev Community
              </a>
              .
            </p>
          </ScrollReveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            4. JOIN THE CAMPUSNODE TEAM
            ══════════════════════════════════════════════════════════════════════ */}
        <section>
          <ScrollReveal direction="up">
            <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border text-center max-w-2xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
                Want to Join the Campusnode Team?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto font-normal">
                Looking to take a more active role in building Campusnode? Contact the team to learn about available roles and opportunities.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Contact the Team</span>
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            5. SIMPLE FOOTER
            ══════════════════════════════════════════════════════════════════════ */}
        <footer className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>

          <Link
            to="/team"
            className="inline-flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors group"
          >
            <span>Meet the Team</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Contribute;