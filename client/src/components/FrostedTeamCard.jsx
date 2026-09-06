import React from 'react';
import { Linkedin, Instagram, Github } from 'lucide-react';

// ── Verified Badge Component ──────────────────────────────────────────────────
export const VerifiedBadge = ({ className = 'w-4 h-4' }) => (
  <svg
    className={`${className} inline-block flex-shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Verified team member"
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

// ── Team Members Dataset ──────────────────────────────────────────────────────
export const TEAM_MEMBERS = [
  {
    id: 'sophie-bennett',
    name: '-',
    role: 'Product Designer',
    department: 'design',
    batch: "Design '27",
    imageUrl: '/sophie-bennett.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
  {
    id: 'himanshu-yadav',
    name: 'Himanshu Yadav',
    role: 'Founder & Lead Backend Engineer',
    department: 'core',
    batch: "CSE '28",
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
  {
    id: 'aarav-sharma',
    name: '-',
    role: 'Frontend Architect',
    department: 'frontend',
    batch: "CSE '27",
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
  // {
  //   id: 'ananya-patel',
  //   name: '-',
  //   role: 'Security & Auth Lead',
  //   department: 'core',
  //   batch: "ECE '27",
  //   imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  //   socials: {
  //     linkedin: 'https://linkedin.com',
  //     instagram: 'https://instagram.com',
  //     github: 'https://github.com',
  //   },
  // },
  // {
  //   id: 'meera-nair',
  //   name: '-',
  //   role: 'Co-Founder & UX Lead',
  //   department: 'design',
  //   batch: "CSE '28",
  //   imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  //   socials: {
  //     linkedin: 'https://linkedin.com',
  //     instagram: 'https://instagram.com',
  //     github: 'https://github.com',
  //   },
  // },
  // {
  //   id: 'kabir-mehta',
  //   name: '-',
  //   role: 'DevOps & SRE Specialist',
  //   department: 'ops',
  //   batch: "IT '27",
  //   imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
  //   socials: {
  //     linkedin: 'https://linkedin.com',
  //     instagram: 'https://instagram.com',
  //     github: 'https://github.com',
  //   },
  // },
  // {
  //   id: 'riya-sen',
  //   name: '-',
  //   role: 'Mobile App Developer',
  //   department: 'frontend',
  //   batch: "IT '28",
  //   imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
  //   socials: {
  //     linkedin: 'https://linkedin.com',
  //     instagram: 'https://instagram.com',
  //     github: 'https://github.com',
  //   },
  // },
  // {
  //   id: 'rohan-gupta',
  //   name: '-',
  //   role: 'Infrastructure Engineer',
  //   department: 'core',
  //   batch: "ECE '28",
  //   imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
  //   socials: {
  //     linkedin: 'https://linkedin.com',
  //     instagram: 'https://instagram.com',
  //     github: 'https://github.com',
  //   },
  // },
];

// ══════════════════════════════════════════════════════════════════════════════
// LIGHT FROSTED GLASS TEAM CARD (Design 2 with Milky Blur, Role Only, Socials)
// ══════════════════════════════════════════════════════════════════════════════
export const FrostedTeamCard = ({ member }) => {
  return (
    <div className="w-full max-w-[300px] xs:max-w-[310px] sm:max-w-[325px] mx-auto aspect-[1/1.52] sm:aspect-[1/1.55] rounded-[24px] sm:rounded-[28px] overflow-hidden relative shadow-[0_10px_35px_rgba(0,0,0,0.07)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-white/80 dark:border-white/10 transition-all duration-300 sm:hover:-translate-y-2 sm:hover:shadow-[0_22px_50px_rgba(0,0,0,0.16)] active:scale-[0.98] flex flex-col justify-end group select-none">
      {/* Full Bleed Image */}
      <img
        src={member.imageUrl}
        alt={member.name}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 sm:group-hover:scale-105"
        onError={(e) => {
          if (member.fallbackUrl && e.currentTarget.src !== member.fallbackUrl) {
            e.currentTarget.src = member.fallbackUrl;
          }
        }}
      />

      {/* Light Frosted Glass Overlay (Milky translucent backdrop blur) */}
      <div className="relative z-10 w-full p-3.5 sm:p-4 pt-4 sm:pt-5 pb-3.5 sm:pb-4.5 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl border-t border-white/60 dark:border-white/10 rounded-b-[28px] sm:rounded-b-[32px] flex flex-col justify-between">
        <div>
          {/* Member Name + Verified Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {member.name}
            </h3>
            <VerifiedBadge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          {/* Role Title Only */}
          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 mt-1 leading-snug tracking-tight">
            {member.role}
          </p>
        </div>

        {/* Bottom Row: Social Media Icons (LinkedIn, Instagram, GitHub) */}
        <div className="flex items-center gap-2 sm:gap-2.5 mt-3.5 sm:mt-4 pt-1">
          {member.socials?.linkedin && (
            <a
              href={member.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 border border-white/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
              aria-label={`${member.name}'s LinkedIn profile`}
            >
              <Linkedin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          )}

          {member.socials?.instagram && (
            <a
              href={member.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 hover:text-pink-600 dark:text-zinc-300 dark:hover:text-pink-400 border border-white/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
              aria-label={`${member.name}'s Instagram profile`}
            >
              <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          )}

          {member.socials?.github && (
            <a
              href={member.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white border border-white/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation"
              aria-label={`${member.name}'s GitHub profile`}
            >
              <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrostedTeamCard;
