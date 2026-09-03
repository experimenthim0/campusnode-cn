import React, { createContext, useContext, useState, useEffect } from "react";

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

  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark =
    theme === "dark" ||
    (theme === "system" && getSystemTheme());

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);

    // Dynamically update theme-color meta tags for PWA top bar / Android status bar
    const targetColor = isDark ? "#0a0a0a" : "#ffffff";
    const metas = document.querySelectorAll("meta[name='theme-color']");
    if (metas.length > 0) {
      metas.forEach((meta) => meta.setAttribute("content", targetColor));
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = targetColor;
      document.head.appendChild(meta);
    }

    const faviconSrc = isDark
      ? "/darkthemelogo.png"
      : "/lightthemelogo2.png";

    if (window.setRoundedFavicon) {
      window.setRoundedFavicon(faviconSrc);
    } else {
      const favicon = document.getElementById("dynamic-favicon");
      if (favicon) favicon.href = faviconSrc;
    }
  }, [theme, isDark]);

  // Update automatically when OS theme changes
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = () => {
      if (theme === "system") {
        setTheme("system");
      }
    };

    media.addEventListener("change", handler);

    return () => media.removeEventListener("change", handler);
  }, [theme]);

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