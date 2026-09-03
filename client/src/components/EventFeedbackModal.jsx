import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { submitEventFeedback } from '../services/feedbackService';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const RATING_CRITERIA = [
  { key: 'overallRating', label: 'Overall experience', icon: 'ri-star-smile-line' },
  { key: 'organizationRating', label: 'Event organization', icon: 'ri-calendar-check-line' },
  { key: 'usefulnessRating', label: 'Usefulness & relevance', icon: 'ri-lightbulb-line' },
  { key: 'speakerRating', label: 'Speaker / Host', icon: 'ri-user-voice-line' },
  { key: 'venueRating', label: 'Venue & atmosphere', icon: 'ri-building-line' },
  { key: 'timingRating', label: 'Timing & schedule', icon: 'ri-time-line' },
];

/**
 * StarRatingSelector — Accessible 1-5 Star Interactive Component
 */
const StarRatingSelector = ({ value, onChange, name, disabled }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-1 sm:gap-2"
        role="radiogroup"
        aria-label={name}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = (hovered || value) >= star;
          const isSelected = value === star;

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${star} star - ${RATING_LABELS[star]}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(0)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all duration-150 transform hover:scale-115 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer ${
                isActive
                  ? 'text-amber-500 dark:text-amber-400 drop-shadow-sm'
                  : 'text-neutral-300 dark:text-neutral-700 hover:text-amber-300'
              }`}
            >
              <Star
                className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-150 ${
                  isActive ? 'fill-amber-400 stroke-amber-500' : 'fill-transparent stroke-current'
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300 min-w-[90px]">
          {(hovered || value) ? RATING_LABELS[hovered || value] : (
            <span className="text-neutral-400 dark:text-neutral-500 font-normal italic">Rate 1–5</span>
          )}
        </span>
      </div>
    </div>
  );
};

export const EventFeedbackModal = ({
  isOpen,
  onClose,
  pendingEvents = [],
  onFeedbackSubmitted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState({
    overallRating: 0,
    organizationRating: 0,
    usefulnessRating: 0,
    speakerRating: 0,
    venueRating: 0,
    timingRating: 0,
  });
  const [attendSimilar, setAttendSimilar] = useState('');
  const [liked, setLiked] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comments, setComments] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const modalRef = useRef(null);

  const currentEvent = pendingEvents[currentIndex] || null;
  const totalPending = pendingEvents.length;

  useEffect(() => {
    setRatings({
      overallRating: 0,
      organizationRating: 0,
      usefulnessRating: 0,
      speakerRating: 0,
      venueRating: 0,
      timingRating: 0,
    });
    setAttendSimilar('');
    setLiked('');
    setImprovements('');
    setComments('');
    setError('');
    setIsSuccess(false);
  }, [currentIndex, currentEvent?.id]);

  // Trap focus & ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !currentEvent) return null;

  const isFormValid =
    ratings.overallRating > 0 &&
    ratings.organizationRating > 0 &&
    ratings.usefulnessRating > 0 &&
    ratings.speakerRating > 0 &&
    ratings.venueRating > 0 &&
    ratings.timingRating > 0 &&
    ['YES', 'MAYBE', 'NO'].includes(attendSimilar);

  const handleRatingChange = (key, val) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please complete all 6 star ratings and the recommendation question.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await submitEventFeedback(currentEvent.id || currentEvent.eventId, {
        ...ratings,
        attendSimilar,
        liked: liked.trim() || undefined,
        improvements: improvements.trim() || undefined,
        comments: comments.trim() || undefined,
      });

      setIsSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(currentEvent.id || currentEvent.eventId);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      const errMsg =
        err.response?.data?.message ||
        'We couldn’t submit your feedback. Please check your network and try again.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextPending = () => {
    if (currentIndex < totalPending - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const formattedDate = currentEvent.startTime
    ? new Date(currentEvent.startTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/50 dark:bg-black/75 backdrop-blur-sm transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-[#555555] dark:text-[#B5B5B5] transition-colors"
        >
          <div className="relative shrink-0 px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-start justify-between gap-4">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FFF7ED] text-[#F97316] dark:bg-[#2A1A0F] dark:text-[#FB923C] border border-orange-200/60 dark:border-orange-800/40">
                  <Sparkles className="w-3 h-3" /> Event Feedback
                </span>
                {totalPending > 1 && (
                  <span className="text-xs font-semibold text-[#888888] dark:text-[#808080]">
                    {currentIndex + 1} of {totalPending}
                  </span>
                )}
              </div>
              <h2
                id="feedback-dialog-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-[#F5F5F5]"
              >
                How was your experience?
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#888888] dark:text-[#808080] pt-0.5">
                <span className="font-bold text-[#111111] dark:text-[#F5F5F5] line-clamp-1">
                  {currentEvent.title}
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#F97316] dark:text-[#FB923C]" />
                      {formattedDate}
                    </span>
                  </>
                )}
                {currentEvent.venue && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#F97316] dark:text-[#FB923C]" />
                      {currentEvent.venue}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Close / Dismiss */}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer shrink-0"
              aria-label="Close feedback modal"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {isSuccess ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-2xl font-bold text-[#111111] dark:text-[#F5F5F5]">
                    Thank you!
                  </h3>
                  <p className="text-sm text-[#555555] dark:text-[#B5B5B5] leading-relaxed">
                    Your feedback has been submitted successfully and will help improve future campus events.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {currentIndex < totalPending - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextPending}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Next Feedback <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form id="event-feedback-form" onSubmit={handleSubmit} className="space-y-6">
                {/* 72h window indicator */}
                <div className="flex items-center gap-2 p-3 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs text-[#555555] dark:text-[#B5B5B5]">
                  <Clock className="w-4 h-4 shrink-0 text-[#888888]" />
                  <span>
                    Feedback closes 72 hours after event completion. Quick rating takes under a minute!
                  </span>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {/* 1-5 Ratings Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F0F0F0] dark:border-[#2A2A2A] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
                      Required Ratings (1–5)
                    </h3>
                    <span className="text-[11px] text-[#888888] dark:text-[#808080] font-medium">
                      All 6 required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {RATING_CRITERIA.map((criterion, idx) => (
                      <div
                        key={criterion.key}
                        className="p-3.5 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl space-y-1.5"
                      >
                        <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">
                          {idx + 1}. {criterion.label} <span className="text-[#F97316]">*</span>
                        </label>
                        <StarRatingSelector
                          name={criterion.label}
                          value={ratings[criterion.key]}
                          onChange={(val) => handleRatingChange(criterion.key, val)}
                          disabled={submitting}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation Question */}
                <div className="p-4 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">
                      Would you attend a similar event again? <span className="text-[#F97316]">*</span>
                    </label>
                    <span className="text-[11px] text-[#888888] dark:text-[#808080] font-medium">
                      Required
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'YES', label: 'Yes' },
                      { val: 'MAYBE', label: 'Maybe' },
                      { val: 'NO', label: 'No' },
                    ].map((opt) => {
                      const isSelected = attendSimilar === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            setAttendSimilar(opt.val);
                            if (error) setError('');
                          }}
                          className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#F97316] text-white border-[#F97316] dark:bg-[#FB923C] dark:text-[#111111] dark:border-[#FB923C] shadow-xs'
                              : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] border-[#E5E5E5] dark:border-[#3A3A3A] hover:border-neutral-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Written Feedback */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between border-b border-[#F0F0F0] dark:border-[#2A2A2A] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
                      Optional Written Feedback
                    </h3>
                    <span className="text-[11px] text-[#888888] dark:text-[#808080] font-medium">
                      Optional
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                        What did you like?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engaging interactive demo, great speaker"
                        value={liked}
                        onChange={(e) => setLiked(e.target.value)}
                        maxLength={500}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                        What could be improved?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sound system in venue, starting on time"
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        maxLength={500}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                        Additional comments
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Any additional thoughts or suggestions for the club organizer..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        maxLength={1000}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {!isSuccess && (
            <div className="shrink-0 px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#303030] rounded-xl transition-colors cursor-pointer"
              >
                Remind me later
              </button>

              <button
                type="submit"
                form="event-feedback-form"
                disabled={submitting || !isFormValid}
                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Feedback</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EventFeedbackModal;
