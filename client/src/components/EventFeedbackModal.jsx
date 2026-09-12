import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  X,
  Sparkles,
  ChevronRight,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { submitEventFeedback } from '../services/feedbackService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const RATING_CRITERIA = [
  { key: 'overallRating', label: 'Overall experience' },
  { key: 'organizationRating', label: 'Event organization' },
  { key: 'usefulnessRating', label: 'Usefulness & relevance' },
  { key: 'speakerRating', label: 'Speaker / Host' },
  { key: 'venueRating', label: 'Venue & atmosphere' },
  { key: 'timingRating', label: 'Timing & schedule' },
];

/**
 * StarRatingSelector — Accessible 1-5 Star Interactive Component
 */
const StarRatingSelector = ({ value, onChange, name, disabled }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-1 sm:gap-1.5"
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
              className={`p-1.5 rounded-lg transition-all duration-150 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer ${
                isActive
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-muted-foreground/30 hover:text-amber-400'
              }`}
            >
              <Star
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-150 ${
                  isActive ? 'fill-amber-400 stroke-amber-500' : 'fill-transparent stroke-current'
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-medium text-muted-foreground min-w-[85px]">
          {(hovered || value) ? RATING_LABELS[hovered || value] : (
            <span className="text-muted-foreground/50 italic">Rate 1–5</span>
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
        className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground transition-colors"
        >
          {/* Header */}
          <div className="relative shrink-0 px-6 py-4 border-b border-border flex items-start justify-between gap-4">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-950/30"
                >
                  <Sparkles className="w-3 h-3" /> Event Feedback
                </Badge>
                {totalPending > 1 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentIndex + 1} of {totalPending}
                  </span>
                )}
              </div>
              <h2
                id="feedback-dialog-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-foreground"
              >
                How was your experience?
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
                <span className="font-semibold text-foreground line-clamp-1">
                  {currentEvent.title}
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-brand-500" />
                      {formattedDate}
                    </span>
                  </>
                )}
                {currentEvent.venue && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-brand-500" />
                      {currentEvent.venue}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Close / Dismiss */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={submitting}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer shrink-0"
              aria-label="Close feedback modal"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {isSuccess ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="text-xl font-bold text-foreground">
                    Thank you!
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your feedback has been submitted successfully and will help improve future campus events.
                  </p>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {currentIndex < totalPending - 1 && (
                    <Button
                      type="button"
                      onClick={handleNextPending}
                      className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                    >
                      Next Feedback <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="w-full sm:w-auto font-semibold text-xs rounded-xl"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form id="event-feedback-form" onSubmit={handleSubmit} className="space-y-6">
                {/* 72h window indicator */}
                <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl text-xs text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span>
                    Feedback closes 72 hours after event completion. Quick rating takes under a minute!
                  </span>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs font-medium text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {/* 1-5 Ratings Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Required Ratings (1–5)
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      All 6 required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {RATING_CRITERIA.map((criterion, idx) => (
                      <div
                        key={criterion.key}
                        className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5"
                      >
                        <label className="block text-xs font-semibold text-foreground">
                          {idx + 1}. {criterion.label} <span className="text-brand-500">*</span>
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
                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-foreground">
                      Would you attend a similar event again? <span className="text-brand-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground font-medium">
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
                          className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                              : 'bg-card text-foreground border-border hover:bg-muted/50'
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
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Optional Written Feedback
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Optional
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        What did you like?
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Engaging interactive demo, great speaker"
                        value={liked}
                        onChange={(e) => setLiked(e.target.value)}
                        maxLength={500}
                        className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        What could be improved?
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Sound system in venue, starting on time"
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        maxLength={500}
                        className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Additional comments
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Any additional thoughts or suggestions for the club organizer..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        maxLength={1000}
                        className="text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {!isSuccess && (
            <div className="shrink-0 px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="font-semibold text-xs rounded-xl"
              >
                Remind me later
              </Button>

              <Button
                type="submit"
                form="event-feedback-form"
                disabled={submitting || !isFormValid}
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Feedback</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EventFeedbackModal;
