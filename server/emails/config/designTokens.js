/**
 * Centralized Design Tokens for CampusNode Transactional Emails.
 *
 * Adheres to the CampusNode visual identity (Blue #0078d4, Teal #00c977, Slate typography).
 * Ensures visual consistency across email clients (Gmail, Outlook, Apple Mail).
 */

export const colors = {
  // Brand & Accents
  primary: "#0078d4",
  primaryHover: "#0061ad",
  teal: "#00c977",
  tealHover: "#00a863",
  dark: "#0f172a",

  // Typography
  heading: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  subtle: "#94a3b8",
  link: "#0078d4",

  // Layout & Backgrounds
  bgApp: "#f8fafc",
  bgCard: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#edf2f7",
  divider: "#e2e8f0",

  // Callouts & Badges
  infoBg: "#eff8ff",
  infoBorder: "#b8e1ff",
  infoText: "#0061ad",

  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  warningText: "#b45309",

  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  dangerText: "#b91c1c",

  successBg: "#ecfff8",
  successBorder: "#a4ffe0",
  successText: "#009f61",

  // Dark Mode Overrides
  darkApp: "#0b1120",
  darkCard: "#111b2e",
  darkBorder: "#1e293b",
  darkHeading: "#f8fafc",
  darkBody: "#cbd5e1",
  darkMuted: "#94a3b8",
  darkAccent: "#38bdf8",
};

export const typography = {
  fontFamily: "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontMono: "'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, Monaco, monospace",

  sizes: {
    xs: "12px",
    sm: "13px",
    base: "15px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    xxl: "22px",
    otp: "32px",
  },

  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.6",
  },
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  base: "16px",
  lg: "20px",
  xl: "24px",
  xxl: "28px",
  xxxl: "32px",
  huge: "36px",
};

export const radii = {
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  xxl: "16px",
  full: "9999px",
};

export const shadows = {
  card: "0 4px 20px -2px rgba(0, 120, 212, 0.05)",
  buttonPrimary: "0 2px 8px rgba(0, 120, 212, 0.28)",
  buttonTeal: "0 2px 8px rgba(0, 201, 119, 0.28)",
  buttonDark: "0 2px 8px rgba(15, 23, 42, 0.25)",
  otp: "0 2px 6px rgba(0, 120, 212, 0.08)",
};

export const designTokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
};

export default designTokens;
