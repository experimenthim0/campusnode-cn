import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getColorSync } from "colorthief";
import { useImageBlob } from "../hooks/useImageBlob";
import { useTheme } from "../context/ThemeContext";
import { ArrowRight } from "lucide-react";
import { InstagramIcon } from "@/components/ui/instagram";
import { LinkedinIcon } from "@/components/ui/linkedin";
import { TwitterIcon } from "@/components/ui/twitter";
import { GithubIcon } from "@/components/ui/github";
import { MessageCircleIcon } from "@/components/ui/message-circle";
import { EarthIcon } from "@/components/ui/earth";

const ClubCard = ({ club }) => {
  const { isDark } = useTheme();
  const [rgb, setRgb] = useState(null);
  const [isColorLoaded, setIsColorLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const imgRef = useRef(null);
  const cardRef = useRef(null);

  // Use fallback logo instantly, preload real clubLogo in background
  const fallbackLogo = isDark ? "/lightthemelogo2.png" : "/darkthemelogo.png";
  const [logoSrc, setLogoSrc] = useState(fallbackLogo);

  useEffect(() => {
    if (!club?.clubLogo) {
      setLogoSrc(fallbackLogo);
      return;
    }
    setLogoSrc(fallbackLogo);
    const img = new Image();
    img.src = club.clubLogo;
    img.onload = () => setLogoSrc(club.clubLogo);
    img.onerror = () => setLogoSrc(fallbackLogo);
  }, [club?.clubLogo, fallbackLogo]);

  const { displayUrl, isBlobLoaded } = useImageBlob(logoSrc);

  const handleImageLoad = () => {
    const imageEl = imgRef.current;
    if (!imageEl || !club.clubLogo) return;
    try {
      if (imageEl.complete && isBlobLoaded) {
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
      console.warn("Could not extract color from club logo:", error.message);
    }
  };

  useEffect(() => {
    setRgb(null);
    setIsColorLoaded(false);
  }, [club.clubLogo]);

  useEffect(() => {
    const imageEl = imgRef.current;
    if (imageEl && imageEl.complete && isBlobLoaded) {
      handleImageLoad();
    }
  }, [displayUrl, isBlobLoaded]);

  // Determine transform-origin based on which edge the cursor entered from
  const handleMouseEnter = useCallback((e) => {
    const card = cardRef.current;
    if (!card) {
      setIsHovered(true);
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const distLeft = x;
    const distRight = w - x;
    const distTop = y;
    const distBottom = h - y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let origin;
    if (minDist === distLeft) origin = "left center";
    else if (minDist === distRight) origin = "right center";
    else if (minDist === distTop) origin = "center top";
    else origin = "center bottom";

    setTransformOrigin(origin);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Construct card styles dynamically
  const cardStyle = (isHovered && rgb)
    ? {
      borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35)`,
      boxShadow: `0 20px 40px -15px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15), 0 0 20px 2px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`,
      transformOrigin,
    }
    : {
      transformOrigin,
    };

  const glowOverlayStyle = (isHovered && rgb)
    ? {
      background: `radial-gradient(circle at top right, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.09) 0%, transparent 60%)`,
    }
    : {};

  const buttonStyle = (isHovered && rgb)
    ? {
      borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`,
    }
    : {};

  // Formatted coordinators
  const facultyName = club.facultyCoordinators && club.facultyCoordinators.length > 0
    ? club.facultyCoordinators.map((f) => (typeof f === "object" ? f.name : f)).join(", ")
    : club.facultyName || "Not Assigned";

  const studentName = club.studentHeads && club.studentHeads.length > 0
    ? club.studentHeads.join(", ")
    : club.studentCoordinators && club.studentCoordinators.length > 0
      ? club.studentCoordinators.join(", ")
      : club.studentLead || "Not Assigned";

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative  border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full group"
    >
      {/* Ambient color gradient overlay on hover */}
      {/* <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={glowOverlayStyle}
      /> */}

      {/* Campus Building Header Banner with Progressive Depth Shading */}
      <div className="relative w-full h-32 sm:h-36 overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
        <img
          src={club.bannerImage || club.coverImage || "/itbuilding.jpeg"}
          alt={`${club.clubName} Banner`}
          className="w-full h-full object-cover transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/itbuilding.jpeg";
          }}
        />

        {/* Subtle top vignette for banner depth */}
        {/* <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" /> */}

        {/* Ambient brand color tint from extracted logo color on hover */}
        {/* {rgb && (
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none transition-opacity duration-500 opacity-25 group-hover:opacity-50"
            style={{
              background: `linear-gradient(to top, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35) 0%, transparent 100%)`,
            }}
          />
        )} */}

        {/* Multi-layered progressive fade matching card surface (eliminates hard edge) */}
        <div className="absolute inset-x-0 bottom-0 h-20 sm:h-16 bg-gradient-to-t from-white/95 via-white/65 via-35% to-transparent dark:from-[#121316]/95 dark:via-[#121316]/65 dark:via-35% dark:to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-[#121316] to-transparent pointer-events-none" />
      </div>

      {/* Floating Circular Club Logo */}
      <div className="-mt-8 sm:-mt-9 flex justify-center relative z-10">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-neutral-900 border-1 border-neutral-700/80 shadow-lg flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-transform duration-300">
          <img
            ref={imgRef}
            src={displayUrl}
            alt={club.clubName}
            crossOrigin={isBlobLoaded && club.clubLogo ? "anonymous" : undefined}
            onLoad={handleImageLoad}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackLogo;
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 pt-1 flex flex-col flex-grow relative z-10">
        {/* Club Name */}
        <h3
          className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white text-center leading-snug mb-1.5 line-clamp-1 group-hover:text-cn-blue-600 dark:group-hover:text-cn-blue-400 transition-colors"
          title={club.clubName}
        >
          {club.clubName}
        </h3>

        {/* Category Pill Badge */}
        {/* <div className="flex justify-center mb-4">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            {club.category ? `${club.category.charAt(0).toUpperCase() + club.category.slice(1)} Club` : "Student Club"}
          </span>
        </div> */}

        {/* Faculty Lead & Student Head (Left-aligned text block matching design) */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-3.5 pb-2 text-left space-y-1 flex flex-row justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              FACULTY LEAD
            </span>
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate" title={facultyName}>
              {facultyName}
            </p>
          </div>

          {studentName && studentName !== "Not Assigned" && (
            <div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
                STUDENT LEAD
              </span>

              <p className="text-sm font-bold text-neutral-900 dark:text-white truncate" title={studentName}>
                {studentName}
              </p>
            </div>
          )}
        </div>

        {/* Social connections & View Page Button at bottom */}
        <div className="mt-auto pt-3">
          {/* Social connections row above View Page button */}
          {club.socialLinks && club.socialLinks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3 min-h-[32px]">
              {club.socialLinks.map((link, i) => {
                const platform = link.platform?.toLowerCase() || "website";
                const iconProps = { className: "w-5 h-5" };

                const getIcon = () => {
                  if (platform.includes("instagram")) return <InstagramIcon {...iconProps} size={18} />;
                  if (platform.includes("linkedin")) return <LinkedinIcon {...iconProps} size={18} />;
                  if (platform.includes("twitter") || platform.includes("x")) return <TwitterIcon {...iconProps} size={18} />;
                  if (platform.includes("github")) return <GithubIcon {...iconProps} size={18} />;
                  if (platform.includes("whatsapp")) return <MessageCircleIcon {...iconProps} size={18} />;
                  if (platform.includes("website")) return <EarthIcon {...iconProps} size={18} />;
                  return <i className="ri-links-line text-xs" />;
                };

                return (
                  <a
                    key={link._id || i}
                    href={platform === "whatsapp" ? `https://wa.me/${link.url.replace(/\s+/g, "")}` : link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white  hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200"
                    title={link.platform}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getIcon()}
                  </a>
                );
              })}
            </div>
          )}

          {/* View Page Button */}
          <Link
            to={`/club/${club.slug || club._id || club.id}`}
            style={buttonStyle}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 text-neutral-900 dark:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group/btn cursor-pointer shadow-xs hover:shadow-md"
          >
            <span>View Page</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClubCard;