import React, { useState } from 'react';
import {
  Star,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Send,
  Eye,
  ListFilter
} from 'lucide-react';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const RATING_CRITERIA = [
  {
    key: 'overallRating',
    label: 'Overall Experience',
    desc: 'General impression and overall satisfaction',
  },
  {
    key: 'organizationRating',
    label: 'Event Organization',
    desc: 'Coordination, check-in process, and team management',
  },
  {
    key: 'usefulnessRating',
    label: 'Usefulness & Content',
    desc: 'Practical value, relevance, and takeaways',
  },
  {
    key: 'speakerRating',
    label: 'Speaker / Host Delivery',
    desc: 'Presenter clarity, engagement, and subject knowledge',
  },
  {
    key: 'venueRating',
    label: 'Venue & Environment',
    desc: 'Audio-visual setup, seating comfort, and ambiance',
  },
  {
    key: 'timingRating',
    label: 'Timing & Punctuality',
    desc: 'Schedule adherence, session length, and pacing',
  },
];

/**
 * StarRatingSelector — Clean 1-5 Star Selector with light borders & unselected default
 */
const StarRatingSelector = ({ value, onChange, name, disabled }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2" role="radiogroup" aria-label={name}>
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
            className={`p-1.5 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-neutral-400 ${
              isActive
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-neutral-300 dark:text-neutral-700 hover:text-neutral-400 dark:hover:text-neutral-500'
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
      <span className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 min-w-[80px]">
        {hovered || value ? (
          RATING_LABELS[hovered || value]
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500 font-normal">Tap to rate</span>
        )}
      </span>
    </div>
  );
};

export default function FeedbackSurveyPreview() {
  const [activeTab, setActiveTab] = useState('live_preview'); // 'live_preview' | 'schema_breakdown'
  
  // Unfilled by default to avoid bias
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
  const [submittedPreview, setSubmittedPreview] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleRatingChange = (key, val) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
    setValidationError('');
  };

  const handleResetForm = () => {
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
    setSubmittedPreview(false);
    setValidationError('');
  };

  const handleSimulateSubmit = (e) => {
    e.preventDefault();
    const isValid =
      ratings.overallRating > 0 &&
      ratings.organizationRating > 0 &&
      ratings.usefulnessRating > 0 &&
      ratings.speakerRating > 0 &&
      ratings.venueRating > 0 &&
      ratings.timingRating > 0 &&
      ['YES', 'MAYBE', 'NO'].includes(attendSimilar);

    if (!isValid) {
      setValidationError('Please select a star rating for all 6 questions and answer the recommendation question.');
      return;
    }
    setValidationError('');
    setSubmittedPreview(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50/40 dark:bg-[#0d0f12] text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white dark:bg-[#13161a] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Student Feedback Form
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Post-Event Feedback Questions
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Preview the exact questionnaire shown to verified student attendees after an event finishes.
              </p>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('live_preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'live_preview'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Interactive View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schema_breakdown')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'schema_breakdown'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" /> Question List
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Live Interactive Student View */}
        {activeTab === 'live_preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Stars and options are intentionally left unselected by default for genuine feedback.
              </span>
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear Form
              </button>
            </div>

            <div className="bg-white dark:bg-[#13161a] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
              
              <div className="px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400 block">
                    Event Feedback
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    How was your experience?
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Sample Completed Event
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      Completed Recently
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      Main Campus Venue
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                  Student View
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-6">
                {submittedPreview ? (
                  /* Success Confirmation */
                  <div className="py-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center mx-auto border border-neutral-200/80 dark:border-neutral-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                        Feedback Submitted
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Your responses have been recorded anonymously and shared with the organizing club.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Reset & Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSimulateSubmit} className="space-y-6">
                    
                    {/* Notice bar */}
                    <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-400">
                      <Clock className="w-4 h-4 shrink-0 text-neutral-500" />
                      <span>
                        Feedback submission is open for 72 hours following event completion.
                      </span>
                    </div>

                    {validationError && (
                      <div className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 border border-red-300 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{validationError}</p>
                      </div>
                    )}

                    {/* Section 1: 6 Star Ratings */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          Rate Your Experience (1–5)
                        </h3>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                          All 6 required
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {RATING_CRITERIA.map((criterion, idx) => (
                          <div
                            key={criterion.key}
                            className="p-3.5 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80 rounded-xl space-y-1.5"
                          >
                            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                              {idx + 1}. {criterion.label} <span className="text-neutral-400">*</span>
                            </label>
                            <StarRatingSelector
                              name={criterion.label}
                              value={ratings[criterion.key]}
                              onChange={(val) => handleRatingChange(criterion.key, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Attendance Intent */}
                    <div className="p-4 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Would you attend a similar event again? <span className="text-neutral-400">*</span>
                        </label>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
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
                                setValidationError('');
                              }}
                              className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-xs'
                                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700/80 hover:border-neutral-300 dark:hover:border-neutral-600'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Qualitative Written Prompts */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          Written Comments
                        </h3>
                        <span className="text-[11px] text-neutral-400 font-medium">
                          Optional
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            What did you like?
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Practical demonstrations, speaker delivery..."
                            value={liked}
                            onChange={(e) => setLiked(e.target.value)}
                            maxLength={500}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            What could be improved?
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Schedule timing, microphone setup, Q&A duration..."
                            value={improvements}
                            onChange={(e) => setImprovements(e.target.value)}
                            maxLength={500}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Additional comments
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Any other thoughts for the organizer..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            maxLength={1000}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="submit"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit Feedback
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Question Breakdown & Rules */}
        {activeTab === 'schema_breakdown' && (
          <div className="space-y-4">
            
            {/* Rating Questions Breakdown */}
            <div className="bg-white dark:bg-[#13161a] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                1. Star Rating Criteria (1–5 Scale)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Mandatory ratings across six core event execution categories:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {RATING_CRITERIA.map((criterion, idx) => (
                  <div
                    key={criterion.key}
                    className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {idx + 1}. {criterion.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                        {criterion.key}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {criterion.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Intent */}
            <div className="bg-white dark:bg-[#13161a] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                2. Return Attendance Intent
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Question: <em>"Would you attend a similar event again?"</em> (Field: `attendSimilar`)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    YES
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
                    Positive promoter rating
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    MAYBE
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
                    Neutral / Conditional attendee
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                    NO
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
                    Detractor / Improvement required
                  </span>
                </div>
              </div>
            </div>

            {/* Qualitative Prompts */}
            <div className="bg-white dark:bg-[#13161a] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                3. Qualitative Text Inputs
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Optional text responses synthesized by AI:
              </p>

              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    "What did you like?" (`liked`)
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Highlights strengths and positive attendee impressions.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    "What could be improved?" (`improvements`)
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Highlights actionable friction points and organizer suggestions.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    "Additional comments" (`comments`)
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    General open remarks and miscellaneous feedback.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
