import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import api from "../services/api";
import Section from "./layout/Section";
import FeaturedEventCard from "./FeaturedEventCard";
import ScrollReveal from "./ScrollReveal";

const CACHE_KEY = "cn_featured_events_cache";

const getCachedFeaturedEvents = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [];
};

const FeaturedEventsSection = ({ showViewAll = true, inline = false, className = "" }) => {
  const [events, setEvents] = useState(getCachedFeaturedEvents);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const res = await api.get("/api/featured-events");
        const list = res.data?.events || [];
        if (isMounted) {
          setEvents(list);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Failed to load featured events in background:", err);
      }
    };

    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check in background silently — do not display any loading state on frontend.
  // If there are no featured events, render nothing.
  if (!events || events.length === 0) {
    return null;
  }

  const Content = (
    <>
      {/* Header: Section Title & View All */}
      <ScrollReveal direction="up" distance={20}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-black text-xs uppercase tracking-widest mb-1.5">
              <Sparkles size={13} className="text-brand-500" />
              <span>Handpicked Campus Highlights</span>
            </div>
            <h2 className="font-black text-2xl sm:text-3xl text-neutral-900 dark:text-white leading-tight tracking-wide">
              Featured Events
            </h2>
          </div>

          {showViewAll && (
            <Link
              to="/featured-events"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <span>View all featured</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </ScrollReveal>

      {/* 3 Cards in One Row on Desktop, Horizontal Scroll on Mobile with Scroll Animations */}
      <div
        className="flex md:grid md:grid-cols-3 gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-y no-scrollbar snap-x snap-mandatory px-1 pt-2 pb-5 md:p-1.5 md:pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", overflowY: "hidden" }}
      >
        {events.map((event, i) => (
          <ScrollReveal
            key={event.id}
            direction="none"
            delay={0.06 * (i % 3)}
            className="min-w-[290px] sm:min-w-[320px] md:min-w-0 flex-1 snap-start h-full"
          >
            <FeaturedEventCard event={event} />
          </ScrollReveal>
        ))}
      </div>
    </>
  );

  if (inline) {
    return <div className={`mb-10 sm:mb-12 ${className}`}>{Content}</div>;
  }

  return (
    <section className={`py-9 sm:py-11 lg:py-14 bg-gradient-to-b from-neutral-50/90 via-white to-neutral-50/60 dark:from-neutral-950/90 dark:via-neutral-900/30 dark:to-neutral-950/90 border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors duration-300 relative overflow-hidden ${className}`}>
      {/* Subtle ambient brand blue glow matching Hero and SectionGlow */}
      <div className="dark:hidden absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true">
        <div className="campus-glow-flow w-[700px] max-w-[90vw] h-[260px] rounded-full bg-[#C9EBFF] opacity-35 blur-[100px]" />
      </div>
      <div className="hidden dark:block absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true">
        <div className="campus-glow-flow w-[700px] max-w-[90vw] h-[260px] rounded-full bg-[#0094FF] opacity-[0.24] blur-[95px]" />
      </div>
      <Section className="relative z-10">{Content}</Section>
    </section>
  );
};

export default FeaturedEventsSection;
