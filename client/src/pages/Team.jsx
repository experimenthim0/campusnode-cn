import React, { useState } from 'react';
import { Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} department        - Engineering domain / team cluster
 * @property {string} batch             - e.g. "CSE '27"
 * @property {string} imageUrl
 * @property {string} imageFormat       - "webp" | "avif" | "jpg" | "png"
 * @property {string} contribution      - Micro-manifesto of specific contribution
 * @property {string[]} techStack       - Technologies this member works with
 * @property {Object}  socials
 * @property {string}  [socials.github]
 * @property {string}  [socials.linkedin]
 * @property {string}  [socials.twitter]
 * @property {string}  [socials.portfolio]
 */

/**
 * Domain clusters — controls section grouping + accent color stripe
 * id must match member.department
 */
const DOMAINS = [
  { id: 'core',     label: 'Core Architecture',     accent: 'var(--domain-core)' },
  { id: 'frontend', label: 'Frontend Engineering',  accent: 'var(--domain-frontend)' },
  { id: 'design',   label: 'Product Design',        accent: 'var(--domain-design)' },
  { id: 'ops',      label: 'Operations & Relations', accent: 'var(--domain-ops)' },
];

// /** @type {TeamMember[]} */
const TEAM_MEMBERS = []
// const TEAM_MEMBERS = [
//   // ── Core Architecture ──────────────────────────────────────────────────
//   {
//     id: '1',
//     name: 'Himanshu Yadav',
//     role: 'Founder & Lead Backend Engineer',
//     department: 'core',
//     batch: 'CSE 28',
//     imageUrl: null,
//     contribution: 'Architected the real-time campus event bus and QR verification engine powering CampusNode.',
//     techStack: ['Node.js', 'MongoDB', 'Redis', 'WebSockets'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
//   {
//     id: '4',
//     name: 'Ananya Patel',
//     role: 'Backend Lead',
//     department: 'core',
//     batch: 'CSE 27',
//     imageUrl: null,
//     contribution: 'Owns the auth layer and RESTful API contracts; reduced p95 API latency by 40%.',
//     techStack: ['Express', 'PostgreSQL', 'Docker', 'JWT'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//     },
//   },
//   {
//     id: '7',
//     name: 'Rohan Gupta',
//     role: 'Security Engineer',
//     department: 'core',
//     batch: 'ECE 28',
//     imageUrl: null,
//     contribution: 'Hardened the platform against OWASP Top-10 vulnerabilities; leads penetration testing cycles.',
//     techStack: ['OWASP', 'Burp Suite', 'Node.js', 'HTTPS/TLS'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
//   // ── Frontend Engineering ────────────────────────────────────────────────
//   {
//     id: '3',
//     name: 'Aarav Sharma',
//     role: 'Frontend Architect',
//     department: 'frontend',
//     batch: 'CSE 27',
//     imageUrl: null,
//     contribution: 'Built the campus map interactive layer and ScrollReveal animation system from scratch.',
//     techStack: ['React', 'TailwindCSS', 'Framer Motion', 'Vite'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
//   {
//     id: '6',
//     name: 'Riya Sen',
//     role: 'Mobile App Developer',
//     department: 'frontend',
//     batch: 'IT 28',
//     imageUrl: null,
//     contribution: 'Shipped the React Native companion app with offline-first sync and push notification infrastructure.',
//     techStack: ['React Native', 'Expo', 'Reanimated', 'AsyncStorage'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//     },
//   },
//   {
//     id: '8',
//     name: 'Isha Verma',
//     role: 'QA Automation Lead',
//     department: 'frontend',
//     batch: 'CSE 27',
//     imageUrl: null,
//     contribution: 'Built end-to-end Playwright test suites achieving 94% UI coverage; owns the CI test pipeline.',
//     techStack: ['Playwright', 'Jest', 'GitHub Actions', 'Storybook'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
//   // ── Product Design ──────────────────────────────────────────────────────
//   {
//     id: '2',
//     name: 'Meera Nair',
//     role: 'Co-Founder & Product Designer',
//     department: 'design',
//     batch: 'CSE 28',
//     imageUrl: null,
//     contribution: 'Defined the design system tokens and information architecture; created every key user flow.',
//     techStack: ['Figma', 'FigJam', 'Tailwind', 'Lottie'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
//   // ── Operations & Relations ──────────────────────────────────────────────
//   {
//     id: '5',
//     name: 'Kabir Mehta',
//     role: 'DevOps Specialist',
//     department: 'ops',
//     batch: 'ECE 27',
//     imageUrl: null,
//     contribution: 'Maintains zero-downtime deployment pipelines on AWS; orchestrates containerised microservices.',
//     techStack: ['AWS', 'Docker', 'Nginx', 'Terraform'],
//     socials: {
//       github: 'https://github.com',
//       linkedin: 'https://linkedin.com',
//       twitter: 'https://twitter.com',
//     },
//   },
// ];

