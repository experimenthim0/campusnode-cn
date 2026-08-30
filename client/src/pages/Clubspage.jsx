import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";
import ClubCard from "../components/ClubCard";
import ClubCardSkeleton from "../components/skeletons/ClubCardSkeleton";
import { Skeleton } from "../components/ui/Skeleton";
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
        setClubs(Array.isArray(clubData) ? clubData : []);
      } catch (err) {
        console.error("Error fetching clubs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();

    const handleUpdate = (newData) => {
      if (Array.isArray(newData)) setClubs(newData);
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

    // Filter by Category
    if (filterCategory !== "ALL") {
      list = list.filter((club) => {
        const cat = club.category || "";
        return cat.trim().toLowerCase() === filterCategory.trim().toLowerCase();
      });
    }

    // Filter by Search Query
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
    return (
      <div className={`${isHome ? "" : "min-h-screen bg-gray-50 dark:bg-neutral-950 py-12"} px-4 transition-colors duration-300`}>
        <div className={isHome ? "" : "max-w-7xl mx-auto"}>
          {!isHome && (
            <div className="mb-8">
              <div className="text-center mb-10">
                <Skeleton className="w-64 h-9 mx-auto mb-3" />
                <Skeleton className="w-96 max-w-full h-4 mx-auto" />
              </div>
              <Skeleton className="w-full h-20 rounded-2xl mb-8" />
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(isHome ? 6 : 9)].map((_, i) => (
              <ClubCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isHome ? "" : "min-h-screen bg-gray-50 dark:bg-neutral-950 py-12 px-4 transition-colors duration-300"}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geom:ital,wght@0,300..900;1,300..900&display=swap');`}</style>

      <div className={isHome ? "" : "max-w-7xl mx-auto"}>
        {/* Page Header - Hide if on Home */}
        {!isHome && (
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-wide">
              NITJ Clubs & Societies
            </h1>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400 tracking-wider text-xs sm:text-sm font-semibold max-w-lg mx-auto">
              Explore student clubs, connect with coordinators, and join activities across campus.
            </p>
          </div>
        )}

        {/* ── FILTER & SEARCH BAR ── */}
        {(!isHome || showFilters) && (
          <div className="mb-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs overflow-hidden">
            {/* Row 1: Search */}
            <div className="relative group">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 text-sm sm:text-base transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search clubs by name, category, faculty, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/70 rounded-xl focus:bg-white dark:focus:bg-neutral-800 focus:border-orange-600 dark:focus:border-orange-500 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-orange-600 transition-colors p-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <i className="ri-close-circle-fill text-sm sm:text-base" />
                </button>
              )}
            </div>

            {/* Row 2: Category Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 mt-2 sm:mt-2.5 min-w-0 max-w-full">
              {categoryTabs.map((cat) => {
                const isSelected = filterCategory.toLowerCase() === cat.key.toLowerCase();
                return (
                  <button
                    key={cat.key}
                    onClick={() => setFilterCategory(cat.key)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg border whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xs"
                        : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60 hover:border-orange-600 hover:text-orange-600"
                    }`}
                  >
                    <i className={`${cat.icon} text-xs`} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Active filter summary */}
            {isFilterActive && (
              <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] sm:text-[11px]">
                <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold truncate pr-2">
                  {filteredClubs.length} club{filteredClubs.length !== 1 ? "s" : ""} found
                  {searchQuery && <span className="text-orange-600 ml-1">for "{searchQuery}"</span>}
                  {filterCategory !== "ALL" && <span className="text-orange-600 ml-1">in category "{filterCategory}"</span>}
                </span>
                <button
                  onClick={handleClearFilters}
                  className="font-bold uppercase tracking-wider text-orange-600 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <i className="ri-close-line" /> Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State Banner */}
        {showEmptyBanner && (
          <div className="text-center py-12 px-4 mb-14 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <img className="w-full h-full object-contain" src={randomCat} alt="No clubs found" />
            </div>
            <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-100 mb-2">
              {clubs.length === 0 ? "No Clubs Found" : "No Matching Clubs Found"}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6 leading-relaxed">
              {clubs.length === 0
                ? "Please check back later for clubs and societies."
                : "Try adjusting your category filter or search query to find what you're looking for."}
            </p>

            {isFilterActive && filteredClubs.length === 0 && (
              <button
                onClick={handleClearFilters}
                className="text-orange-600 font-bold uppercase tracking-widest text-[11px] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <i className="ri-refresh-line" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Clubs Grid */}
        {clubsToShow.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      </div>
    </div>
  );
};

export default ClubsPage;

