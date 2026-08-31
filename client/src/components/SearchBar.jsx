import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicJson } from "../lib/publicDataCache";


// Static pages that are always searchable
const STATIC_PAGES = [
  { title: "Home", path: "/", type: "page", icon: "ri-home-4-line" },
  { title: "Clubs", path: "/clubs", type: "page", icon: "ri-team-line" },
  { title: "Events", path: "/events", type: "page", icon: "ri-calendar-event-line" },
  { title: "Team", path: "/team", type: "page", icon: "ri-group-line" },
  { title: "Contribute", path: "/contribute", type: "page", icon: "ri-heart-line" },
  { title: "About & Features", path: "/about-features", type: "page", icon: "ri-information-line" },
  { title: "FAQ", path: "/faq", type: "page", icon: "ri-question-line" },
  { title: "Event Guide", path: "/event-guide", type: "page", icon: "ri-book-open-line" },
  { title: "Privacy Policy", path: "/privacy", type: "page", icon: "ri-shield-line" },
  { title: "Terms & Conditions", path: "/terms", type: "page", icon: "ri-file-list-line" },
  { title: "Payment Policy", path: "/payment-policy", type: "page", icon: "ri-money-dollar-circle-line" },
  { title: "Data Privacy", path: "/data-privacy", type: "page", icon: "ri-lock-line" },
  { title: "Login", path: "/login", type: "page", icon: "ri-login-box-line" },
  { title: "Register", path: "/register/student", type: "page", icon: "ri-user-add-line" },
  { title: "Profile", path: "/profile", type: "page", icon: "ri-user-line" },
  { title: "My Events", path: "/my-events", type: "page", icon: "ri-calendar-check-line" },
  { title: "Notifications", path: "/notifications", type: "page", icon: "ri-notification-3-line" },
];

const SearchBar = ({ isOpen, onClose, isMobile = false }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && !hasFetched) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [clubsData, eventsData] = await Promise.all([
            getPublicJson('/api/clubs'),
            getPublicJson('/api/events'),
          ]);
          setClubs(clubsData || []);
          setEvents(eventsData || []);
          setHasFetched(true);
        } catch (err) {
          console.error("Search data fetch error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, hasFetched]);

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Filter results based on query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const matched = [];

    clubs.forEach((club) => {
      if (
        club.clubName?.toLowerCase().includes(q) ||
        club.category?.toLowerCase().includes(q) ||
        club.description?.toLowerCase().includes(q)
      ) {
        matched.push({
          title: club.clubName,
          subtitle: club.category || "Club",
          path: `/club/${club.slug || club._id}`,
          type: "club",
          icon: "ri-team-line",
          logo: club.clubLogo,
        });
      }
    });

    events.forEach((event) => {
      if (
        event.title?.toLowerCase().includes(q) ||
        event.venue?.toLowerCase().includes(q) ||
        event.club?.clubName?.toLowerCase().includes(q)
      ) {
        matched.push({
          title: event.title,
          subtitle: event.club?.clubName || "Event",
          path: `/event/${event.slug || event._id}`,
          type: "event",
          icon: "ri-calendar-event-line",
          image: event.imageUrl,
        });
      }
    });

    STATIC_PAGES.forEach((page) => {
      if (page.title.toLowerCase().includes(q)) {
        matched.push({
          title: page.title,
          subtitle: "Page",
          path: page.path,
          type: "page",
          icon: page.icon,
        });
      }
    });

    // Special case: Developer search
    if (q.includes("nikhil") || q.includes("Nikhil") || q.includes("nik") || q.includes("Nik") || q.includes("yadav") || q.includes("Yadav") || q.includes("n")) {
      matched.push({
        title: "Nikhil Yadav",
        subtitle: "Lead Developer of CampusNode",
        path: "/team",
        type: "developer",
        icon: "ri-code-s-slash-line",
      });
    }

    setResults(matched.slice(0, 8));
  }, [query, clubs, events]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && results.length > 0) {
      navigate(results[0].path);
      onClose();
    }
  };

  const handleResultClick = () => {
    onClose();
  };

  const typeLabel = (type) => {
    switch (type) {
      case "club": return "Club";
      case "event": return "Event";
      case "page": return "Page";
      case "developer": return "Dev";
      default: return "";
    }
  };

  const typeBadgeColor = (type) => {
    switch (type) {
      case "club": return "bg-blue-50 text-blue-600 border-blue-200";
      case "event": return "bg-orange-50 text-orange-600 border-orange-200";
      case "page": return "bg-neutral-100 text-neutral-600 border-neutral-200";
      case "developer": return "bg-purple-50 text-purple-600 border-purple-200";
      default: return "";
    }
  };

  const renderResults = () => {
    if (!isOpen || !query.trim()) return null;
    return (
      <div ref={resultsRef} className="search-results">
        {loading ? (
          <div className="search-loading">
            <div className="search-loading-spinner" />
            <span>Searching...</span>
          </div>
        ) : results.length > 0 ? (
          <div key={query} className="contents">
            <div className="search-results-header">
              <span>{results.length} result{results.length !== 1 ? "s" : ""} found</span>
            </div>
            {results.map((result, idx) => (
              <Link
                key={`${result.type}-${idx}`}
                to={result.path}
                onClick={handleResultClick}
                className="search-result-item"
              >
                <div className="search-result-icon-wrapper">
                  {result.logo ? (
                    <img src={result.logo} alt="" className="search-result-logo" />
                  ) : result.image ? (
                    <img src={result.image} alt="" className="search-result-logo" />
                  ) : (
                    <i className={`${result.icon} search-result-icon`} />
                  )}
                </div>
                <div className="search-result-content">
                  <span className="search-result-title">{result.title}</span>
                  <span className="search-result-subtitle">{result.subtitle}</span>
                </div>
                <span className={`search-result-badge ${typeBadgeColor(result.type)}`}>
                  {typeLabel(result.type)}
                </span>
                <i className="ri-arrow-right-up-line search-result-arrow" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="search-no-results">
            <i className="ri-search-line search-no-results-icon" />
            <p className="search-no-results-text">No results for "{query}"</p>
            <p className="search-no-results-hint">Try searching for a club name, event, or page</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`search-bar-wrapper ${
        isOpen ? "search-bar-open" : "search-bar-closed"
      }`}
    >
      <div className={`search-bar-container ${isOpen ? "search-bar-container-open" : ""}`}>
        <div className="search-input-wrapper">
          <i className="ri-search-line search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clubs, events, pages..."
            className="search-input"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="search-clear-btn"
              aria-label="Clear search"
            >
              <i className="ri-close-line" />
            </button>
          )}
          <button
            onClick={onClose}
            className="search-close-btn hidden sm:flex"
            aria-label="Close search"
          >
            <kbd className="search-kbd">ESC</kbd>
          </button>
          <button
            onClick={onClose}
            className="search-close-btn sm:hidden flex p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label="Close search"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {renderResults()}
      </div>
    </div>
  );
};

export default SearchBar;
