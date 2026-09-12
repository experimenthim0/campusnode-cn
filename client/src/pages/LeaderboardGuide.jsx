import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Star, CheckCircle2, ShieldCheck, Zap, Clock, Users, Calendar, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

const LeaderboardGuide = () => {
  return (
    <div className="min-h-screen bg-cn-bg myfont text-cn-text py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full border border-brand-500/20">
            Official Ranking Methodology
          </span>
        </div>

        <div className="relative overflow-hidden bg-neutral-900 dark:bg-zinc-900 border border-neutral-800 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-brand-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>CampusNode Club Hall of Fame</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Club Points & Ranking System
            </h1>
            
            <p className="text-neutral-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Points are earned through verified events, student participation, and attendee satisfaction. Every event contributes a maximum of <strong className="text-white">50 points</strong> to maintain balanced, fair rankings across all campus organizations.
            </p>
          </div>
        </div>

        {/* The 3 Core Pillars of Club Points */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
              <Zap className="w-6 h-6 text-brand-500" />
              The 3 Pillars of Club Points
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              Points are earned through verified activity, student participation, and attendee satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pillar 1 */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-brand-500/40 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                  PILLAR 1
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                  Event Hosting
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed mb-4">
                  Points awarded for every approved event successfully conducted by the club.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-sm font-black text-brand-600 dark:text-brand-400">
                  +10 Points / Event
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">Max 10 pts per event</div>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                  PILLAR 2
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                  Student Participation
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed mb-4">
                  Points awarded for verified students attending the club's events (capped to prevent single-event domination).
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                  +1 Point / Verified Attendee
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">Capped at 20 pts per event</div>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-amber-500/40 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                  PILLAR 3
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                  Feedback Quality
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed mb-4">
                  Bonus points based on the final attendee satisfaction percentage from verified feedback.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                  Up to +20 Bonus Points
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">90%+ satisfaction = +20 pts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Satisfaction Range Table */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Feedback Quality Score Tiers
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Bonus points are tiered based on verified student ratings.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Attendee Satisfaction %</th>
                  <th className="py-3 px-4 sm:px-6">Average Rating</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Bonus Points Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                <tr className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors font-medium">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-emerald-600 dark:text-emerald-400">90% – 100%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-neutral-500">4.5 – 5.0 ★</td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-black text-emerald-600 dark:text-emerald-400">+20 Points</td>
                </tr>
                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold">80% – 89%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-neutral-500">4.0 – 4.4 ★</td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-neutral-900 dark:text-white">+15 Points</td>
                </tr>
                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold">70% – 79%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-neutral-500">3.5 – 3.9 ★</td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-neutral-900 dark:text-white">+10 Points</td>
                </tr>
                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold">60% – 69%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-neutral-500">3.0 – 3.4 ★</td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-neutral-900 dark:text-white">+5 Points</td>
                </tr>
                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors text-neutral-400">
                  <td className="py-3.5 px-4 sm:px-6">Below 60%</td>
                  <td className="py-3.5 px-4 sm:px-6">&lt; 3.0 ★</td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-semibold">0 Points</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-2xl text-xs text-brand-900 dark:text-brand-300 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Minimum 10 Feedback Submissions Threshold:</strong>
              To prevent artificial skewing (such as 2 responses yielding 100%), the feedback bonus activates only when an event receives at least <strong>10 verified attendee responses</strong>.
            </div>
          </div>
        </div>

        {/* Max 50 Points Structure */}
        <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Maximum Score Per Event: 50 Points
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Every event can contribute a maximum of 50 points to the club's leaderboard standing.
              </p>
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-2xl font-mono text-sm font-black text-amber-400 border border-white/10">
              10 + 20 + 20 = 50 MAX
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Event Hosting</span>
              <span className="text-lg font-black text-white">Max 10 pts</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Verified Attendance</span>
              <span className="text-lg font-black text-blue-400">Max 20 pts</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Feedback Quality</span>
              <span className="text-lg font-black text-amber-400">Max 20 pts</span>
            </div>
          </div>
        </div>

        {/* Concrete Example Calculation */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            Example Calculation
          </h2>

          <div className="p-5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-750 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Scenario: Debate Championship</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">Completed Event</span>
            </div>

            <ul className="text-xs sm:text-sm space-y-2.5 text-neutral-700 dark:text-neutral-300">
              <li className="flex items-center justify-between">
                <span>1. Event successfully conducted:</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">+10 pts</span>
              </li>
              <li className="flex items-center justify-between">
                <span>2. 35 verified attendees (capped at 20):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">+20 pts</span>
              </li>
              <li className="flex items-center justify-between">
                <span>3. 24 feedback responses with 87% satisfaction:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">+15 pts</span>
              </li>
            </ul>

            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between font-bold text-sm sm:text-base">
              <span className="text-neutral-900 dark:text-white">Total Event Score Earned:</span>
              <span className="text-brand-600 dark:text-brand-400 font-black font-mono">10 + 20 + 15 = 45 Points</span>
            </div>
          </div>
        </div>

        {/* 72-Hour Quality Lock & Anti-Cheating Safeguards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              72-Hour Quality Lock Rule
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Feedback bonus points lock in exactly once after the event's 72-hour feedback collection window expires. This prevents volatile live rating swings and guarantees reliable, high-speed website performance.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Verified Attendance Enforcement
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Points are awarded for verified attendees who checked in with QR scanning at the venue—not mere online registrations. Only verified attendees are eligible to submit feedback.
            </p>
          </div>
        </div>

        {/* Back Link CTA */}
        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans text-xs rounded-full shadow-xs shadow-brand-500/20 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
          >
            <Award className="w-4 h-4" />
            View Live Club Leaderboard
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LeaderboardGuide;
