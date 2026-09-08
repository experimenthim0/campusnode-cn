import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";
import ClubCard from "../components/ClubCard";
import ClubCardSkeleton from "../components/skeletons/ClubCardSkeleton";
import { Skeleton } from "../components/ui/Skeleton";
import Section from "../components/layout/Section";
import { useTheme } from "../context/ThemeContext";
import { getPublicJson } from "../lib/publicDataCache";
import { registerUpdateCallback, unregisterUpdateCallback } from "../lib/cacheManager";

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

const CATEGORY_ICONS = {
  technical: "ri-code-s-slash-line",
  tech: "ri-computer-line",
  cultural: "ri-palette-line",
  sports: "ri-run-line",
  "sports & fitness": "ri-football-line",
  fitness: "ri-heart-pulse-line",
  literary: "ri-book-open-line",
  "literary & debating": "ri-mic-line",
  debating: "ri-mic-line",
  social: "ri-hand-heart-line",
  "social & welfare": "ri-heart-line",
  academic: "ri-graduation-cap-line",
  departmental: "ri-building-4-line",
  dramatics: "ri-theater-line",
  music: "ri-music-2-line",
  dance: "ri-disc-line",
  photography: "ri-camera-lens-line",
  "fine arts": "ri-brush-line",
  arts: "ri-brush-line",
  robotics: "ri-robot-line",
  finance: "ri-line-chart-line",
  entrepreneurship: "ri-funds-line",
  esports: "ri-gamepad-line",
  gaming: "ri-gamepad-line",
  environment: "ri-leaf-line",
  space: "ri-rocket-line",
  media: "ri-video-line",
  wellness: "ri-mental-health-line",
};

const getCategoryIcon = (category) => {
  if (!category) return "ri-team-line";
  const lower = category.toLowerCase().trim();
  if (CATEGORY_ICONS[lower]) return CATEGORY_ICONS[lower];
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  return "ri-team-line";
};

/**
 * Fisher-Yates (Knuth) Shuffle algorithm.
 * Creates an unbiased, randomly shuffled shallow copy of the array
 * without mutating the original source array.
 *
 * @template T
 * @param {T[]} array
 * @returns {T[]} New shuffled array
 */
