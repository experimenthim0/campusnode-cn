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

  // Track system dark preference as reactive state so OS changes trigger re-renders
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const isDark =
    theme === "dark" ||
    ((theme === "system" || !theme) && systemDark);

  // Apply theme whenever active theme changes
  useEffect(() => {
    const activeIsDark =
      theme === "dark" ||
      ((theme === "system" || !theme) && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (typeof window.updateAppTheme === "function") {
      window.updateAppTheme(activeIsDark);
    }

    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);

  // Listen for OS theme changes to automatically handle system preference
  useEffect(() => {
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