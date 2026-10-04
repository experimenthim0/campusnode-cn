import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import EventCard from '../components/EventCard';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getUserEvents, registerForEvent } from '../services/eventService';
import { useSearchParams } from 'react-router-dom';
import EventCardSkeleton from '../components/skeletons/EventCardSkeleton';
import { Skeleton } from '../components/ui/Skeleton';
import { getPublicJson } from '../lib/publicDataCache';
import { registerUpdateCallback, unregisterUpdateCallback, invalidateCache } from '../lib/cacheManager';
import Section from '../components/layout/Section';
import FeaturedEventsSection from '../components/FeaturedEventsSection';
import CardCarousel from '../components/CardCarousel';
import ScrollReveal from '../components/ScrollReveal';

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

const ALL_MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [1];
  if (currentPage > 3) {
    pages.push('...');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  pages.push(totalPages);
  return pages;
}

const EventFeed = ({ limit, hideHeader = false, showFilters = false, onlyActive = false, isCarousel = false }) => {
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial filter values from URL searchParams
  const initialClub = searchParams.get('club') || searchParams.get('clubName') || searchParams.get('filterClub') || 'ALL';
  const initialStatus = searchParams.get('status') || searchParams.get('filterStatus') || 'ALL';
  const initialMonth = searchParams.get('month') || searchParams.get('filterMonth') || 'ALL';
  const initialYear = searchParams.get('year') || searchParams.get('filterYear') || 'ALL';
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialPage = Number.parseInt(searchParams.get('page'), 10) || 1;

  const pageSize = limit || 12;
  const [page, setPage] = useState(initialPage > 0 ? initialPage : 1);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterClub, setFilterClub] = useState(initialClub);
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState(() => new Set());
  const [clubsList, setClubsList] = useState([]);
  const [randomCat] = useState(() => CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)]);

  const { user, role } = useAuth();
  const isFirstMountRef = useRef(true);
  const requestIdRef = useRef(0);
  const eventsUrl = '/api/events';

  useEffect(() => {
    if (!hideHeader) {
      document.title = "Events - CampusNode";
    }
  }, [hideHeader]);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load all clubs once for dropdown options
  useEffect(() => {
    let isMounted = true;
    getPublicJson('/api/clubs')
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setClubsList(data);
        }
      })
      .catch((err) => console.error('Failed to load clubs for dropdown:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch logged-in student's registrations
  useEffect(() => {
    let isMounted = true;
    if (user && (user.id || user._id)) {
      getUserEvents(user.id || user._id)
        .then((regRes) => {
          if (isMounted) {
            const registeredIds = new Set(
              (regRes.data || []).map((item) => String(item.eventId?._id || item.eventId))
            );
            setRegisteredEvents(registeredIds);
          }
        })
        .catch((err) => console.error('Failed to load registered events:', err));
    } else {
      setRegisteredEvents(new Set());
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Sync state from URL search params (e.g., browser back/forward buttons)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (hideHeader) return;

    const urlPage = Number.parseInt(searchParams.get('page'), 10) || 1;
    const urlClub = searchParams.get('club') || searchParams.get('clubName') || searchParams.get('filterClub') || 'ALL';
    const urlStatus = searchParams.get('status') || searchParams.get('filterStatus') || 'ALL';
    const urlMonth = searchParams.get('month') || searchParams.get('filterMonth') || 'ALL';
    const urlYear = searchParams.get('year') || searchParams.get('filterYear') || 'ALL';
    const urlSearch = searchParams.get('search') || searchParams.get('q') || '';

    setPage((prev) => (prev !== urlPage ? urlPage : prev));
    setFilterClub((prev) => (prev !== urlClub ? urlClub : prev));
    setFilterStatus((prev) => (prev !== urlStatus ? urlStatus : prev));
    setFilterMonth((prev) => (prev !== urlMonth ? urlMonth : prev));
    setFilterYear((prev) => (prev !== urlYear ? urlYear : prev));
    setSearchQuery((prev) => (prev !== urlSearch ? urlSearch : prev));
  }, [searchParams, hideHeader]);

  // Reset page to 1 when any filter or debounced search changes
  const prevFilterValuesRef = useRef({
    status: filterStatus,
    club: filterClub,
    month: filterMonth,
    year: filterYear,
    search: debouncedSearch,
  });

  useEffect(() => {
    const prev = prevFilterValuesRef.current;
    if (
      prev.status !== filterStatus ||
      prev.club !== filterClub ||
      prev.month !== filterMonth ||
      prev.year !== filterYear ||
      prev.search !== debouncedSearch
    ) {
      prevFilterValuesRef.current = {
        status: filterStatus,
        club: filterClub,
        month: filterMonth,
        year: filterYear,
        search: debouncedSearch,
      };
      setPage(1);
    }
  }, [filterStatus, filterClub, filterMonth, filterYear, debouncedSearch]);

  // Synchronize state to URL search parameters for shareable URLs and persistence
  useEffect(() => {
    if (hideHeader) return;

    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    if (filterClub !== 'ALL') params.set('club', filterClub);
    if (filterMonth !== 'ALL') params.set('month', String(filterMonth));
    if (filterYear !== 'ALL') params.set('year', String(filterYear));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

    setSearchParams(params, { replace: true });
  }, [page, filterStatus, filterClub, filterMonth, filterYear, debouncedSearch, hideHeader, setSearchParams]);

  // Core server-side query fetcher with AbortController and race condition guard
  const fetchEvents = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsFetching(true);
    setApiError(null);

    const controller = new AbortController();

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(pageSize));

      if (filterStatus !== 'ALL') queryParams.set('status', filterStatus);
      if (filterClub !== 'ALL') queryParams.set('club', filterClub);
      if (filterMonth !== 'ALL') queryParams.set('month', String(filterMonth));
      if (filterYear !== 'ALL') queryParams.set('year', String(filterYear));
      if (debouncedSearch.trim()) queryParams.set('search', debouncedSearch.trim());

      const url = `${eventsUrl}?${queryParams.toString()}`;
      const resData = await getPublicJson(url);

      // Race condition check: ensure out-of-order response does not overwrite latest
      if (currentRequestId !== requestIdRef.current) return;

      const dataList = Array.isArray(resData) ? resData : (resData?.events || []);
      const paginationMeta = resData?.pagination || {
        page,
        limit: pageSize,
        total: dataList.length,
        totalPages: Math.ceil(dataList.length / pageSize) || (dataList.length === 0 ? 0 : 1),
        hasNextPage: false,
        hasPreviousPage: page > 1,
      };

      setEvents(dataList);
      setPagination(paginationMeta);
      setLoading(false);
      setIsFetching(false);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      console.error('Failed to fetch events:', err);
      setApiError(err.message || 'Failed to load events. Please try again.');
      setLoading(false);
      setIsFetching(false);
    }

    return () => {
      controller.abort();
    };
  }, [page, pageSize, filterStatus, filterClub, filterMonth, filterYear, debouncedSearch, eventsUrl]);

  // Trigger fetch whenever page or active filters change
  useEffect(() => {
    fetchEvents();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchEvents();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchEvents]);

  // Background update callback from cacheManager
  const handleBackgroundUpdate = useCallback((newData) => {
    if (newData) {
      const dataList = Array.isArray(newData) ? newData : (newData?.events || []);
      if (Array.isArray(dataList)) {
        setEvents((prev) => {
          const newMap = new Map(dataList.map((e) => [e.id || e._id, e]));
          return prev.map((e) => newMap.get(e.id || e._id) || e);
        });
      }
    }
  }, []);

  useEffect(() => {
    const currentUrl = `${eventsUrl}?page=${page}&limit=${pageSize}&status=${filterStatus}&club=${filterClub}&month=${filterMonth}&year=${filterYear}&search=${encodeURIComponent(debouncedSearch.trim())}`;
    registerUpdateCallback(currentUrl, handleBackgroundUpdate);
    return () => {
      unregisterUpdateCallback(currentUrl, handleBackgroundUpdate);
    };
  }, [page, pageSize, filterStatus, filterClub, filterMonth, filterYear, debouncedSearch, eventsUrl, handleBackgroundUpdate]);

  // Club names for dropdown: combines all campus clubs + any active event organizers
  const clubNames = useMemo(() => {
    const names = new Set();
    clubsList.forEach((c) => {
      if (c.clubName) names.add(c.clubName);
    });
    events.forEach((e) => {
      const cName = e.club?.clubName || e.createdBy?.clubName;
      if (cName) names.add(cName);
      if (Array.isArray(e.organizers)) {
        e.organizers.forEach((o) => {
          if (o.club?.clubName) names.add(o.club.clubName);
        });
      }
    });
    return Array.from(names).sort();
  }, [clubsList, events]);

  // Dynamic years list based on current year
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear - 2, currentYear - 1, currentYear, currentYear + 1]);
    events.forEach((e) => {
      if (e.startTime) {
        const d = new Date(e.startTime);
        if (!isNaN(d.getTime())) {
          years.add(d.getFullYear());
        }
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [events]);

  const handleRegister = async (eventId) => {
    if (!user || (role !== 'member' && role !== 'student')) {
      showNotification('Please login as a student to register.', 'warning');
      return;
    }

    try {
      const res = await registerForEvent(eventId, {
        userId: user.id || user._id,
      });
      showNotification(res.data.message, 'success');
      setRegisteredEvents((prev) => new Set([...prev, String(eventId)]));
      await invalidateCache(['/api/events', `/api/events/user/${user.id || user._id}`]);
      await fetchEvents();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterClub('ALL');
    setFilterMonth('ALL');
    setFilterYear('ALL');
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
    if (!hideHeader) {
      setSearchParams({}, { replace: true });
    }
  };

  // Group events into sections based on their status
  const { liveEvents, upcomingEvents, endedEvents, hasNoActiveEvents } = useMemo(() => {
    let live = events.filter((e) => e.status === 'LIVE');
    let upcoming = events.filter((e) => e.status === 'UPCOMING');
    let ended = events.filter((e) => e.status === 'ENDED');

    upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    ended.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    const noActive = live.length === 0 && upcoming.length === 0;

    if (onlyActive) {
      if (noActive) {
        ended = hideHeader ? ended.slice(0, 3) : ended;
      } else {
        ended = [];
      }
    } else {
      if (noActive && hideHeader) {
        ended = ended.slice(0, 3);
      }
    }

    return {
      liveEvents: live,
      upcomingEvents: upcoming,
      endedEvents: ended,
      hasNoActiveEvents: noActive,
    };
  }, [events, onlyActive, hideHeader]);

  if (loading) {
    const skeletonGrid = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {[...Array(pageSize > 6 ? 6 : pageSize)].map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );

    if (hideHeader) {
      return <div className="w-full">{skeletonGrid}</div>;
    }

    return (
      <Section className="py-10 sm:py-12 lg:py-16">
        <Skeleton className="w-48 h-8 mb-6 rounded-xl" />
        {skeletonGrid}
      </Section>
    );
  }

  const isFilterActive =
    filterStatus !== 'ALL' ||
    filterClub !== 'ALL' ||
    filterMonth !== 'ALL' ||
    filterYear !== 'ALL' ||
    debouncedSearch.trim() !== '';

  const showEmptyBanner = !loading && !apiError && (events.length === 0 || (!isFilterActive && hasNoActiveEvents));

  const statusButtons = [
    { key: 'ALL', label: 'All', icon: 'ri-layout-grid-line' },
    { key: 'LIVE', label: 'Live', icon: 'ri-live-line' },
    { key: 'UPCOMING', label: 'Upcoming', icon: 'ri-calendar-event-line' },
    { key: 'ENDED', label: 'Ended', icon: 'ri-history-line' },
  ];

  const Container = hideHeader ? 'div' : Section;
  const containerProps = hideHeader ? { className: "myfont w-full" } : { className: "myfont py-10 sm:py-12 lg:py-16" };

  return (
    <Container {...containerProps}>
      {!hideHeader && (
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            Events & Activities
          </h1>
        </div>
      )}

      {!hideHeader && <FeaturedEventsSection inline={true} />}

      {(!hideHeader || showFilters) && (
        <div className="mb-6 bg-cn-surface border border-cn-border rounded-2xl p-2.5 sm:p-3.5 shadow-2xs max-w-full overflow-hidden">
          <div className="relative group">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 text-sm sm:text-base transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search events, clubs, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-brand-600 dark:focus:border-brand-500 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <i className="ri-close-circle-fill text-sm sm:text-base" />
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-2.5 mt-2 sm:mt-2.5 min-w-0 max-w-full">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0 max-w-full">
              {statusButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setFilterStatus(btn.key)}
                  className={`mysans inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-lg border whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                    filterStatus === btn.key
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs"
                      : "bg-neutral-50 dark:bg-zinc-850/80 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <i className={`${btn.icon} text-xs`} />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 grow min-w-0">
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-zinc-900/70 border border-neutral-200 dark:border-zinc-800 rounded-lg text-[11px] sm:text-xs text-neutral-800 dark:text-neutral-200 focus:border-brand-600 dark:focus:border-brand-500 outline-none truncate transition-colors font-medium cursor-pointer"
                aria-label="Filter by club"
              >
                <option value="ALL">All Clubs</option>
                <option value="CENTRAL">Central (ODSW)</option>
                {clubNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-zinc-900/70 border border-neutral-200 dark:border-zinc-800 rounded-lg text-[11px] sm:text-xs text-neutral-800 dark:text-neutral-200 focus:border-brand-600 dark:focus:border-brand-500 outline-none truncate transition-colors font-medium cursor-pointer"
                aria-label="Filter by month"
              >
                <option value="ALL">All Months</option>
                {ALL_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-zinc-900/70 border border-neutral-200 dark:border-zinc-800 rounded-lg text-[11px] sm:text-xs text-neutral-800 dark:text-neutral-200 focus:border-brand-600 dark:focus:border-brand-500 outline-none truncate transition-colors font-medium cursor-pointer"
                aria-label="Filter by year"
              >
                <option value="ALL">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mysans inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 bg-neutral-100 dark:bg-zinc-800 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Reset all filters"
              >
                <i className="ri-refresh-line text-xs" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
            <span>
              Showing{' '}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {pagination.total > 0
                  ? `${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
                  : '0'}
              </span>{' '}
              {pagination.total === 1 ? 'event' : 'events'}
            </span>
            <div className="flex items-center gap-2">
              {isFetching && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider animate-pulse">
                  <i className="ri-loader-4-line animate-spin text-xs" />
                  Updating...
                </span>
              )}
              {isFilterActive && !isFetching && (
                <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Filters applied
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {apiError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center shadow-2xs mb-8">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base mb-1">
            Failed to load events
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-4 max-w-md mx-auto">
            {apiError}
          </p>
          <button
            type="button"
            onClick={() => fetchEvents()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <i className="ri-refresh-line text-xs" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {showEmptyBanner && (
        <div className="bg-cn-surface border border-cn-border rounded-2xl p-8 sm:p-12 text-center shadow-2xs mb-8">
          <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-4 flex items-center justify-center">
            <img
              src={randomCat}
              alt="Friendly Campus Cat"
              className="max-h-full max-w-full object-contain drop-shadow-xs"
            />
          </div>
          <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white mb-1 tracking-tight">
            {pagination.total === 0 && !isFilterActive
              ? 'No events scheduled yet'
              : pagination.total === 0
                ? 'No matching events found'
                : 'No active events currently'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4 leading-relaxed font-light">
            {pagination.total === 0 && !isFilterActive
              ? 'Please check back later for new events.'
              : pagination.total === 0
                ? "Try adjusting your filters or search query to find what you're looking for."
                : "There aren't any active events happening right now. Don't worry! You can still browse our past events below."}
          </p>

          {isFilterActive && pagination.total === 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-brand-600 font-semibold uppercase tracking-widest text-[10px] hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {liveEvents.length > 0 && (
        <div className="mb-14">
          {!hideHeader && (
            <h2 className="text-lg font-medium text-red-500 mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Happening Now
            </h2>
          )}
          {hideHeader && (
            <h3 className="text-md font-semibold text-red-500 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Live Now
            </h3>
          )}

          {isCarousel || (hideHeader && liveEvents.length > 3) ? (
            <CardCarousel threshold={3}>
              {liveEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="none" delay={0.05 * (idx % 3)} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </CardCarousel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {liveEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="up" delay={0.05 * (idx % 3)} distance={24} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className={endedEvents.length > 0 ? 'mb-14' : ''}>
          {!hideHeader && (
            <ScrollReveal direction="up" distance={15}>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-neutral-300 mb-6 flex items-center gap-2">
                Upcoming Events
              </h2>
            </ScrollReveal>
          )}

          {isCarousel || (hideHeader && upcomingEvents.length > 3) ? (
            <CardCarousel threshold={3}>
              {upcomingEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="none" delay={0.05 * (idx % 3)} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </CardCarousel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {upcomingEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="up" delay={0.05 * (idx % 3)} distance={24} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      )}

      {endedEvents.length > 0 && (
        <div>
          {!hideHeader && (
            <ScrollReveal direction="up" distance={15}>
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-6 flex items-center justify-center gap-2">
                Past Events
              </h2>
            </ScrollReveal>
          )}
          {hideHeader && (
            <h3 className="text-md font-semibold text-neutral-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
              Past Events
            </h3>
          )}
          {isCarousel || (hideHeader && endedEvents.length > 3) ? (
            <CardCarousel threshold={3}>
              {endedEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="none" delay={0.05 * (idx % 3)} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </CardCarousel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {endedEvents.map((event, idx) => (
                <ScrollReveal key={event.id || event._id} direction="up" delay={0.05 * (idx % 3)} distance={24} className="h-full">
                  <EventCard
                    event={event}
                    onRegister={handleRegister}
                    isRegistered={registeredEvents.has(String(event.id || event._id))}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Traditional Pagination Controls */}
      {!limit && pagination.totalPages > 1 && (
        <div className="mt-12 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 dark:border-zinc-800/80 pt-6">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Page <span className="font-semibold text-neutral-900 dark:text-neutral-100">{pagination.page}</span> of{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{pagination.totalPages}</span>
            {' '}• {pagination.total} total {pagination.total === 1 ? 'event' : 'events'}
          </div>

          <nav aria-label="Events Pagination" className="inline-flex items-center gap-1.5">
            {/* Previous button */}
            <button
              type="button"
              onClick={() => {
                if (pagination.hasPreviousPage) {
                  setPage((p) => p - 1);
                  window.scrollTo({ top: 200, behavior: 'smooth' });
                }
              }}
              disabled={!pagination.hasPreviousPage || isFetching}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-2xs cursor-pointer"
              aria-label="Previous Page"
            >
              <i className="ri-arrow-left-s-line text-sm" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Numbers */}
            <div className="inline-flex items-center gap-1">
              {getPageNumbers(pagination.page, pagination.totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-neutral-400 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => {
                      if (p !== pagination.page) {
                        setPage(p);
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }
                    }}
                    disabled={isFetching}
                    className={`min-w-[34px] h-[34px] text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer ${
                      pagination.page === p
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs font-bold'
                        : 'bg-white dark:bg-zinc-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800'
                    }`}
                    aria-current={pagination.page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => {
                if (pagination.hasNextPage) {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 200, behavior: 'smooth' });
                }
              }}
              disabled={!pagination.hasNextPage || isFetching}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-2xs cursor-pointer"
              aria-label="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <i className="ri-arrow-right-s-line text-sm" />
            </button>
          </nav>
        </div>
      )}

      {!limit && pagination.total > 0 && pagination.totalPages <= 1 && (
        <div className="mt-8 mb-4 text-center text-xs text-neutral-400 dark:text-neutral-500 font-medium">
          All {pagination.total} {pagination.total === 1 ? 'event' : 'events'} loaded
        </div>
      )}
    </Container>
  );
};

export default EventFeed;
