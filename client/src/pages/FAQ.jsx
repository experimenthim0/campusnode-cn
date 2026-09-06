import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Mail,
  ArrowRight,
  MessageCircle,
  X,
  Share2,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

// ── Verified FAQ Dataset (Aligned with Real CampusNode Features) ───────────────
const FAQS = [
  // ── Events & Registrations ──
  {
    id: 'how-to-register',
    category: 'events',
    question: 'How do I register for an event, workshop, or competition?',
    answer:
      'Browse upcoming events on the Event Feed or Club pages. Click any event to review its dates, venue, rules, and eligibility criteria. Click "Register Now" to confirm an individual registration, or "Create Team" if the event supports team participation.',
  },
  {
    id: 'team-registration-flow',
    category: 'events',
    question: 'How does team creation and registration work on CampusNode?',
    answer:
      'For team events, the team leader clicks "Create Team", enters a unique Team Name, and searches for teammates by their official Email or College Roll Number. Once the leader adds the required number of members (within the event\'s min and max team size) and submits, teammates receive an automated Team Invitation in their Notifications center.',
  },
  {
    id: 'team-invitation-accept',
    category: 'events',
    question: 'Where do I find and accept team invitations sent by my teammates?',
    answer:
      'When a teammate adds you to their team roster, you receive an in-app and web push notification. Open your Notifications center (the bell icon in the top bar) to view the invitation card. Click "Accept" to confirm your participation and generate your event ticket, or "Reject" if you are unable to join.',
  },
  {
    id: 'team-payment-who-pays',
    category: 'events',
    question: 'For paid team events, does every member pay individually or does the leader pay?',
    answer:
      'For paid team events, the team leader completes the single combined registration payment during team creation by scanning the club UPI QR code and submitting the 12-digit UTR number. Teammates do not need to pay separately; they simply accept the team invitation from their notifications.',
  },
  {
    id: 'cancel-registration',
    category: 'events',
    question: 'Can I cancel or deregister from an event?',
    answer:
      'Yes. Go to "My Events" from the navigation bar and click "Deregister" on the event card. For team events, only the Team Leader has permission to deregister; cancelling by the leader deregisters the entire team and frees up the reserved slot for other students.',
  },
  {
    id: 'qr-ticket-access',
    category: 'events',
    question: 'Where can I find my QR ticket for venue check-in on event day?',
    answer:
      'Once registered (or once you accept a team invitation), your cryptographically signed QR ticket is available under "My Events" and on your Profile. Click "View Ticket" on your event card to open your dynamic QR code for gate coordinators to scan.',
  },
  {
    id: 'qr-ticket-offline',
    category: 'events',
    question: 'What if I have poor internet connectivity or my phone battery dies at the venue gate?',
    answer:
      'You can take a screenshot of your QR ticket in advance from "My Events". If your phone dies, gate coordinators can manually check you in using the search feature on the gate scanner tool by looking up your official College Roll Number or registered email.',
  },
  {
    id: 'external-student-participation',
    category: 'events',
    question: 'Can students from other colleges participate in fests and hackathons?',
    answer:
      'Yes, for events that allow external participants. Internal department club workshops are restricted to NIT Jalandhar students, but major campus fests (like Utkansh) and open hackathons welcome outside college students via the External Registration portal.',
  },
  {
    id: 'eligibility-restrictions',
    category: 'events',
    question: 'Why does the platform say I am ineligible to register for an event?',
    answer:
      'Event organizers can configure eligibility restrictions based on Academic Program (e.g., B.Tech, M.Tech, MBA, PhD), Academic Year (e.g., 1st Year Freshers only), or Department Branch. CampusNode verifies your student profile against these rules automatically.',
  },
  {
    id: 'waiting-list-capacity',
    category: 'events',
    question: 'What does "Waitlisted" status mean when registering?',
    answer:
      'When an event with limited capacity reaches its maximum seat limit, subsequent registrations are automatically placed on the waitlist. If any confirmed participant cancels their registration, waitlisted students are automatically promoted in chronological order.',
  },

  // ── Payments & Verification ──
  {
    id: 'payment-methods-supported',
    category: 'payments',
    question: 'What payment method is used for paid events on CampusNode?',
    answer:
      'Paid events utilize direct UPI payment via a dynamic QR code provided by the organizing club. You can scan and pay using any UPI app (Google Pay, PhonePe, Paytm, BHIM), then enter your 12-digit UPI Reference / UTR Number into the confirmation modal to complete your submission.',
  },
  {
    id: 'payment-verification-pending',
    category: 'payments',
    question: 'Why does my payment show "Pending Verification"?',
    answer:
      'CampusNode uses manual reconciliation for student club transactions. Student club treasurers and faculty coordinators cross-verify submitted UTR numbers against the society bank account. Verification typically completes within a few hours, and you will receive an alert once approved.',
  },
  {
    id: 'payment-deducted-failed',
    category: 'payments',
    question: 'My bank debited the UPI payment, but my registration still shows pending. What should I do?',
    answer:
      'Bank UPI settlements can occasionally take a short time to reflect on statements. Keep your 12-digit UTR number from your banking receipt handy. If verification is still pending after several hours, contact the event coordinator listed on the event page or email clubsetu@nikhim.me with your transaction screenshot.',
  },
  {
    id: 'incorrect-utr-submission',
    category: 'payments',
    question: 'What should I do if I entered an incorrect UTR / Transaction ID?',
    answer:
      'If you made a typo while submitting your UTR number, reach out to the organizing club coordinator listed on the event details page or email clubsetu@nikhim.me with your registered email, event name, and payment receipt screenshot for manual approval.',
  },
  {
    id: 'convenience-fee',
    category: 'payments',
    question: 'Are there any hidden platform charges or convenience fees on CampusNode?',
    answer:
      'No. CampusNode charges 0% convenience fees. 100% of your registration fee goes directly to the organizing student club or departmental society account for kits, refreshments, and prize pools.',
  },

  // ── Certificates & Attendance ──
  {
    id: 'how-to-get-certificate',
    category: 'certificates',
    question: 'When and where can I download my participation or winner certificate?',
    answer:
      'Certificates are generated once an event concludes and coordinators lock the verified attendance roster. Visit your Profile → Certificates tab to view, share, or download your high-resolution printable PDF certificate.',
  },
  {
    id: 'attendance-marking-procedure',
    category: 'certificates',
    question: 'How is attendance recorded during an event?',
    answer:
      'Present your dynamic QR ticket on your phone at the entrance or registration desk. Authorized club staff scan your QR code using the built-in CampusNode scanner to instantly stamp your attendance in the database.',
  },
  {
    id: 'attendance-missed-gate',
    category: 'certificates',
    question: 'What if I attended the event but forgot to scan my QR ticket at the gate?',
    answer:
      'Coordinators maintain backup check-in logs during events. If you missed scanning at the gate, contact the student coordinator within 24 hours of event completion with valid proof of participation so they can reconcile your attendance before certificates are locked.',
  },
  {
    id: 'certificate-authenticity-verification',
    category: 'certificates',
    question: 'How can recruiters or external organizations verify my certificate?',
    answer:
      'Every issued certificate features a secure cryptographic slug and scannable QR code. When scanned, it leads to CampusNode\'s public verification engine, confirming the student\'s name, roll number, event title, date, and awarded standing (Participant, Winner, Runner-Up).',
  },
  {
    id: 'certificate-name-correction',
    category: 'certificates',
    question: 'My name or college roll number is misspelled on my certificate. Can it be updated?',
    answer:
      'Ensure your profile name and roll number are updated correctly in Profile → Edit Profile. Then navigate to your certificate view and click "Regenerate". If the certificate batch has already been locked by faculty advisors, email clubsetu@nikhim.me for manual reissue.',
  },

  // ── Account & Security ──
  {
    id: 'nitj-email-requirement',
    category: 'account',
    question: 'Do I need an @nitj.ac.in email address to register?',
    answer:
      'Yes, NIT Jalandhar students must register with their official college G-Suite email (@nitj.ac.in). This automatically links your academic branch, roll number, and event eligibility. External participants attending open fests register via the dedicated External flow.',
  },
  {
    id: 'did-not-receive-verification-email',
    category: 'account',
    question: 'I didn\'t receive the email verification link. What should I do?',
    answer:
      'Check your Spam and Junk folders, as campus mail filters can occasionally classify automated emails as spam. If it hasn\'t arrived after a few minutes, click "Resend Verification" on the login screen.',
  },
  {
    id: 'cannot-login-role-selection',
    category: 'account',
    question: 'I cannot log in to my account. What should I check?',
    answer:
      '1) Verify your email via the confirmation link sent during sign-up. 2) Ensure you selected the correct role toggle on the login page (Student vs Club Coordinator / Admin). 3) If you forgot your password, use the "Forgot Password" link to request a reset.',
  },
  {
    id: 'forgot-password-reset',
    category: 'account',
    question: 'How do I reset my password if I forgot it?',
    answer:
      'Click "Forgot Password?" on the login screen, enter your registered campus email, and submit. You will receive a secure password reset link valid for 15 minutes. Follow the link to choose a new password.',
  },
  {
    id: 'privacy-data-visible',
    category: 'account',
    question: 'What personal information is visible to other students and club organizers?',
    answer:
      'Your public student profile displays only your name, branch, avatar, bio, and social handles (if added). Your phone number and roll number remain private and are only accessible by authorized coordinators of events you explicitly register for, purely for gate attendance.',
  },

  // ── Club Organizers ──
  {
    id: 'club-onboarding-procedure',
    category: 'organizers',
    question: 'How can our club or department society get onboarded onto CampusNode?',
    answer:
      'Club presidents or faculty coordinators can request a Club Portal by contacting the CampusNode team or Student Affairs. Approved clubs receive an administrative dashboard to post events, review payments, scan QR tickets, and design certificates.',
  },
  {
    id: 'how-to-create-event',
    category: 'organizers',
    question: 'How do club coordinators create and publish a new event?',
    answer:
      'Log into your Club Coordinator dashboard, click "+ Create Event", and enter your title, description, category, venue, dates, solo vs team limits, eligible branches/years, custom form fields, and optional UPI registration fee. You can save it as a draft or publish it directly to the campus feed.',
  },
  {
    id: 'gate-scanner-tool',
    category: 'organizers',
    question: 'How do volunteer teams scan QR tickets at the door without dedicated hardware?',
    answer:
      'No hardware scanners are required. Organizers and appointed event volunteers simply open the built-in "Check-In / Gate Scanner" tool on any smartphone browser. It activates the device camera to verify tickets and mark attendance in less than 1 second per attendee.',
  },
  {
    id: 'export-attendee-data',
    category: 'organizers',
    question: 'Can club organizers export registration rosters and attendance data to Excel?',
    answer:
      'Yes! From the event dashboard, click "Export Center" to instantly download real-time participant lists, team compositions, UTR payment verification logs, and attendance check-in timestamps as structured CSV or Excel files.',
  },
  {
    id: 'custom-certificate-templates',
    category: 'organizers',
    question: 'Can clubs upload their own custom certificate designs and faculty signatures?',
    answer:
      'Yes. CampusNode features an interactive in-browser Certificate Designer. Club heads can upload custom high-res vector/PNG backgrounds, position dynamic placeholder text (names, roll numbers, positions), and embed faculty advisor e-signatures.',
  },

  // ── Campus & Lost/Found ──
  {
    id: 'lost-and-found-portal',
    category: 'campus',
    question: 'How does the campus Lost & Found system work?',
    answer:
      'If you lost or found an item (keys, ID cards, electronics, bags) anywhere on campus, post a report under the Lost & Found section with pictures, item category, and location info. The portal helps students and security desks connect to return misplaced belongings safely.',
  },
  {
    id: 'lost-and-found-claim',
    category: 'campus',
    question: 'What proof is required to claim a found item from the finder or security desk?',
    answer:
      'To prevent wrongful claims, the claimant must verify key identifying details not visible in public photos (such as device passcode unlock, engraving details, or key chain markings) before the item handover is completed.',
  },
  {
    id: 'developer-contributions',
    category: 'campus',
    question: 'Can students contribute code or design improvements to CampusNode?',
    answer:
      'Absolutely! CampusNode is an open, student-built initiative. Visit our Contribute page (/contribute) to explore our tech stack, view open tasks, and join our WhatsApp developer channel to collaborate on features.',
  },
  {
    id: 'report-bug-feature',
    category: 'campus',
    question: 'How do I report a technical glitch or suggest a new feature for CampusNode?',
    answer:
      'You can submit bug reports and feature ideas via GitHub Issues on our repository or message our developer community directly on WhatsApp. We roll out student-driven fixes and improvements on a weekly cycle.',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FAQ PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState(new Set(['how-to-register']));
  const [copiedFaqId, setCopiedFaqId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});

  useEffect(() => {
    document.title = 'Frequently Asked Questions · CampusNode';
  }, []);

  const toggleFaq = (id) => {
    setOpenFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenFaqIds(new Set(filteredFaqs.map((f) => f.id)));
  };

  const collapseAll = () => {
    setOpenFaqIds(new Set());
  };

  const copyFaqLink = (faq) => {
    const url = `${window.location.origin}/faq#${faq.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedFaqId(faq.id);
      setTimeout(() => setCopiedFaqId(null), 2000);
    }
  };

  const handleFeedback = (faqId, isPositive) => {
    setFeedbackState((prev) => ({
      ...prev,
      [faqId]: isPositive ? 'up' : 'down',
    }));
  };

  // Pure search filtering based only on searchQuery
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return FAQS;
    return FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="mysans min-h-screen bg-[#f8f9fb] dark:bg-zinc-950 text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* Subtle Atmospheric Radial Glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 relative z-10 space-y-8 sm:space-y-10">
        {/* ── Page Header ── */}
        <div className="text-center max-w-2xl mx-auto">
          <ScrollReveal direction="up" delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Help Center & Knowledge Base</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3 sm:mb-4">
              Frequently Asked{' '}
              <span className="logofont font-light">
                Questions
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.15}>
            <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Everything you need to know about event registrations, QR tickets, payment verifications, club portals, and digital certificates on CampusNode.
            </p>
          </ScrollReveal>
        </div>

        {/* ── Search Bar ── */}
        <ScrollReveal direction="up" delay={0.2} className="space-y-4">
          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. ticket, payment, certificate, team, login)..."
              className="w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Result Count & Expand/Collapse Toggle */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1 pt-1 max-w-4xl mx-auto">
            <span>
              Showing <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{filteredFaqs.length}</strong> {filteredFaqs.length === 1 ? 'question' : 'questions'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
              >
                Expand all
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ── FAQ Accordion List ── */}
        <div className="space-y-3.5 sm:space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIds.has(faq.id);
              const isCopied = copiedFaqId === faq.id;
              const feedback = feedbackState[faq.id];

              return (
                <ScrollReveal key={faq.id} direction="up" delay={0.02 * Math.min(idx, 10)}>
                  <div
                    id={faq.id}
                    className={`rounded-2xl transition-all duration-200 border overflow-hidden ${
                      isOpen
                        ? 'bg-white/95 dark:bg-zinc-900/90 border-brand-500/30 dark:border-brand-500/30 shadow-md'
                        : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white tracking-tight leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isOpen
                            ? 'rotate-180 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-1 pt-3.5 space-y-3.5">
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {faq.answer}
                        </p>

                        {/* Interactive FAQ actions (copy link & helpful feedback) */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/40">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px]">Was this answer helpful?</span>
                            <button
                              type="button"
                              onClick={() => handleFeedback(faq.id, true)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                feedback === 'up'
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 font-semibold'
                                  : 'hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title="Yes, helpful"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(faq.id, false)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                feedback === 'down'
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-semibold'
                                  : 'hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title="Needs improvement"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                            {feedback && (
                              <span className="text-[11px] text-zinc-400 ml-1">
                                Thanks for your feedback!
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => copyFaqLink(faq)}
                            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied link</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3" />
                                <span>Copy link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })
          ) : (
            <div className="text-center py-12 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
              <HelpCircle className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                No matching answers found
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                We couldn't find anything matching "{searchQuery}". Try a different keyword or reach out directly.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* ── Still Have Questions Support Card ── */}
        <ScrollReveal direction="up" delay={0.2}>
          <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-0.5">
                    Still have questions or need assistance?
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Our team is here to help with event registrations, club dashboards, or platform issues.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <a
                  href="mailto:clubsetu@nikhim.me"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Support</span>
                </a>

                <a
                  href="https://whatsapp.com/channel/0029VbAhXba7z4kgTBY3nS0Z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <i className="ri-whatsapp-line text-sm" />
                  <span>WhatsApp Help</span>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Bottom Navigation Links ── */}
        <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm font-semibold">
          <Link
            to="/"
            className="text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1"
          >
            <span>← Back to Home</span>
          </Link>

          <div className="flex items-center gap-5">
            <Link
              to="/team"
              className="text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              The Team
            </Link>
            <Link
              to="/contribute"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors inline-flex items-center gap-1"
            >
              <span>Contribute</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;

