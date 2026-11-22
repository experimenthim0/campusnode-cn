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
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  FileSpreadsheet,
  FileCode,
  Download,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

/**
 * Format timestamp into Instagram/Twitter-style relative or absolute dates
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

/**
 * Standardized 12-hour AM/PM deadline date formatting (AGENTS.md compliance)
 */
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
    hour12: true,
  });
}

const CATEGORY_STYLES = {
  OFFICIAL: {
    label: "Official",
    badgeClass: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200/80 dark:border-brand-800/60",
    dotClass: "bg-brand-600 dark:bg-brand-400",
  },
  TPO: {
    label: "TPO",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60",
    dotClass: "bg-teal-600 dark:bg-teal-400",
  },
  IMPORTANT: {
    label: "Important",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
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
  const [copied, setCopied] = useState(false);

  const cardRef = useRef(null);
  const mediaContainerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isHorizontalSwipeRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const mouseStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const images = Array.isArray(post?.images)
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
    post?.updatedAt &&
    post?.publishedAt &&
    new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 60000;

  const categoryConfig = CATEGORY_STYLES[post?.category] || CATEGORY_STYLES.OFFICIAL;

  // Handle deep-link highlighting timeout
  useEffect(() => {
    if (isTarget) {
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isTarget]);

  // Carousel navigation handlers
  const nextImage = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
    },
    [images.length]
  );

  const prevImage = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToImage = useCallback(
    (index, e) => {
      if (e) e.stopPropagation();
      if (index >= 0 && index < images.length) {
        setCurrentImageIndex(index);
      }
    },
    [images.length]
  );

  // Keyboard navigation for carousel
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

  // Touch gesture handling with smooth resistance
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

  // Lightbox keyboard listener
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

  // Share and copy link functionality
  const getShareUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/campus-updates?post=${post?.id}`;
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      if (showNotification) {
        showNotification("Announcement link copied to clipboard!", "success");
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
      title: post?.title,
      text: `${post?.title} — Campus Updates | NIT Jalandhar`,
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

  const description = post?.description || "";
  const isLongDescription = description.length > 180 || description.includes("\n\n");
  const attachments = Array.isArray(post?.attachments) ? post.attachments : [];
  const hasAttachments = attachments.length > 0;
  const deadlineDate = post?.deadline ? formatDeadlineDate(post.deadline) : null;

  return (
    <>
      <article
        id={`post-${post?.id}`}
        ref={cardRef}
        className={`w-full bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl overflow-hidden shadow-xs hover:border-brand-500/40 transition-all duration-200 ${
          isHighlighted
            ? "ring-2 ring-brand-500 shadow-lg shadow-brand-500/10"
            : ""
        }`}
      >
        {/* ============================================================== */}
        {/* 1. COMPACT HEADER                                              */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-cn-border/60 bg-cn-surface dark:bg-cn-surface-card">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Office Avatar */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-1 ring-cn-border overflow-hidden shrink-0 bg-cn-surface-muted flex items-center justify-center">
              {post?.organizationAvatar ? (
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
                <span className="text-label text-cn-text-secondary uppercase select-none">
                  {post?.organizationName ? post.organizationName.slice(0, 2) : "NJ"}
                </span>
              )}
            </div>

            {/* Office Info & Meta */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-body-emphasis text-cn-text truncate max-w-[200px] sm:max-w-[280px]">
                  {post?.organizationName || "Campus Office"}
                </span>
                <span className="text-cn-text-muted text-xs">•</span>
                <span className="text-metadata text-cn-text-muted whitespace-nowrap">
                  {formatRelativeTime(post?.publishedAt || post?.createdAt)}
                </span>
                {isEdited && (
                  <span className="text-[10px] text-cn-text-muted italic">
                    (Edited)
                  </span>
                )}
                {post?.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-label font-medium text-amber-700 dark:text-amber-300">
                    <Pin size={11} className="fill-amber-500/30 text-amber-600 dark:text-amber-400" />
                    <span>Pinned</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category Pill Badge */}
          <div className="shrink-0 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label font-medium tracking-wide border ${categoryConfig.badgeClass}`}
            >
              {categoryConfig.label}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MEDIA CAROUSEL (Instagram / Twitter upfront display)        */}
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
            aria-label={hasMultipleImages ? `${post?.title || "Campus update"} images` : undefined}
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
                    alt={`${post?.title || "Campus update poster"} - image ${idx + 1} of ${images.length}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    className="w-full max-h-[580px] object-contain select-none pointer-events-none"
                  />
                </div>
              ))}
            </div>

            {/* Multiple Images Counter (e.g. 1/3) */}
            {hasMultipleImages && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-label font-medium tracking-wide shadow-md z-10 pointer-events-none tabular-nums select-none">
                {safeImageIndex + 1}/{images.length}
              </div>
            )}

            {/* Expand Fullscreen / Lightbox Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="absolute top-3 left-3 p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10"
              title="View full screen"
              aria-label="View full screen image"
            >
              <Maximize2 size={13} strokeWidth={2.2} />
            </button>

            {/* Desktop Carousel Arrows */}
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

            {/* Carousel Dots */}
            {hasMultipleImages && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md shadow-sm z-10">
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
        {/* 3. CARD BODY & DESCRIPTION (Instagram-style caption)           */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Announcement Title */}
          <h2 className="text-card-title text-cn-text leading-snug tracking-tight">
            {post?.title}
          </h2>

          {/* Caption / Description with Instagram-style "... more" toggle */}
          <div className="text-body text-cn-text-secondary leading-relaxed break-words font-normal">
            {isExpanded ? (
              <div className="whitespace-pre-line space-y-2.5">
                {description}
              </div>
            ) : (
              <p className="line-clamp-3 whitespace-pre-line">
                {description}
              </p>
            )}

            {isLongDescription && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-block mt-1.5 text-btn text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer select-none"
              >
                {isExpanded ? "Show less" : "... more"}
              </button>
            )}
          </div>

          {/* Official Documents / Attachments */}
          {hasAttachments && (
            <div className="pt-2 space-y-2 border-t border-cn-border/60">
              <p className="text-label font-medium text-cn-text-muted uppercase tracking-wider">
                Official Documents & Circulars
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((file, idx) => {
                  const fileName = typeof file === "string" ? file.split("/").pop() : file?.name || "Official_Document.pdf";
                  const fileUrl = typeof file === "string" ? file : file?.url;
                  const fileSize = typeof file === "object" ? file?.size : null;

                  return (
                    <a
                      key={idx}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cn-surface-muted hover:bg-brand-50/50 dark:hover:bg-brand-950/30 border border-cn-border hover:border-brand-500/40 text-xs font-medium text-cn-text transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={15} className="text-brand-600 dark:text-brand-400 shrink-0" />
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {fileSize && (
                          <span className="text-[11px] text-cn-text-muted font-normal">
                            {fileSize}
                          </span>
                        )}
                        <Download size={13} className="text-cn-text-muted group-hover:text-brand-600 transition-colors" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 3. DEDICATED ACTION & DEADLINE BAR                             */}
        {/* ============================================================== */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-cn-border/80 bg-cn-surface-muted/60 flex flex-wrap items-center justify-between gap-3">
          {/* Metadata: Deadline & Circular/Ref code */}
          <div className="flex flex-wrap items-center gap-2.5 text-metadata">
            {deadlineDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Deadline: {deadlineDate}</span>
              </span>
            )}
            {post?.sourceReference && (
              <span className="text-cn-text-muted font-mono text-[11px] bg-cn-surface px-2.5 py-1 rounded-md border border-cn-border">
                Ref: {post.sourceReference}
              </span>
            )}
          </div>

          {/* Actions: Primary CTA, Share & Instant Copied Link */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Share Announcement */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cn-border bg-cn-surface hover:bg-cn-surface-muted text-cn-text text-btn transition-colors cursor-pointer active:scale-95"
              aria-label="Share update"
              title="Share Announcement"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>

            {/* Copy Link with Instant Copied Feedback */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-btn transition-all cursor-pointer active:scale-95 ${
                copied
                  ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  : "border-cn-border bg-cn-surface hover:bg-cn-surface-muted text-cn-text"
              }`}
              aria-label="Copy direct post link"
              title="Copy Direct Link"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Link2 size={13} />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {/* Primary Action Button (if actionUrl exists) */}
            {post?.actionUrl && (
              <a
                href={post.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-btn transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>{post.actionLabel || "View Portal"}</span>
                <ExternalLink size={13} />
              </a>
            )}

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-cn-border">
                {onTogglePin && (
                  <button
                    type="button"
                    onClick={() => onTogglePin(post.id)}
                    className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                      post?.isPinned
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                        : "text-cn-text-muted hover:text-cn-text hover:bg-cn-surface"
                    }`}
                    title={post?.isPinned ? "Unpin Announcement" : "Pin Announcement"}
                  >
                    <Pin size={13} />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(post)}
                    className="px-2.5 py-1 rounded-full text-label text-cn-text hover:bg-cn-surface transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="px-2.5 py-1 rounded-full text-label text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ============================================================== */}
      {/* 4. FULLSCREEN LIGHTBOX MODAL                                   */}
      {/* ============================================================== */}
      {isLightboxOpen && hasMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Bar */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/60 backdrop-blur-sm z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-white/90 text-sm font-medium truncate max-w-[80vw]">
              <span className="truncate">{post?.title}</span>
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
                    alt={`${post?.title || "Full view"} - image ${idx + 1}`}
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

/**
 * Blueprint AnnouncementCard component adhering to CampusNode tokens (AGENTS.md)
 */
export function AnnouncementCard({
  office,
  date,
  pinned,
  category,
  title,
  summary,
  deadline,
  referenceCode,
  primaryActionLabel,
  primaryActionHref,
}) {
  return (
    <article className="rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card p-5 text-cn-text shadow-xs transition hover:border-brand-500/40">
      <div className="flex flex-wrap items-center justify-between gap-2 text-metadata">
        <div className="flex items-center gap-2 font-medium text-brand-600 dark:text-brand-400">
          <span>{office}</span>
          <span className="text-cn-text-muted">•</span>
          <span className="text-cn-text-muted">{date}</span>
          {pinned && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">
              Pinned
            </span>
          )}
        </div>
        <span className="rounded-full bg-brand-50 dark:bg-brand-950/60 px-3 py-0.5 text-label font-medium text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
          {category}
        </span>
      </div>

      <h3 className="mt-3 text-card-title text-cn-text">
        {title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-body text-cn-text-secondary leading-relaxed">
        {summary}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cn-border/80 pt-3 text-metadata">
        <div className="flex flex-wrap items-center gap-3 text-cn-text-secondary">
          {deadline && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Deadline: {deadline}
            </span>
          )}
          {referenceCode && <span className="font-mono text-cn-text-muted text-[11px]">Ref: {referenceCode}</span>}
        </div>

        {primaryActionHref && primaryActionLabel && (
          <a
            href={primaryActionHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-brand-600 px-4 py-1.5 text-btn text-white transition hover:bg-brand-700 active:scale-95 shadow-xs"
          >
            {primaryActionLabel}
          </a>
        )}
      </div>
    </article>
  );
}

export default UpdatePostCard;
