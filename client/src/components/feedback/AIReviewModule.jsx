import React from 'react';
import {
  Sparkles,
  Brain,
  AlertTriangle,
  Lock,
  RefreshCw,
  Download,
  FileJson,
} from 'lucide-react';
import AIVerdictStrip from './AIVerdictStrip';
import ExecutiveSummary from './ExecutiveSummary';
import KeyInsightsColumns from './KeyInsightsColumns';
import RecommendedActions from './RecommendedActions';
import NotableFeedback from './NotableFeedback';

const AIReviewModule = ({
  aiState,
  setAiState,
  totalResponses,
  analytics,
  onGenerateReview,
  onDownloadPDF,
  onDownloadJSON,
}) => {
  const { data, loading, generating, downloadingPdf, error, selectedReviewIndex } = aiState;
  const reviews = data?.reviews || [];
  const completedCount = data?.completedCount || reviews.length || 0;
  const remainingReviews = data?.remainingReviews ?? Math.max(0, 2 - completedCount);
  const isWindowLocked = data?.isWindowLocked || false;

  const currentReview = reviews[selectedReviewIndex] || reviews[0] || null;
  const maxReviewNumber = reviews.reduce((max, r) => Math.max(max, r.reviewNumber || 0), 0);

  return (
    <section aria-label="AI Feedback Review & Intelligence" className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xs overflow-hidden relative space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Feedback Review
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">
                OpenRouter AI
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {currentReview
                ? `AI analysis of ${currentReview.responseCount || totalResponses} verified attendee responses`
                : 'Grounded analysis of complete attendee feedback & actionable recommendations'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-700/60 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
            <span>
              Reviews used:{' '}
              <strong className="text-orange-600 dark:text-orange-400">
                {completedCount} / 2
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* 72-Hour Window Gating Alert */}
      {isWindowLocked && (
        <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                72-Hour Feedback Window Active
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 max-w-xl leading-relaxed">
                To guarantee complete data integrity, AI Review generation unlocks once the 72-hour student feedback collection window finishes on{' '}
                <strong>{new Date(data.windowClosesAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong>.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-200/60 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 shrink-0">
            Collecting Feedback
          </span>
        </div>
      )}

      {/* State: 0 Reviews Generated Yet (and window is unlocked) */}
      {!isWindowLocked && reviews.length === 0 && (
        <div className="py-10 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Generate First AI Review
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Analyze all {totalResponses} submitted attendee feedback responses to identify positive highlights, recurring issues, and high-priority action items.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGenerateReview}
              disabled={generating || totalResponses === 0 || completedCount >= 2}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing {totalResponses} Feedback Responses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Generate AI Review (1 of 2)</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            You can generate an AI review up to 2 times for each event.
          </p>
        </div>
      )}

      {/* State: Reviews Available */}
      {reviews.length > 0 && currentReview && (
        <div className="space-y-6">
          {/* History Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="AI Review History Tabs">
              {reviews.map((rev, idx) => {
                const isSelected = selectedReviewIndex === idx;
                const isLatest = rev.reviewNumber === maxReviewNumber && reviews.length > 1;

                return (
                  <button
                    key={rev.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setAiState((prev) => ({ ...prev, selectedReviewIndex: idx }))}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span>AI Review #{rev.reviewNumber}</span>
                    <span className={`text-[10px] font-semibold opacity-90 ${isSelected ? 'text-orange-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      ({rev.responseCount} responses)
                    </span>
                    {isLatest && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        isSelected ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                      }`}>
                        Latest
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>
                Generated on {new Date(currentReview.generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>

          {/* 1. AI Verdict Strip */}
          <AIVerdictStrip review={currentReview} analytics={analytics} />

          {/* 2. Executive Summary */}
          <ExecutiveSummary
            summary={currentReview.overallSummary}
            sentiment={currentReview.overallSentiment}
            keyTakeaways={currentReview.keyTakeaways}
          />

          {/* 3. Key Insights (What Students Liked vs What Should Improve) */}
          <KeyInsightsColumns
            whatStudentsLiked={currentReview.whatStudentsLiked}
            improvementAreas={currentReview.improvementAreas}
          />

          {/* 4. Actionable Recommended Actions */}
          <RecommendedActions recommendations={currentReview.recommendations} />

          {/* 5. Notable Feedback / Real Quotes */}
          <NotableFeedback
            positiveHighlights={currentReview.positiveHighlights}
            constructiveHighlights={currentReview.constructiveHighlights}
          />

          {/* Bottom Action Controls: Download AI Report & Quota Management */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onDownloadPDF(currentReview.reviewNumber)}
                disabled={downloadingPdf}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                aria-label={`Download AI Report PDF for Review #${currentReview.reviewNumber}`}
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{downloadingPdf ? 'Exporting PDF...' : 'Download AI Report (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadJSON(currentReview.reviewNumber)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                aria-label={`Export JSON for Review #${currentReview.reviewNumber}`}
              >
                <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>
            </div>

            <div>
              {remainingReviews > 0 ? (
                <button
                  type="button"
                  onClick={onGenerateReview}
                  disabled={generating || completedCount >= 2}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/40 text-xs font-bold rounded-xl hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-all cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{generating ? 'Generating Review...' : `Regenerate Review (${remainingReviews} remaining)`}</span>
                </button>
              ) : (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-neutral-800 px-3.5 py-2 rounded-xl block text-center">
                  AI review limit reached (2 / 2 reviews used)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AIReviewModule;
