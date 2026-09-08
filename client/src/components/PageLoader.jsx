import React, { useEffect, useState } from 'react';
import ShimmerText from './ShimmerText';

/**
 * PageLoader — Modern AI-style shimmering text loader for CampusNode.
 * 
 * Props:
 *  - visible (boolean): Controls whether the loader is visible (defaults to true)
 *  - absolute (boolean): Uses absolute positioning instead of fixed (defaults to false)
 *  - text (string): Custom shimmer text (defaults to "Loading...")
 *  - showBrand (boolean): Whether to show the CampusNode brand header (defaults to true)
 */
export default function PageLoader({
  visible = true,
  absolute = false,
  text = 'Loading...',
  showBrand = true,
}) {
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  // Handle visibility transitions
  useEffect(() => {
    if (!visible) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setHidden(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setHidden(false);
      setFadeOut(false);
    }
  }, [visible]);

  // Sync with dark/light theme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <div
      id="page-loader-overlay"
      role="status"
      aria-label={typeof text === 'string' ? text : 'Loading'}
      style={{
        position: absolute ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: absolute ? 40 : 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cn-bg)',
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Subtle modern ambient background glow */}
      <div
        style={{
          position: 'absolute',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--cn-brand-soft) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main loader presentation */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 select-none">
        {showBrand && (
          <div
            className="mb-4 text-2xl sm:text-3xl font-medium tracking-wider"
            style={{
              fontFamily: "'logofont', serif",
              color: 'var(--cn-text)',
            }}
          >
            CampusNode
          </div>
        )}

        {/* AI Shimmering Text Loader */}
        <ShimmerText
          text={text}
          className="text-base sm:text-lg font-medium tracking-wider"
        />
      </div>
    </div>
  );
}
