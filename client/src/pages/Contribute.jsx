import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const Reveal = ({ children, delay = 0, className = '' }) => {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const SocialLink = ({ icon, label, username, href, hoverColor }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`group flex items-center gap-3.5 p-4 bg-neutral-900/40 dark:bg-neutral-950/20 border border-neutral-800 rounded-xl transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-800/40 cursor-pointer`}
  >
    <div className={`w-10 h-10 bg-neutral-800 border border-neutral-700/50 rounded-lg flex items-center justify-center shrink-0 group-hover:${hoverColor} transition-colors duration-300`}>
      <i className={`${icon} text-neutral-300 group-hover:text-white text-lg transition-colors`} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="text-xs font-semibold text-neutral-300 group-hover:text-brand-500 truncate transition-colors">{username}</p>
    </div>
    <i className="ri-arrow-right-up-line ml-auto text-neutral-600 group-hover:text-brand-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
  </a>
);

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-4 mb-8">
    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-500 whitespace-nowrap">{children}</span>
    <span className="block h-px flex-1 bg-neutral-200 dark:bg-neutral-850" />
  </div>
);

const Contribute = () => {
  const [activeTab, setActiveTab] = useState('git');
  const [copiedText, setCopiedText] = useState(null);

  useEffect(() => {
    document.title = "Developer Community - CampusNode";
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const codeBlocks = {
    git: {
      title: 'git_operations.sh',
      commands: [
        '# Once repository access is granted to you:',
        'git clone https://github.com/experimenthim0/club-event.git',
        'cd club-event',
        '',
        '# Create a branch for your feature/bugfix:',
        'git checkout -b feature/your-awesome-feature'
      ].join('\n')
    },
    env: {
      title: 'setup_workspace.sh',
      commands: [
        '# Install backend dependencies:',
        'cd server && npm install',
        '',
        '# Spin up the local database using docker:',
        'npm run db:create:postgres',
        '',
        '# Synchronize schema and start backend dev server:',
        'npm run prisma:push && npm run dev'
      ].join('\n')
    },
    frontend: {
      title: 'run_client.sh',
      commands: [
        '# Navigate to frontend and install packages:',
        'cd client && npm install',
        '',
        '# Spin up the Vite development server:',
        'npm run dev',
        '',
        '# App is now running at: http://localhost:5173'
      ].join('\n')
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white transition-colors duration-300">
      
      <style>{`
        .code-font { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      `}</style>

      <div className="relative border-b border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-950 overflow-hidden py-16 sm:py-24">
        {/* Dynamic Canvas/Dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: '0 0, 12px 12px' }} 
        />
        {/* Glowing visual accent */}
        <div className="absolute -top-1/4 -right-1/4 w-[400px] h-[400px] bg-brand-600/10 dark:bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 lg:px-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 mb-6 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            <span className="code-font text-[10px] font-bold tracking-widest text-brand-700 dark:text-brand-400 uppercase">
              $ cat community_guidelines.md
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
                Join our Developer<br />
                Community
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base max-w-lg leading-relaxed mb-6">
                CampusNode is a project built for and by NIT Jalandhar students. The codebase is private, but we share access with students who join our community. Connect with us to get access and start building!
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://whatsapp.com/channel/0029VbAhXba7z4kgTBY3nS0Z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 transition-colors duration-250 cursor-pointer shadow-sm shadow-black/5"
                >
                  <i className="ri-whatsapp-line text-base" /> Join WhatsApp Community
                </a>
                <Link
                  to="/faq"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 dark:border-neutral-800 text-[12px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors duration-250"
                >
                  <i className="ri-question-line text-base" /> Read FAQ
                </Link>
              </div>
            </div>

            {/* Code IDE Mockup on Hero */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="bg-neutral-900 dark:bg-neutral-955 border border-neutral-850 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-neutral-950/80 border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="code-font text-[10px] text-neutral-500 font-bold uppercase">project_details.json</span>
                  <div className="w-12" />
                </div>
                <div className="p-5 code-font text-xs text-neutral-400 space-y-2.5">
                  <p><span className="text-brand-500">{"{"}</span></p>
                  <p className="pl-4"><span className="text-sky-400">"projectName"</span>: <span className="text-emerald-400">"CampusNode"</span>,</p>
                  <p className="pl-4"><span className="text-sky-400">"projectType"</span>: <span className="text-emerald-400">"Student Initiative"</span>,</p>
                  <p className="pl-4"><span className="text-sky-400">"location"</span>: <span className="text-emerald-400">"NIT Jalandhar"</span>,</p>
                  <p className="pl-4"><span className="text-sky-400">"codeAccess"</span>: <span className="text-emerald-400">"Community Only"</span>,</p>
                  <p className="pl-4"><span className="text-sky-400">"devCount"</span>: <span className="text-amber-400">12</span>,</p>
                  <p className="pl-4"><span className="text-sky-400">"acceptingDevs"</span>: <span className="text-rose-400">true</span></p>
                  <p><span className="text-brand-500">{"}"}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 space-y-20">

        <Reveal>
          <SectionLabel>Technology Stack</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {[
              { label: 'Frontend UI', value: 'React 19', note: 'Single Page App', icon: 'ri-reactjs-line' },
              { label: 'Build Tool', value: 'Vite 7', note: 'Hot Module Reload', icon: 'ri-terminal-box-line' },
              { label: 'Styling Engine', value: 'Tailwind v4', note: 'Utility CSS-First', icon: 'ri-palette-line' },
              { label: 'Backend Server', value: 'Express 5', note: 'Node.js runtime', icon: 'ri-server-line' },
              { label: 'Database', value: 'PostgreSQL', note: 'Prisma Client ORM', icon: 'ri-database-2-line' },
            ].map((tech, i) => (
              <div key={tech.label} className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 hover:border-brand-500 dark:hover:border-brand-500/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mb-4 transition-colors group-hover:bg-brand-600">
                  <i className={`${tech.icon} text-xl text-brand-600 group-hover:text-white transition-colors duration-250`} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">{tech.label}</p>
                <p className="text-[14px] font-black text-neutral-800 dark:text-neutral-200 leading-snug">{tech.value}</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-normal">{tech.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-850 flex items-start gap-3">
            <i className="ri-information-line text-brand-600 text-lg shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              CampusNode is structured with a decoupled modular architecture. The backend manages flexible payment verifications, generates PDF dynamic tickets with QR codes, handles custom student forms, and sends real-time event updates via WebSockets.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <SectionLabel>Roadmap to Access & Contribute</SectionLabel>
          <div className="space-y-0 border-l border-neutral-200 dark:border-neutral-800 ml-6">
            {[
              { step: '01', title: 'Join our Community', desc: 'Join our WhatsApp Channel/Group to connect with the developer team.', icon: 'ri-whatsapp-line' },
              { step: '02', title: 'Request Codebase Access', desc: 'Introduce yourself to the project maintainers and request access to the Git repository.', icon: 'ri-key-line' },
              { step: '03', title: 'Setup Locally', desc: 'Clone the repository, configure database tokens, and launch your server locally.', icon: 'ri-computer-line' },
              { step: '04', title: 'Pick a Task', desc: 'Collaborate with the maintainers to pick from existing roadmap items or suggest your own enhancements.', icon: 'ri-checkbox-line' },
              { step: '05', title: 'Submit a Review Request', desc: 'Push your branch updates and request a code review from the main developer team.', icon: 'ri-git-pull-request-line' },
            ].map((item, i) => (
              <div key={item.step} className="relative flex gap-6 pl-8 pb-10 group">
                {/* dot on timeline */}
                <div className="absolute -left-[12.5px] top-1.5 w-6 h-6 bg-white dark:bg-neutral-950 rounded-full border border-neutral-200 dark:border-neutral-800 group-hover:border-brand-500 transition-colors duration-200 flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-brand-600 rounded-full" />
                </div>

                {/* step content */}
                <div className="relative flex-grow">
                  <span className="code-font text-xs font-bold text-brand-500 mb-1 block">STEP {item.step}</span>
                  <div className="flex items-center gap-2 mb-1.5">
                    <i className={`${item.icon} text-brand-600 text-sm`} />
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-[15px]">{item.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <SectionLabel>Setup Guides & Commands</SectionLabel>
          <div className="bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
            
            <div className="bg-neutral-950 border-b border-neutral-900/60 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800/60">
                {Object.keys(codeBlocks).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-md text-[10px] code-font font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === tab 
                        ? 'bg-neutral-950 text-brand-500' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {codeBlocks[tab].title}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleCopy(codeBlocks[activeTab].commands, activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-855 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 text-[10px] code-font uppercase cursor-pointer transition-colors"
              >
                {copiedText === activeTab ? (
                  <>
                    <i className="ri-check-line text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <i className="ri-file-copy-line" /> Copy
                  </>
                )}
              </button>
            </div>

            {/* Terminal Body */}
            <div className="p-6 code-font text-xs leading-relaxed overflow-x-auto text-neutral-300 h-64 bg-neutral-900/20">
              <pre className="whitespace-pre">{codeBlocks[activeTab].commands}</pre>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <SectionLabel>Areas We Need Help With</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: 'ri-bug-line', title: 'Bug Fixes', desc: 'Investigate open bugs, address memory leaks, and submit fixes to stable releases.', tag: 'Medium' },
              { icon: 'ri-paint-brush-line', title: 'UX & UI Refinement', desc: 'Craft sleek modern animations, enhance accessibility, and polish responsive layouts.', tag: 'Design' },
              { icon: 'ri-shield-keyhole-line', title: 'Security & Auth', desc: 'Audit middlewares, secure API endpoints against vulnerabilities, and harden JWT auth.', tag: 'High' },
              { icon: 'ri-speed-line', title: 'Perf Optimization', desc: 'Minimize bundle sizes, optimize database connection pooling, and integrate query caching.', tag: 'Refactor' },
              { icon: 'ri-notification-3-line', title: 'Email & Notify System', desc: 'Harden webhooks, configure background job queues, and add push/email alerts.', tag: 'Feature' },
              { icon: 'ri-test-tube-line', title: 'Test Automation', desc: 'Add comprehensive unit, integration, and E2E browser tests using Vitest and Playwright.', tag: 'Testing' },
            ].map((area, i) => (
              <div key={area.title} className="group flex items-start gap-4 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-855 rounded-2xl hover:border-brand-500 dark:hover:border-brand-500/50 hover:shadow-sm transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shrink-0 group-hover:bg-brand-600 transition-colors">
                  <i className={`${area.icon} text-lg text-brand-600 group-hover:text-white transition-colors duration-250`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">{area.title}</h3>
                    <span className="code-font text-[9px] px-1.5 py-0.5 rounded border border-neutral-350 dark:border-neutral-750 text-neutral-400 bg-neutral-50 dark:bg-neutral-950 font-bold uppercase">{area.tag}</span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{area.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <SectionLabel>Project Maintainer</SectionLabel>
          <div className="bg-neutral-900 dark:bg-neutral-955 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
            <div className="h-1 bg-brand-600 w-full" />

            <div className="p-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-850 border border-neutral-800 flex items-center justify-center shrink-0 text-3xl text-brand-500 shadow-md">
                    <i className="ri-user-3-line" />
                  </div>
                  <div>
                    <span className="code-font text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Repository Owner</span>
                    <h3 className="text-2xl font-black text-white leading-tight">Nikhil Yadav</h3>
                    <p className="text-xs text-neutral-400 mt-1">Student · NIT Jalandhar</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleCopy('contact.nikhim@gmail.com', 'email')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-855 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <i className="ri-mail-line" />
                    {copiedText === 'email' ? 'Copied' : 'Copy Email'}
                  </button>
                  <a
                    href="mailto:contact.nikhim@gmail.com"
                    className="inline-flex items-center justify-center w-10.5 h-10.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-base transition-colors cursor-pointer"
                    aria-label="Direct Email"
                  >
                    <i className="ri-external-link-line" />
                  </a>
                </div>
              </div>

              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-8 max-w-xl">
                Feel free to connect or open an issue if you encounter bugs, want to suggest optimizations, or collaborate on expanding feature modules. Let's make campus software better.
              </p>

              {/* Social grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SocialLink icon="ri-github-fill" label="GitHub" username="experimenthim0" href="https://github.com/experimenthim0" hoverColor="bg-neutral-700" />
                <SocialLink icon="ri-linkedin-box-fill" label="LinkedIn" username="Nikhil Yadav" href="https://linkedin.com/in/nikhilydv0148" hoverColor="bg-blue-600" />
                <SocialLink icon="ri-twitter-x-fill" label="X / Twitter" username="@Nikhil0148" href="https://x.com/Nikhil0148" hoverColor="bg-neutral-800" />
                <SocialLink icon="ri-instagram-line" label="Instagram" username="@nikhim.me" href="https://instagram.com/nikhim.me" hoverColor="bg-pink-600" />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <SectionLabel>Contribution Guidelines</SectionLabel>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-7 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: 'Write Clean Code', desc: 'Follow standard ESLint formatting, add clean comments for non-trivial modules, and export clean components.' },
                { title: 'Respect Existing Patterns', desc: 'Match state management structures, respect API parameter validation styles, and use established color tokens.' },
                { title: 'Test Locally', desc: 'Ensure your updates build with zero warnings or exceptions, and test features thoroughly across screen boundaries.' },
                { title: 'Explain Your Changes', desc: 'Provide clear, concise details in your pull request templates explaining the motivations and motivations.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="ri-check-line text-emerald-600 dark:text-emerald-400 text-xs" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">{item.title}</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-855">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors">
            <i className="ri-arrow-left-line" /> Back to Home
          </Link>
          <span className="code-font text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">CampusNode · Developer Community</span>
        </div>

      </div>
    </div>
  );
};

export default Contribute;