// ── Fallback initials avatar ──────────────────────────────────────────────
const InitialsAvatar = ({ name, domain }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      aria-hidden="true"
      style={{ background: 'var(--avatar-bg)' }}
    >
      <span
        className="font-bold tracking-widest uppercase"
        style={{
          fontSize: 'clamp(1.25rem, 4vw, 2rem)',
          color: 'var(--avatar-text)',
         
          letterSpacing: '0.12em',
        }}
      >
        {initials}
      </span>
    </div>
  );
};

const MemberCard = ({ member, domainAccent, index }) => {
  const [hovered, setHovered] = useState(false);
  const hasImage = Boolean(member.imageUrl);

  return (
    <div
      className="flex flex-col myfont"
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
        role="img"
        aria-label={`Profile photo of ${member.name}`}
      >
        {/* Domain accent stripe (top of card) */}
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
            alt={`${member.name}, ${member.role} at NIT Jalandhar`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width="400"
            height="400"
            style={{
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
            }}
          />
        ) : (
          <InitialsAvatar name={member.name} domain={member.department} />
        )}

        {/* Tech stack reveal overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-end p-3"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 55%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.28s ease',
            zIndex: 3,
          }}
          aria-hidden="true"
        >
          <div className="flex flex-wrap gap-1">
            {member.techStack.map((tech) => (
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
            <h3
              className="text-base font-bold text-zinc-900 dark:text-white leading-snug"
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
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
          <p
            className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            {member.role}
          </p>
          <p
            className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed line-clamp-2"
            style={{ fontFamily: '"DM Sans", sans-serif', fontStyle: 'italic' }}
          >
            {member.contribution}
          </p>
        </div>

        {/* Socials row */}
        <div className="flex flex-row gap-3 items-center mt-0.5">
          {member.socials.github && (
            <a
              href={member.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
              aria-label={`${member.name}'s GitHub profile`}
            >
              <Github size={14} aria-hidden="true" />
            </a>
          )}
          {member.socials.linkedin && (
            <a
              href={member.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
              aria-label={`${member.name}'s LinkedIn profile`}
            >
              <Linkedin size={14} aria-hidden="true" />
            </a>
          )}
          {member.socials.twitter && (
            <a
              href={member.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
              aria-label={`${member.name}'s Twitter/X profile`}
            >
              <Twitter size={14} aria-hidden="true" />
            </a>
          )}
          {member.socials.portfolio && (
            <a
              href={member.socials.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
              aria-label={`${member.name}'s portfolio`}
            >
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      </figcaption>
    </div>
  );
};

const DomainSection = ({ domain, members, sectionIndex }) => {
  if (members.length === 0) return null;

  const domainMeta = DOMAINS.find((d) => d.id === domain);
  if (!domainMeta) return null;

  return (
    <div className="mb-16 last:mb-0 myfont">
      {/* Section label */}
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
          <span
            className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
            
          >
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
              index={idx}
            />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
};

const Team = () => {
  // Group members by department
  const byDomain = DOMAINS.reduce((acc, domain) => {
    acc[domain.id] = TEAM_MEMBERS.filter((m) => m.department === domain.id);
    return acc;
  }, {});

  const totalActive = TEAM_MEMBERS.length;
  const hasAnyMembers = totalActive > 0;

  return (
    <>
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

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen relative overflow-hidden transition-colors duration-300">
        {/* Background radial glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl"
          style={{
            height: '600px',
            background: 'radial-gradient(ellipse at center top, rgba(234,88,12,0.04) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto relative z-10">

          <div className="flex flex-col items-center mb-20 text-center max-w-3xl mx-auto">
            <ScrollReveal direction="up" delay={0.1}>
              <span
                className="text-orange-600 dark:text-orange-500 font-bold uppercase block mb-3"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  
                }}
              >
                The Innovators
              </span>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6"
                style={{ lineHeight: 1.08 }}
              >
                The Minds Behind{' '}
                <span className="logofont font-light">
                  Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p
                className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed font-light mb-6"

              >
                Student innovators, creators, and engineers building the digital gateway for NITJ.
              </p>
              
             
            </ScrollReveal>
          </div>

          {hasAnyMembers ? (
            <div>
              {DOMAINS.map((domain, i) => (
                <DomainSection
                  key={domain.id}
                  domain={domain.id}
                  members={byDomain[domain.id]}
                  sectionIndex={i}
                />
              ))}
            </div>
          ) : (
            /* Elegant empty state — renders when all members are stripped */
            <ScrollReveal direction="up" delay={0.2}>
              <div
                className="mx-auto text-center"
                style={{
                  maxWidth: '480px',
                  padding: '64px 32px',
                  border: '0.5px solid',
                  borderColor: 'rgba(234,88,12,0.18)',
                  borderRadius: '20px',
                  background: 'rgba(234,88,12,0.02)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(234,88,12,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                  aria-hidden="true"
                >
                  <span style={{ fontSize: '22px' }}>⚡</span>
                </div>
                <h2
                  className="text-xl font-bold text-zinc-900 dark:text-white mb-2"
                  
                >
                  Team expansion in progress
                </h2>
                <p
                  className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed"
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  Our roster is being assembled. Check back soon — great things are coming together.
                </p>
              </div>
            </ScrollReveal>
          )}
        </section>
      </div>
    </>
  );
};

export default Team;