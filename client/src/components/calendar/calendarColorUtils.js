// Distinct color palettes for clubs and events across the calendar
export const CLUB_COLOR_PALETTES = [
  {
    key: "blue",
    name: "Blue",
    bg: "bg-blue-500/15 dark:bg-blue-500/25",
    border: "border-blue-300 dark:border-blue-700/60",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    badge: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800/60",
  },
  {
    key: "purple",
    name: "Purple",
    bg: "bg-purple-500/15 dark:bg-purple-500/25",
    border: "border-purple-300 dark:border-purple-700/60",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    badge: "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800/60",
  },
  {
    key: "emerald",
    name: "Emerald",
    bg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    border: "border-emerald-300 dark:border-emerald-700/60",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60",
  },
  {
    key: "amber",
    name: "Amber",
    bg: "bg-amber-500/15 dark:bg-amber-500/25",
    border: "border-amber-300 dark:border-amber-700/60",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800/60",
  },
  {
    key: "rose",
    name: "Rose",
    bg: "bg-rose-500/15 dark:bg-rose-500/25",
    border: "border-rose-300 dark:border-rose-700/60",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    badge: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800/60",
  },
  {
    key: "cyan",
    name: "Cyan",
    bg: "bg-cyan-500/15 dark:bg-cyan-500/25",
    border: "border-cyan-300 dark:border-cyan-700/60",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
    badge: "bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    pill: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60",
  },
  {
    key: "amber",
    name: "Amber",
    bg: "bg-amber-500/15 dark:bg-amber-500/25",
    border: "border-amber-300 dark:border-amber-700/60",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800/60",
  },
  {
    key: "indigo",
    name: "Indigo",
    bg: "bg-indigo-500/15 dark:bg-indigo-500/25",
    border: "border-indigo-300 dark:border-indigo-700/60",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800/60",
  },
  {
    key: "teal",
    name: "Teal",
    bg: "bg-teal-500/15 dark:bg-teal-500/25",
    border: "border-teal-300 dark:border-teal-700/60",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    badge: "bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    pill: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-800/60",
  },
  {
    key: "fuchsia",
    name: "Fuchsia",
    bg: "bg-fuchsia-500/15 dark:bg-fuchsia-500/25",
    border: "border-fuchsia-300 dark:border-fuchsia-700/60",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
    badge: "bg-fuchsia-100 dark:bg-fuchsia-950/70 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
    pill: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-300 dark:border-fuchsia-800/60",
  },
];

/**
 * Deterministically get a distinct color palette based on club ID or event key
 */
export const getClubColorPalette = (clubKey, fallbackIndex = 0) => {
  if (!clubKey) {
    return CLUB_COLOR_PALETTES[fallbackIndex % CLUB_COLOR_PALETTES.length];
  }
  const str = String(clubKey);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CLUB_COLOR_PALETTES.length;
  return CLUB_COLOR_PALETTES[index];
};

/**
 * Get color palette for an event. Prioritizes club identifier so all events
 * belonging to the same club share the same distinct color palette.
 */
export const getEventColorPalette = (event, fallbackIndex = 0) => {
  if (!event) {
    return CLUB_COLOR_PALETTES[fallbackIndex % CLUB_COLOR_PALETTES.length];
  }

  const clubId =
    event.clubId ||
    event.club?._id ||
    event.club?.id ||
    event.organizers?.[0]?.clubId ||
    event.organizers?.[0]?.club?._id ||
    event.club?.clubName ||
    event.category ||
    event.id ||
    event._id;

  return getClubColorPalette(clubId, fallbackIndex);
};
