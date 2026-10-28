import React from 'react';
import { Link } from 'react-router-dom';


const SectionTag = ({ label }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="h-px w-7 bg-brand-500" />
    <span className="text-label uppercase tracking-widest text-brand-600 dark:text-brand-400">
      {label}
    </span>
  </div>
);

const SectionTitle = ({ children, dark = false }) => (
  <h2
    className={`text-page-title mb-3 ${
      dark ? 'text-white' : 'text-cn-text'
    }`}
  >
    {children}
  </h2>
);

const SectionDesc = ({ children, dark = false }) => (
  <p
    className={`text-body-reading max-w-md mb-12 ${
      dark ? 'text-cn-text-muted' : 'text-cn-text-secondary'
    }`}
  >
    {children}
  </p>
);


const StudentCard = ({ icon, title, desc }) => (
  <div className="group bg-cn-surface hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors duration-200 p-8 flex flex-col gap-5 border-r border-b border-cn-border last:border-r-0">
    <div className="w-10 h-10 rounded-full bg-neutral-950 dark:bg-brand-600 flex items-center justify-center shrink-0">
      <span className="text-white text-base">{icon}</span>
    </div>
    <div>
      <h3 className="text-subheading mb-2 text-cn-text">
        {title}
      </h3>
      <p className="text-body text-cn-text-secondary">{desc}</p>
    </div>
  </div>
);


const OrgCard = ({ icon, title, desc, soon = false, className = '' }) => (
  <div
    className={`border border-cn-border bg-cn-surface-card rounded-xl p-7 flex flex-col gap-4 hover:border-brand-500/50 transition-colors duration-200 ${className}`}
  >
    <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
      <span className="text-white text-sm">{icon}</span>
    </div>
    <div>
      <h3 className="text-subheading text-cn-text mb-2">
        {title}
        {soon && (
          <span className="ml-2 text-label tracking-widest text-brand-500 uppercase">
            Soon
          </span>
        )}
      </h3>
      <p className="text-body text-cn-text-secondary">{desc}</p>
    </div>
  </div>
);


