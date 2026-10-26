import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Share2,
  Link2,
  Pin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  Sparkles,
  Maximize2,
  X,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

/**
 * Format timestamp into Instagram-style relative or absolute dates
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  // Older dates: e.g. "15 Oct" or "15 Oct 2025"
  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatted = `${date.getDate()} ${monthNames[date.getMonth()]}`;
  return isCurrentYear ? formatted : `${formatted} ${date.getFullYear()}`;
}

export function formatDeadlineDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CATEGORY_STYLES = {
  OFFICIAL: {
    label: "Official",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60",
    dotClass: "bg-blue-600 dark:bg-blue-400",
  },
  TPO: {
    label: "TPO",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
    dotClass: "bg-emerald-600 dark:bg-emerald-400",
  },
  IMPORTANT: {
    label: "Important",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
    dotClass: "bg-amber-600 dark:bg-amber-400",
  },
};

const UpdatePostCard = ({
  post,
  isTarget = false,
  isAdmin = false,
  onEdit = null,
  onDelete = null,
  onTogglePin = null,
  _onToggleStatus = null,
}) => {
  const { showNotification } = useNotification() || {};
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(Boolean(isTarget));
  const [isHighlighted, setIsHighlighted] = useState(Boolean(isTarget));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const cardRef = useRef(null);
  const mediaContainerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isHorizontalSwipeRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const mouseStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const images = Array.isArray(post.images)
    ? post.images.filter((img) => typeof img === "string" && img.trim())
    : [];

  const hasMedia = images.length > 0;
  const hasMultipleImages = images.length > 1;

  // Safe clamped index to prevent out-of-bounds
  const safeImageIndex = images.length > 0 ? Math.min(currentImageIndex, images.length - 1) : 0;

  // Lock scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  // Check if edited after publication
  const isEdited =
    post.updatedAt &&
    post.publishedAt &&
    new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 60000;

  const categoryConfig = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.OFFICIAL;

  // Handle deep-link highlighting timeout
  useEffect(() => {
    if (isTarget) {
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isTarget]);

  // Navigation handlers
  const nextImage = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  const prevImage = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToImage = useCallback((index, e) => {
    if (e) e.stopPropagation();
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
    }
  }, [images.length]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!hasMultipleImages) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevImage();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextImage();
    }
  };

  // Touch gesture handling with real-time sliding and boundary resistance
  const handleTouchStart = (e) => {
    if (!hasMultipleImages) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipeRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!hasMultipleImages || !isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 7 || Math.abs(deltaY) > 7) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipeRef.current === false) {
      return;
    }

    if (isHorizontalSwipeRef.current === true) {
      if (e.cancelable) {
        e.preventDefault();
      }
      hasMovedRef.current = true;

      let offset = deltaX;
      if (
        (currentImageIndex === 0 && deltaX > 0) ||
        (currentImageIndex === images.length - 1 && deltaX < 0)
      ) {
        offset = deltaX * 0.3;
      }
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (!hasMultipleImages) return;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current === true) {
      const threshold = 40;
      if (dragOffset < -threshold && currentImageIndex < images.length - 1) {
        setCurrentImageIndex((prev) => prev + 1);
      } else if (dragOffset > threshold && currentImageIndex > 0) {
        setCurrentImageIndex((prev) => prev - 1);
      }
    }

    setDragOffset(0);
    isHorizontalSwipeRef.current = null;
  };

  // Desktop mouse drag-to-slide
  const handleMouseDown = (e) => {
    if (!hasMultipleImages || e.button !== 0) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current || !hasMultipleImages) return;
    const deltaX = e.clientX - mouseStartXRef.current;
    if (Math.abs(deltaX) > 5) {
      hasMovedRef.current = true;
    }
    let offset = deltaX;
    if (
      (currentImageIndex === 0 && deltaX > 0) ||
      (currentImageIndex === images.length - 1 && deltaX < 0)
    ) {
      offset = deltaX * 0.3;
    }
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsDragging(false);

    const threshold = 40;
    if (dragOffset < -threshold && currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else if (dragOffset > threshold && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
      handleMouseUp();
    }
  };

  const handleClickCapture = (e) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Keyboard controls for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "ArrowRight") {
        nextImage();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLightboxOpen, prevImage, nextImage]);

  // Share functionality
  const getShareUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/campus-updates?post=${post.id}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      if (showNotification) {
        showNotification("Post link copied to clipboard!", "success");
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
      if (showNotification) {
        showNotification("Could not copy link to clipboard.", "error");
      }
    }
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const shareData = {
      title: post.title,
      text: `${post.title} — Campus Updates | NIT Jalandhar`,
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Share error:", err);
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Determine if description is long enough to warrant "... more"
  const isLongDescription = (post.description || "").length > 180 || (post.description || "").includes("\n\n");

  return (
    <>
      <article
        id={`post-${post.id}`}
      ref={cardRef}
      className={`w-full bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 mb-6 ${
        isHighlighted
          ? "ring-2 ring-brand-500 shadow-xl shadow-brand-500/10 scale-[1.01]"
          : ""
      }`}
    >
      {/* ============================================================== */}
      {/* A. HEADER                                                     */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-neutral-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Circular Organization Avatar */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full ring-1 ring-neutral-200/80 dark:ring-zinc-700/80 overflow-hidden shrink-0 bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center">
            {post.organizationAvatar ? (
              <img
                src={post.organizationAvatar}
                alt={post.organizationName}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase select-none">
                {post.organizationName ? post.organizationName.slice(0, 2) : "NJ"}
              </span>
            )}
          </div>

          {/* Org Name, Time & Meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-[13px] sm:text-[14px] font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[220px] sm:max-w-[280px]">
                {post.organizationName}
              </h3>
              <span className="text-neutral-300 dark:text-zinc-650 text-xs">•</span>
              <span className="text-[11px] sm:text-[12px] font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                {formatRelativeTime(post.publishedAt || post.createdAt)}
              </span>
              {isEdited && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">
                  (Edited)
                </span>
              )}
            </div>

            {/* Sub-line: Pinned / Draft Status */}
            <div className="flex items-center gap-2 mt-0.5">
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <Pin size={11} className="fill-amber-500/20 text-amber-500" />
                  <span>Pinned Announcement</span>
                </span>
              )}
              {post.status === "DRAFT" && (
                <span className="text-[10px] font-medium uppercase px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-neutral-300">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category Pill Badge */}
        <div className="shrink-0 ml-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-Medium tracking-wide border ${categoryConfig.badgeClass}`}
          >
            {/* <span className={`w-1.5 h-1.5 rounded-full ${categoryConfig.dotClass}`} /> */}
            {categoryConfig.label}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* B. MEDIA CONTAINER                                             */}
      {/* ============================================================== */}
      {hasMedia && (
        <div
          ref={mediaContainerRef}
          tabIndex={hasMultipleImages ? 0 : -1}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClickCapture={handleClickCapture}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative w-full bg-neutral-950 flex items-center justify-center overflow-hidden select-none focus:outline-hidden ${
            hasMultipleImages ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          role={hasMultipleImages ? "region" : undefined}
          aria-roledescription={hasMultipleImages ? "carousel" : undefined}
          aria-label={hasMultipleImages ? `${post.title || "Campus update"} images` : undefined}
        >
          {/* Smooth Sliding Track */}
          <div
            className="flex w-full will-change-transform"
            style={{
              transform: `translate3d(calc(-${safeImageIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging
                ? "none"
                : "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className="w-full shrink-0 min-w-full flex items-center justify-center max-h-[580px] bg-black/40 relative cursor-pointer"
                onClick={() => {
                  if (!hasMovedRef.current) {
                    setIsLightboxOpen(true);
                  }
                }}
              >
                <img
                  src={img}
                  alt={`${post.title || "Campus update poster"} - image ${idx + 1} of ${images.length}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="w-full max-h-[580px] object-contain select-none pointer-events-none"
                />
              </div>
            ))}
          </div>

          {/* Multiple Images Counter (1/3) */}
          {hasMultipleImages && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-medium tracking-wide shadow-md z-10 pointer-events-none tabular-nums select-none transition-opacity duration-200">
              {safeImageIndex + 1}/{images.length}
            </div>
          )}

          {/* Expand / Lightbox Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="absolute top-3 left-3 p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white/90 hover:text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10"
            title="View full screen"
            aria-label="View full screen image"
          >
            <Maximize2 size={13} strokeWidth={2.2} />
          </button>

          {/* Prev/Next Controls for Desktop */}
          {hasMultipleImages && (
            <>
              {safeImageIndex > 0 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 dark:bg-zinc-900/85 hover:bg-white dark:hover:bg-zinc-800 text-neutral-800 dark:text-neutral-100 flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10 focus:outline-hidden"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
              )}
              {safeImageIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 dark:bg-zinc-900/85 hover:bg-white dark:hover:bg-zinc-800 text-neutral-800 dark:text-neutral-100 flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10 focus:outline-hidden"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}

          {/* Animated Clickable Dots Indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md shadow-sm z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => goToImage(idx, e)}
                  aria-label={`Go to image ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-hidden ${
                    idx === safeImageIndex
                      ? "w-4 sm:w-5 h-1.5 bg-white shadow-xs"
                      : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* C. DESCRIPTION & DETAILS                                       */}
      {/* ============================================================== */}
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Title */}
        <h2 className="text-[15px] sm:text-[16px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
          {post.title}
        </h2>

        {/* Description Text (Inline Expand / Collapse) */}
        <div className="text-[13px] sm:text-[13.5px] text-neutral-700 dark:text-neutral-300 leading-relaxed break-words font-normal">
          {isExpanded ? (
            <div className="whitespace-pre-line space-y-2">
              {post.description}
            </div>
          ) : (
            <p className="line-clamp-3 whitespace-pre-line">
              {post.description}
            </p>
          )}

          {/* Inline "... more" / "See less" Button */}
          {isLongDescription && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-block mt-1 font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer text-xs"
            >
              {isExpanded ? "See less" : "... more"}
            </button>
          )}
        </div>

        {/* Important Deadline (Optional) */}
        {post.deadline && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/[0.08] dark:bg-red-500/[0.12] border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-medium">
            <Clock size={13} className="shrink-0 text-red-500" />
            <span>Deadline: {formatDeadlineDate(post.deadline)}</span>
          </div>
        )}

        {/* Attachments (Optional) */}
        {Array.isArray(post.attachments) && post.attachments.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Official Documents
            </p>
            <div className="flex flex-wrap gap-2">
              {post.attachments.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800/80 hover:bg-neutral-200/70 dark:hover:bg-zinc-700 border border-neutral-200/80 dark:border-zinc-700/80 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors group"
                >
                  <FileText size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name || "Download Document"}</span>
                  {file.size && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                      ({file.size})
                    </span>
                  )}
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Button (Optional external URL for register/apply) */}
        {post.actionUrl && (
          <div className="pt-2">
            <a
              href={post.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white text-xs sm:text-sm font-medium tracking-wide shadow-sm shadow-brand-600/20 transition-all cursor-pointer"
            >
              <span>{post.actionLabel || "Proceed to Official Portal"}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Source Reference (Admin / Internal verification if present) */}
        {post.sourceReference && (
          <div className="pt-1 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
            {post.sourceReference}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* D. ACTIONS (ONLY Share & Copy Link)                            */}
      {/* ============================================================== */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-t border-neutral-100 dark:border-zinc-800/60 bg-neutral-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
            aria-label="Share update"
            title="Share Announcement"
          >
            <Share2 size={16} strokeWidth={2} />
            <span>Share</span>
          </button>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
            aria-label="Copy direct post link"
            title="Copy Direct Link"
          >
            <Link2 size={16} strokeWidth={2} />
            <span>Copy Link</span>
          </button>
        </div>

        {/* Admin Controls (Only when viewed inside Admin Dashboard) */}
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            {onTogglePin && (
              <button
                type="button"
                onClick={() => onTogglePin(post.id)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  post.isPinned
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                    : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                }`}
                title={post.isPinned ? "Unpin Post" : "Pin Post (Max 3)"}
              >
                <Pin size={15} />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(post)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>

    {/* Fullscreen Lightbox Modal */}
    {isLightboxOpen && hasMedia && (
      <div
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200 select-none"
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Lightbox Top Bar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/60 backdrop-blur-sm z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5 text-white/90 text-sm font-medium truncate max-w-[80vw]">
            <span className="truncate">{post.title}</span>
            {hasMultipleImages && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs shrink-0 font-normal">
                {safeImageIndex + 1} / {images.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close full view"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lightbox Main Carousel */}
        <div
          className="relative flex-1 w-full flex items-center justify-center overflow-hidden p-2 sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex w-full h-full will-change-transform items-center"
            style={{
              transform: `translate3d(calc(-${safeImageIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging
                ? "none"
                : "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className="w-full shrink-0 min-w-full h-full flex items-center justify-center p-2"
              >
                <img
                  src={img}
                  alt={`${post.title || "Full view"} - image ${idx + 1}`}
                  className="max-w-full max-h-[80vh] object-contain select-none"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* Lightbox Prev / Next Buttons */}
          {hasMultipleImages && (
            <>
              {safeImageIndex > 0 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
              )}
              {safeImageIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Lightbox Bottom Dots */}
        {hasMultipleImages && (
          <div
            className="py-4 flex items-center justify-center gap-1.5 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToImage(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === safeImageIndex
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    )}
  </>
  );
};

export default UpdatePostCard;
