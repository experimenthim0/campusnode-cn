import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from './ui/arrow-up-right';
import { getPublicJson } from '../lib/publicDataCache';

const ClubLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First try the dedicated leaderboard API which incorporates feedback percentage
        try {
          const lbData = await getPublicJson('/api/clubs/leaderboard');
          if (Array.isArray(lbData) && lbData.length > 0) {
            setLeaderboardData(lbData);
            setLoading(false);
            return;
          }
        } catch (lbErr) {
          console.warn("Could not fetch dedicated leaderboard, falling back to public data:", lbErr);
        }

        const [clubsData, eventsData] = await Promise.all([
          getPublicJson('/api/clubs'),
          getPublicJson('/api/events')
        ]);
        setClubs(Array.isArray(clubsData) ? clubsData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (err) {
        console.error("Error fetching leaderboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const leaderboard = useMemo(() => {
    if (leaderboardData.length > 0) {
      return leaderboardData;
    }

    // Fallback calculation if dedicated endpoint is not yet loaded
    const stats = events.reduce((acc, event) => {
      const clubId =
        event.club?._id ||
        (typeof event.club === "string" ? event.club : null) ||
        event.createdBy?._id ||
        (typeof event.createdBy === "string" ? event.createdBy : null);

      if (!clubId) return acc;

      if (!acc[clubId]) {
        acc[clubId] = {
          eventCount: 0,
          totalVerifiedAttendees: 0,
          totalPoints: 0,
          totalFeedbacks: 0,
          overallRatingSum: 0,
        };
      }

      acc[clubId].eventCount++;
      
      // Pillar 1: +10 pts per event
      const eventPoints = 10;

      // Pillar 2: +1 pt per participant (capped at 20)
      const attendees = event.registeredCount || 0;
      const participationPoints = Math.min(attendees, 20);
      acc[clubId].totalVerifiedAttendees += attendees;

      // Pillar 3: Feedback bonus (0 to 20, min 10 responses)
      let feedbackPoints = 0;
      if (event.feedbacks && event.feedbacks.length >= 10) {
        const sum = event.feedbacks.reduce((s, f) => s + (f.overallRating || 0), 0);
        const avg = sum / event.feedbacks.length;
        const pct = Math.round((avg / 5) * 100);
        if (pct >= 90) feedbackPoints = 20;
        else if (pct >= 80) feedbackPoints = 15;
        else if (pct >= 70) feedbackPoints = 10;
        else if (pct >= 60) feedbackPoints = 5;

        acc[clubId].totalFeedbacks += event.feedbacks.length;
        acc[clubId].overallRatingSum += sum;
      } else if (event.feedbacks && event.feedbacks.length > 0) {
        acc[clubId].totalFeedbacks += event.feedbacks.length;
        acc[clubId].overallRatingSum += event.feedbacks.reduce((s, f) => s + (f.overallRating || 0), 0);
      }

      acc[clubId].totalPoints += (eventPoints + participationPoints + feedbackPoints);

      return acc;
    }, {});

    return clubs
      .map((club) => {
        const clubEvents = events
          .filter((e) => {
            const cid =
              e.club?._id ||
              e.club ||
              e.createdBy?._id ||
              e.createdBy;

            return cid === club._id || cid === club.id;
          })
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
          .slice(0, 2);

        const clubStat = stats[club._id || club.id] || {
          eventCount: 0,
          totalVerifiedAttendees: 0,
          totalPoints: 0,
          totalFeedbacks: 0,
          overallRatingSum: 0,
        };

        const eventCount = clubStat.eventCount;
        const participantCount = clubStat.totalVerifiedAttendees;
        const feedbackCount = clubStat.totalFeedbacks;
        const avgRating = feedbackCount > 0 ? clubStat.overallRatingSum / feedbackCount : 0;
        const feedbackPercentage = feedbackCount > 0 ? Math.round((avgRating / 5) * 100) : 0;
        const points = clubStat.totalPoints;

        return {
          ...club,
          eventCount,
          participantCount,
          feedbackCount,
          feedbackPercentage,
          points,
          score: points,
          recentEvents: clubEvents,
        };
      })
      .filter((club) => club.eventCount > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }, [leaderboardData, clubs, events]);

  if (loading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center gap-4 bg-white border-2 border-neutral-100 rounded-3xl animate-pulse">
        <div className="w-12 h-12 bg-neutral-50 rounded-full"></div>
        <div className="w-48 h-3 bg-neutral-50 rounded-full"></div>
        <div className="w-32 h-3 bg-neutral-50 rounded-full"></div>
      </div>
    );
  }

  if (leaderboard.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[1.5rem] p-6 shadow-sm overflow-hidden relative group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-500">Live Ranking</span>
              <Link 
                to="/ranking-guide"
                className="text-[10px] font-bold text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 underline decoration-dotted transition-colors"
              >
                How points work?
              </Link>
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-wide">Club Leaderboard</h2>
          </div>
          <div
           
            className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors rounded-2xl rotate-3 flex items-center justify-center shadow-md shadow-black/10"
          >
            <i className="ri-medal-fill text-brand-500 text-2xl" />
          </div>
        </div>

        <div className="space-y-2.5">
          {leaderboard.slice(0, showAll ? 10 : 3).map((club, index) => {
            const isTop3 = index < 3;
            const rankStyles = [
              { bg: 'bg-tier-gold/30 dark:bg-tier-gold/15', border: 'border-tier-gold/40 dark:border-tier-gold/30', text: 'text-tier-gold dark:text-tier-gold', icon: 'ri-vip-crown-fill', label: 'Champion' },
              { bg: 'bg-tier-silver/30 dark:bg-neutral-700/20', border: 'border-neutral-300 dark:border-neutral-700', text: 'text-neutral-700 dark:text-neutral-300', icon: 'ri-award-fill', label: 'Runner Up' },
              { bg: 'bg-tier-bronze/30 dark:bg-brand-500/15', border: 'border-brand-400/40 dark:border-brand-500/30', text: 'text-brand-700 dark:text-brand-400', icon: 'ri-medal-line', label: 'Third Place' }
            ];

            return (
              <div 
                key={club._id} 
                className={`group/item relative flex flex-col p-3 rounded-2xl transition-all duration-300 border
                  ${isTop3 ? `${rankStyles[index].bg} ${rankStyles[index].border}` : 'bg-neutral-50/70 dark:bg-neutral-850/50 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}
                `}
              >
                {/* Main Content */}
                <div className="flex items-center gap-3">
                  
                  <div className={`w-11 h-11 shrink-0 flex flex-col items-center justify-center rounded-xl font-black text-base shadow-xs
                    ${isTop3 ? 'bg-white dark:bg-neutral-800' : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'}
                    ${isTop3 ? rankStyles[index].text : ''}
                  `}>
                    {isTop3 && <i className={`${rankStyles[index].icon} text-[10px] mt-0.5`} />}
                    <span className="leading-none">{index + 1}</span>
                  </div>

               
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/club/${club.slug || club._id}`}
                        className="text-[16px] font-black text-neutral-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors block truncate tracking-tight"
                      >
                        {club.clubName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest">{club.category || 'Society'}</span>
                      
                    </div>
                  </div>

                  {/* Counter: Only show Points/Score */}
                  <div className="text-right pr-1 sm:pr-2 shrink-0">
                    <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white leading-none tabular-nums tracking-tighter">
                      {club.points !== undefined ? club.points : club.score}
                    </div>

                    <div className="text-[8px] sm:text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-0.5">
                      Points
                    </div>
                  </div>
                </div>

                
              </div>
            );
          })}
        </div>

        {leaderboard.length > 3 && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-black dark:hover:text-white transition-all cursor-pointer"
            >
              {showAll ? (
                <><i className="ri-arrow-up-s-line text-sm" /> Show Top 3</>
              ) : (
                <><i className="ri-trophy-line text-sm text-brand-500" /> View Top {Math.min(leaderboard.length, 10)}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubLeaderboard;
