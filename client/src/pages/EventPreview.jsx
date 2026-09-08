import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Send,
  Globe,
  Tag,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { markdownToHtml } from '../utils/htmlMarkdownConverter';
import { getEventById, submitEventForReview } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { validateAllEventSteps } from '../utils/eventValidation';
import { PROGRAM_OPTIONS, PROGRAM_LABELS } from '../constants/academicConstants';

const EventPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await getEventById(id);
        const data = res.data;
        setEvent(data);

        // Run client validation check for completeness
        const vResult = validateAllEventSteps(data, {
          sponsors: data.sponsors || [],
          media: data.media || [],
          isUnlimited: data.totalSeats === 0,
        });
        setValidationResult(vResult);
      } catch (err) {
        console.error('Failed to load event for preview:', err);
        showNotification(
          err.response?.data?.message || 'Could not load event for preview.',
          'error'
        );
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id, navigate, showNotification]);

  const handleSubmitForReview = async (directPublish = false) => {
    if (!validationResult?.isValid) {
      showNotification(
        'Please resolve incomplete sections before submitting.',
        'error'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitEventForReview(id, { directPublish });
      showNotification(
        res.data?.message ||
          (directPublish
            ? 'Event published successfully!'
            : 'Event submitted for faculty approval!'),
        'success'
      );
      // Reload event data to reflect new status
      const updated = res.data?.event || res.data;
      setEvent(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Submission failed:', err);
      const msg = err.response?.data?.message || 'Failed to submit event.';
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        showNotification(`${msg}: ${errors.join(' ')}`, 'error');
      } else {
        showNotification(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-neutral-500">Loading event preview...</p>
      </div>
    );
  }

  if (!event) return null;

  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;
  const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;

  const formattedDate = start
    ? start.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date to be announced';

  const formattedStartTime = start
    ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  const formattedEndTime = end
    ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const posterImage = event.imageUrl || '/CLUBSETU.png';
  const clubName = event.club?.clubName || 'Club Event';
  const clubLogo = event.club?.clubLogo;

  const paymentMethod = event.paymentMethod || 'FREE';
  const isPaid = paymentMethod !== 'FREE' || event.registrationFee > 0;
  const feeAmount = event.registrationFee ?? event.entryFee ?? 0;

  const isTeam = event.registrationType === 'team' || (event.maxTeamSize && event.maxTeamSize > 1);
  const minTeam = event.minTeamSize || 1;
  const maxTeam = event.maxTeamSize || 1;

  const isAllPrograms =
    !event.allowedPrograms ||
    !Array.isArray(event.allowedPrograms) ||
    event.allowedPrograms.length === 0 ||
    event.allowedPrograms.length >= PROGRAM_OPTIONS.length;
  const allowedPrograms = isAllPrograms
    ? ['All Programs']
    : event.allowedPrograms.map((p) => PROGRAM_LABELS[p] || p);

  const allowedYears =
    Array.isArray(event.allowedYears) && event.allowedYears.length > 0
      ? event.allowedYears
      : ['All Years'];

  const allowedBranches =
    Array.isArray(event.allowedBranches) && event.allowedBranches.length > 0
      ? event.allowedBranches
      : ['All Branches'];

  const canDirectPublish =
    user?.role === 'admin' || user?.role === 'SUPER_ADMIN';

  const isCreator = Boolean(
    event &&
      user &&
      (event.createdById === user.id ||
        event.createdById === user._id ||
        (event.createdBy && (event.createdBy.id === user.id || event.createdBy.id === user._id)))
  );

  const isClubCoordinator = Boolean(
    user &&
      (user.role === 'club' ||
        user.role === 'club_account' ||
        (user.clubId && String(event?.clubId) === String(user.clubId)))
  );

  const canEdit = canDirectPublish || isCreator || isClubCoordinator;

  const isDraft = event.reviewStatus === 'DRAFT';
  const isRejected = event.reviewStatus === 'REJECTED';
  const isPending = event.reviewStatus === 'PENDING';
  const isPublished = event.reviewStatus === 'PUBLISHED';

  return (
    <div className="min-h-screen bg-cn-bg pb-24">
      {/* Top sticky organizer toolbar */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Back to edit & Status Pill */}
          <div className="flex items-center space-x-3">
            {canEdit && (
              <Link
                to={`/events/edit/${event.id}`}
                className="inline-flex items-center text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Edit
              </Link>
            )}

            {/* Status pill */}
            {isDraft && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 mr-1.5" />
                Draft Preview
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                <Clock className="w-3 h-3 mr-1" />
                Pending Faculty Review
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Needs Changes (Rejected)
              </span>
            )}
            {isPublished && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                Published & Live
              </span>
            )}
          </div>

          {/* Center: Quick Step Jumps */}
          {canEdit && (
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-neutral-500">
              <span className="mr-1">Jump to:</span>
              {[
                { id: 1, label: 'Basic' },
                { id: 2, label: 'Schedule' },
                { id: 3, label: 'Registration' },
                { id: 4, label: 'Extras' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/events/edit/${event.id}?step=${s.id}`)}
                  className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Right: Submission & Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {isPublished ? (
              <Link
                to={`/event/${event.slug || event.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                View Public Event
              </Link>
            ) : canEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/events/edit/${event.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Event
                </button>

                {canDirectPublish && (
                  <button
                    type="button"
                    disabled={submitting || !validationResult?.isValid}
                    onClick={() => handleSubmitForReview(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Publish Directly
                  </button>
                )}

                <button
                  type="button"
                  disabled={submitting || !validationResult?.isValid}
                  onClick={() => handleSubmitForReview(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isRejected ? 'Resubmit for Approval' : 'Submit for Faculty Approval'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rejection notice banner if rejected */}
      {isRejected && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Event Needs Revisions
                </h3>
                <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
                  {event.reviewComment
                    ? `Faculty Feedback: "${event.reviewComment}"`
                    : 'The faculty coordinator requested changes before approving this event.'}
                </p>
                {event.reviewedBy?.name && (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-400">
                    Reviewed by: <span className="font-semibold">{event.reviewedBy.name}</span>
                  </p>
                )}
                <div className="mt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/events/edit/${event.id}`)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Edit Required Steps
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation issues warning banner */}
      {validationResult && !validationResult.isValid && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Event isn't ready for submission ({validationResult.invalidSteps.length} section{validationResult.invalidSteps.length > 1 ? 's' : ''} need attention)
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validationResult.invalidSteps.map((s) => (
                    <button
                      key={s.stepId}
                      type="button"
                      onClick={() => navigate(`/events/edit/${event.id}?step=${s.stepId}`)}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
                    >
                      <span className="mr-1 font-bold">!</span>
                      <span>{s.stepName}</span>
                      <span className="ml-1 text-[11px] opacity-75">({s.issues[0]})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Event Content — True attendee presentation layout */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Banner image */}
        <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 shadow-sm aspect-[16/9] md:aspect-[21/9]">
          <img
            src={posterImage}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/CLUBSETU.png';
            }}
          />
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/70 text-white backdrop-blur-md">
              {isPaid ? `₹${feeAmount}` : 'FREE ENTRY'}
            </span>
            {isTeam && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-600/90 text-white backdrop-blur-md">
                Team Event ({minTeam}-{maxTeam} Members)
              </span>
            )}
          </div>
        </div>

        {/* Header Details */}
        <div className="mt-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center space-x-3">
              {clubLogo ? (
                <img
                  src={clubLogo}
                  alt={clubName}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg">
                  {clubName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Organized by
                </p>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {clubName}
                </h3>
              </div>
            </div>

            {/* Registration status badge */}
            <div className="text-right">
              <span className="text-xs text-neutral-400 block font-medium">Registration</span>
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {event.totalSeats === 0 ? 'Unlimited Seats' : `${event.totalSeats} Total Seats`}
              </span>
            </div>
          </div>

          <h1 className="mt-6 text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            {event.title || 'Untitled Event Draft'}
          </h1>

          {/* Quick info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <Calendar className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400">Date</span>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400">Time</span>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {formattedStartTime} {formattedEndTime ? `- ${formattedEndTime}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400">Venue</span>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {event.venue || 'TBD'}
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
              About the Event
            </h2>
            {event.description ? (
              <div
                className="prose dark:prose-invert max-w-none text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed wysiwyg-rendered-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(markdownToHtml(event.description)),
                }}
              />
            ) : (
              <p className="text-sm italic text-neutral-400">No description provided yet.</p>
            )}
          </div>

          {/* Eligibility & Access Details */}
          <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
              Eligibility & Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                <span className="font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Academic Programs
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allowedPrograms.map((prog, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-medium text-neutral-700 dark:text-neutral-200"
                    >
                      {prog}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                <span className="font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Years Allowed
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allowedYears.map((yr, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-medium text-neutral-700 dark:text-neutral-200"
                    >
                      {yr}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                <span className="font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Registration Deadline
                </span>
                <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                  {regDeadline
                    ? regDeadline.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Open until event start'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                <span className="font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  External Participants
                </span>
                <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                  {event.allowExternal !== false
                    ? 'Allowed (Students from other colleges may join)'
                    : 'Campus only (Restricted to internal students)'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details if Paid */}
          {isPaid && (
            <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                Payment Details
              </h2>
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Payment Method</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                    {paymentMethod === 'MANUAL_TRANSACTION'
                      ? 'Manual UPI Verification'
                      : paymentMethod === 'COLLEGE_PAYMENT'
                      ? 'College Payment Portal'
                      : paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Registration Fee</span>
                  <span className="text-base font-bold text-brand-600">₹{feeAmount}</span>
                </div>
                {paymentMethod === 'MANUAL_TRANSACTION' && event.upiId && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">UPI ID / Number</span>
                    <span className="text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200">
                      {event.upiId}
                    </span>
                  </div>
                )}
                {paymentMethod === 'COLLEGE_PAYMENT' && event.collegePaymentUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">Payment Portal</span>
                    <a
                      href={event.collegePaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center"
                    >
                      Portal Link <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                )}
                {event.paymentInstructions && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="font-semibold block mb-1">Instructions:</span>
                    <p>{event.paymentInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sponsors if available */}
          {Array.isArray(event.sponsors) && event.sponsors.length > 0 && (
            <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                Event Sponsors
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {event.sponsors.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center space-x-3"
                  >
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className="w-10 h-10 object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {s.name}
                      </p>
                      {s.websiteUrl && (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-brand-600 hover:underline flex items-center"
                        >
                          Website <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Items if available */}
          {Array.isArray(event.media) && event.media.length > 0 && (
            <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                Media Gallery
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {event.media.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 aspect-video bg-neutral-100 dark:bg-neutral-800"
                  >
                    {m.type === 'VIDEO' ? (
                      <video src={m.url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EventPreview;
