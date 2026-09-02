import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getColorSync } from "colorthief";
import { useImageBlob } from "../hooks/useImageBlob";
import { useTheme } from "../context/ThemeContext";
import { markdownToHtml } from "../utils/htmlMarkdownConverter";
import "../components/WysiwygMarkdownEditor.css";
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
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const imgRef = useRef(null);
  const cardRef = useRef(null);

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
    const x = e.clientX - rect.left;  // cursor x relative to card
    const y = e.clientY - rect.top;   // cursor y relative to card
    const w = rect.width;
    const h = rect.height;

    // Distance from each edge
    const distLeft   = x;
    const distRight  = w - x;
    const distTop    = y;
    const distBottom = h - y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let origin;
    if (minDist === distLeft)        origin = "left center";
    else if (minDist === distRight)  origin = "right center";
    else if (minDist === distTop)    origin = "center top";
    else                             origin = "center bottom";

    setTransformOrigin(origin);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Construct premium card styles dynamically
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
      color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`,
      backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`,
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
    : "Not Assigned";

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative bg-white dark:bg-[#0d0d0d] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.02] flex flex-col h-full group shadow-sm hover:shadow-xl"
    >
      {/* Top right ambient color gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={glowOverlayStyle}
      />

      <div className="relative w-full h-28 sm:h-32 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800 overflow-hidden shrink-0">
        <img
          src={club.bannerImage || club.coverImage || "/mainbuilding.jpeg"}
          alt={`${club.clubName} Banner`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/collegeimg.jpeg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 pt-0 flex flex-col flex-grow relative z-10">

        {/* Upper section: Overlapping Logo & Title + Category in same row */}
        <div className="flex items-end gap-3.5 -mt-1 sm:-mt-9 mb-2 min-w-0">
          
          {/* Logo with border */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white dark:bg-[#0d0d0d] rounded-full flex items-center justify-center border-2 border-white dark:border-[#0d0d0d] shadow-md shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-300 ">
            <img
              ref={imgRef}
              src={displayUrl}
              alt={club.clubName}
              crossOrigin={isBlobLoaded && club.clubLogo ? "anonymous" : undefined}
              onLoad={handleImageLoad}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackLogo;
              }}
            />
          </div>

          {/* Name & Category in same row */}
          <div className="space-y-0.5 min-w-0 flex-1 pb-0.5">
             <h2 className="text-lg sm:text-xl font-bold tracking-wide text-neutral-900 dark:text-white leading-tight truncate" title={club.clubName}>
              {club.clubName}
            </h2>
            <span className="inline-flex px-2 py-0.5 text-[9px] font-bold tracking-widest bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full">
              {club.category || "Student Club"}
            </span>
           
          </div>
        </div>

        {/* Description */}
        <div
          className="campusnode-markdown-preview text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed [&_*]:!text-inherit [&_*]:!bg-transparent [&>p]:!mb-0 [&>p:last-child]:!mb-0 [&>h1]:!text-sm [&>h1]:!my-0 [&>h1]:!border-none [&>h1]:!pb-0 [&>h2]:!text-sm [&>h2]:!my-0 [&>h3]:!text-sm [&>h3]:!my-0 [&>ul]:!my-0 [&>ol]:!my-0 [&>blockquote]:!my-0 [&>blockquote]:!p-0 [&>blockquote]:!border-none [&_a]:text-orange-600 [&_a]:underline"
          dangerouslySetInnerHTML={{
            __html: markdownToHtml(
              club.description ||
                "The official student group dedicated to community, innovation, and campus spirit."
            ),
          }}
        />

        <div className="border-t border-neutral-200/75 dark:border-neutral-800/80 my-2" />

        <div className="space-y-1">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-0.5">
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
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-0.5">
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
        <div className="mt-auto pt-2 space-y-2">

          {/* Social connections row */}
          {club.socialLinks && club.socialLinks.length > 0 && (
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-1.5">
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-orange-600 transition-all duration-300"
                      title={link.platform}
                    >
                      {getIcon()}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-neutral-200/75 dark:border-neutral-800/80 pt-3.5">
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