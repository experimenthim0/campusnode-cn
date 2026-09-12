import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "system";
  });

  // Track system dark preference as reactive state so OS changes trigger re-renders
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const isDark =
    theme === "dark" ||
    ((theme === "system" || !theme) && systemDark);

  // Apply all theme side-effects whenever isDark changes
  const applyTheme = useCallback((dark) => {
    const root = document.documentElement;

    // Tailwind dark class
    root.classList.toggle("dark", dark);

    // CSS color-scheme — controls native UI chrome (scrollbars, form controls, PWA status bar)
    root.style.colorScheme = dark ? "dark" : "light";

    // Single runtime-controlled theme-color meta tag
    const metaThemeColor = document.getElementById("theme-color-meta");
    if (metaThemeColor) {
      const computedColor = getComputedStyle(root).getPropertyValue(dark ? "--cn-bg" : "--cn-surface").trim() || (dark ? "#0a0a0a" : "#ffffff");
      metaThemeColor.setAttribute("content", computedColor);
    }

    // Dynamic favicon
    const faviconSrc = dark ? "/darkthemelogo.png" : "/lightthemelogo2.png";
    if (window.setRoundedFavicon) {
      window.setRoundedFavicon(faviconSrc);
    } else {
      const favicon = document.getElementById("dynamic-favicon");
      if (favicon) favicon.href = faviconSrc;
    }
  }, []);

  // Apply theme whenever isDark or theme changes
  useEffect(() => {
    applyTheme(isDark);
    localStorage.setItem("theme", theme);
  }, [theme, isDark, applyTheme]);

  // Listen for OS theme changes — update systemDark state so isDark recomputes
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e) => {
      setSystemDark(e.matches);
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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