import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * CardCarousel Component
 * 
 * Automatically switches between a standard responsive grid (when cards fit in 1 row)
 * and a smooth, interactive Carousel with navigation arrows and dot indicators
 * (when cards exceed one row).
 * 
 * Props:
 * - children: Array of card elements
 * - threshold: Max cards for a single row before carousel is activated (default: 3)
 * - className: Container custom class
 * - cardClassName: Per-card wrapper class
 */
export default function CardCarousel({
  children,
  threshold = 3,
  className = "",
  cardClassName = "",
  showDots = true,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = React.Children.toArray(children).filter(Boolean);
  const totalItems = items.length;
  const isCarouselActive = totalItems > threshold;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);

    // Calculate approximate active page based on scroll position
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 340;
    const pageIndex = Math.round(scrollLeft / (cardWidth + 24));
    setActiveIndex(Math.max(0, Math.min(pageIndex, totalItems - 1)));
  }, [totalItems]);

  useEffect(() => {
    if (!isCarouselActive) return;

    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [isCarouselActive, updateScrollState]);

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 340;
    const gap = 24;
    // Scroll 1 card on mobile, 2 on tablet, 3 on desktop
    const cardsPerView = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
    const scrollDistance = (cardWidth + gap) * cardsPerView;

    el.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (idx) => {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 340;
    const gap = 24;
    el.scrollTo({
      left: idx * (cardWidth + gap),
      behavior: "smooth",
    });
  };

  // If 3 or fewer items, render clean static grid
  if (!isCarouselActive) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 ${className}`}>
        {items}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Top Action Controls: Quick Previous / Next Arrows */}
      <div className="flex items-center justify-end gap-2 mb-4 -mt-2">
        <button
          type="button"
          onClick={() => handleScroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleScroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Carousel Track with smooth snap */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar p-1 pb-4 pt-1 -mx-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((child, idx) => (
          <div
            key={idx}
            className={`w-[85vw] sm:w-[320px] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start transition-opacity duration-300 ${cardClassName}`}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Bottom Dot Indicators */}
      {showDots && totalItems > 3 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: Math.ceil(totalItems - 2) }).map((_, dotIdx) => {
            const isActive = activeIndex === dotIdx;
            return (
              <button
                key={dotIdx}
                type="button"
                onClick={() => scrollToIndex(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? "w-6 h-1.5 bg-neutral-900 dark:bg-white"
                    : "w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-500"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
