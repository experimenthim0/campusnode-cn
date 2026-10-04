import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

export const HERO_BG_IMAGES = [
  { src: '/bg_images/mainbuilding.jpeg', title: 'Main Administrative Building' },
  { src: '/bg_images/top_view.webp', title: 'Campus Aerial View' },
  { src: '/bg_images/SAC.webp', title: 'Student Activity Centre (SAC)' },
  { src: '/bg_images/it_building.webp', title: 'Department of IT & Computer Science' },
  { src: '/bg_images/lib_alt.webp', title: 'Central Library & Lecture Theatres' },
  { src: '/bg_images/csh_sac.webp', title: 'Central Seminar Hall & SAC' },
  { src: '/bg_images/ALt.webp', title: 'Academic Lecture Theatres' },
  { src: '/bg_images/hostels.webp', title: 'Student Hostels' },
  { src: '/bg_images/itbuilding.jpeg', title: 'IT Complex' },
  { src: '/bg_images/hostels-day.jpeg', title: 'Campus Residences' },
];

/**
 * HeroBackground - Dynamic cross-fading campus background slideshow with
 * vibrant, clearly visible imagery and balanced contrast scrims for 100% text legibility.
 */
const HeroBackground = ({ glowTop = 'top-[80px]', showLocationTag = true, className = '' }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Preload all background images on mount so transitions are instant
  useEffect(() => {
    HERO_BG_IMAGES.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });
  }, []);

  // Automatic smooth transition between all campus images every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % HERO_BG_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`absolute inset-0 z-0 h-full w-full overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* ── Base canvas background ──────────────────────────────────── */}
      <div className="absolute inset-0 bg-neutral-100 dark:bg-slate-950" />

      {/* ── Campus Images with Silky Crossfade & Micro-Zoom ───────── */}
      {HERO_BG_IMAGES.map((item, idx) => {
        const isActive = idx === currentIdx;
        return (
          <div
            key={item.src}
            className={`absolute inset-0 z-1 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={item.src}
              alt=""
              className={`w-full h-full object-cover object-center transition-transform duration-[7000ms] ease-out contrast-[0.90] brightness-[1.03] dark:contrast-100 dark:brightness-100 ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
            />
          </div>
        );
      })}

      {/* ── LIGHT MODE OVERLAY: Softer, reduced-contrast scrim for gentle harmony ── */}
      {/* ── LIGHT MODE OVERLAY: Preserve campus imagery while keeping text readable ── */}
<div
  className="dark:hidden absolute inset-0 z-2 pointer-events-none"
  style={{
    background:
      'linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.22) 70%, rgba(255,255,255,0.72) 100%)',
  }}
/>

<div
  className={`dark:hidden absolute left-1/2 ${glowTop} -translate-x-1/2 pointer-events-none z-2`}
>
  <div className="campus-glow-flow h-[500px] w-[900px] max-w-[90vw] rounded-full bg-[#C9EBFF] opacity-20 blur-[50px]" />
</div>

      {/* ── DARK MODE OVERLAY: Rich cinema scrim keeping photo vibrant while white text pops ── */}
      <div
        className="hidden dark:block absolute inset-0 z-2 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(2, 6, 23, 0.65) 0%, rgba(2, 6, 23, 0.35) 35%, rgba(2, 6, 23, 0.70) 80%, rgba(2, 6, 23, 0.98) 100%)',
        }}
      />
      <div className={`hidden dark:block absolute left-1/2 ${glowTop} -translate-x-1/2 pointer-events-none z-2`}>
        <div className="campus-glow-flow h-[500px] w-[900px] max-w-[90vw] rounded-full bg-[#0094FF] opacity-[0.20] blur-[105px]" />
      </div>

      {/* ── Subtle Campus Spot Pill in Corner (informative & elegant) ── */}
      {showLocationTag && (
        <div className="absolute right-4 bottom-3.5 z-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide text-neutral-800 dark:text-neutral-200 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs pointer-events-none transition-all">
          <MapPin size={12} className="text-brand-500 shrink-0" />
          <span className="truncate max-w-[220px]">{HERO_BG_IMAGES[currentIdx]?.title || 'NIT Jalandhar Campus'}</span>
        </div>
      )}

      {/* ── Subtle Slide Dots Indicator ─────────────────────────────── */}
      <div className="absolute left-1/2 bottom-3.5 -translate-x-1/2 z-3 hidden md:flex items-center gap-1.5 pointer-events-auto">
        {HERO_BG_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIdx(i)}
            aria-label={`Show campus photo ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === currentIdx
                ? 'w-6 bg-brand-500 dark:bg-brand-400 shadow-xs'
                : 'w-2 bg-neutral-400/80 dark:bg-neutral-600/80 hover:bg-neutral-600 dark:hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBackground;
