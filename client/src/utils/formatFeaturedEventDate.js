/**
 * Formats event date and time for Featured Event cards.
 * Returns dynamically calculated weekday, date, time, and combined string.
 * Uses the application's Asia/Kolkata timezone convention.
 *
 * Example:
 * dateStr: "Sat, 5 Sep 2026"
 * timeStr: "8:00 PM"
 * combinedStr: "Sat, 5 Sep 2026 · 8:00 PM"
 */
export function formatFeaturedEventDateTime(startTime) {
  if (!startTime) return { dateStr: "", timeStr: "", combinedStr: "" };
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return { dateStr: "", timeStr: "", combinedStr: "" };

  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Kolkata" });
  const day = d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Asia/Kolkata" });
  const month = d.toLocaleDateString("en-GB", { month: "short", timeZone: "Asia/Kolkata" });
  const year = d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "Asia/Kolkata" });
  const dateStr = `${weekday}, ${day} ${month} ${year}`;

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const combinedStr = `${dateStr} · ${timeStr}`;
  return { dateStr, timeStr, combinedStr };
}
