import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  User,
  Mail,
  FileText,
  HelpCircle,
  QrCode,
  Tag,
  Globe,
  Sparkles,
  Loader2
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { markdownToHtml } from '../utils/htmlMarkdownConverter';

import { PROGRAM_OPTIONS, PROGRAM_LABELS } from '../constants/academicConstants';

const EventApprovalPreviewModal = ({
  event,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onDeleteApprove,
  onRestore,
  userRole = 'facultyCoordinator'
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payment' | 'eligibility' | 'registration' | 'organizer'
  const [reviewComment, setReviewComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen || !event) return null;

  const eventIdStr = String(event.id || event._id);
  const now = new Date();
  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;
  const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;

  const isPast = end && end < now;
  const isLive = start && end && start <= now && end > now;
  const isUpcoming = start && start > now;

  const formattedDate = start
    ? start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : 'Not Scheduled';

  const formattedStartTime = start
    ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

  const formattedEndTime = end
    ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

  const formattedDeadline = regDeadline
    ? regDeadline.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : 'Open until event start';

  const posterImage = event.imageUrl || '/CLUBSETU.png';
  const clubName = event.club?.clubName || event.createdBy?.clubName || 'Student Club';
  const clubLogo = event.club?.clubLogo || event.createdBy?.clubLogo;

  // Payment Calculation
  const paymentMethod = event.paymentMethod || (event.entryFee > 0 || event.registrationFee > 0 ? 'MANUAL_TRANSACTION' : 'FREE');
  const isPaidEvent = paymentMethod !== 'FREE' || (event.entryFee > 0 || event.registrationFee > 0);
  const feeAmount = event.registrationFee ?? event.entryFee ?? 0;

  // Team & Registration Config
  const isTeam = event.registrationType === 'team' || (event.maxTeamSize && event.maxTeamSize > 1);
  const minTeam = event.minTeamSize || 1;
  const maxTeam = event.maxTeamSize || 1;

  // Eligibility
  const isAllPrograms = !event.allowedPrograms || !Array.isArray(event.allowedPrograms) || event.allowedPrograms.length === 0 || event.allowedPrograms.length >= PROGRAM_OPTIONS.length || (PROGRAM_OPTIONS.length > 0 && PROGRAM_OPTIONS.every(p => event.allowedPrograms.includes(p)));
  const allowedPrograms = isAllPrograms ? ['All'] : event.allowedPrograms.map(p => PROGRAM_LABELS[p] || p);
  const allowedYears = Array.isArray(event.allowedYears) && event.allowedYears.length > 0 ? event.allowedYears : ['All Years'];
  const allowedBranches = Array.isArray(event.allowedBranches) && event.allowedBranches.length > 0 ? event.allowedBranches : ['All Branches'];
  const allowExternal = event.allowExternal !== false;

  // Custom Fields & Form
  const requiredFields = Array.isArray(event.requiredFields) ? event.requiredFields : [];
  const customFields = Array.isArray(event.customFields)
    ? event.customFields
    : typeof event.customFields === 'object' && event.customFields !== null
    ? Object.entries(event.customFields).map(([key, val]) => ({ fieldName: key, label: typeof val === 'string' ? val : key, ...val }))
    : [];

  const handleCopyUpi = (upiId) => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setIsSubmitting(true);
    try {
      await onApprove(eventIdStr, reviewComment);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    if (!onReject) return;
    if (!reviewComment.trim()) {
      alert('Please provide a rejection reason so the organizers know what changes are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(eventIdStr, reviewComment.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPendingReview = event.reviewStatus?.toUpperCase() === 'PENDING';
  const isDeletionRequested = event.reviewStatus?.toUpperCase() === 'DELETION_REQUESTED';
  const isApproved = event.reviewStatus?.toUpperCase() === 'PUBLISHED';
  const isRejected = event.reviewStatus?.toUpperCase() === 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Close preview"
        >
          <X size={18} />
        </button>

        {/* Modal Banner & Header */}
        <div className="relative aspect-[21/7] w-full bg-neutral-900 shrink-0 overflow-hidden">
          <img
            src={posterImage}
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/CLUBSETU.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          <div className="absolute bottom-5 left-6 right-16 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              {clubLogo ? (
                <img
                  src={clubLogo}
                  alt={clubName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white/80 dark:border-zinc-700 bg-white shadow-md shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg border-2 border-white/80 shadow-md shrink-0">
                  {clubName[0] || 'C'}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block drop-shadow-sm">
                  {clubName}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate drop-shadow-md">
                  {event.title}
                </h2>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isPendingReview && (
                <span className="px-3 py-1 bg-amber-500 text-black text-xs font-extrabold tracking-wider rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                  <Clock size={13} /> PENDING APPROVAL
                </span>
              )}
              {isDeletionRequested && (
                <span className="px-3 py-1 bg-rose-600 text-white text-xs font-extrabold tracking-wider rounded-full shadow-lg flex items-center gap-1.5">
                  <AlertTriangle size={13} /> DELETION REQUESTED
                </span>
              )}
              {isApproved && (
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-extrabold tracking-wider rounded-full shadow-lg flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> PUBLISHED / APPROVED
                </span>
              )}
              {isRejected && (
                <span className="px-3 py-1 bg-rose-600 text-white text-xs font-extrabold tracking-wider rounded-full shadow-lg flex items-center gap-1.5">
                  <XCircle size={13} /> REJECTED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="bg-neutral-50 dark:bg-zinc-900/70 border-b border-neutral-200 dark:border-zinc-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-neutral-600 dark:text-neutral-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-500" />
              <strong className="text-neutral-900 dark:text-white">{formattedDate}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-orange-500" />
              <span>{formattedStartTime} - {formattedEndTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-orange-500" />
              <strong className="text-neutral-900 dark:text-white">{event.venue || 'TBA'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
              isPaidEvent
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50'
            }`}>
              {isPaidEvent ? `₹${feeAmount} Entry Fee` : 'Free Event'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-zinc-700">
              {isTeam ? `Team (${minTeam}-${maxTeam})` : 'Individual Entry'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f0f] overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Details', icon: FileText },
            { id: 'payment', label: 'Payment & Financials', icon: CreditCard, badge: isPaidEvent ? `₹${feeAmount}` : 'Free' },
            { id: 'eligibility', label: 'Eligibility & Rules', icon: Users },
            { id: 'registration', label: 'Registration Form', icon: QrCode, badge: customFields.length > 0 ? `${customFields.length} custom` : null },
            { id: 'organizer', label: 'Organizer & Submission', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-800 text-[10px] rounded-md font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                  Event Description & Agenda
                </h4>
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 text-sm leading-relaxed prose dark:prose-invert max-w-none">
                  {event.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(event.description)
                      }}
                    />
                  ) : (
                    <p className="text-neutral-400 italic">No description provided by organizers.</p>
                  )}
                </div>
              </div>

              {/* Post Registration Message (if any) */}
              {event.postRegistrationMessage && (
                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-1">
                  <p className="text-xs font-bold text-orange-800 dark:text-orange-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Post-Registration Confirmation Note for Students:
                  </p>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap font-medium">
                    {event.postRegistrationMessage}
                  </p>
                </div>
              )}

              {/* Quick Logistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Registration Deadline</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white mt-1">{formattedDeadline}</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Total Seats / Capacity</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white mt-1">
                    {event.totalSeats > 0 ? `${event.totalSeats} seats` : 'Unlimited capacity'}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Certificate & Feedback</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white mt-1">
                    {event.provideCertificate ? '✓ Certificates Enabled' : 'No Certificates'} • {event.feedbackEnabled !== false ? '✓ Feedback Enabled' : 'No Feedback'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT & FINANCIALS */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <div className={`p-5 rounded-2xl border ${
                isPaidEvent
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                  : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isPaidEvent ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {isPaidEvent ? 'Paid Registration Event' : 'Free Entry Event'}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {isPaidEvent ? 'Participants must submit transaction proof or pay registration fee.' : 'No entry fee is charged for this event.'}
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    ₹{feeAmount}
                  </span>
                </div>

                {isPaidEvent && (
                  <div className="space-y-4 pt-3 border-t border-amber-200/80 dark:border-amber-800/40 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Payee Account Holder */}
                      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                          Payee / Account Holder Name
                        </span>
                        <p className="font-bold text-sm text-neutral-900 dark:text-white">
                          {event.accountHolderName || 'Not specified'}
                        </p>
                      </div>

                      {/* Payee UPI ID */}
                      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                            UPI ID / VPA
                          </span>
                          <p className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400">
                            {event.upiId || 'Not provided'}
                          </p>
                        </div>
                        {event.upiId && (
                          <button
                            type="button"
                            onClick={() => handleCopyUpi(event.upiId)}
                            className="px-2.5 py-1 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedUpi ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* College Payment Gateway URL if any */}
                    {event.collegePaymentUrl && (
                      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                          Official College Payment Portal URL
                        </span>
                        <a
                          href={event.collegePaymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-orange-600 hover:underline flex items-center gap-1.5 break-all"
                        >
                          <span>{event.collegePaymentUrl}</span>
                          <ExternalLink size={13} className="shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Payment Instructions for participants */}
                    {event.paymentInstructions && (
                      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                          Instructions Displayed to Students During Registration
                        </span>
                        <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                          {event.paymentInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ELIGIBILITY & RULES */}
          {activeTab === 'eligibility' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* External Participation */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                    External College Participation
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${allowExternal ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <p className="font-bold text-sm text-neutral-900 dark:text-white">
                      {allowExternal ? 'Open to External Students' : 'NITJ Students Only (Internal)'}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {allowExternal ? 'Students from other colleges/institutes can register.' : 'Restricted strictly to NITJ roll numbers.'}
                  </p>
                </div>

                {/* Team Requirements */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">
                    Participation Format & Team Size
                  </span>
                  <p className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                    {isTeam ? `Team Event (${minTeam} to ${maxTeam} members)` : 'Individual Registration (Solo)'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isTeam ? `Teams must have between ${minTeam} and ${maxTeam} verified participants.` : 'Each attendee registers individually.'}
                  </p>
                </div>
              </div>

              {/* Target Programs & Branches */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1.5">
                    Allowed Academic Programs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedPrograms.map((prog, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-bold rounded-lg text-neutral-800 dark:text-neutral-200">
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1.5">
                    Allowed Academic Years
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedYears.map((yr, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-bold rounded-lg text-neutral-800 dark:text-neutral-200">
                        {yr}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1.5">
                    Allowed Branches & Departments
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedBranches.map((br, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-bold rounded-lg text-neutral-800 dark:text-neutral-200">
                        {br}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGISTRATION FORM */}
          {activeTab === 'registration' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                  Default Required Fields
                </span>
                <div className="flex flex-wrap gap-2">
                  {requiredFields.length > 0 ? (
                    requiredFields.map((field, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold rounded-lg text-neutral-800 dark:text-neutral-200">
                        ✓ {field}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500">Standard user profile fields (Name, Email, Roll No)</span>
                  )}
                </div>
              </div>

              {/* Custom Questions / Fields */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                  Custom Registration Questions ({customFields.length})
                </span>
                {customFields.length > 0 ? (
                  <div className="space-y-2">
                    {customFields.map((field, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">
                            {idx + 1}. {field.label || field.question || field.fieldName}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Type: <span className="font-mono font-semibold">{field.type || 'text'}</span> {field.required ? '• Required' : '• Optional'}
                          </p>
                        </div>
                        {field.options && (
                          <div className="text-right text-[11px] text-neutral-500">
                            Options: {Array.isArray(field.options) ? field.options.join(', ') : String(field.options)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs text-neutral-400 text-center bg-white dark:bg-zinc-900/30">
                    No custom questions configured for this event.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ORGANIZER & METADATA */}
          {activeTab === 'organizer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                  Created & Submitted By
                </span>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 font-bold">
                      <User size={15} />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">
                        {event.createdBy?.name || 'Student Coordinator'}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {event.createdBy?.email || 'No email provided'}
                      </p>
                    </div>
                  </div>
                  {event.createdBy?.email && (
                    <a
                      href={`mailto:${event.createdBy.email}`}
                      className="px-3 py-1.5 bg-neutral-200 dark:bg-zinc-800 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Mail size={13} />
                      <span>Contact Organizer</span>
                    </a>
                  )}
                </div>
              </div>

              {event.reviewComment && (
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1">
                  <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <MessageSquare size={13} /> Previous Review Comment:
                  </span>
                  <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                    {event.reviewComment}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Decision Footer for Faculty Coordinator */}
        <div className="px-6 py-5 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50/80 dark:bg-zinc-900/80 shrink-0 space-y-3.5">
          {/* Rejection / Note Input */}
          {(isPendingReview || isRejecting) && (
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                <span>Faculty Review Notes / Instructions (Optional for Approval, Required for Rejection):</span>
                {isRejecting && <span className="text-rose-600 font-bold">* Required for rejection</span>}
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="e.g. Please verify SAC venue booking confirmation before publishing / Fee details look correct..."
                rows={2}
                className="w-full px-3.5 py-3 bg-white dark:bg-[#0c0c0c] border border-neutral-300 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-600 transition-colors text-neutral-900 dark:text-white"
              />
            </div>
          )}

          {/* Button padding scale: Secondary/destructive actions use px-4 py-2.5; primary confirm (Approve & Publish) uses px-5 py-2.5 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-neutral-200 dark:bg-zinc-800 text-neutral-800 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Close Preview
            </button>

            <div className="flex items-center gap-2.5">
              {isPendingReview ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRejectClick}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    <span>Reject Proposal</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleApproveClick}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Approve &amp; Publish Event</span>
                  </button>
                </>
              ) : isDeletionRequested ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (onRestore) onRestore(eventIdStr);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 size={14} />
                    <span>Restore Event</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (onDeleteApprove) onDeleteApprove(eventIdStr);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <XCircle size={14} />
                    <span>Approve Deletion</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold">
                    Status: {event.reviewStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventApprovalPreviewModal;