const Aboutfeatures = () => {
  return (
    <>
      <div className="min-h-screen bg-cn-bg text-cn-text">

        <section className="relative px-8 md:px-16 pt-20 pb-24 overflow-hidden">
          {/* BG monogram */}
          <span
            className="absolute -right-4 -bottom-10 text-[220px] font-medium text-neutral-200/40 dark:text-neutral-800/20 leading-none pointer-events-none select-none tracking-tighter"
            aria-hidden
          >
            CN
          </span>

          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-8 relative z-10">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-label tracking-wider uppercase text-cn-text-secondary flex items-center gap-1.5 flex-wrap">
              <span className="logofont font-light normal-case text-xs text-cn-text">Campus<span className="text-brand-500">Node</span></span> — Campus Events Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(40px,7vw,80px)] font-medium leading-[1.05] tracking-tight text-cn-text mb-5 relative z-10">
            Events,
            <br />
            <span className="text-brand-600 dark:text-brand-400">Simplified.</span>
          </h1>

          <p className="text-body-reading text-cn-text-secondary max-w-lg mb-10 relative z-10">
            One platform bridging students and organizers. Discover events, register instantly, and run flawless experiences.
          </p>

          <div className="flex flex-wrap gap-3 relative z-10">
            <a
              href="#students"
              className="px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-btn rounded-xl transition-colors"
            >
              For Students
            </a>
            <a
              href="#organizers"
              className="px-7 py-3.5 bg-transparent text-cn-text text-btn border border-cn-border rounded-xl hover:bg-cn-surface-muted transition-colors"
            >
              For Organizers
            </a>
          </div>
        </section>

        <section id="students" className="px-8 md:px-16 py-20 bg-cn-surface border-y border-cn-border">
          <SectionTag label="Discover Life" />
          <SectionTitle>Built for<br />the student.</SectionTitle>
          <SectionDesc>
            No more WhatsApp chaos. Every hackathon, workshop, and fest — in one clean, searchable place.
          </SectionDesc>

          {/* Feature grid — 1px divider pattern */}
          <div className="border border-cn-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-xl overflow-hidden">
            <StudentCard
              icon={<i className="ri-time-fill"></i>}
              title="Central Hub"
              desc="All campus events in one beautiful, searchable feed. No more FOMO."
            />
            <StudentCard
              icon={<i className="ri-check-double-line"></i>}
              title="1-Click Entry"
              desc="Auto-filled details. Register for any event in seconds — no form fatigue."
            />
            <StudentCard
              icon={<i className="ri-secure-payment-line"></i>}
              title="Secure Pay"
              desc="Seamless payments. Pay fees directly via UPI or Portal, receive verified tickets upon verification."
            />
            <StudentCard
              icon={<i className="ri-dashboard-line"></i>}
              title="Live Track"
              desc="A personal dashboard for every event you've registered for or attended."
            />
          </div>

          {/* CTA banner */}
          <div className="mt-10 bg-brand-600 rounded-xl px-10 py-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-section-title text-white mb-1">
                Ready to dive in?
              </h3>
              <p className="text-body text-brand-100 font-normal">
                Join 500+ NITJ students already on Campusnode.
              </p>
            </div>
            <Link
              to="/register/student"
              className="shrink-0 px-8 py-3.5 bg-white text-brand-950 text-btn rounded-xl hover:bg-brand-50 transition-colors"
            >
              Create Student Account →
            </Link>
          </div>
        </section>

        <section id="organizers" className="relative px-8 md:px-16 py-20 overflow-hidden">
          <div className="relative z-10">
            <SectionTag label="Scale Impact" />
            <SectionTitle>
              Command center<br />for club heads.
            </SectionTitle>
            <SectionDesc>
              Everything you need to create, manage, and analyze events — from one clean interface.
            </SectionDesc>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-cn-border bg-cn-surface-card rounded-xl p-8 flex flex-col gap-5 hover:border-brand-500/50 transition-colors duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <i className="ri-settings-2-line text-white text-xl"></i>
                  </div>
                  <h3 className="text-card-title text-cn-text">
                    Seamless Event Hosting
                  </h3>
                </div>
                <p className="text-body text-cn-text-secondary">
                  Create professional event pages in minutes. Set fees, define categories, and add custom registration fields — no code needed.
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Automated Payments', 'Custom Forms', 'Role Management'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 text-label uppercase tracking-widest text-cn-text-muted border border-cn-border rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <OrgCard
                icon={<i className="ri-bar-chart-box-line text-white text-xl"></i>}
                title="Data Insights"
                desc="Real-time analytics — registrations by branch, revenue, and engagement at a glance."
              />
              <OrgCard
                icon={<i className="ri-file-list-line text-white text-xl"></i>}
                title="Smart Export"
                desc="Download attendee lists and payment reports as clean Excel/CSV files in one click."
              />
              <OrgCard
                icon={<i className="ri-qr-code-line text-white text-xl"></i>}
                title="QR Attendance"
                desc="Verify entries at the door with integrated QR scanning. Zero fake entries."
                soon
              />
              <OrgCard
                icon={<i className="ri-graduation-cap-line text-white text-xl"></i>}
                title="Digital Certificates"
                desc="Issue verified digital participation certificates to all attendees automatically."
                soon
              />
            </div>

            {/* Trusted by */}
            <div className="mt-14 pt-10 border-t border-cn-border flex flex-wrap items-center gap-x-10 gap-y-4">
              {['APOGEE', 'Aarogya', 'Kalakaar', 'Fine Arts Society', 'Zeal Society', 'Rural Activity Club'].map((club) => (
                <span
                  key={club}
                  className="text-subheading text-cn-text-muted"
                >
                  {club}
                </span>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/register/club-head"
                className="inline-block px-10 py-4 bg-brand-600 text-white text-btn rounded-xl hover:bg-brand-700 transition-colors"
              >
                Onboard Your Club →
              </Link>
            </div>
          </div>
        </section>

        <section className="px-8 md:px-16 py-24 bg-cn-surface border-t border-cn-border text-center">
          <h2 className="text-section-title text-cn-text mb-4">
            Ready to{' '}
            <span className="text-brand-600 dark:text-brand-400">Connect?</span>
          </h2>
          <p className="text-body-reading text-cn-text-secondary max-w-md mx-auto mb-10">
            Whether you're hunting your next hackathon or running the grandest fest, Campusnode has you covered.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/events"
              className="w-full sm:w-auto px-9 py-4 bg-brand-600 hover:bg-brand-700 text-white text-btn rounded-xl transition-colors"
            >
              Explore Events
            </Link>
            <Link
              to="/faq"
              className="w-full sm:w-auto px-9 py-4 bg-transparent text-cn-text text-btn border border-cn-border rounded-xl hover:bg-cn-surface-muted transition-colors"
            >
              Got Questions?
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default Aboutfeatures;