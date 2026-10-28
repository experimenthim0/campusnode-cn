/**
 * Adapts an extracted image RGB color [r, g, b] based on theme (light vs dark mode).
 * 
 * Problem solved:
 * In dark mode, if an extracted color is black/near-black, shadows, borders,
 * and ambient glows become invisible (rgba(0,0,0,...) has zero luminescence).
 * In light mode, if an extracted color is pure white, it washes out on white cards.
 * 
 * This helper ensures that:
 * - In dark mode: dark or monochromatic black colors are lifted to a glowing,
 *   luminous tone (like icy blue / cyan or brightened vibrant tone), while
 *   preserving hues and providing visible glow.
 * - In light mode: pure white / over-bright colors are gently toned down so they
 *   have contrast and border visibility.
 */
export const adaptExtractedColor = (rgb, isDark) => {
  if (!Array.isArray(rgb) || rgb.length < 3) {
    return isDark ? [96, 165, 250] : [0, 148, 255];
  }

  const [r, g, b] = rgb;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const isNearGrayscale = (max - min) < 28;

  if (isDark) {
    // If the color is nearly black or very dark grayscale (e.g., [0,0,0] or [15,15,15])
    if (luminance < 60 && isNearGrayscale) {
      // Return a sleek luminous icy-blue tone that pops beautifully against dark backgrounds
      return [120, 185, 255];
    }

    // If the color has a color hue but is too dark to glow in dark mode (e.g. dark navy, deep forest green)
    if (luminance < 90) {
      const boost = Math.min(3.2, 110 / Math.max(luminance, 1));
      return [
        Math.min(255, Math.max(0, Math.round(r * boost + 20))),
        Math.min(255, Math.max(0, Math.round(g * boost + 20))),
        Math.min(255, Math.max(0, Math.round(b * boost + 20))),
      ];
    }

    return [r, g, b];
  } else {
    // In light mode: if the color is pure white or over-exposed near-white, tone it down for contrast
    if (luminance > 225 && isNearGrayscale) {
      return [30, 41, 59]; // Slate 800 dark accent
    }

    if (luminance > 235) {
      const dim = 190 / luminance;
      return [
        Math.round(r * dim),
        Math.round(g * dim),
        Math.round(b * dim),
      ];
    }

    return [r, g, b];
  }
};

export default adaptExtractedColor;
