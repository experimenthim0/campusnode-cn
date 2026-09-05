import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, ArrowLeft } from "lucide-react";
import api from "../services/api";
import Section from "../components/layout/Section";
import FeaturedEventCard from "../components/FeaturedEventCard";

const FeaturedEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Featured Events - CampusNode";
    const fetchAllFeatured = async () => {
      try {
        let res = await api.get("/api/featured-events/all");
        let list = res.data?.events || [];
        if (list.length === 0) {
          const fallback = await api.get("/api/featured-events?all=true");
          list = fallback.data?.events || [];
        }
        setEvents(list);
      } catch (err) {
        console.error("Failed to load from /api/featured-events/all, trying fallback:", err);
        try {
          const fallback = await api.get("/api/featured-events?all=true");
          setEvents(fallback.data?.events || []);
        } catch (fallbackErr) {
          console.error("Failed to load all featured events:", fallbackErr);
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAllFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-300 py-10 sm:py-14">
      <Section>
        {/* Back Link & Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/50 mb-3">
            <Sparkles size={12} className="text-brand-500" />
            <span>Campus Spotlight</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
            Featured Events
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-2 max-w-2xl">
            Discover highlighted campus events, flagship fests, guest lectures, and featured student community gatherings across NIT Jalandhar.
          </p>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-52 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
                  <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
                <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
              <Calendar size={22} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              No Featured Events Right Now
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 mb-6">
              Check back soon for newly featured activities or explore all upcoming events in the feed.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {events.map((event) => (
              <FeaturedEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default FeaturedEventsPage;
