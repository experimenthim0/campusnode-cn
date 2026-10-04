import React from 'react';
import { Linkedin, Instagram, Github, ExternalLink, Sparkles, Bell, Globe, GraduationCap, Mail } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';


// ── Verified Badge ────────────────────────────────────────────────────────────
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
      fill="#10b981"
    />
    <path
      d="M8.5 11.5L10.5 13.5L15 9"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Social Icon Button ────────────────────────────────────────────────────────
const SocialButton = ({ href, label, icon: Icon, hoverColor }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className={`group/btn relative flex items-center justify-center w-9 h-9 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 ${hoverColor}`}
  >
    <Icon className="w-4 h-4 transition-transform duration-200 group-hover/btn:scale-110" />
  </a>
);

// ── Inset Modern Team Card Component ──────────────────────────────────────────
export const InsetModernTeamCard = ({ member, data, className = '' }) => {
  const item = member || data || {};
  const hasSocials = Boolean(
    item.socials?.linkedin ||
    item.socials?.instagram ||
    item.socials?.github ||
    item.socials?.portfolio ||
    item.socials?.email ||
    item.profileUrl
  );

  return (
    <div
      className={`
        relative w-full max-w-[300px] mx-auto
        bg-white dark:bg-zinc-900
        rounded-[28px] p-3
        border border-zinc-200/80 dark:border-zinc-800
        shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]
        hover:-translate-y-1
        transition-all duration-300
        flex flex-col
        select-none
        mysans
        ${className}
      `}
    >
      {/* ── Photo ── */}
      <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 group">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          onError={(e) => {
            if (item.fallbackUrl && e.currentTarget.src !== item.fallbackUrl)
              e.currentTarget.src = item.fallbackUrl;
          }}
        />

        {/* subtle gradient overlay at bottom of image */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* ── Info ── */}
      <div className="mt-3.5 px-1 flex flex-col gap-3">
        {/* Name */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[17px] font-medium text-zinc-900 dark:text-white tracking-tight leading-tight truncate">
              {item.name}
            </h3>
            {/* <VerifiedBadge className="w-[15px] h-[15px] flex-shrink-0" /> */}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800" />

        {/* Social Links Row */}
        {hasSocials && (
          <div className="flex items-center justify-between pb-0.5">
            {/* Left: icon cluster */}
            <div className="flex items-center gap-2">
              {item.socials?.linkedin && (
                <SocialButton
                  href={item.socials.linkedin}
                  label={`${item.name}'s LinkedIn`}
                  icon={Linkedin}
                  hoverColor="hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                />
              )}
              {item.socials?.portfolio && (
                <SocialButton
                  href={item.socials.portfolio}
                  label={`${item.name}'s Portfolio`}
                  icon={Globe}
                  hoverColor="hover:text-pink-600 dark:hover:text-pink-400 hover:border-pink-200 dark:hover:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                />
              )}
              {item.socials?.email && (
                <SocialButton
                  href={`mailto:${item.socials.email}`}
                  label={`${item.name}'s Email`}
                  icon={Mail}
                  hoverColor="hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                />
              )}
              {item.socials?.github && (
                <SocialButton
                  href={item.socials.github}
                  label={`${item.name}'s GitHub`}
                  icon={Github}
                  hoverColor="hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                />
              )}
            </div>

            {/* Right: profile CTA pill */}
            {item.profileUrl && (
              <a
                href={item.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 group/link"
              >
                <span className="group-hover/link:underline underline-offset-2">Profile</span>
                <ExternalLink className="w-3 h-3 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Dedicated Faculty Card Component ──────────────────────────────────────────
export const FacultyCard = ({ mentor, data, className = '' }) => {
  const item = mentor || data || {};
  const hasSocials = Boolean(
    item.socials?.linkedin ||
    item.socials?.email ||
    item.socials?.portfolio ||
    item.profileUrl
  );

  return (
    <div
      className={`
        relative w-full max-w-[320px] mx-auto
        bg-white dark:bg-zinc-900
        rounded-[28px] p-3.5
        border border-zinc-200/80 dark:border-zinc-800
        shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]
        hover:-translate-y-1
        transition-all duration-300
        flex flex-col
        select-none
        mysans
        ${className}
      `}
    >
      {/* ── Photo & Faculty Tag ── */}
      <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 group">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contains object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          onError={(e) => {
            if (item.fallbackUrl && e.currentTarget.src !== item.fallbackUrl)
              e.currentTarget.src = item.fallbackUrl;
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

        {/* Faculty Badge */}
       
      </div>

      {/* ── Info ── */}
      <div className="mt-3.5 px-1 flex flex-col flex-grow justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white tracking-tight leading-tight truncate">
            {item.name}
          </h3>

          {item.designation && (
            <p className="text-[12px] font-medium text-brand-600 dark:text-brand-400 leading-snug">
              {item.designation}
            </p>
          )}

          {item.department && (
            <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
              {item.department}
            </p>
          )}

          
        </div>

      
        <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800" />

        {/* Links Row */}
        {hasSocials && (
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              {item.socials?.linkedin && (
                <SocialButton
                  href={item.socials.linkedin}
                  label={`${item.name}'s LinkedIn`}
                  icon={Linkedin}
                  hoverColor="hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                />
              )}
              {item.socials?.email && (
                <SocialButton
                  href={`mailto:${item.socials.email}`}
                  label={`Email ${item.name}`}
                  icon={Mail}
                  hoverColor="hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                />
              )}
            </div>

            {item.profileUrl && (
              <a
                href={item.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-200 group/link"
              >
                <span>Profile</span>
                <ExternalLink className="w-3 h-3 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const FacultyMentorCard = FacultyCard;

// ── Faculty Mentors Dataset ───────────────────────────────────────────────────
export const FACULTY_MENTORS = [
  {
    id: 'dr-samayveer-singh',
    name: 'Dr. Samayveer Singh',
    role: 'Faculty Mentor',
    designation: 'Assistant Professor (Grade-I)',
    department: 'Department of Computer Science & Engineering',
    institution: 'NIT Jalandhar',
    imageUrl: '/team_members/samayveer_singh.jpg',
    fallbackUrl: '/user-img.png',
    profileUrl: 'https://departments.nitj.ac.in/dept/cse/Faculty/6430446b38bff038a78085b7',
    socials: {
      linkedin: 'https://in.linkedin.com/in/dr-samayveer-singh-231b694a',
      email: 'samays@nitj.ac.in',
    },
  },
  {
    id: 'dr-lalatendu-behera',
    name: 'Dr. Lalatendu Behera',
    role: 'Faculty Mentor',
    designation: 'Assistant Professor (Grade-I)',
    department: 'Department of Computer Science & Engineering',
    institution: 'NIT Jalandhar',
    imageUrl: '/team_members/lalatendu_behera.jpg',
    fallbackUrl: '/user-img.png',
    profileUrl: 'https://lalatendubehera.github.io/lalatendu/',
    socials: {
      linkedin: 'https://in.linkedin.com/in/lalatendu-behera-40050014',
      email: 'beheral@nitj.ac.in',
    },
  },
];

// ── Team Members Dataset ──────────────────────────────────────────────────────
export const TEAM_MEMBERS = [
  {
    id: 'nikhil-yadav',
    name: 'Nikhil Yadav',
    role: 'Product Designer',
    department: 'design',
    batch: "Design '27",
    imageUrl: '/team_members/nikhim.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    socials: {
      linkedin: 'https://www.linkedin.com/in/nikhil0148',
      portfolio: 'https://nikhim.me',
      github: 'https://github.com/experimenthim0',
    },
  },
  {
    id: 'Pranjal Bansal',
    name: 'Pranjal Bansal',
    role: 'Frontend Architect',
    department: 'frontend',
    batch: "CSE '27",
    imageUrl: '/team_members/pranjal_bansal.jpg',
    socials: {
      linkedin: 'https://www.linkedin.com/in/pranjal-bansal-nitj',
      // instagram: 'https://instagram.com',
      github: 'https://github.com/xplorewithpranjal',
    },
  },
  {
    id: 'amrit-noor',
    name: 'Amrit Noor Singh',
    role: 'Core Member',
    department: 'backend',
    batch: "CSE '27",
    imageUrl: '/team_members/amrit_noor_singh.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/amritnoor',
      // instagram: 'https://instagram.com',
      github: 'https://github.com/Amrit0726',
    },
  },
  {
    id: 'ayush-poddar',
    name: 'Ayush Poddar',
    role: 'Core Member',
    department: 'core',
    batch: "ECE '27",
    imageUrl: '/user-img.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/ayush-poddar-88026221a/',
      // instagram: 'https://instagram.com',
      github: 'https://github.com/ayushpoddar06',
    },
  },
  {
    id: 'vikrant-saini',
    name: 'Vikrant Saini',
    role: 'Frontend Architect',
    department: 'frontend',
    batch: "ECE '27",
    imageUrl: '/user-img.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/vikrant-saini',
      // instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
  {
    id: 'simran-mourya',
    name: 'Simran Mourya',
    role: 'Core Member',
    department: 'backend',
    batch: "IT '27",
    imageUrl: '/user-img.png',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
  {
    id: 'sujal-gupta',
    name: 'Sujal Gupta',
    role: 'Core Member',
    department: 'frontend',
    batch: "ECE '27",
    imageUrl: '/user-img.png',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
      github: 'https://github.com',
    },
  },
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20 sm:pb-28 relative z-10">
        {/* ── Section 1: Faculty Advisory & Mentorship ── */}
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-3 sm:mb-4">
              <GraduationCap className="w-3.5 h-3.5" />
              Faculty Advisory & Leadership
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-cn-text tracking-tight mb-3 sm:mb-4">
              Mentorship & Guidance
            </h1>
            <p className="text-sm sm:text-base text-cn-text-muted leading-relaxed mysans">
              CampusNode is developed under the institutional guidance and mentorship of faculty members from the Department of Computer Science & Engineering, NIT Jalandhar.
            </p>
          </div>
        </ScrollReveal>

        {/* Faculty Mentors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto mb-16 sm:mb-20">
          {FACULTY_MENTORS.map((mentor, index) => (
            <ScrollReveal key={mentor.id} delay={index * 0.1}>
              <FacultyCard mentor={mentor} />
            </ScrollReveal>
          ))}
        </div>

        {/* Section Divider */}
        <div className="relative flex py-5 items-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
          <span className="shrink-0 mx-4 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Student Innovation Team
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
        </div>

        {/* ── Section 2: Student Creators ── */}
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-3 sm:mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              The People Behind CampusNode
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-cn-text tracking-tight mb-3">
              Meet the Creators
            </h2>
            <p className="text-sm sm:text-base text-cn-text-muted leading-relaxed mysans">
              Designed, built, and maintained by student developers and designers at NIT Jalandhar.
            </p>
          </div>
        </ScrollReveal>

        {/* Member Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto mb-16 sm:mb-24">
          {TEAM_MEMBERS.map((member, index) => (
            <ScrollReveal key={member.id} delay={index * 0.1}>
              <InsetModernTeamCard member={member} />
            </ScrollReveal>
          ))}
        </div>

        {/* Contribute CTA Section */}
        <ScrollReveal delay={0.6}>
          <div className="text-center p-8 sm:p-12 rounded-3xl border border-cn-border bg-cn-surface/60 backdrop-blur-sm relative overflow-hidden shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-cn-text mb-2 sm:mb-3">
              Want to build with us?
            </h3>
            <p className="text-xs sm:text-sm mysans text-cn-text-muted leading-relaxed mb-5 sm:mb-6 max-w-md mx-auto">
              CampusNode is an open, student-driven initiative across NIT Jalandhar. We welcome new developers, designers, and organizers.
            </p>
            <a
              href="/contribute"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-md shadow-brand-600/20 transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <span>Join the Team & Contribute</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Interactive In-App Notification Toast Preview Playground */}
      
          
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Team;