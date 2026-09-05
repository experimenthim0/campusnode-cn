import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop Component
 * 
 * Automatically resets scroll position on route changes:
 * 1. Resets window scroll to top (0, 0) for standard public pages.
 * 2. Resets inner scrollable <main> container for dashboard and admin layouts.
 * 3. Handles in-page hash links (e.g. #faq, #announcements) gracefully.
 * 4. Runs an immediate reset plus a microtask check to prevent async Suspense layout shift.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If navigating to a hash anchor, scroll to that specific element
    if (hash) {
      const targetId = hash.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    const resetScroll = () => {
      // 1. Standard window scroll for public routes
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      // 2. Inner scroll container for dashboard & admin routes
      const scrollableMain = document.querySelector("main.overflow-y-auto");
      if (scrollableMain) {
        scrollableMain.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant",
        });
      }
    };

    // Immediate scroll reset
    resetScroll();

    // Secondary reset via requestAnimationFrame to ensure layout shift / Suspense swap settles at top
    const rafId = requestAnimationFrame(() => {
      resetScroll();
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, search, hash]);

  return null;
}
