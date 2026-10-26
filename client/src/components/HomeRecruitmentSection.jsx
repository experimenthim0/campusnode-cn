import React from 'react';
import { ArrowRight, Palette, Code2, Sparkles } from 'lucide-react';
import Section from './layout/Section';
import ScrollReveal from './ScrollReveal';
import { RECRUITMENT_FORM_URL } from '../constants/recruitment';

/**
 * Compact recruitment CTA for the Homepage.
 * Directs interested students to the configurable Google Form.
 */
const HomeRecruitmentSection = () => {
  const contributionAreas = [
    { name: 'UI/UX Design', icon: Palette, isPrimary: true },
    { name: 'Frontend Development', icon: Code2, isPrimary: false },
    { name: 'Creative Design', icon: Sparkles, isPrimary: false },
  ];

  return (
    <section
      id="join-creative-team"
      className="py-12 sm:py-16 lg:py-20 bg-cn-surface border-b border-neutral-200/50 dark:border-white/[0.05] transition-colors duration-300 relative overflow-hidden"
      aria-labelledby="recruitment-heading"
    >
      <Section className="relative z-10">
        <ScrollReveal direction="up" delay={0.1}>
          <div className="rounded-3xl border border-neutral-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-zinc-900/60 p-6 sm:p-8 lg:p-10 backdrop-blur-sm shadow-xs transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
              {/* Text Content */}
              <div className="max-w-2xl">
                <span className="text-brand-600 dark:text-brand-400 font-medium tracking-[0.2em] text-xs uppercase block mb-2.5">
                  CAMPUSNODE CREATIVE TEAM
                </span>

                <h2
                  id="recruitment-heading"
                  className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-neutral-900 dark:text-white mb-3"
                >
                  Want to Be Part of CampusNode?
                </h2>

                <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  We're looking for students interested in design and web development to work with us on CampusNode. You'll get to design event pages, try out new ideas, and create special themes for college festivals.
                </p>

                {/* Contribution Areas */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mr-1 self-center">
                    Roles:
                  </span>
                  {contributionAreas.map((area) => {
                    const Icon = area.icon;
                    return (
                      <span
                        key={area.name}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${area.isPrimary
                            ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/25 font-medium'
                            : 'bg-neutral-100 dark:bg-zinc-800/80 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-zinc-700 font-medium'
                          }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${area.isPrimary ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                        <span>{area.name}</span>
                        {area.isPrimary && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-brand-500/15 text-brand-700 dark:text-brand-300 font-medium">
                            Primary
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex items-center">
                <a
                  href={RECRUITMENT_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join the Team - Apply via Google Form (opens in new tab)"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-zinc-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-zinc-900 text-sm font-medium shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                >
                  <span>Join the Team</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Section>
    </section>
  );
};

export default HomeRecruitmentSection;
