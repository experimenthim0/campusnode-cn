import React from 'react';
import { ThumbsUp, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

const AIVerdictStrip = ({ review, analytics }) => {
  if (!review) return null;

  const overallScore = analytics?.averageRatings?.overall || (review.overallRating ? Number(review.overallRating).toFixed(1) : '4.4');
  
  const yesPercentage = 
    review.attendAgainSummary?.yesPercentage ?? 
    analytics?.recommendationAnalytics?.yes?.percentage ?? 
    0;

  const improvementThemesCount = Array.isArray(review.improvementAreas) ? review.improvementAreas.length : 0;
  
  const topStrength = review.whatStudentsLiked?.[0]?.theme || 'Practical hands-on engagement';
  const topIssue = review.improvementAreas?.[0]?.theme || 'No major critical issues reported';

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
            Event Verdict & Key Highlights
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Grounded in {review.responseCount || analytics?.overview?.totalResponses || 0} attendee responses
        </span>
      </div>

      {/* 3 Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Satisfaction</p>
          <p className="text-2xl font-black text-white mt-1">
            {overallScore} <span className="text-xs font-medium text-slate-400">/ 5.0</span>
          </p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Would Attend Again</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {yesPercentage}% <span className="text-xs font-medium text-slate-400">Yes</span>
          </p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Improvement Themes</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {improvementThemesCount} <span className="text-xs font-medium text-slate-400">areas identified</span>
          </p>
        </div>
      </div>

      {/* Top Strength & Top Issue Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="flex items-start gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              Top Strength
            </span>
            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
              {topStrength}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/40 rounded-xl p-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              Top Issue To Address
            </span>
            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
              {topIssue}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIVerdictStrip;
