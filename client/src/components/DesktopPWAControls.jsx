import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";

/**
 * DesktopPWAControls — Back and Reload buttons for standalone desktop PWA mode.
 *
 * Renders only when BOTH conditions are true:
 *   1. Running in standalone PWA mode (display-mode: standalone)
 *   2. Viewport is desktop-sized (≥768px, matching Tailwind's md breakpoint)
 *
 * Hidden in normal browser tabs and on mobile devices.
 */
const DesktopPWAControls = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isStandalone, setIsStandalone] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track in-app navigation depth to determine safe back navigation
  const navDepthRef = useRef(0);
  const prevPathnameRef = useRef(location.pathname);

  // Detect standalone PWA mode
  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    const updateStandalone = (e) => setIsStandalone(e.matches);

    // Check initial state (also handles navigator.standalone for iOS)
    setIsStandalone(
      standaloneQuery.matches || window.navigator.standalone === true
    );

    standaloneQuery.addEventListener("change", updateStandalone);
    return () => standaloneQuery.removeEventListener("change", updateStandalone);
  }, []);

  // Detect desktop viewport (≥768px — Tailwind md breakpoint)
  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    const updateDesktop = (e) => setIsDesktop(e.matches);

    setIsDesktop(desktopQuery.matches);

    desktopQuery.addEventListener("change", updateDesktop);
    return () => desktopQuery.removeEventListener("change", updateDesktop);
  }, []);

  // Track navigation depth — increment on route changes
  useEffect(() => {
    if (location.pathname !== prevPathnameRef.current) {
      navDepthRef.current += 1;
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Back: use React Router navigate(-1) if we have in-app history, else go to /
  const handleBack = useCallback(() => {
    if (navDepthRef.current > 0) {
      navigate(-1);
      navDepthRef.current = Math.max(0, navDepthRef.current - 1);
    } else {
      // No in-app history — navigate to home instead of leaving the app
      navigate("/");
    }
  }, [navigate]);

  // Reload: simple page reload, preserves all app data
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  // Only render in standalone desktop PWA mode
  if (!isStandalone || !isDesktop) return null;

  const btnClass =
    "p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/70 transition-all duration-200 cursor-pointer active:scale-90";

  return (
    <div className="flex items-center gap-0.5 mr-2">
      <button
        onClick={handleBack}
        className={btnClass}
        aria-label="Go back"
        title="Go back"
      >
        <ArrowLeft size={18} strokeWidth={2.2} />
      </button>
      <button
        onClick={handleReload}
        className={btnClass}
        aria-label="Reload page"
        title="Reload page"
      >
        <RotateCw size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default DesktopPWAControls;
