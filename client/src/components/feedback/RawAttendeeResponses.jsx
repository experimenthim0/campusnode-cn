import React, { useState, useMemo } from 'react';
import { MessageSquare, Search, Star, ArrowUpDown } from 'lucide-react';

const RawAttendeeResponses = ({ responses = [] }) => {
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'highest' | 'lowest'

  // Filter and sort responses in memory
  const filteredResponses = useMemo(() => {
    let result = [...responses];

    // 1. Sentiment filter
    if (sentimentFilter !== 'all') {
      result = result.filter((r) => r.sentiment === sentimentFilter);
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.liked && r.liked.toLowerCase().includes(q)) ||
          (r.improvements && r.improvements.toLowerCase().includes(q)) ||
          (r.comments && r.comments.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'highest') {
        return (b.overallRating || 0) - (a.overallRating || 0);
      }
      if (sortBy === 'lowest') {
        return (a.overallRating || 0) - (b.overallRating || 0);
      }
      // default: newest
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    return result;
  }, [responses, sentimentFilter, searchQuery, sortBy]);

  return (
    <section aria-label="Raw Attendee Written Responses" className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" aria-hidden="true" />
            <span>Attendee Written Responses ({responses.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Anonymized qualitative comments submitted by verified event attendees
          </p>
        </div>

        {/* Filters and Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Sentiment Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold" role="tablist" aria-label="Filter by sentiment">
            {['all', 'positive', 'neutral', 'negative'].map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                role="tab"
                aria-selected={sentimentFilter === filterKey}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSentimentFilter(filterKey);
                }}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  sentimentFilter === filterKey
                    ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-900 dark:text-white placeholder:text-slate-400"
              aria-label="Search feedback responses"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-xl text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
              aria-label="Sort attendee responses"
            >
              <option value="newest" className="dark:bg-neutral-800">Newest First</option>
              <option value="highest" className="dark:bg-neutral-800">Highest Rated</option>
              <option value="lowest" className="dark:bg-neutral-800">Lowest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Response Cards Feed */}
      {filteredResponses.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-neutral-700" aria-hidden="true" />
          <p className="text-xs font-medium">No written responses matching current filter or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResponses.map((res) => (
            <div
              key={res.id}
              className="p-4 md:p-5 rounded-xl bg-slate-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-700/50 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" aria-hidden="true" />
                    <span>{res.overallRating} / 5</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                    res.sentiment === 'positive'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : res.sentiment === 'neutral'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {res.sentiment}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {res.submittedAt ? new Date(res.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {res.liked && (
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-400 text-[11px]">What they liked:</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{res.liked}</p>
                  </div>
                )}
                {res.improvements && (
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-400 text-[11px]">Areas for improvement:</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{res.improvements}</p>
                  </div>
                )}
                {res.comments && (
                  <div>
                    <p className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">Additional comments:</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{res.comments}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RawAttendeeResponses;
