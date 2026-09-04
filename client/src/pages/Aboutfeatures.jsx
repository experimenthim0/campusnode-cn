import React from 'react';
import { Link } from 'react-router-dom';


const SectionTag = ({ label }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="h-px w-7 bg-brand-500" />
    <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-brand-500">
      {label}
    </span>
  </div>
);

const SectionTitle = ({ children, dark = false }) => (
  <h2
    className={`text-[clamp(28px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-1.5px] mb-3 ${
      dark ? 'text-white' : 'text-neutral-950'
    }`}
    style={{ fontFamily: "'myfont', sans-serif" }}
  >
    {children}
  </h2>
);

const SectionDesc = ({ children, dark = false }) => (
  <p
    className={`text-[15px] font-light leading-relaxed max-w-md mb-12 ${
      dark ? 'text-neutral-600' : 'text-neutral-500'
    }`}
  >
    {children}
  </p>
);


const StudentCard = ({ icon, title, desc }) => (
  <div className="group bg-white hover:bg-brand-50 transition-colors duration-200 p-8 flex flex-col gap-5 border-r border-b border-neutral-200 last:border-r-0">
    <div className="w-10 h-10 rounded-full bg-neutral-950 flex items-center justify-center shrink-0">
      <span className="text-white text-base">{icon}</span>
    </div>
    <div>
      <h3
        className="text-[15px] font-bold tracking-[-0.3px] mb-2 text-neutral-950"
        style={{ fontFamily: "'myfont', sans-serif" }}
      >
        {title}
      </h3>
      <p className="text-[13px] font-light text-neutral-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);


const OrgCard = ({ icon, title, desc, soon = false, className = '' }) => (
  <div
    className={`border border-neutral-800 rounded-sm p-7 flex flex-col gap-4 hover:border-neutral-600 transition-colors duration-200 ${className}`}
  >
    <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
      <span className="text-black text-sm">{icon}</span>
    </div>
    <div>
      <h3
        className="text-[15px] font-bold text-black tracking-[-0.3px] mb-2"
        style={{ fontFamily: "'myfont', sans-serif" }}
      >
        {title}
        {soon && (
          <span className="ml-2 text-[10px] font-bold tracking-widest text-brand-500 uppercase">
            Soon
          </span>
        )}
      </h3>
      <p className="text-[13px] font-light text-neutral-600 leading-relaxed">{desc}</p>
    </div>
  </div>
);


const Aboutfeatures = () => {
  return (
    <>
      {/* Google font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        <section className="relative bg-white px-8 md:px-16 pt-20 pb-24 overflow-hidden">
          {/* BG monogram */}
          <span
            className="absolute -right-4 -bottom-10 text-[220px] font-extrabold text-[#d5d5d5] leading-none pointer-events-none select-none tracking-tighter"
            style={{ fontFamily: "'Syne', sans-serif" }}
            aria-hidden
          >
            NH
          </span>

          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-8 relative z-10">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-700 flex items-center gap-1.5 flex-wrap">
              <span className="logofont font-light normal-case text-xs text-black dark:text-neutral-200">Campus<span className="text-brand-500">Node</span></span> — Campus Events Platform
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-[clamp(48px,9vw,100px)] font-extrabold leading-[1] tracking-[-3px] text-black mb-5 relative z-10"
            style={{ fontFamily: "'myfont', sans-serif" }}
          >
            Events,
            <br />
            <span className="text-brand-500">Simplified.</span>
          </h1>

          <p className="text-[16px] font-light text-neutral-600 max-w-lg leading-relaxed mb-10 relative z-10">
            One platform bridging students and organizers. Discover events, register instantly, and run flawless experiences.
          </p>

          <div className="flex flex-wrap gap-3 relative z-10">
            <a
              href="#students"
              className="px-7 py-3.5 bg-brand-500 text-white text-[13px] font-bold uppercase tracking-widest rounded-sm hover:bg-brand-600 transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              For Students
            </a>
            <a
              href="#organizers"
              className="px-7 py-3.5 bg-transparent text-black text-[13px] font-bold uppercase tracking-widest border border-neutral-700 rounded-sm hover:border-neutral-400 transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              For Organizers
            </a>
          </div>
        </section>

        <section id="students" className="px-8 md:px-16 py-20 bg-white">
          <SectionTag label="Discover Life" />
          <SectionTitle>Built for<br />the student.</SectionTitle>
          <SectionDesc>
            No more WhatsApp chaos. Every hackathon, workshop, and fest — in one clean, searchable place.
          </SectionDesc>

          {/* Feature grid — 1px divider pattern */}
          <div className="border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              icon={<i class="ri-dashboard-line"></i>}
              title="Live Track"
              desc="A personal dashboard for every event you've registered for or attended."
            />
          </div>

          {/* CTA banner */}
          <div className="mt-10 bg-brand-500 rounded-sm px-10 py-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3
                className="text-[22px] font-extrabold text-white tracking-[-0.5px] mb-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Ready to dive in?
              </h3>
              <p className="text-[13px] text-brand-100 font-light">
                Join 500+ NITJ students already on CampusNode.
              </p>
            </div>
            <Link
              to="/register/student"
              className="shrink-0 px-8 py-3.5 bg-white text-neutral-950 text-[12px] font-bold uppercase tracking-widest rounded-sm hover:bg-brand-50 transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Create Student Account →
            </Link>
          </div>
        </section>

        <section id="organizers" className="relative bg-white px-8 md:px-16 py-20 overflow-hidden">
          {/* subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 0)',
              backgroundSize: '36px 36px',
            }}
          />

          <div className="relative z-10">
            <SectionTag label="Scale Impact" />
            <SectionTitle >
              Command center<br />for club heads.
            </SectionTitle>
            <SectionDesc >
              Everything you need to create, manage, and analyze events — from one clean interface.
            </SectionDesc>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-neutral-800 bg-white rounded-sm p-8 flex flex-col gap-5 hover:border-neutral-700 transition-colors duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                   
                    <i class="ri-settings-2-line text-black text-xl"></i>
                  </div>
                  <h3
                    className="text-[20px] font-bold text-black tracking-[-0.4px]"
                    style={{ fontFamily: "'myfont', sans-serif" }}
                  >
                    Seamless Event Hosting
                  </h3>
                </div>
                <p className="text-[14px] font-light text-neutral-600 leading-relaxed">
                  Create professional event pages in minutes. Set fees, define categories, and add custom registration fields — no code needed.
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Automated Payments', 'Custom Forms', 'Role Management'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border border-neutral-800 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <OrgCard
                icon={<i class="ri-bar-chart-box-line text-black text-xl"></i>}
                title="Data Insights"
                desc="Real-time analytics — registrations by branch, revenue, and engagement at a glance."
              />
              <OrgCard
                icon={<i class="ri-file-list-line text-black text-xl"></i>}
                title="Smart Export"
                desc="Download attendee lists and payment reports as clean Excel/CSV files in one click."
              />
              <OrgCard
                icon={<i class="ri-qr-code-line text-black text-xl"></i>}
                title="QR Attendance"
                desc="Verify entries at the door with integrated QR scanning. Zero fake entries."
                soon
              />
              <OrgCard
                icon={<i class="ri-graduation-cap-line text-black text-xl"></i>}
                title="Digital Certificates"
                desc="Issue verified digital participation certificates to all attendees automatically."
                soon
              />
            </div>

            {/* Trusted by */}
            <div className="mt-14 pt-10 border-t border-neutral-800 flex flex-wrap items-center gap-x-10 gap-y-4">
              {['APOGEE', 'Aarogya', 'Kalakaar', 'Fine Arts Society', 'Zeal Society', 'Rural Activity Club'].map((club) => (
                <span
                  key={club}
                  className="text-[20px] font-extrabold tracking-[-0.5px] text-neutral-500"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {club}
                </span>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/register/club-head"
                className="inline-block px-10 py-4 bg-brand-500 text-white text-[13px] font-bold uppercase tracking-widest rounded-sm hover:bg-brand-600 transition-colors"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Onboard Your Club →
              </Link>
            </div>
          </div>
        </section>

        <section className="px-8 md:px-16 py-24 bg-neutral-100 text-center">
          <h2
            className="text-[clamp(36px,6vw,72px)] font-extrabold leading-[1] tracking-[-2.5px] text-neutral-950 mb-4"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Ready to{' '}
            <span className="text-brand-500">Connect?</span>
          </h2>
          <p className="text-[15px] font-light text-neutral-500 max-w-md mx-auto mb-10 leading-relaxed">
            Whether you're hunting your next hackathon or running the grandest fest, CampusNode has you covered.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/events"
              className="w-full sm:w-auto px-9 py-4 bg-neutral-950 text-white text-[13px] font-bold uppercase tracking-widest rounded-sm hover:bg-neutral-800 transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Explore Events
            </Link>
            <Link
              to="/faq"
              className="w-full sm:w-auto px-9 py-4 bg-transparent text-neutral-950 text-[13px] font-bold uppercase tracking-widest border border-neutral-950 rounded-sm hover:bg-neutral-950 hover:text-white transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
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