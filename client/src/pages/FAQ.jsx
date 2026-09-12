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
  // ─────────────────────────────────────────────
  // Events & Registration
  // ─────────────────────────────────────────────
  {
    id: 'how-to-find-events',
    category: 'events',
    question: 'How can I find events on CampusNode?',
    answer:
      'Open the Event Feed to explore upcoming events from campus clubs, societies, departments, and organizers. You can search and filter events to find opportunities based on your interests and requirements.',
  },
  {
    id: 'how-to-register',
    category: 'events',
    question: 'How do I register for an event?',
    answer:
      'Open the event you want to attend and review its date, venue, eligibility, registration requirements, and participation rules. If you are eligible and registration is open, click "Register Now" and complete the required registration steps.',
  },
  {
    id: 'registration-status',
    category: 'events',
    question: 'How can I check my event registration status?',
    answer:
      'Open "My Events" from your account to view the events you have registered for and check the current status of each registration.',
  },
  {
    id: 'cancel-registration',
    category: 'events',
    question: 'Can I cancel my event registration?',
    answer:
      'If the event allows deregistration, you can cancel your registration from "My Events". Team-event cancellation may be restricted to the team leader because it can affect the registration status of the entire team.',
  },
  {
    id: 'event-eligibility',
    category: 'events',
    question: 'Why am I not eligible to register for an event?',
    answer:
      'Some events have eligibility requirements such as academic program, year, branch, or other conditions configured by the organizer. CampusNode checks your profile against the eligibility rules before allowing registration.',
  },
  {
    id: 'registration-closed',
    category: 'events',
    question: 'Why can I not register for an event?',
    answer:
      'Registration may be unavailable because the registration period has ended, the event has reached its capacity, you are not eligible, or registration has been disabled by the organizer. Check the event details for the current registration status.',
  },
  {
    id: 'event-details',
    category: 'events',
    question: 'What information can I find on an event page?',
    answer:
      'An event page can contain the event description, organizer information, date and time, venue, eligibility requirements, registration details, participation rules, team requirements, payment information, sponsors, media, and other information provided by the organizer.',
  },
  {
    id: 'external-participants',
    category: 'events',
    question: 'Can students from other colleges participate in CampusNode events?',
    answer:
      'Yes, if the organizer has enabled external participation for the event. Events can be configured for NIT Jalandhar students only or opened to participants from other institutions.',
  },
  {
    id: 'waitlist',
    category: 'events',
    question: 'What does it mean if an event is full or I am waitlisted?',
    answer:
      'An event may have a participant capacity configured by its organizer. When capacity is reached, registration may become unavailable or follow the event\'s configured waitlist process. The event status shown on CampusNode is the latest indication of whether you can register.',
  },

  // ─────────────────────────────────────────────
  // Teams
  // ─────────────────────────────────────────────
  {
    id: 'team-registration',
    category: 'events',
    question: 'How does team registration work?',
    answer:
      'For an event that supports teams, a student can create a team and add eligible members according to the event\'s minimum and maximum team size. Team members may need to accept their invitations before the team becomes fully confirmed.',
  },
  {
    id: 'create-team',
    category: 'events',
    question: 'How do I create a team for an event?',
    answer:
      'Open a team-based event and select "Create Team". Enter the required team information and add eligible members using the available student search options. Complete any additional registration or payment requirements shown by the event.',
  },
  {
    id: 'team-invitation',
    category: 'events',
    question: 'How do team members receive a team invitation?',
    answer:
      'When a team leader adds a student to a team, CampusNode creates a private team invitation for that student. The invited student can access the invitation through their notifications and take the available action.',
  },
  {
    id: 'accept-team-invitation',
    category: 'events',
    question: 'Where can I accept or reject a team invitation?',
    answer:
      'Open the Notifications section from your CampusNode account and find the team invitation. From the invitation, you can accept or reject it when those actions are available.',
  },
  {
    id: 'team-invitation-not-visible',
    category: 'events',
    question: 'Why can I not see my team invitation?',
    answer:
      'Make sure you are signed into the account that was invited and check your Notifications section. If the invitation is still missing, the team may have been changed or the invitation may no longer be active.',
  },
  {
    id: 'team-leader',
    category: 'events',
    question: 'Who can manage a team?',
    answer:
      'The team leader manages the team according to the event\'s configured rules. Team members can accept or reject invitations, while actions affecting the entire team may be restricted to the team leader.',
  },
  {
    id: 'team-member-changes',
    category: 'events',
    question: 'Can team members be changed after creating a team?',
    answer:
      'Team-member changes depend on the event and the current registration state. If the event permits changes, the team leader can manage the team through the available team-management options.',
  },

  // ─────────────────────────────────────────────
  // Payments
  // ─────────────────────────────────────────────
  {
    id: 'paid-events',
    category: 'payments',
    question: 'How do I register for a paid event?',
    answer:
      'For a paid event, follow the payment instructions displayed on the event or registration page. After making the payment, submit the requested transaction or UTR details so the organizer can verify the payment.',
  },
  {
    id: 'payment-method',
    category: 'payments',
    question: 'What payment method is supported for paid events?',
    answer:
      'The payment method depends on the event configuration. When an organizer requires UPI payment, the event provides the payment details or QR code needed to complete the transaction.',
  },
  {
    id: 'utr-number',
    category: 'payments',
    question: 'What is a UTR or transaction reference number?',
    answer:
      'A UTR or transaction reference number is the identifier provided by your payment service for a transaction. When an event uses transaction-based payment verification, you must enter the correct reference number so the organizer can match your payment.',
  },
  {
    id: 'payment-verification',
    category: 'payments',
    question: 'Why is my payment showing as pending verification?',
    answer:
      'A submitted payment may remain pending while the event organizer or authorized coordinator verifies the transaction details. Your registration status will be updated after the payment is reviewed.',
  },
  {
    id: 'payment-rejected',
    category: 'payments',
    question: 'Why was my payment verification rejected?',
    answer:
      'Payment verification can be rejected if the submitted transaction details cannot be matched, the information is incorrect, or the organizer cannot confirm the payment. Check the registration details and contact the event organizer if you believe the rejection is incorrect.',
  },
  {
    id: 'wrong-utr',
    category: 'payments',
    question: 'What should I do if I submitted the wrong UTR or transaction ID?',
    answer:
      'Contact the event organizer or authorized coordinator as soon as possible and provide the correct transaction details along with any requested proof of payment. Do not submit another payment unless the organizer specifically instructs you to do so.',
  },
  {
    id: 'registration-fee-refund',
    category: 'payments',
    question: 'How can I request a refund for an event registration?',
    answer:
      'Refunds depend on the event\'s refund policy and the organizer. Check the event information or contact the organizing club or coordinator to determine whether your registration is eligible for a refund.',
  },

  // ─────────────────────────────────────────────
  // QR Tickets & Attendance
  // ─────────────────────────────────────────────
  {
    id: 'event-ticket',
    category: 'events',
    question: 'Where can I find my event ticket or QR code?',
    answer:
      'After your registration reaches the required confirmed status, your event ticket or QR code can be accessed from the relevant event section of your account, such as "My Events", when provided for that event.',
  },
  {
    id: 'qr-checkin',
    category: 'events',
    question: 'How does QR check-in work at an event?',
    answer:
      'At the event venue, authorized event staff can scan your CampusNode QR ticket using the event check-in system. A successful scan records your attendance for the event.',
  },
  {
    id: 'qr-ticket-problem',
    category: 'events',
    question: 'What should I do if my QR ticket is not working?',
    answer:
      'First, make sure you are using the ticket for the correct event and that your registration is confirmed. If the problem continues at the venue, contact the authorized event staff or registration desk for assistance.',
  },
  {
    id: 'attendance',
    category: 'events',
    question: 'How is my attendance recorded?',
    answer:
      'Attendance can be recorded by authorized event staff using the CampusNode check-in system. The exact check-in method depends on how the organizer has configured the event.',
  },
  {
    id: 'missed-checkin',
    category: 'events',
    question: 'What if I attended an event but my attendance was not recorded?',
    answer:
      'Contact the event organizer or authorized event staff as soon as possible. They can review the available attendance information and determine whether your attendance can be corrected.',
  },

  // ─────────────────────────────────────────────
  // Certificates
  // ─────────────────────────────────────────────
  {
    id: 'event-certificates',
    category: 'certificates',
    question: 'Does CampusNode provide event certificates?',
    answer:
      'Certificates can be issued through CampusNode when the event organizer uses the certificate system. Eligibility and certificate issuance depend on the event\'s attendance and certificate rules.',
  },
  {
    id: 'certificate-download',
    category: 'certificates',
    question: 'Where can I find my certificate?',
    answer:
      'If a certificate has been issued to you, open the Certificates section of your CampusNode profile to view and access it.',
  },
  {
    id: 'certificate-not-received',
    category: 'certificates',
    question: 'Why have I not received my event certificate yet?',
    answer:
      'Certificate issuance depends on the organizer completing attendance verification and the certificate process for the event. If certificates have been announced but yours is missing, contact the event organizer.',
  },
  {
    id: 'certificate-verification',
    category: 'certificates',
    question: 'How can someone verify a CampusNode certificate?',
    answer:
      'CampusNode certificates can include verification information such as a unique verification identifier or QR code. A verifier can use the provided verification mechanism to check whether the certificate is valid.',
  },
  {
    id: 'certificate-details',
    category: 'certificates',
    question: 'What information can appear on a CampusNode certificate?',
    answer:
      'Certificate information depends on the template and event. It can include the participant\'s name, roll number, event name, event date, organization, and achievement or participation status.',
  },
  {
    id: 'certificate-correction',
    category: 'certificates',
    question: 'What should I do if my certificate contains incorrect information?',
    answer:
      'First check that your profile information is correct. If the certificate still contains incorrect information, contact the event organizer so they can review the certificate and determine whether it can be corrected or reissued.',
  },

  // ─────────────────────────────────────────────
  // Account & Profile
  // ─────────────────────────────────────────────
  {
    id: 'create-account',
    category: 'account',
    question: 'How do I create a CampusNode account?',
    answer:
      'Use the CampusNode registration flow and provide the information requested for your account type. Complete any required verification steps before using features that require an authenticated account.',
  },
  {
    id: 'student-account',
    category: 'account',
    question: 'Who can create a student account?',
    answer:
      'Student accounts are intended for eligible students supported by CampusNode. The registration process may require institutional information such as your college email, roll number, branch, program, or academic year.',
  },
  {
    id: 'email-verification',
    category: 'account',
    question: 'Why do I need to verify my email?',
    answer:
      'Email verification helps CampusNode confirm ownership of the email address associated with your account and protects account-related features.',
  },
  {
    id: 'verification-email-not-received',
    category: 'account',
    question: 'I did not receive my verification email. What should I do?',
    answer:
      'Check your Spam or Junk folder and confirm that the email address you entered is correct. If the verification option is available, request another verification email.',
  },
  {
    id: 'forgot-password',
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'Select "Forgot Password" on the login page and follow the password-reset instructions sent to your registered email address.',
  },
  {
    id: 'cannot-login',
    category: 'account',
    question: 'Why can I not log in to CampusNode?',
    answer:
      'Check that you are using the correct email and password and that your account has completed any required verification. If you use a role-specific login flow, make sure you are using the appropriate account type.',
  },
  {
    id: 'edit-profile',
    category: 'account',
    question: 'How can I update my profile information?',
    answer:
      'Open your Profile and use the available profile-editing options to update information that CampusNode allows you to change.',
  },
  {
    id: 'privacy',
    category: 'account',
    question: 'What personal information is visible to other users?',
    answer:
      'CampusNode only exposes profile information that is intended to be public or required for a specific platform function. Sensitive account information should not be treated as publicly visible. Access to additional information is controlled by the relevant permissions and event workflows.',
  },

  // ─────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────
  {
    id: 'notifications',
    category: 'account',
    question: 'Where can I see my CampusNode notifications?',
    answer:
      'Open the Notifications section from your CampusNode account. Notifications are used to keep you informed about actions and updates relevant to your account, events, teams, clubs, and other CampusNode activities.',
  },
  {
    id: 'notification-types',
    category: 'account',
    question: 'What kind of notifications can I receive?',
    answer:
      'Depending on your account and activity, notifications can include team invitations, event updates, registration updates, approvals, payment updates, attendance-related updates, and other messages relevant to you.',
  },
  {
    id: 'private-notifications',
    category: 'account',
    question: 'Can other users see my private notifications?',
    answer:
      'No. Private notifications are intended only for their specified recipient or authorized audience. A notification should not become visible to another user simply because that user has a different role or administrative access.',
  },
  {
    id: 'notification-read',
    category: 'account',
    question: 'How do I mark a notification as read?',
    answer:
      'Open the notification from your Notifications section. CampusNode can mark notifications as read when you view them, and supported notification controls may also allow you to manage unread notifications.',
  },

  // ─────────────────────────────────────────────
  // Clubs & Organizers
  // ─────────────────────────────────────────────
  {
    id: 'club-onboarding',
    category: 'organizers',
    question: 'How can a club or society join CampusNode?',
    answer:
      'Clubs and societies can follow the CampusNode onboarding or approval process available to organizations. Access to organizer features is provided after the required authorization and approval steps are completed.',
  },
  {
    id: 'create-event',
    category: 'organizers',
    question: 'How can a club create an event?',
    answer:
      'Authorized club organizers can use their organizer dashboard to create an event and provide information such as the title, description, schedule, venue, eligibility, registration settings, team requirements, payment details, and other event-specific information.',
  },
  {
    id: 'event-draft',
    category: 'organizers',
    question: 'Can an organizer save an event before publishing it?',
    answer:
      'Yes, if draft functionality is enabled for the organizer account. An event can be prepared and reviewed before it is made available to participants.',
  },
  {
    id: 'event-approval',
    category: 'organizers',
    question: 'Does every event require approval before publishing?',
    answer:
      'Event publishing can follow the approval workflow configured for the organizer and institution. Where approval is required, the event must pass the relevant review process before it becomes publicly available.',
  },
  {
    id: 'manage-registrations',
    category: 'organizers',
    question: 'Can organizers manage event registrations on CampusNode?',
    answer:
      'Authorized organizers can manage registrations for their events according to their permissions. Depending on the event, this can include reviewing participants, teams, payment status, and registration information.',
  },
  {
    id: 'export-event-data',
    category: 'organizers',
    question: 'Can organizers export event registration data?',
    answer:
      'Authorized organizers can use the available event data export tools to download registration information and other permitted event data. The available fields depend on the organizer\'s permissions and the event data.',
  },
  {
    id: 'certificate-designer',
    category: 'organizers',
    question: 'Can organizers design certificates on CampusNode?',
    answer:
      'CampusNode provides a certificate-design workflow for authorized organizers. Organizers can configure certificate layouts and dynamic participant information according to the available designer features.',
  },
  {
    id: 'qr-scanner',
    category: 'organizers',
    question: 'Can event organizers scan participant QR tickets?',
    answer:
      'Authorized event staff can use the CampusNode check-in or scanner tools to scan participant tickets and record attendance for the relevant event.',
  },

  // ─────────────────────────────────────────────
  // Faculty Coordinator
  // ─────────────────────────────────────────────
  {
    id: 'faculty-coordinator',
    category: 'organizers',
    question: 'What is the role of a Faculty Coordinator on CampusNode?',
    answer:
      'A Faculty Coordinator can oversee and support the activities assigned to them, including relevant club or event workflows that require faculty involvement. Their available actions depend on the permissions assigned to their account.',
  },
  {
    id: 'faculty-approvals',
    category: 'organizers',
    question: 'What can a Faculty Coordinator approve?',
    answer:
      'Faculty approval capabilities depend on the workflow and permissions assigned to the account. Where faculty approval is required, the coordinator can review the relevant request and take the permitted approval or rejection action.',
  },
  {
    id: 'faculty-notifications',
    category: 'organizers',
    question: 'What notifications should a Faculty Coordinator receive?',
    answer:
      'Faculty Coordinators should receive notifications relevant to their assigned responsibilities, such as incoming requests or updates from relevant clubs, organizers, or administrative workflows. Private notifications belonging to individual students or unrelated users are not part of their notification inbox.',
  },

  // ─────────────────────────────────────────────
  // ODSW / Central Organizer / Event Staff
  // ─────────────────────────────────────────────
  {
    id: 'odsw-role',
    category: 'organizers',
    question: 'What is the ODSW or Central Organizer role?',
    answer:
      'The ODSW or Central Organizer role is intended for authorized users who manage or coordinate institution-level events and activities. The exact capabilities depend on the permissions assigned to the account.',
  },
  {
    id: 'central-event-management',
    category: 'organizers',
    question: 'Can the Central Organizer manage college-level events?',
    answer:
      'Authorized Central Organizers can manage institution-level event workflows supported by CampusNode, including the event-management functions available to their account.',
  },
  {
    id: 'event-staff',
    category: 'organizers',
    question: 'What is an Event Staff account?',
    answer:
      'Event Staff are authorized users assigned to support a particular event. Their access should be limited to the event-related functions and information required for their assigned responsibilities.',
  },
  {
    id: 'event-staff-access',
    category: 'organizers',
    question: 'Can Event Staff access every event on CampusNode?',
    answer:
      'No. Event Staff access is intended to be scoped to the events and functions they are authorized to handle. Staff assigned to one event should not automatically gain access to unrelated event operations.',
  },

  // ─────────────────────────────────────────────
  // Search & Discovery
  // ─────────────────────────────────────────────
  {
    id: 'search-campusnode',
    category: 'campus',
    question: 'How can I search for events, clubs, or other content?',
    answer:
      'Use the CampusNode search feature to find relevant events, clubs, and supported campus content. Search results can be refined using the available filters and categories.',
  },
  {
    id: 'club-pages',
    category: 'campus',
    question: 'Where can I find information about campus clubs?',
    answer:
      'Open the Clubs section or a club profile to explore the organization\'s information, events, activities, and other details made available by the club.',
  },

  // ─────────────────────────────────────────────
  // Lost & Found
  // ─────────────────────────────────────────────
  {
    id: 'lost-found',
    category: 'campus',
    question: 'How does CampusNode Lost & Found work?',
    answer:
      'The Lost & Found section allows campus users to report lost or found items and provide relevant information such as the item category, description, images, and location. The system helps connect people who may be able to return or identify an item.',
  },
  {
    id: 'report-lost-item',
    category: 'campus',
    question: 'How do I report a lost item?',
    answer:
      'Open the Lost & Found section and create a lost-item report. Provide accurate information about the item and where or when it was last seen so that others can identify it.',
  },
  {
    id: 'report-found-item',
    category: 'campus',
    question: 'How do I report an item that I found?',
    answer:
      'Create a found-item report in the Lost & Found section and provide useful identifying information without unnecessarily exposing sensitive details. Follow the platform\'s instructions for safely returning the item.',
  },
  {
    id: 'claim-found-item',
    category: 'campus',
    question: 'How is ownership verified for a found item?',
    answer:
      'A claimant may be asked to provide identifying information or proof that demonstrates ownership. Do not publicly reveal private identifying details that could allow someone else to make a false claim.',
  },

  // ─────────────────────────────────────────────
  // Security & Support
  // ─────────────────────────────────────────────
  {
    id: 'account-security',
    category: 'account',
    question: 'How does CampusNode protect my account?',
    answer:
      'CampusNode uses account authentication, role and permission controls, and protected application workflows to restrict access to platform features and data. Keep your password and verification information private and never share them with another person.',
  },
  {
    id: 'two-factor-authentication',
    category: 'account',
    question: 'Does CampusNode support two-factor authentication?',
    answer:
      'Two-factor authentication can be enabled for supported account types and security workflows. If 2FA is available for your account, follow the security settings or verification flow provided by CampusNode.',
  },
  {
    id: 'report-problem',
    category: 'campus',
    question: 'How do I report a problem or technical issue?',
    answer:
      'If you encounter a technical problem, provide the relevant details such as the page or feature, what you were trying to do, and what happened. Use the support or issue-reporting channel provided by CampusNode.',
  },
  {
    id: 'feature-request',
    category: 'campus',
    question: 'How can I suggest a new CampusNode feature?',
    answer:
      'You can submit feature suggestions through the available CampusNode feedback or contribution channels. Include a clear explanation of the problem and how the proposed feature would help students, clubs, organizers, or administrators.',
  },
  {
    id: 'student-contribution',
    category: 'campus',
    question: 'Can students contribute to CampusNode?',
    answer:
      'Yes. Students can contribute ideas, feedback, design improvements, development work, and other useful contributions through the contribution channels provided by the CampusNode project.',
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
    <div className="mysans min-h-screen bg-cn-bg text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full  border border-cn-blue-500/40 bg-cn-blue-500/10 text-cn-blue-600 dark:text-cn-blue-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
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
              className="w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cn-blue-500/30 focus:border-cn-blue-500 transition-all shadow-xs"
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
                className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors cursor-pointer"
              >
                Expand all
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors cursor-pointer"
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
                        ? 'bg-white/95 dark:bg-zinc-900/90 border-cn-blue-500/30 dark:border-cn-blue-500/30 shadow-md'
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
                            ? 'rotate-180 bg-cn-blue-500/10 text-cn-blue-600 dark:text-cn-blue-400'
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
                            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors cursor-pointer"
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
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-whatsapp hover:bg-whatsapp-hover text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
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
            className="text-zinc-600 dark:text-zinc-400 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <span>← Back to Home</span>
          </Link>

          <div className="flex items-center gap-5">
            <Link
              to="/team"
              className="text-zinc-600 dark:text-zinc-400 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors"
            >
              The Team
            </Link>
            <Link
              to="/contribute"
              className="text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 transition-colors inline-flex items-center gap-1"
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

