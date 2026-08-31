import React, { useState, useRef, useEffect } from 'react';
import { getColorSync } from 'colorthief';
import { useImageBlob } from '../hooks/useImageBlob';

/**
 * Reusable Card component that dynamically extracts the dominant color 
 * from its source image and applies a premium, soft background tint 
 * and a vibrant shadow glow.
 *
 * @param {Object} props
 * @param {string} props.imageSrc - URL of the image
 * @param {string} props.title - Title of the card
 * @param {string} props.description - Short description text
 * @param {string} [props.className] - Optional custom CSS classes
 */
export const ColorExtractorCard = ({
  imageSrc,
  title,
  description,
  className = '',
}) => {
  const { displayUrl, isBlobLoaded } = useImageBlob(imageSrc);

  // Store rgb array [r, g, b] or null if not yet loaded
  const [rgb, setRgb] = useState(null);
  const [isColorLoaded, setIsColorLoaded] = useState(false);
  const imgRef = useRef(null);

  const handleImageLoad = () => {
    const imageEl = imgRef.current;
    if (!imageEl) return;

    try {
      // Ensure image is fully loaded and decode is complete
      if (imageEl.complete && isBlobLoaded) {
        // Use the synchronous getColorSync from ColorThief v3
        const color = getColorSync(imageEl);
        if (color) {
          const rgbArray = color.array();
          if (Array.isArray(rgbArray) && rgbArray.length === 3) {
            setRgb(rgbArray);
            setIsColorLoaded(true);
          }
        }
      }
    } catch (error) {
      console.warn(
        'Could not extract dominant color from image. Skipping extraction:',
        error.message
      );
      // Fallback: stay with default colors
    }
  };

  // Reset colors when image changes
  useEffect(() => {
    setRgb(null);
    setIsColorLoaded(false);
  }, [imageSrc]);

  // Safe fallback if image is already cached and loaded before component mount
  useEffect(() => {
    const imageEl = imgRef.current;
    if (imageEl && imageEl.complete && isBlobLoaded) {
      handleImageLoad();
    }
  }, [displayUrl, isBlobLoaded]);

  // Option A: Premium styling using dynamic CSS variables + Tailwind utility classes
  // We define dynamic values as CSS variables so we can transition them smoothly.
  const cssVariables = rgb
    ? {
        '--extracted-r': rgb[0],
        '--extracted-g': rgb[1],
        '--extracted-b': rgb[2],
        '--extracted-opacity-bg': 0.08,
        '--extracted-opacity-border': 0.18,
        '--extracted-opacity-shadow': 0.25,
      }
    : {
        '--extracted-r': 120,
        '--extracted-g': 120,
        '--extracted-b': 120,
        '--extracted-opacity-bg': 0.03,
        '--extracted-opacity-border': 0.08,
        '--extracted-opacity-shadow': 0.08,
      };

  // Option B: Premium styling using pure Inline Styles (in case Tailwind isn't desired for the dynamics)
  const inlineStyles = {
    ...cssVariables,
    backgroundColor: rgb
      ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08)`
      : 'rgba(255, 255, 255, 0.03)',
    borderColor: rgb
      ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.18)`
      : 'rgba(255, 255, 255, 0.08)',
    boxShadow: isColorLoaded && rgb
      ? `0 20px 40px -15px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`
      : '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div
      style={inlineStyles}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-500 ease-out hover:scale-[1.02] hover:-translate-y-1 flex flex-col w-full max-w-sm group ${className}`}
    >
      {/* Glow Effect Background Element (For extra depth/premium look) */}
      <div 
        style={{
          background: rgb ? `radial-gradient(circle, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1) 0%, transparent 70%)` : 'none'
        }}
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-100"
      />

      {/* Image container */}
      <div className="relative overflow-hidden aspect-[4/3] bg-neutral-900/40">
        <img
          ref={imgRef}
          src={displayUrl}
          alt={title}
          crossOrigin={isBlobLoaded ? "anonymous" : undefined}
          onLoad={handleImageLoad}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Soft gradient overlay on image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="p-6 flex flex-col flex-grow relative z-10">
        <h3 className="text-xl font-semibold text-white tracking-tight mb-2 group-hover:text-neutral-100 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-neutral-400 leading-relaxed font-normal flex-grow">
          {description}
        </p>
        
        {/* Decorative dynamic badge to show styling interaction */}
        {isColorLoaded && rgb && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
              Dominant Palette
            </span>
            <div className="flex gap-1.5">
              <span 
                style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
                className="w-3.5 h-3.5 rounded-full shadow-inner animate-pulse"
              />
              <span 
                style={{ backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)` }}
                className="w-3.5 h-3.5 rounded-full shadow-inner"
              />
              <span 
                style={{ backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)` }}
                className="w-3.5 h-3.5 rounded-full shadow-inner"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorExtractorCard;
