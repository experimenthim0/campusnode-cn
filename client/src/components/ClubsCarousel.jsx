import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ClubCard from './ClubCard';
import { getPublicJson } from '../lib/publicDataCache';
import { registerUpdateCallback, unregisterUpdateCallback } from '../lib/cacheManager';

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Clubs', icon: 'ri-apps-2-line' },
  { key: 'technical', label: 'Technical', icon: 'ri-code-s-slash-line' },
  { key: 'cultural', label: 'Cultural', icon: 'ri-palette-line' },
  { key: 'sports', label: 'Sports', icon: 'ri-run-line' },
  { key: 'literary', label: 'Literary', icon: 'ri-book-open-line' },
  { key: 'social', label: 'Social', icon: 'ri-hand-heart-line' },
  { key: 'departmental', label: 'Departmental', icon: 'ri-building-4-line' },
];

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

const ClubsCarousel = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef(null);
  const itemsPerRow = useItemsPerRow();

  const fetchClubs = useCallback(async () => {
    try {
      const data = await getPublicJson('/api/clubs');
      const rawClubs = Array.isArray(data) ? data : (data?.clubs || []);
      setClubs(rawClubs);
    } catch (err) {
      console.error('Failed to fetch clubs for carousel:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
    registerUpdateCallback('/api/clubs', fetchClubs);
    return () => unregisterUpdateCallback('/api/clubs', fetchClubs);
  }, [fetchClubs]);

  const filteredClubs = useMemo(() => {
    if (filterCategory === 'ALL') return clubs;
    return clubs.filter(c => {
      const cat = (c.category || '').toLowerCase();
      return cat.includes(filterCategory.toLowerCase());
    });
  }, [clubs, filterCategory]);

  const isCarousel = filteredClubs.length > itemsPerRow;

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
  }, [isCarousel, filteredClubs, checkScroll]);

  // Reset scroll position on category filter change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [filterCategory]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <div className="w-full">
      {/* Header with Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-cn-blue-600 dark:text-cn-blue-400 font-bold text-xs uppercase tracking-widest mb-1.5">
            <i className="ri-team-line text-sm" />
            <span>Student Communities</span>
          </div>
          <h2 className="font-black text-2xl sm:text-3xl lg:text-4xl text-neutral-900 dark:text-white leading-tight tracking-tight">
            NITJ Clubs & Societies
          </h2>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Show scroll buttons ONLY when items exceed one row on this screen */}
          {isCarousel && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous clubs"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-cn-blue-500/50 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <i className="ri-arrow-left-s-line text-base sm:text-lg" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label="Next clubs"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-cn-blue-500/50 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <i className="ri-arrow-right-s-line text-base sm:text-lg" />
              </button>
            </div>
          )}

          {/* Direct link to all clubs */}
          <Link
            to="/clubs"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200/90 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 hover:border-cn-blue-500/40 transition-all duration-200 shadow-2xs hover:shadow-xs group"
          >
            <span>Explore All</span>
            <i className="ri-arrow-right-line text-xs transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
        {CATEGORY_TABS.map(tab => {
          const isSelected = filterCategory.toLowerCase() === tab.key.toLowerCase();
          return (
            <button
              key={tab.key}
              onClick={() => setFilterCategory(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border transition-all duration-150 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white shadow-2xs'
                  : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <i className={`${tab.icon} text-xs`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Carousel Track (when > 1 row) or Static 1-row Grid (when <= 1 row) */}
      {loading ? (
        <div className="flex gap-5 sm:gap-6 overflow-hidden py-2">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className="w-[280px] sm:w-[310px] md:w-[330px] h-[260px] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-5 shrink-0 animate-pulse flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-4" />
            </div>
          ))}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-10 px-4 bg-cn-surface border border-cn-border rounded-2xl">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No clubs found in this category.
          </p>
        </div>
      ) : isCarousel ? (
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredClubs.map(club => (
            <div
              key={club._id || club.id || club.slug}
              className="w-[280px] sm:w-[310px] md:w-[330px] shrink-0 snap-start flex flex-col"
            >
              <ClubCard club={club} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-5 sm:gap-6 py-2 ${
            filteredClubs.length === 1
              ? 'grid-cols-1 max-w-sm sm:max-w-md'
              : filteredClubs.length === 2
              ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredClubs.map(club => (
            <div key={club._id || club.id || club.slug} className="w-full flex flex-col">
              <ClubCard club={club} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubsCarousel;
