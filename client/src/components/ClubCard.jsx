import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { getColorSync } from "colorthief";
import { useImageBlob } from "../hooks/useImageBlob";
import { useTheme } from "../context/ThemeContext";
import { ArrowUpRightIcon } from "@/components/ui/arrow-up-right";
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
  const imgRef = useRef(null);

  // Use fallback logo instantly, preload real clubLogo in background
  const fallbackLogo = isDark ? "/darkthemelogo.png" : "/lightthemelogo.png";
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
    if (!imageEl || !club.clubLogo) return; // Only extract color from actual club logos
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

  // Construct premium card styles dynamically
  const cardStyle = (isHovered && rgb)
    ? {
      borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35)`,
      boxShadow: `0 20px 40px -15px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15), 0 0 20px 2px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`,
    }
    : {};

  // Interactive dynamic styles for buttons/badges on hover
  const glowOverlayStyle = (isHovered && rgb)
    ? {
      background: `radial-gradient(circle at top right, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.09) 0%, transparent 60%)`,
    }
    : {};

  const buttonStyle = (isHovered && rgb)
    ? {
      color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`,
      backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`,
    }
    : {};

  // Formatted coordinators
  const facultyName = club.facultyCoordinators && club.facultyCoordinators.length > 0
    ? club.facultyCoordinators.map((f) => (typeof f === "object" ? f.name : f)).join(", ")
    : club.facultyName || "Not Assigned";

  const studentName = club.studentCoordinators && club.studentCoordinators.length > 0
    ? club.studentCoordinators.join(", ")
    : "Not Assigned";

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white dark:bg-[#0d0d0d] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1.5 flex flex-col h-full group shadow-sm hover:shadow-xl"
    >
      {/* Top right ambient color gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={glowOverlayStyle}
      />

      {/* Main Content Area */}
      <div className="p-6 flex flex-col flex-grow relative z-10">

        {/* Upper section: Logo, Title, Category */}
        <div className="flex items-start gap-4">
          {/* Logo container: custom shadow and smooth borders */}
          <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-300">
            <img
              ref={imgRef}
              src={displayUrl}
              alt={club.clubName}
              crossOrigin={isBlobLoaded && club.clubLogo ? "anonymous" : undefined}
              onLoad={handleImageLoad}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackLogo;
              }}
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded">
              {club.category || "Student Club"}
            </span>
            <h2 className="text-xl font-bold tracking-wide text-neutral-900 dark:text-white leading-tight break-words">
              {club.clubName}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-4 leading-relaxed">
          {(club.description ? club.description.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim() : "") ||
            "The official student group dedicated to community, innovation, and campus spirit."}
        </p>

        {/* Dynamic divider line */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/80 my-5" />

        {/* Mid section: Stacking Coordinator Details in Separate Rows */}
        <div className="space-y-3.5">
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-0.5">
              Faculty Lead
            </span>
            <p
              className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate"
              title={facultyName}
            >
              {facultyName}
            </p>
          </div>

          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-0.5">
              Student Lead
            </span>
            <p
              className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate"
              title={studentName}
            >
              {studentName}
            </p>
          </div>
        </div>

        {/* Push socials & footer to bottom */}
        <div className="mt-auto pt-6 space-y-4">

          {/* Social connections row */}
          {club.socialLinks && club.socialLinks.length > 0 && (
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-2">
                Connect
              </span>
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {club.socialLinks.map((link, i) => {
                  const platform = link.platform?.toLowerCase() || "website";
                  const iconProps = { className: "w-6 h-6" };

                  const getIcon = () => {
                    if (platform.includes("instagram")) return <InstagramIcon {...iconProps} size={28} />;
                    if (platform.includes("linkedin")) return <LinkedinIcon {...iconProps} size={28} />;
                    if (platform.includes("twitter") || platform.includes("x")) return <TwitterIcon {...iconProps} size={28} />;
                    if (platform.includes("github")) return <GithubIcon {...iconProps} size={28} />;
                    if (platform.includes("whatsapp")) return <MessageCircleIcon {...iconProps} size={28} />;
                    if (platform.includes("website")) return <EarthIcon {...iconProps} size={28} />;
                    return <i className="ri-links-line text-sm" />;
                  };

                  return (
                    <a
                      key={link._id || i}
                      href={platform === "whatsapp" ? `https://wa.me/${link.url.replace(/\s+/g, "")}` : link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg  flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-all duration-300"
                      title={link.platform}
                    >
                      {getIcon()}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action button row */}
          <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
            <Link
              to={`/club/${club.slug || club._id}`}
              style={buttonStyle}
              className="flex items-center justify-center gap-1 w-full py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[11px] font-bold tracking-wider text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 shadow-xs"
            >
              <ArrowUpRightIcon size={16}>
                View Page
              </ArrowUpRightIcon>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ClubCard;
