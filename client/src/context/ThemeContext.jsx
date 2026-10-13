import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // light | dark | system
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("theme") || "system";
  });

  // Track system dark preference as reactive state so OS changes trigger re-renders
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const isDark =
    theme === "dark" ||
    ((theme === "system" || !theme) && systemDark);

  const isTransitioningRef = useRef(false);

  // Apply theme whenever active theme changes via direct state updates
  useEffect(() => {
    const activeIsDark =
      theme === "dark" ||
      ((theme === "system" || !theme) && systemDark);

    if (typeof window !== "undefined" && typeof window.updateAppTheme === "function") {
      window.updateAppTheme(activeIsDark);
    }

    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme, systemDark]);

  // Listen for OS theme changes to automatically handle system preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemDark(e.matches);
      const savedTheme = localStorage.getItem("theme");
      if (!savedTheme || savedTheme === "system") {
        if (typeof window.updateAppTheme === "function") {
          window.updateAppTheme(e.matches);
        }
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /**
   * Helper to resolve coordinates from mouse, pointer, touch or keyboard event
   */
  const getCoordinates = (event) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event) {
      if (
        typeof event.clientX === "number" &&
        typeof event.clientY === "number" &&
        (event.clientX !== 0 || event.clientY !== 0)
      ) {
        x = event.clientX;
        y = event.clientY;
      } else if (
        event.currentTarget &&
        typeof event.currentTarget.getBoundingClientRect === "function"
      ) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (
        event.target &&
        typeof event.target.getBoundingClientRect === "function"
      ) {
        const rect = event.target.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    return {
      x: Number.isFinite(x) ? Math.round(x) : Math.round(window.innerWidth / 2),
      y: Number.isFinite(y) ? Math.round(y) : Math.round(window.innerHeight / 2),
    };
  };

  /**
   * Switch theme with circular reveal ripple (View Transitions API)
   * or graceful smooth CSS transition fallback.
   */
  const switchTheme = (nextThemeInput, event) => {
    const nextTheme =
      typeof nextThemeInput === "function"
        ? nextThemeInput(theme)
        : nextThemeInput;

    const nextIsDark =
      nextTheme === "dark" ||
      ((nextTheme === "system" || !nextTheme) &&
        (typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches));

    // If dark mode state does not change, just persist preference without visual ripple
    if (nextIsDark === isDark) {
      setThemeState(nextTheme);
      try {
        localStorage.setItem("theme", nextTheme);
      } catch (e) {}
      return;
    }

    const canUseViewTransition =
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Graceful fallback for browsers without View Transitions
    if (!canUseViewTransition) {
      document.documentElement.classList.add("dark-transition");
      if (typeof window.updateAppTheme === "function") {
        window.updateAppTheme(nextIsDark);
      }
      setThemeState(nextTheme);
      try {
        localStorage.setItem("theme", nextTheme);
      } catch (e) {}
      setTimeout(() => {
        document.documentElement.classList.remove("dark-transition");
      }, 400);
      return;
    }

    // Guard against multiple concurrent clicks
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const { x, y } = getCoordinates(event);
    const endRadius = Math.ceil(
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )
    );

    // Set origin coordinates on root element before starting view transition
    // so CSS can immediately clip ::view-transition-new(root) to 0px at this origin
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.style.setProperty("--theme-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-radius", `${endRadius}px`);
    }

    try {
      const transition = document.startViewTransition(() => {
        if (typeof window.updateAppTheme === "function") {
          window.updateAppTheme(nextIsDark);
        }
        flushSync(() => {
          setThemeState(nextTheme);
        });
        try {
          localStorage.setItem("theme", nextTheme);
        } catch (e) {}
      });

      transition.ready
        .then(() => {
          const animation = document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 750,
              easing: "cubic-bezier(0.25, 1, 0.35, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
          animation.finished.finally(() => {
            isTransitioningRef.current = false;
          });
        })
        .catch(() => {
          isTransitioningRef.current = false;
        });


      transition.finished.finally(() => {
        isTransitioningRef.current = false;
      });
    } catch (err) {
      isTransitioningRef.current = false;
      if (typeof window.updateAppTheme === "function") {
        window.updateAppTheme(nextIsDark);
      }
      setThemeState(nextTheme);
      try {
        localStorage.setItem("theme", nextTheme);
      } catch (e) {}
    }
  };

  const toggleTheme = (event) => {
    const nextTheme = isDark ? "light" : "dark";
    switchTheme(nextTheme, event);
  };

  const setTheme = (nextTheme, event) => {
    switchTheme(nextTheme, event);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
