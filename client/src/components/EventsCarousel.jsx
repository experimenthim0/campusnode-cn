import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EventCard from './EventCard';
import { getPublicJson } from '../lib/publicDataCache';
import { registerUpdateCallback, unregisterUpdateCallback, invalidateCache } from '../lib/cacheManager';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getUserEvents, registerForEvent } from '../services/eventService';

// Detect items that naturally fit in one row based on responsive viewport
const useItemsPerRow = () => {
  const [itemsPerRow, setItemsPerRow] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerRow(3);
      } else if (window.innerWidth >= 640) {
        setItemsPerRow(2);
      } else {
        setItemsPerRow(1);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return itemsPerRow;
};

// Reusable row for a specific event status (Live, Upcoming, Past)
const EventRowSection = ({
  title,
  badgeText,
  badgeIcon,
  badgeClass,
  events,
  registeredEvents,
  handleRegister,
  statusParam,
  itemsPerRow,
}) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Show carousel only if events exceed one row for the current viewport
  const isCarousel = events && events.length > itemsPerRow;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    if (isCarousel) {
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }
  }, [isCarousel, events, checkScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (!events || events.length === 0) return null;

  return (
    <div className="w-full">
      {/* Row Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${badgeClass}`}>
            {badgeIcon}
            <span>{badgeText}</span>
            <span className="opacity-60 text-[11px] font-semibold">({events.length})</span>
          </div>
          <h3 className="font-black text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight tracking-tight">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Show scroll buttons ONLY when items exceed one row on this screen */}
          {isCarousel && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label={`Previous ${title}`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-cn-blue-500/50 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <i className="ri-arrow-left-s-line text-base sm:text-lg" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label={`Next ${title}`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-cn-blue-500/50 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <i className="ri-arrow-right-s-line text-base sm:text-lg" />
              </button>
            </div>
          )}

          {/* Direct link to filter in events page */}
          <Link
            to={statusParam ? `/events?status=${statusParam}` : '/events'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200/90 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:border-cn-blue-500/40 transition-all duration-200 shadow-2xs hover:shadow-xs group"
          >
            <span>View All</span>
            <i className="ri-arrow-right-line text-xs transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Row Cards: Horizontal Carousel when > 1 row, or Static 1-row Grid when <= 1 row */}
      {isCarousel ? (
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map(event => (
            <div
              key={event.id || event._id}
              className="w-[290px] sm:w-[330px] md:w-[350px] shrink-0 snap-start flex flex-col"
            >
              <EventCard
                event={event}
                onRegister={handleRegister}
                isRegistered={registeredEvents.includes(event.id || event._id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-5 sm:gap-6 py-2 ${
            events.length === 1
              ? 'grid-cols-1 max-w-sm sm:max-w-md'
              : events.length === 2
              ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {events.map(event => (
            <div key={event.id || event._id} className="w-full flex flex-col">
              <EventCard
                event={event}
                onRegister={handleRegister}
                isRegistered={registeredEvents.includes(event.id || event._id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EventsCarousel = () => {
  const [liveEvents, setLiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [endedEvents, setEndedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  const itemsPerRow = useItemsPerRow();
  const { user, role } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getPublicJson('/api/events');
      const rawEvents = Array.isArray(data) ? data : (data?.events || []);

      const live = [];
      const upcoming = [];
      const ended = [];

      rawEvents.forEach(e => {
        if (!e) return;
        if (e.status === 'LIVE') {
          live.push(e);
        } else if (e.status === 'UPCOMING') {
          upcoming.push(e);
        } else if (e.status === 'ENDED') {
          ended.push(e);
        } else {
          // Dynamic timestamp fallback
          const now = new Date();
          const start = e.startTime ? new Date(e.startTime) : null;
          const end = e.endTime ? new Date(e.endTime) : (start ? new Date(start.getTime() + 3 * 3600000) : null);
          if (start && end && now >= start && now <= end) {
            live.push(e);
          } else if (start && start > now) {
            upcoming.push(e);
          } else {
            ended.push(e);
          }
        }
      });

      // Sort upcoming soonest first
      upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      // Sort ended most recent first
      ended.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      // Sort live soonest first
      live.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      setLiveEvents(live);
      setUpcomingEvents(upcoming.slice(0, 12));
      setEndedEvents(ended.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch events for carousel:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    registerUpdateCallback('/api/events', fetchEvents);
    return () => unregisterUpdateCallback('/api/events', fetchEvents);
  }, [fetchEvents]);

  // Fetch registered events for current user
  useEffect(() => {
    let isMounted = true;
    const fetchRegistered = async () => {
      if (user && (role === 'student' || role === 'member')) {
        try {
          const res = await getUserEvents(user.id || user._id);
          if (isMounted) {
            const registeredIds = (res.data || []).map(e => e._id || e.id);
            setRegisteredEvents(registeredIds);
          }
        } catch (err) {
          // quiet error
        }
      }
    };
    fetchRegistered();
    return () => { isMounted = false; };
  }, [user, role]);

  const handleRegister = async (eventId) => {
    if (!user || (role !== 'member' && role !== 'student')) {
      showNotification('Please login as a student to register.', 'warning');
      navigate('/login');
      return;
    }

    try {
      const res = await registerForEvent(eventId, {
        userId: user.id || user._id,
      });
      showNotification(res.data.message || 'Successfully registered!', 'success');
      await invalidateCache(['/api/events', `/api/events/user/${user.id || user._id}`]);
      await fetchEvents();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  const totalEvents = liveEvents.length + upcomingEvents.length + endedEvents.length;

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-cn-blue-600 dark:text-cn-blue-400 font-bold text-xs uppercase tracking-widest mb-1.5">
          <span className="w-2 h-2 rounded-full bg-cn-blue-600 dark:bg-cn-blue-400" />
          <span>Latest Happenings</span>
        </div>
        <h2 className="font-black text-2xl sm:text-3xl lg:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
          What's Buzzing on Campus
        </h2>
      </div>

      {loading ? (
        <div className="flex gap-5 sm:gap-6 overflow-hidden py-2">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="w-[290px] sm:w-[330px] md:w-[350px] h-[380px] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-5 shrink-0 animate-pulse flex flex-col justify-between"
            >
              <div className="h-40 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-4" />
              <div className="space-y-2.5">
                <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
              <div className="h-9 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full mt-4" />
            </div>
          ))}
        </div>
      ) : totalEvents === 0 ? (
        <div className="text-center py-12 px-4 bg-cn-surface border border-cn-border rounded-2xl">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No events scheduled right now. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-12 sm:space-y-14">
          {/* ROW 1: LIVE EVENTS */}
          <EventRowSection
            title="Live Events"
            badgeText="Live Now"
            badgeIcon={
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            }
            badgeClass="bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/50 text-rose-600 dark:text-rose-400"
            events={liveEvents}
            registeredEvents={registeredEvents}
            handleRegister={handleRegister}
            statusParam="LIVE"
            itemsPerRow={itemsPerRow}
          />

          {/* ROW 2: UPCOMING EVENTS */}
          <EventRowSection
            title="Upcoming Events"
            badgeText="Upcoming"
            badgeIcon={<i className="ri-calendar-check-line text-xs" />}
            badgeClass="bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/50 text-blue-600 dark:text-blue-400"
            events={upcomingEvents}
            registeredEvents={registeredEvents}
            handleRegister={handleRegister}
            statusParam="UPCOMING"
            itemsPerRow={itemsPerRow}
          />

          {/* ROW 3: PAST EVENTS */}
          <EventRowSection
            title="Passed Events"
            badgeText="Past Events"
            badgeIcon={<i className="ri-history-line text-xs" />}
            badgeClass="bg-neutral-100 dark:bg-neutral-850 border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
            events={endedEvents}
            registeredEvents={registeredEvents}
            handleRegister={handleRegister}
            statusParam="ENDED"
            itemsPerRow={itemsPerRow}
          />
        </div>
      )}
    </div>
  );
};

export default EventsCarousel;
