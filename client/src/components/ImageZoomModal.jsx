import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ImageZoomModal
 * A feature-rich, high-performance image viewer modal with:
 * - Zoom in / Zoom out / Reset Fit
 * - Mouse wheel zoom
 * - Mouse drag to pan when zoomed
 * - Touch pinch-to-zoom and pan for mobile
 * - Double click / Double tap to zoom
 * - Rotate 90°
 * - Download image
 * - Keyboard shortcuts (Esc, +, -, 0, r)
 * - Glassmorphism UI with smooth spring animations
 */
const ImageZoomModal = ({ isOpen, onClose, src, alt = 'Poster', title = '' }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef(null);
  const touchStartDistRef = useRef(null);
  const touchStartScaleRef = useRef(1);
  const lastTouchPosRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, src]);

  // Zoom Helpers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = (title || alt || 'event-poster').toLowerCase().replace(/[^a-z0-9]/g, '-') + '.jpg';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(src, '_blank');
    }
  }, [src, title, alt]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale + delta, 1), 4);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  // Mouse Drag to Pan
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double Click / Double Tap to toggle zoom
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Touch Handlers for Pinch Zoom & Pan
  const handleTouchStart = (e) => {
    const now = Date.now();
    if (e.touches.length === 1) {
      if (now - lastTapTimeRef.current < 300) {
        // Double tap detected
        handleDoubleClick(e);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (scale > 1) {
        setIsDragging(true);
        lastTouchPosRef.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        };
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging && scale > 1 && lastTouchPosRef.current) {
      setPosition({
        x: e.touches[0].clientX - lastTouchPosRef.current.x,
        y: e.touches[0].clientY - lastTouchPosRef.current.y
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(touchStartScaleRef.current * ratio, 1), 4);
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
    lastTouchPosRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl select-none"
        onClick={(e) => {
          if (e.target === containerRef.current && !isDragging) {
            onClose();
          }
        }}
      >
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-2.5 pointer-events-auto min-w-0 pr-4">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-white text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-md">
                {title || 'Event Poster'}
              </h3>
              <p className="text-neutral-400 text-[11px] font-medium hidden sm:block">
                Click & drag to pan • Scroll or pinch to zoom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto shrink-0">
            <button
              onClick={handleDownload}
              className="p-2 sm:px-3.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 hover:border-white/25 active:scale-95"
              title="Download image"
            >
              <i className="ri-download-2-line text-sm" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-red-500/80 hover:text-white text-neutral-300 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/10 active:scale-95"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>

        {/* Main Image Viewport Area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative w-full h-full flex items-center justify-center overflow-hidden p-4 sm:p-12 ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
              <i className="ri-loader-4-line animate-spin text-3xl text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Loading poster...
              </span>
            </div>
          )}

          <motion.img
            src={src}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            onDoubleClick={handleDoubleClick}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)',
            }}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-auto will-change-transform"
            draggable={false}
          />
        </div>

        {/* Bottom Floating Control Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-neutral-900/85 backdrop-blur-xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-white"
          >
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-neutral-200"
              title="Zoom out (-)"
            >
              <i className="ri-subtract-line text-base sm:text-lg" />
            </button>

            {/* Scale percentage indicator */}
            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer text-neutral-200"
              title="Click to reset (0)"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-neutral-200"
              title="Zoom in (+)"
            >
              <i className="ri-add-line text-base sm:text-lg" />
            </button>

            <div className="w-px h-5 bg-white/15 mx-1" />

            <button
              onClick={handleRotate}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all cursor-pointer text-neutral-200"
              title="Rotate 90° (R)"
            >
              <i className="ri-clockwise-line text-base sm:text-lg" />
            </button>

            {/* Reset / Fit to Screen Button */}
            <button
              onClick={handleResetZoom}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all cursor-pointer text-neutral-200"
              title="Fit to screen (0)"
            >
              <i className="ri-fullscreen-exit-line text-base sm:text-lg" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageZoomModal;
