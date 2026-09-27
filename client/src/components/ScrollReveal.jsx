import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

/**
 * ScrollReveal - High-impact, responsive scroll animation wrapper
 * 
 * Automatically scales intensity for smaller devices (mobile/tablet)
 * so cards glide and pop into view with high visibility, smooth easing,
 * and zero layout shifts.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elements to animate
 * @param {"up" | "down" | "left" | "right" | "none"} props.direction - Direction of the slide (default: "up")
 * @param {number} props.delay - Animation delay in seconds (default: 0)
 * @param {number} props.duration - Animation duration in seconds (default: 0.5)
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.distance - Base translation distance in pixels (default: 36)
 * @param {boolean} props.scale - Whether to include depth scale pop (default: true)
 * @param {boolean} props.once - Whether to animate only once (default: true)
 * @param {string} props.margin - Viewport root margin (default: "0px 0px -50px 0px")
 * @param {number} props.amount - Viewport threshold ratio (default: 0.1)
 * @param {number} props.mobileDistance - Enhanced translation distance on smaller devices (default: 52)
 * @param {number} props.mobileScale - Initial scale on smaller devices (default: 0.88)
 * @param {number} props.desktopScale - Initial scale on desktop (default: 0.94)
 */
const ScrollReveal = ({ 
  children, 
  direction = "up", 
  delay = 0, 
  duration = 0.5, 
  className = "", 
  distance = 36,
  scale = true,
  once = true,
  margin = "0px 0px -50px 0px",
  amount = 0.1,
  mobileDistance = 52,
  mobileScale = 0.88,
  desktopScale = 0.94,
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else if (mq.addListener) {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, []);

  // Intensity tuned specifically for smaller devices where subtle moves are easily missed:
  // On mobile: stronger translation (>= 50px), punchier scale pop (0.88 -> 1.0),
  // and trigger threshold well inside the visible screen (not hidden behind bottom chrome / thumb).
  const effectiveDistance = isMobile 
    ? Math.max(distance * 1.6, mobileDistance) 
    : Math.max(distance, 32);

  const effectiveScale = scale 
    ? (isMobile ? mobileScale : desktopScale) 
    : 1;

  const effectiveDuration = isMobile ? 0.55 : duration;
  const effectiveMargin = isMobile ? "0px 0px -65px 0px" : margin;
  const effectiveAmount = isMobile ? 0.12 : amount;

  const variants = {
    hidden: {
      opacity: 0,
      scale: effectiveScale,
      y: direction === "up" ? effectiveDistance : direction === "down" ? -effectiveDistance : 0,
      x: direction === "left" ? effectiveDistance : direction === "right" ? -effectiveDistance : 0,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        duration: effectiveDuration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom snappy-yet-silky cubic-bezier
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: effectiveMargin, amount: effectiveAmount }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
