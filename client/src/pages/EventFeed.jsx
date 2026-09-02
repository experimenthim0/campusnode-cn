import React, { useEffect, useState, useMemo, useCallback } from 'react';
import EventCard from '../components/EventCard';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getUserEvents, registerForEvent } from '../services/eventService';
import { Link, useSearchParams } from 'react-router-dom';
import EventCardSkeleton from '../components/skeletons/EventCardSkeleton';
import { Skeleton } from '../components/ui/Skeleton';
import { getPublicJson } from '../lib/publicDataCache';
import { registerUpdateCallback, unregisterUpdateCallback, invalidateCache } from '../lib/cacheManager';

const CAT_IMAGES = [
  "/cat_images/cat-black (1).png",
  "/cat_images/cat-black_brown.png",
  "/cat_images/cat-blk-white.png",
  "/cat_images/cat-forest.png",
  "/cat_images/cat-whitemix.png",
  "/cat_images/cat_brown.png",
  "/cat_images/cat_jangli.png",
  "/cat.png",
];

const EventFeed = ({ limit, hideHeader = false, showFilters = false, onlyActive = false }) => {
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [randomCat] = useState(() => CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)]);

  useEffect(() => {
    if (!hideHeader) {
      document.title = "Events - CampusNode";
    }
  }, [hideHeader]);

  const initialClub = searchParams.get('club') || searchParams.get('clubName') || searchParams.get('filterClub') || 'ALL';
  const initialStatus = searchParams.get('status') || searchParams.get('filterStatus') || 'ALL';
  const initialMonth = searchParams.get('month') || searchParams.get('filterMonth') || 'ALL';
  const initialYear = searchParams.get('year') || searchParams.get('filterYear') || 'ALL';
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';

  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterClub, setFilterClub] = useState(initialClub);
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const eventsUrl = '/api/events';

  // Sync state if URL query params change
  useEffect(() => {
    const c = searchParams.get('club') || searchParams.get('clubName') || searchParams.get('filterClub');
    const s = searchParams.get('status') || searchParams.get('filterStatus');
    const m = searchParams.get('month') || searchParams.get('filterMonth');
    const y = searchParams.get('year') || searchParams.get('filterYear');
    const q = searchParams.get('search') || searchParams.get('q');

    if (c !== null && c !== undefined) setFilterClub(c);
    if (s !== null && s !== undefined) setFilterStatus(s);
    if (m !== null && m !== undefined) setFilterMonth(m);
    if (y !== null && y !== undefined) setFilterYear(y);
    if (q !== null && q !== undefined) setSearchQuery(q);
  }, [searchParams]);

  const fetchEvents = async () => {
    try {
      // Uses cacheManager: 10-minute TTL, SWR pattern, IndexedDB persistence
      const eventData = await getPublicJson(eventsUrl);
      setEvents(Array.isArray(eventData) ? eventData : []);
      if (user) {
        const regRes = await getUserEvents(user.id || user._id);
        setRegisteredEvents(regRes.data.map(item => item.eventId?._id || item.eventId));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // SWR: auto-update UI when background revalidation finds new data
  const handleBackgroundUpdate = useCallback((newData) => {
    if (newData && Array.isArray(newData)) {
      setEvents(newData);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    // Register for background SWR updates (e.g., cache invalidated from another tab)
    registerUpdateCallback(eventsUrl, handleBackgroundUpdate);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchEvents();
      }
    }, 60000);
    return () => {
      clearInterval(interval);
      unregisterUpdateCallback(eventsUrl, handleBackgroundUpdate);
    };
  }, []);

  const clubNames = useMemo(() => {
    const names = new Set();
    if (Array.isArray(events)) {
      events.forEach(e => {
        const isCentral = e.organizerType === 'CENTRAL' || e.organizerType === 'CENTRAL_ORGANIZATION' || Boolean(e.centralOrganizerId) || (!e.club && !e.clubId);
        if (isCentral) return;
        const cName = e.club?.clubName || e.createdBy?.clubName;
        if (cName) names.add(cName);
      });
    }
    return Array.from(names).sort();
  }, [events]);

  const availableYears = useMemo(() => {
    const currentYear = 2026;
    const years = new Set([currentYear]);
    if (Array.isArray(events)) {
      events.forEach(e => {
        if (e.startTime) {
          const d = new Date(e.startTime);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            if (year >= currentYear) years.add(year);
          }
        }
      });
    }
    // Add a few future years if not present
    years.add(currentYear + 1);
    years.add(currentYear + 2);
    return Array.from(years).sort((a, b) => a - b);
  }, [events]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    if (Array.isArray(events)) {
      events.forEach(e => {
        if (e.startTime) {
          const d = new Date(e.startTime);
          if (!isNaN(d.getTime())) {
            months.add(d.getMonth() + 1); // 1-12
          }
        }
      });
    }
    return Array.from(months).sort((a, b) => a - b);
  }, [events]);

  const handleRegister = async (eventId) => {
    if (!user || (role !== 'member' && role !== 'student')) {
      showNotification('Please login as a student to register.', 'warning');
      return;
    }

    try {
      const res = await registerForEvent(eventId, {
        userId: user.id || user._id
      });
      showNotification(res.data.message, 'success');
      await invalidateCache(['/api/events', `/api/events/user/${user.id || user._id}`]);
      await fetchEvents();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className={`max-w-7xl mx-auto px-6 ${hideHeader ? '' : 'py-12'}`}>
        {!hideHeader && (
          <Skeleton className="w-48 h-8 mb-6" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit || 6)].map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Apply filters
  let filtered = [...events];

  if (filterClub !== 'ALL') {
    if (filterClub === 'CENTRAL' || filterClub.toLowerCase() === 'central') {
      filtered = filtered.filter(e =>
        e.organizerType === 'CENTRAL' ||
        e.organizerType === 'CENTRAL_ORGANIZATION' ||
        Boolean(e.centralOrganizerId) ||
        Boolean(e.centralOrganizer) ||
        (!e.club && !e.clubId)
      );
    } else {
      filtered = filtered.filter(e => {
        const isCentral = e.organizerType === 'CENTRAL' || e.organizerType === 'CENTRAL_ORGANIZATION' || Boolean(e.centralOrganizerId) || (!e.club && !e.clubId);
        if (isCentral) return false;
        const cName = e.club?.clubName || e.createdBy?.clubName;
        return cName && cName.trim().toLowerCase() === filterClub.trim().toLowerCase();
      });
    }
  }

  if (filterStatus !== 'ALL') {
    filtered = filtered.filter(e => e.status === filterStatus);
  }

  if (filterYear !== 'ALL') {
    filtered = filtered.filter(e => {
      if (!e.startTime) return false;
      return new Date(e.startTime).getFullYear().toString() === filterYear.toString();
    });
  }

  if (filterMonth !== 'ALL') {
    filtered = filtered.filter(e => {
      if (!e.startTime) return false;
      return (new Date(e.startTime).getMonth() + 1).toString() === filterMonth.toString();
    });
  }

  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(e => {
      const isCentral = e.organizerType === 'CENTRAL' || e.organizerType === 'CENTRAL_ORGANIZATION' || Boolean(e.centralOrganizerId) || (!e.club && !e.clubId);
      const titleMatch = e.title?.toLowerCase().includes(query);
      const clubMatch = (e.club?.clubName || e.createdBy?.clubName || '').toLowerCase().includes(query);
      const categoryMatch = (e.club?.category || '').toLowerCase().includes(query);
      const centralMatch = isCentral && ('central'.includes(query) || 'odsw'.includes(query) || 'college'.includes(query));
      return titleMatch || clubMatch || categoryMatch || centralMatch;
    });
  }

  // Sort events by status priority: LIVE first, then UPCOMING, then ENDED
  let liveEvents = filtered.filter(e => e.status === 'LIVE');
  let upcomingEvents = filtered.filter(e => e.status === 'UPCOMING');
  let endedEvents = filtered.filter(e => e.status === 'ENDED');

  // Sort upcoming by startTime ascending (soonest first)
  upcomingEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  // Sort ended by startTime descending (most recent first)
  endedEvents.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const hasNoActiveEvents = liveEvents.length === 0 && upcomingEvents.length === 0;

  if (onlyActive) {
    if (hasNoActiveEvents) {
      endedEvents = hideHeader ? endedEvents.slice(0, 3) : endedEvents;
    } else {
      endedEvents = [];
    }
  } else {
    if (hasNoActiveEvents && hideHeader) {
      endedEvents = endedEvents.slice(0, 3);
    }
  }

  // Apply limit: fill slots with priority LIVE → UPCOMING → ENDED
  if (limit) {
    let remaining = limit;

    if (liveEvents.length > remaining) {
      liveEvents = liveEvents.slice(0, remaining);
      remaining = 0;
    } else {
      remaining -= liveEvents.length;
    }

    if (upcomingEvents.length > remaining) {
      upcomingEvents = upcomingEvents.slice(0, remaining);
      remaining = 0;
    } else {
      remaining -= upcomingEvents.length;
    }

    if (endedEvents.length > remaining) {
      endedEvents = endedEvents.slice(0, remaining);
    }
  }

  const totalFiltered = liveEvents.length + upcomingEvents.length + endedEvents.length;

  const isFilterActive = filterStatus !== 'ALL' || filterClub !== 'ALL' || filterMonth !== 'ALL' || filterYear !== 'ALL' || searchQuery.trim() !== '';
  const showEmptyBanner = events.length === 0 || totalFiltered === 0 || (!isFilterActive && hasNoActiveEvents);

  const statusButtons = [
    { key: 'ALL', label: 'All', icon: 'ri-layout-grid-line' },
    { key: 'LIVE', label: 'Live', icon: 'ri-live-line' },
    { key: 'UPCOMING', label: 'Upcoming', icon: 'ri-calendar-event-line' },
    { key: 'ENDED', label: 'Ended', icon: 'ri-history-line' },
  ];

  return (
    <div className={`max-w-7xl mx-auto px-4 ${hideHeader ? '' : 'py-12'}`}>

      {!hideHeader && (
        <h1 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
          Events
        </h1>
      )}

      {(!hideHeader || showFilters) && (
        <div className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs max-w-full overflow-hidden">

          <div className="relative group">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 text-sm sm:text-base transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search events, clubs, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/70 rounded-xl focus:bg-white dark:focus:bg-neutral-800 focus:border-orange-600 dark:focus:border-orange-500 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-orange-600 transition-colors p-1"
                aria-label="Clear search"
              >
                <i className="ri-close-circle-fill text-sm sm:text-base" />
              </button>
            )}
          </div>

          {/* Row 2: Status + Selects */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-2.5 mt-2 sm:mt-2.5 min-w-0 max-w-full">

            {/* Status buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0 max-w-full">
              {statusButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setFilterStatus(btn.key)}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg border whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${filterStatus === btn.key
                      ? btn.key === 'LIVE'
                        ? 'bg-red-500 text-white border-red-500 shadow-2xs'
                        : btn.key === 'UPCOMING'
                          ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                          : btn.key === 'ENDED'
                            ? 'bg-neutral-800 text-white border-neutral-800'
                            : 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60 hover:border-orange-600 hover:text-orange-600'
                    }`}
                >
                  <i className={`${btn.icon} text-xs`} />
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Vertical divider — desktop */}
            <div className="hidden md:block h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5 shrink-0" />

            {/* Selects: Club, Year, Month in 1 single row */}
           <div className="grid grid-cols-3 gap-1 sm:gap-1.5 flex-1 min-w-0">

  {/* Club */}
  <div className="relative group min-w-0">
    <i className="ri-building-line absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 text-xs pointer-events-none z-10" />

    <select
      value={
        filterClub === "CENTRAL"
          ? "CENTRAL"
          : clubNames.find(
              (c) => c.toLowerCase() === filterClub.toLowerCase()
            ) || filterClub
      }
      onChange={(e) => setFilterClub(e.target.value)}
      className="
        w-full min-w-0
        pl-5 sm:pl-6 pr-5 sm:pr-6
        py-1.5
        !text-[10px] sm:!text-[11px]
        !leading-4
        font-semibold
        tracking-wide
        border border-neutral-200 dark:border-neutral-700/70
        rounded-lg
        bg-neutral-50 dark:bg-neutral-800
        text-neutral-800 dark:text-neutral-200
        focus:outline-none
        focus:border-orange-600
        focus:bg-white dark:focus:bg-neutral-800
        transition-all
        cursor-pointer
        appearance-none
        truncate
      "
      style={{ fontSize: "10px" }}
    >
      <option value="ALL">All Clubs</option>

      <option value="CENTRAL">Central (ODSW)</option>

      {clubNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>

    <i className="ri-arrow-down-s-line absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none" />
  </div>


  {/* Year */}
  <div className="relative group min-w-0">
    <i className="ri-calendar-line absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 text-xs pointer-events-none z-10" />

    <select
      value={filterYear}
      onChange={(e) => setFilterYear(e.target.value)}
      className="
        w-full min-w-0
        pl-5 sm:pl-6 pr-5 sm:pr-6
        py-1.5
        !text-[10px] sm:!text-[11px]
        !leading-4
        font-semibold
        tracking-wide
        border border-neutral-200 dark:border-neutral-700/70
        rounded-lg
        bg-neutral-50 dark:bg-neutral-800
        text-neutral-800 dark:text-neutral-200
        focus:outline-none
        focus:border-orange-600
        focus:bg-white dark:focus:bg-neutral-800
        transition-all
        cursor-pointer
        appearance-none
        truncate
      "
      style={{ fontSize: "10px" }}
    >
      <option value="ALL">All Years</option>

      {availableYears.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>

    <i className="ri-arrow-down-s-line absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none" />
  </div>


  {/* Month */}
  <div className="relative group min-w-0">
    <i className="ri-time-line absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 text-xs pointer-events-none z-10" />

    <select
      value={filterMonth}
      onChange={(e) => setFilterMonth(e.target.value)}
      className="
        w-full min-w-0
        pl-5 sm:pl-6 pr-5 sm:pr-6
        py-1.5
        !text-[10px] sm:!text-[11px]
        !leading-4
        font-semibold
        tracking-wide
        border border-neutral-200 dark:border-neutral-700/70
        rounded-lg
        bg-neutral-50 dark:bg-neutral-800
        text-neutral-800 dark:text-neutral-200
        focus:outline-none
        focus:border-orange-600
        focus:bg-white dark:focus:bg-neutral-800
        transition-all
        cursor-pointer
        appearance-none
        truncate
      "
      style={{ fontSize: "10px" }}
    >
      <option value="ALL">All Months</option>

      {monthNames.map((m, i) => (
        <option key={m} value={i + 1}>
          {m}
        </option>
      ))}
    </select>

    <i className="ri-arrow-down-s-line absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none" />
  </div>

</div>
          </div>

          {isFilterActive && (
            <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold truncate pr-2">
                {totalFiltered} event{totalFiltered !== 1 ? 's' : ''} found
                {searchQuery && <span className="text-orange-600 ml-1">for "{searchQuery}"</span>}
              </span>
              <button
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterClub('ALL');
                  setFilterMonth('ALL');
                  setFilterYear('ALL');
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="font-bold uppercase tracking-wider text-orange-600 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <i className="ri-close-line" /> Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* If No Active/Upcoming Events or No Filter Matches */}
      {showEmptyBanner && (
        <div className="text-center py-8 px-4 mb-14">
          <div className="w-50 h-65 sm:w-44 sm:h-44 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img className='w-full h-full object-contain' src={randomCat} alt="No events" />
          </div>
          <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-100 mb-2">
            {events.length === 0
              ? 'No Events Found'
              : totalFiltered === 0
                ? 'No Matching Events Found'
                : 'No Active or Upcoming Events Found'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
            {events.length === 0
              ? 'Please check back later for new events.'
              : totalFiltered === 0
                ? "Try adjusting your filters or search query to find what you're looking for."
                : "There aren't any active events happening right now. Don't worry! You can still browse our past events below."}
          </p>

          {isFilterActive && totalFiltered === 0 && (
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setFilterClub('ALL');
                setFilterMonth('ALL');
                setFilterYear('ALL');
                setSearchQuery('');
                setSearchParams({});
              }}
              className="text-orange-600 font-bold uppercase tracking-widest text-[10px] hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {liveEvents.length > 0 && (
        <div className="mb-14">
          {!hideHeader && (
            <h2 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Happening Now
            </h2>
          )}
          {hideHeader && (
            <h3 className="text-md font-bold text-red-500 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Live Now
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveEvents.map(event => (
              <EventCard
                key={event.id || event._id}
                event={event}
                onRegister={handleRegister}
                isRegistered={registeredEvents.includes(event.id || event._id)}
              />
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className={endedEvents.length > 0 ? 'mb-14' : ''}>
          {!hideHeader && (
            <h2 className="text-lg font-semibold text-gray-700 dark:text-neutral-300 mb-6 flex items-center gap-2">
         
              Upcoming Events
            </h2>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id || event._id}
                event={event}
                onRegister={handleRegister}
                isRegistered={registeredEvents.includes(event.id || event._id)}
              />
            ))}
          </div>
        </div>
      )}

      {endedEvents.length > 0 && (
        <div>
          {!hideHeader && (
            <h2 className="text-lg font-semibold text-neutral-400 mb-6 flex items-center gap-2">
          
              Past Events 
            </h2>
          )}
          {hideHeader && (
            <h3 className="text-md font-bold text-neutral-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
             
              Past Events
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedEvents.map(event => (
              <EventCard
                key={event.id || event._id}
                event={event}
                onRegister={handleRegister}
                isRegistered={registeredEvents.includes(event.id || event._id)}
              />
            ))}
          </div>
        </div>
      )}


    </div>
  );
}

export default EventFeed;
