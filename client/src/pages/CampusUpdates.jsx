import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Inbox,
  AlertCircle,
  Pin,
  Clock,
  FileText,
  Filter,
  Check,
  Building2,
  SlidersHorizontal,
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

  // Quick secondary toggles
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [hasDeadlineOnly, setHasDeadlineOnly] = useState(false);
  const [hasAttachmentOnly, setHasAttachmentOnly] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState("ALL");

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

  // Sync category changes to URL
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

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
    setPinnedOnly(false);
    setHasDeadlineOnly(false);
    setHasAttachmentOnly(false);
    setSelectedOffice("ALL");
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    setSearchParams(newParams, { replace: true });
  };

  const hasActiveFilters =
    selectedCategory !== "ALL" ||
    debouncedSearch.length > 0 ||
    pinnedOnly ||
    hasDeadlineOnly ||
    hasAttachmentOnly ||
    selectedOffice !== "ALL";

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
          limit: 15,
          postId: isInitial ? targetPostId : null,
        });

        if (data.success) {
          if (pageNum === 1) {
            setPosts(data.updates || []);
          } else {
            // Deduplicate posts
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newUnique = (data.updates || []).filter((p) => !existingIds.has(p.id));
              return [...prev, ...newUnique];
            });
          }
          setHasMore(Boolean(data.pagination?.hasMore));
        } else {
          setError(data.message || "Failed to load announcements.");
        }
      } catch (err) {
        console.error("Fetch updates error:", err);
        setError("Unable to connect to campus updates. Please check your connection.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, debouncedSearch, targetPostId]
  );

  // Trigger initial fetch
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

  // Derive unique offices for quick filtering
  const availableOffices = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      const name = p.organizationName?.trim();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [posts]);

  // Compute live category counts from fetched posts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: posts.length, OFFICIAL: 0, TPO: 0, IMPORTANT: 0 };
    posts.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category] += 1;
      }
    });
    return counts;
  }, [posts]);

  // Filter posts on client side for quick sub-filters (pinned, deadline, attachment, office)
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (pinnedOnly && !post.isPinned) return false;
      if (hasDeadlineOnly && !post.deadline) return false;
      if (
        hasAttachmentOnly &&
        (!Array.isArray(post.attachments) || post.attachments.length === 0)
      ) {
        return false;
      }
      if (selectedOffice !== "ALL" && post.organizationName !== selectedOffice) {
        return false;
      }
      return true;
    });
  }, [posts, pinnedOnly, hasDeadlineOnly, hasAttachmentOnly, selectedOffice]);

  return (
    <div className="min-h-screen bg-cn-bg py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      {/* Outer Workspace Container */}
      <div className="max-w-7xl mx-auto">
        {/* Page Header with Heading on Left and Search Box on Right */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Heading & Subtitle */}
            <div className="shrink-0">
              <h1 className="text-page-title text-cn-text tracking-tight">
                Campus Updates
              </h1>
              <p className="text-body text-cn-text-secondary mt-1">
                Official notices, academic circulars, TPO recruitment drives, and deadlines.
              </p>
            </div>

            {/* Right: Search Box */}
            <div className="relative w-full sm:w-80 md:w-96 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cn-text-muted">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements, TPO, offices..."
                className="w-full pl-10 pr-10 py-2.5 rounded-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border text-body text-cn-text placeholder:text-cn-text-muted focus:outline-hidden focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cn-text-muted hover:text-cn-text cursor-pointer"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Horizontal Filter Bar (Collapses left rail on smaller viewports) */}
          <div className="lg:hidden mt-3 space-y-2">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`px-3.5 py-1 rounded-full text-btn whitespace-nowrap transition-all duration-150 cursor-pointer ${
                      active
                        ? "bg-brand-600 text-white shadow-xs"
                        : "bg-cn-surface dark:bg-cn-surface-card text-cn-text-secondary border border-cn-border hover:border-brand-500/40 hover:text-cn-text"
                    }`}
                  >
                    <span>{cat.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`ml-1.5 text-[11px] font-normal ${active ? "text-white/80" : "text-cn-text-muted"}`}>
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Secondary Toggles for Mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              <button
                type="button"
                onClick={() => setPinnedOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label font-medium whitespace-nowrap border transition-all cursor-pointer ${
                  pinnedOnly
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    : "bg-cn-surface dark:bg-cn-surface-card border-cn-border text-cn-text-secondary"
                }`}
              >
                <Pin size={11} />
                <span>Pinned</span>
              </button>

              <button
                type="button"
                onClick={() => setHasDeadlineOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label font-medium whitespace-nowrap border transition-all cursor-pointer ${
                  hasDeadlineOnly
                    ? "bg-brand-500/15 border-brand-500/40 text-brand-700 dark:text-brand-300"
                    : "bg-cn-surface dark:bg-cn-surface-card border-cn-border text-cn-text-secondary"
                }`}
              >
                <Clock size={11} />
                <span>Deadlines</span>
              </button>

              <button
                type="button"
                onClick={() => setHasAttachmentOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label font-medium whitespace-nowrap border transition-all cursor-pointer ${
                  hasAttachmentOnly
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300"
                    : "bg-cn-surface dark:bg-cn-surface-card border-cn-border text-cn-text-secondary"
                }`}
              >
                <FileText size={11} />
                <span>Documents</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 rounded-full text-label text-cn-text-muted hover:text-brand-600 underline whitespace-nowrap cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SPLIT-PANE DESKTOP WORKSPACE                                  */}
        {/* ============================================================== */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Left Filter Rail (Desktop: sticky, 240px - 260px) */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-20 space-y-6">
            {/* Filter Section Card */}
            <div className="rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card p-4 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cn-text">
                  <SlidersHorizontal size={16} className="text-brand-600 dark:text-brand-400" />
                  <span className="text-subheading text-cn-text">Filters</span>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-label text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* 1. Category Pills with Counts */}
              <div className="space-y-1.5">
                <span className="text-label text-cn-text-muted uppercase tracking-wider block">
                  Category
                </span>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id;
                    const count = categoryCounts[cat.id] ?? 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-btn transition-colors cursor-pointer ${
                          active
                            ? "bg-brand-600 text-white font-medium shadow-xs"
                            : "hover:bg-cn-surface-muted text-cn-text-secondary hover:text-cn-text"
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span
                          className={`text-label px-2 py-0.5 rounded-full ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-cn-surface-muted text-cn-text-muted"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Quick Toggles (Pinned, Deadlines, Docs) */}
              <div className="space-y-2 pt-3 border-t border-cn-border/60">
                <span className="text-label text-cn-text-muted uppercase tracking-wider block">
                  Quick Signals
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-cn-surface-muted cursor-pointer select-none">
                    <div className="flex items-center gap-2 text-btn text-cn-text">
                      <Pin size={14} className="text-amber-500" />
                      <span>Pinned notices</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pinnedOnly}
                      onChange={(e) => setPinnedOnly(e.target.checked)}
                      className="rounded border-cn-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-cn-surface-muted cursor-pointer select-none">
                    <div className="flex items-center gap-2 text-btn text-cn-text">
                      <Clock size={14} className="text-brand-500" />
                      <span>Has deadlines</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasDeadlineOnly}
                      onChange={(e) => setHasDeadlineOnly(e.target.checked)}
                      className="rounded border-cn-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-cn-surface-muted cursor-pointer select-none">
                    <div className="flex items-center gap-2 text-btn text-cn-text">
                      <FileText size={14} className="text-teal-500" />
                      <span>With attachments</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasAttachmentOnly}
                      onChange={(e) => setHasAttachmentOnly(e.target.checked)}
                      className="rounded border-cn-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 3. Office / Sender Filters */}
              {availableOffices.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-cn-border/60">
                  <span className="text-label text-cn-text-muted uppercase tracking-wider block">
                    Sender Office
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedOffice("ALL")}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-btn transition-colors cursor-pointer ${
                        selectedOffice === "ALL"
                          ? "bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-medium"
                          : "text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted"
                      }`}
                    >
                      <span className="truncate">All Offices</span>
                      <span className="text-metadata text-cn-text-muted">{posts.length}</span>
                    </button>
                    {availableOffices.map((office) => {
                      const active = selectedOffice === office.name;
                      return (
                        <button
                          key={office.name}
                          type="button"
                          onClick={() => setSelectedOffice(office.name)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-btn transition-colors cursor-pointer ${
                            active
                              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-medium"
                              : "text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted"
                          }`}
                        >
                          <span className="truncate max-w-[150px]">{office.name}</span>
                          <span className="text-metadata text-cn-text-muted">({office.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Feed Container (Max width 800px for comfortable reading line length) */}
          <main className="flex-1 w-full max-w-[800px]">
            {/* Results Feedback Bar */}
            {!loading && !error && (
              <div className="flex items-center justify-between gap-2 mb-4 text-metadata text-cn-text-muted">
                <span>
                  Showing {filteredPosts.length} of {posts.length} announcements
                  {debouncedSearch && ` matching "${debouncedSearch}"`}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <UpdatesFeedSkeleton count={4} />
            ) : error ? (
              /* Error State */
              <div className="w-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl p-8 text-center shadow-xs my-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={24} />
                </div>
                <h2 className="text-card-title text-cn-text mb-1">
                  Unable to Load Updates
                </h2>
                <p className="text-body text-cn-text-secondary mb-4 max-w-sm mx-auto">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-btn shadow-xs transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Try Again</span>
                </button>
              </div>
            ) : filteredPosts.length === 0 ? (
              /* Empty State */
              <div className="w-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl p-10 text-center shadow-xs my-6">
                <div className="w-14 h-14 rounded-full bg-cn-surface-muted text-cn-text-muted flex items-center justify-center mx-auto mb-3">
                  <Inbox size={28} strokeWidth={1.5} />
                </div>
                <h2 className="text-card-title text-cn-text mb-1">
                  {hasActiveFilters ? "No matching updates found" : "No updates available"}
                </h2>
                <p className="text-body text-cn-text-secondary max-w-sm mx-auto mb-4">
                  {hasActiveFilters
                    ? "We couldn't find any announcements matching your active filters or search terms. Try clearing some filters."
                    : "There are currently no active announcements in this category. Check back soon for new notices."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-btn transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              /* Compact Announcement Cards Feed */
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <UpdatePostCard
                    key={post.id}
                    post={post}
                    isTarget={post.id === targetPostId}
                  />
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4 pb-8">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border text-btn text-cn-text hover:bg-cn-surface-muted shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
    </div>
  );
};

export default CampusUpdates;
