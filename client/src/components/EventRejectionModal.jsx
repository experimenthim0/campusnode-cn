import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QUICK_REJECTION_REASONS = [
  'Schedule conflict with institute academic calendar or exams',
  'Requested venue is already booked or unavailable',
  'Incomplete event details, agenda, or guidelines',
  'External speaker or sponsor permissions required from administration',
  'Budget or payment details need revision',
];

const EventRejectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  event,
  eventTitle: fallbackTitle,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const title = event?.title || event?.eventName || fallbackTitle || 'Selected Event';
  const submitting = isSubmitting || localSubmitting;

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason so club coordinators know what to adjust.');
      textareaRef.current?.focus();
      return;
    }

    setError('');
    setLocalSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reject event proposal. Please try again.');
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleApplyPreset = (preset) => {
    if (!reason.trim()) {
      setReason(preset);
    } else if (!reason.includes(preset)) {
      setReason((prev) => `${prev}. ${preset}`);
    }
    setError('');
    textareaRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-event-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <Card
        className="max-w-lg w-full shadow-2xl overflow-hidden border-border bg-card animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-destructive/5 dark:bg-destructive/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="reject-event-title" className="text-base font-medium text-foreground leading-tight truncate">
                Reject Event Proposal
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Feedback will be sent to the club organizers
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={submitting}
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Event Context */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                Target Event
              </span>
              <p className="font-medium text-foreground truncate mt-0.5">
                {title}
              </p>
            </div>
            {event?.venue && (
              <span className="text-[11px] text-muted-foreground shrink-0 px-2 py-0.5 rounded-md bg-background border border-border">
                {event.venue}
              </span>
            )}
          </div>

          {/* Quick presets for common rejection reasons */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground block">
              Quick Suggestions (Click to insert):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REJECTION_REASONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleApplyPreset(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/70 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="rejection-reason" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-destructive" />
                <span>Rejection Reason / Required Changes</span>
                <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                {reason.length} / 500
              </span>
            </div>
            <textarea
              id="rejection-reason"
              ref={textareaRef}
              rows={3}
              maxLength={500}
              disabled={submitting}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Schedule clashes with Mid-Term examinations; please reschedule to next weekend and resubmit."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={submitting || !reason.trim()}
              className="h-9 px-4 text-xs font-medium rounded-xl cursor-pointer shadow-xs gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EventRejectionModal;