const shuffleArray = (array) => {
  if (!Array.isArray(array) || array.length <= 1) {
    return Array.isArray(array) ? [...array] : [];
  }
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ClubsPage = ({ isHome = false, showFilters = false }) => {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [randomCat] = useState(() => CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)]);

  const initialCategory = searchParams.get("category") || searchParams.get("filterCategory") || "ALL";
  const initialSearch = searchParams.get("search") || searchParams.get("q") || "";

  const [filterCategory, setFilterCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    if (!isHome) {
      document.title = "Clubs & Societies - CampusNode";
    }
  }, [isHome]);

  const clubsUrl = "/api/clubs";

  // Sync state if URL query params change
  useEffect(() => {
    const cat = searchParams.get("category") || searchParams.get("filterCategory");
    const q = searchParams.get("search") || searchParams.get("q");

    if (cat !== null && cat !== undefined) setFilterCategory(cat);
    if (q !== null && q !== undefined) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const clubData = await getPublicJson(clubsUrl);
        // Randomize order on initial fetch using Fisher-Yates shuffle
        setClubs(Array.isArray(clubData) ? shuffleArray(clubData) : []);
      } catch (err) {
        console.error("Error fetching clubs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();

    const handleUpdate = (newData) => {
      if (Array.isArray(newData)) {
        // Randomize when fresh data is intentionally pushed
        setClubs(shuffleArray(newData));
      }
    };
    registerUpdateCallback(clubsUrl, handleUpdate);

    return () => {
      unregisterUpdateCallback(clubsUrl, handleUpdate);
    };
  }, []);

  // Dynamically extract categories from clubs
  const categoryTabs = useMemo(() => {
    const tabs = [{ key: "ALL", label: "All", icon: "ri-layout-grid-line" }];
    const uniqueCategories = new Set();

    if (Array.isArray(clubs)) {
      clubs.forEach((c) => {
        if (c.category && typeof c.category === "string" && c.category.trim()) {
          uniqueCategories.add(c.category.trim());
        }
      });
    }

    const dynamicTabs = Array.from(uniqueCategories)
      .sort((a, b) => a.localeCompare(b))
      .map((cat) => ({
        key: cat,
        label: cat,
        icon: getCategoryIcon(cat),
      }));

    return [...tabs, ...dynamicTabs];
  }, [clubs]);

  // Filtered clubs based on search and category tab
  const filteredClubs = useMemo(() => {
    let list = Array.isArray(clubs) ? [...clubs] : [];

    if (filterCategory !== "ALL") {
      list = list.filter((club) => {
        const cat = club.category || "";
        return cat.trim().toLowerCase() === filterCategory.trim().toLowerCase();
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((club) => {
        const nameMatch = (club.clubName || "").toLowerCase().includes(q);
        const catMatch = (club.category || "").toLowerCase().includes(q);
        const descMatch = (club.description ? club.description.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ") : "")
          .toLowerCase()
          .includes(q);
        const facultyMatch = (
          typeof club.facultyName === "string"
            ? club.facultyName
            : Array.isArray(club.facultyCoordinators)
            ? club.facultyCoordinators.map((f) => (typeof f === "object" ? f.name : f)).join(" ")
            : ""
        )
          .toLowerCase()
          .includes(q);
        const studentMatch = (
          Array.isArray(club.studentHeads)
            ? club.studentHeads.join(" ")
            : Array.isArray(club.studentCoordinators)
            ? club.studentCoordinators.join(" ")
            : typeof club.studentCoordinators === "string"
            ? club.studentCoordinators
            : ""
        )
          .toLowerCase()
          .includes(q);

        return nameMatch || catMatch || descMatch || facultyMatch || studentMatch;
      });
    }

    return list;
  }, [clubs, filterCategory, searchQuery]);

  const clubsToShow = isHome ? (Array.isArray(clubs) ? clubs.slice(0, 6) : []) : filteredClubs;
  const isFilterActive = filterCategory !== "ALL" || searchQuery.trim() !== "";
  const showEmptyBanner = !isHome && (clubs.length === 0 || filteredClubs.length === 0);

  const handleClearFilters = () => {
    setFilterCategory("ALL");
    setSearchQuery("");
    setSearchParams({});
  };

  if (loading) {
    const skeletonGrid = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {[...Array(isHome ? 6 : 9)].map((_, i) => (
          <ClubCardSkeleton key={i} />
        ))}
      </div>
    );

    if (isHome) {
      return <div className="w-full">{skeletonGrid}</div>;
    }

    return (
      <div className="min-h-screen bg-cn-bg transition-colors duration-300">
        <Section className="py-10 sm:py-12 lg:py-16">
          <div className="text-center mb-10">
            <Skeleton className="w-64 h-9 mx-auto mb-3 rounded-xl" />
            <Skeleton className="w-96 max-w-full h-4 mx-auto rounded-lg" />
          </div>
          <Skeleton className="w-full h-20 rounded-2xl mb-8" />
          {skeletonGrid}
        </Section>
      </div>
    );
  }

  const content = (
    <>
      {/* Page Header - Hide if on Home */}
      {!isHome && (
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            NITJ Clubs & Societies
          </h1>
          <p className="mt-2.5 text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-normal max-w-lg mx-auto leading-relaxed">
            Explore student clubs, connect with coordinators, and join activities across campus.
          </p>
        </div>
      )}

      {(!isHome || showFilters) && (
        <div className="mb-8 bg-cn-surface border border-cn-border rounded-2xl p-2.5 sm:p-3.5 shadow-2xs overflow-hidden">
          <div className="relative group">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 text-sm sm:text-base transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search clubs by name, category, faculty, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-brand-600 dark:focus:border-brand-500 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <i className="ri-close-circle-fill text-sm sm:text-base" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 mt-2 sm:mt-2.5 min-w-0 max-w-full">
            {categoryTabs.map((cat) => {
              const isSelected = filterCategory.toLowerCase() === cat.key.toLowerCase();
              return (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key)}
                  className={`mysans inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg border whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs"
                      : "bg-neutral-50 dark:bg-zinc-850/80 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <i className={`${cat.icon} text-xs`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {isFilterActive && (
            <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold truncate pr-2">
                {filteredClubs.length} club{filteredClubs.length !== 1 ? "s" : ""} found
                {searchQuery && <span className="text-brand-600 dark:text-brand-400 ml-1">for "{searchQuery}"</span>}
                {filterCategory !== "ALL" && <span className="text-brand-600 dark:text-brand-400 ml-1">in category "{filterCategory}"</span>}
              </span>
              <button
                onClick={handleClearFilters}
                className="mysans font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <i className="ri-close-line" /> Clear
              </button>
            </div>
          )}
        </div>
      )}

      {showEmptyBanner && (
        <div className="text-center py-10 sm:py-12 px-4 mb-10 bg-cn-surface border border-cn-border rounded-2xl shadow-2xs">
          <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img className="w-full h-full object-contain drop-shadow-xs" src={randomCat} alt="No clubs found" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white mb-1 tracking-tight">
            {clubs.length === 0 ? "No Clubs Found" : "No Matching Clubs Found"}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4 leading-relaxed font-light">
            {clubs.length === 0
              ? "Please check back later for clubs and societies."
              : "Try adjusting your category filter or search query to find what you're looking for."}
          </p>

          {isFilterActive && filteredClubs.length === 0 && (
            <button
              onClick={handleClearFilters}
              className="mysans text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest text-[10px] sm:text-[11px] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <i className="ri-refresh-line text-xs" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Clubs Grid */}
      {clubsToShow.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {clubsToShow.map((club, index) => (
            <ScrollReveal
              direction="up"
              delay={(index % 3) * 0.08}
              key={club._id || club.id || club.slug || index}
            >
              <ClubCard club={club} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </>
  );

  if (isHome) {
    return <div className="myfont w-full">{content}</div>;
  }

  return (
    <div className="myfont min-h-screen bg-cn-bg transition-colors duration-300">
      <Section className="py-10 sm:py-12 lg:py-16">
        {content}
      </Section>
    </div>
  );
};

export default ClubsPage;

