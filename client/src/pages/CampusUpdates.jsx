import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Bell,
  Sparkles,
  Inbox,
  AlertCircle,
  Pin,
  TrendingUp,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import UpdatePostCard from "../components/updates/UpdatePostCard";
import UpdatesFeedSkeleton from "../components/updates/UpdatesFeedSkeleton";
import { getCampusUpdates } from "../services/campusUpdatesService";

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "OFFICIAL", label: "Official" },
  { id: "TPO", label: "TPO" },
  { id: "IMPORTANT", label: "Important" },
];

const CampusUpdates = () => {
  const { showNotification } = useNotification() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const targetPostId = searchParams.get("post") || null;
  const initialCategory = (searchParams.get("category") || "ALL").toUpperCase();

  const [selectedCategory, setSelectedCategory] = useState(
    ["ALL", "OFFICIAL", "TPO", "IMPORTANT"].includes(initialCategory) ? initialCategory : "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync category changes to URL without reload
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (catId === "ALL") {
      newParams.delete("category");
    } else {
      newParams.set("category", catId.toLowerCase());
    }
    setSearchParams(newParams, { replace: true });
  };

  // Fetch feed updates
  const fetchUpdates = useCallback(
    async (pageNum, isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const data = await getCampusUpdates({
          category: selectedCategory,
          search: debouncedSearch,
          page: pageNum,
          limit: 10,
          postId: isInitial ? targetPostId : null,
        });

        if (data.success) {
          if (pageNum === 1) {
            setPosts(data.updates);
          } else {
            // Deduplicate posts
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newUnique = data.updates.filter((p) => !existingIds.has(p.id));
              return [...prev, ...newUnique];
            });
          }
          setHasMore(data.pagination.hasMore);
        } else {
          setError(data.message || "Failed to load updates.");
        }
      } catch (err) {
        console.error("Fetch updates error:", err);
        setError("Unable to connect to campus updates. Please check your internet connection.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, debouncedSearch, targetPostId]
  );

  // Trigger initial fetch or category/search reload
  useEffect(() => {
    fetchUpdates(1, true);
  }, [selectedCategory, debouncedSearch, fetchUpdates]);

  // Handle deep-link scrolling once posts are loaded
  useEffect(() => {
    if (targetPostId && posts.length > 0 && !deepLinkHandled) {
      const targetElement = document.getElementById(`post-${targetPostId}`);
      if (targetElement) {
        setDeepLinkHandled(true);
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      } else if (!loading) {
        // Post not found in first batch
        setDeepLinkHandled(true);
        if (showNotification) {
          showNotification("Announcement not found or may have been unpinned/archived.", "info");
        }
      }
    }
  }, [targetPostId, posts, deepLinkHandled, loading, showNotification]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUpdates(nextPage, false);
    }
  };

  const handleRetry = () => {
    setPage(1);
    fetchUpdates(1, true);
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-zinc-950 py-6 sm:py-10 px-3.5 sm:px-4">
      {/* Feed Container — Max width 620px (Instagram standard) */}
      <div className="w-full max-w-[620px] mx-auto">
        {/* ============================================================== */}
        {/* FEED HEADER                                                    */}
        {/* ============================================================== */}
        <header className="mb-6 text-center sm:text-left">
          <div className="flex flex-col  sm:items-center sm:justify-between gap-2 mb-2">
           
              <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 dark:text-neutral-100 tracking-tight">
                Campus Updates
              </h1>
           

            
          </div>

          {/* ============================================================ */}
          {/* SEARCH BAR                                                   */}
          {/* ============================================================ */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements, TPO drives, or offices..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* ============================================================ */}
          {/* CATEGORY FILTER TABS (All | Official | TPO | Important)      */}
          {/* ============================================================ */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 no-scrollbar select-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs scale-102"
                      : "bg-white dark:bg-zinc-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* ============================================================== */}
        {/* POSTS FEED                                                     */}
        {/* ============================================================== */}
        <main>
          {loading ? (
            <UpdatesFeedSkeleton count={3} />
          ) : error ? (
            /* Error State */
            <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-xs my-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Unable to Load Updates
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
                {error}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium tracking-wide shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          ) : posts.length === 0 ? (
            /* Empty State */
            <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center shadow-xs my-6">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
                <Inbox size={28} strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                {debouncedSearch ? "No matching updates found" : "No updates available"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                {debouncedSearch
                  ? `We couldn't find any announcements matching "${debouncedSearch}". Try checking your spelling or clearing filters.`
                  : "There are currently no active announcements in this category. Check back soon for new notices."}
              </p>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            /* Post Cards Feed */
            <div className="space-y-6">
              {posts.map((post) => (
                <UpdatePostCard
                  key={post.id}
                  post={post}
                  isTarget={post.id === targetPostId}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-2 pb-8">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-800/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-brand-600" />
                        <span>Loading more updates...</span>
                      </>
                    ) : (
                      <span>Load More Updates</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CampusUpdates;
