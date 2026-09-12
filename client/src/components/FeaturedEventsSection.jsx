import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import api from "../services/api";
import Section from "./layout/Section";
import FeaturedEventCard from "./FeaturedEventCard";
import ScrollReveal from "./ScrollReveal";

const FeaturedEventsSection = ({ showViewAll = true, inline = false, className = "" }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const res = await api.get("/api/featured-events");
        if (isMounted) {
          setEvents(res.data?.events || []);
        }
      } catch (err) {
        console.error("Failed to load featured events:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  // Do not render section if loaded and no featured events exist
  if (!loading && events.length === 0) {
    return null;
  }

  const Content = (
    <>
      {/* Header: Section Title & View All */}
      <ScrollReveal direction="up">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <span>View all featured</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </ScrollReveal>

      {/* 3 Cards in One Row on Desktop, Horizontal Scroll on Mobile */}
      <ScrollReveal delay={0.15}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-52 p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-sm animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full mb-4" />
                  <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-2.5" />
                  <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
                <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex md:grid md:grid-cols-3 gap-5 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory p-1 pb-4 md:p-1.5 md:pb-2">
            {events.map((event) => (
              <div key={event.id} className="min-w-[290px] sm:min-w-[320px] md:min-w-0 flex-1 snap-start">
                <FeaturedEventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </ScrollReveal>
    </>
  );

  if (inline) {
    return <div className={`mb-10 sm:mb-12 ${className}`}>{Content}</div>;
  }

  return (
    <section className={`py-9 sm:py-11 lg:py-14 bg-gradient-to-b from-neutral-50/90 via-white to-neutral-50/60 dark:from-neutral-950/90 dark:via-neutral-900/30 dark:to-neutral-950/90 border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors duration-300 relative overflow-hidden ${className}`}>
      {/* Subtle ambient spotlight in section header area */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-36 bg-radial from-brand-500/8 via-amber-500/4 to-transparent blur-3xl pointer-events-none" />
      <Section>{Content}</Section>
    </section>
  );
};

export default FeaturedEventsSection;
