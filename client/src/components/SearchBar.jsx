import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicJson } from "../lib/publicDataCache";

const RECENT_SEARCHES_KEY = "campusnode_recent_searches";

// Comprehensive catalog of all public pages and guides on CampusNode
const PUBLIC_PAGES = [
  {
    title: "Home",
    path: "/",
    category: "General",
    description: "Main campus portal, live events feed, and top societies showcase",
    keywords: "home landing main feed nitj campus explore welcome",
    icon: "ri-home-4-line",
  },
  {
    title: "Events Feed",
    path: "/events",
    category: "Events",
    description: "Browse upcoming workshops, hackathons, cultural & sports fests",
    keywords: "events fests hackathons workshops competitions technical cultural sports schedule registrations",
    icon: "ri-calendar-event-line",
  },
  {
    title: "Clubs & Societies Directory",
    path: "/clubs",
    category: "Clubs",
    description: "Explore all student societies, technical chapters, and cultural teams",
    keywords: "clubs societies organizations chapters gdg robotics coding dramatics dance music teams",
    icon: "ri-team-line",
  },
  {
    title: "Event Calendar",
    path: "/event-calendar",
    category: "Events",
    description: "Full interactive venue schedule and campus date timeline",
    keywords: "calendar schedule dates timeline venue booking slots",
    icon: "ri-calendar-2-line",
  },
  {
    title: "Lost & Found Portal",
    path: "/lost-found",
    category: "Services",
    description: "Report, search, and claim lost campus belongings and items",
    keywords: "lost found belongings claim report items missing keys id card wallet phone laptop",
    icon: "ri-search-eye-line",
  },
  {
    title: "Lost & Found Guide",
    path: "/lost-found/guide",
    category: "Guides",
    description: "Rules, claim procedures, and safety guidelines for lost campus items",
    keywords: "lost found guide rules help claiming returning policy safety verification",
    icon: "ri-book-open-line",
  },
  {
    title: "Event Organizer Guide",
    path: "/event-guide",
    category: "Guides",
    description: "Handbook for hosting, managing, and publishing campus events",
    keywords: "event guide organizer manual hosting tickets certificate approval direct payments upi",
    icon: "ri-book-read-line",
  },
  {
    title: "Club Ranking Guide",
    path: "/ranking-guide",
    category: "Guides",
    description: "How club points, engagement rankings, and Hall of Fame are calculated",
    keywords: "ranking leaderboard points scoring hall of fame criteria guide metrics engagement",
    icon: "ri-trophy-line",
  },
  {
    title: "About & Platform Features",
    path: "/about-features",
    category: "About",
    description: "Platform architecture, cryptographic ticketing, and student community tools",
    keywords: "about features architecture cryptographic qr security ferpa mission vision",
    icon: "ri-information-line",
  },
  {
    title: "FAQ & Help Center",
    path: "/faq",
    category: "Help",
    description: "Frequently asked questions for students, organizers, and faculty",
    keywords: "faq questions help support tickets refunds registration account login password",
    icon: "ri-questionnaire-line",
  },
  {
    title: "Meet the Developers",
    path: "/team",
    category: "About",
    description: "Core developers, designers, and contributors behind CampusNode",
    keywords: "team developers creators contributors nikhil yadav nitj engineering maintainers",
    icon: "ri-code-s-slash-line",
  },
  {
    title: "Contribute & Open Source",
    path: "/contribute",
    category: "About",
    description: "Open source repository, contribution guide, tech stack, and bounties",
    keywords: "contribute open source github code repo git bug report tech stack pull request",
    icon: "ri-git-branch-line",
  },
  {
    title: "Student Registration",
    path: "/register",
    category: "Account",
    description: "Sign up with official institutional student email",
    keywords: "register signup student account create profile nitj email",
    icon: "ri-user-add-line",
  },
  {
    title: "External Participant Registration",
    path: "/register/external",
    category: "Account",
    description: "Registration portal for non-NITJ inter-college fest participants",
    keywords: "external register inter college visitor outsider participant signup other colleges",
    icon: "ri-user-shared-line",
  },
  {
    title: "Login Portal",
    path: "/login",
    category: "Account",
    description: "Access student, club organizer, coordinator, or institutional account",
    keywords: "login signin access portal account credentials student club faculty",
    icon: "ri-login-box-line",
  },
  {
    title: "Admin & Faculty Portal",
    path: "/admin-secret-login",
    category: "Account",
    description: "Institutional administrative access and faculty coordinator portal",
    keywords: "admin login secret faculty coordinator portal dsw command management",
    icon: "ri-shield-keyhole-line",
  },
  {
    title: "Privacy Policy",
    path: "/privacy",
    category: "Legal",
    description: "Data privacy practices, information handling, and student privacy rights",
    keywords: "privacy policy data collection security protection rights confidentiality",
    icon: "ri-shield-check-line",
  },
  {
    title: "Terms & Conditions",
    path: "/terms",
    category: "Legal",
    description: "Platform usage rules, code of conduct, and terms of service",
    keywords: "terms conditions rules regulations service user agreement conduct",
    icon: "ri-file-text-line",
  },
  {
    title: "Payment & Direct UPI Policy",
    path: "/payment-policy",
    category: "Legal",
    description: "Event fees, direct organizer UPI verification, and college payment terms",
    keywords: "payment policy upi fees refund transactions college central direct account",
    icon: "ri-bank-card-line",
  },
  {
    title: "Data Privacy & Compliance",
    path: "/data-privacy",
    category: "Legal",
    description: "FERPA compliance, cryptographic signatures, and audit trails",
    keywords: "data privacy compliance ferpa encryption signatures security audit",
    icon: "ri-lock-line",
  },
  {
    title: "My Events & Tickets",
    path: "/my-events",
    category: "Student",
    description: "View your registered event passes, QR tickets, and check-in status",
    keywords: "my events tickets qr pass registered bookings attendance certificate passes",
    icon: "ri-coupon-line",
  },
  {
    title: "Student Profile",
    path: "/profile",
    category: "Student",
    description: "Update bio, social handles, portfolio link, and event achievements",
    keywords: "profile dashboard account settings resume badges bio edit avatar",
    icon: "ri-user-line",
  },
  {
    title: "Campus Notifications",
    path: "/notifications",
    category: "Student",
    description: "Campus announcements, team invitations, and event alerts",
    keywords: "notifications alerts messages announcements invites updates broadcasts",
    icon: "ri-notification-3-line",
  },
  {
    title: "QR Attendance Scanner",
    path: "/event-staff",
    category: "Organizer",
    description: "Staff ticket validation, offline cryptographic QR check-in portal",
    keywords: "scanner check-in qr tickets attendance staff validate gate pass checkin",
    icon: "ri-qr-scan-2-line",
  },
];

const POPULAR_QUICK_SEARCHES = [
  { label: "Hackathons", query: "hackathon", icon: "ri-code-box-line" },
  { label: "Technical Clubs", query: "technical", icon: "ri-cpu-line" },
  { label: "Club Heads", query: "head", icon: "ri-user-star-line" },
  { label: "Lost & Found", query: "lost found", icon: "ri-search-eye-line" },
  { label: "Event Guidelines", query: "guide", icon: "ri-book-open-line" },
  { label: "Dev Team", query: "team", icon: "ri-terminal-box-line" },
];

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "clubs", label: "Clubs" },
  { id: "members", label: "Members" },
  { id: "pages", label: "Pages" },
];

// Helper to highlight matching text substrings
const HighlightMatch = ({ text = "", query = "" }) => {
  if (!query.trim() || !text) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="text-orange-600 dark:text-orange-400 font-extrabold underline decoration-orange-500/40 underline-offset-2"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const SearchBar = ({ isOpen, onClose, isMobile = false }) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selectedItemRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, [isOpen]);

  const saveRecent = (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return;
    try {
      const trimmed = searchTerm.trim();
      const filtered = recentSearches.filter(
        (s) => s.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  };

  const removeRecent = (searchTerm, e) => {
    e?.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== searchTerm);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  };

  const clearAllRecents = (e) => {
    e?.stopPropagation();
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch {}
  };

  // Load public clubs and events when search opens
  useEffect(() => {
    if (isOpen && !hasFetched) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [clubsData, eventsData] = await Promise.all([
            getPublicJson("/api/clubs"),
            getPublicJson("/api/events"),
          ]);
          setClubs(Array.isArray(clubsData) ? clubsData : []);
          setEvents(Array.isArray(eventsData) ? eventsData : []);
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

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset query on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveTab("all");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Extract club members from clubs data (without roll numbers)
  const clubMembers = useMemo(() => {
    const memberMap = new Map();

    clubs.forEach((club) => {
      const clubSlug = club.slug || club._id || club.id;
      const clubName = club.clubName || "Club";
      const clubLogo = club.clubLogo;

      // 1. Structured memberships
      if (Array.isArray(club.memberships)) {
        club.memberships.forEach((m) => {
          const st = m.student;
          if (!st || !st.name) return;

          // Exclude club account itself if named like the club
          if (st.name.trim().toLowerCase() === clubName.trim().toLowerCase()) return;

          const key = `${st.id || st.email || st.name}-${clubSlug}-${m.role}`;
          if (!memberMap.has(key)) {
            let roleBadge = "Member";
            let rolePriority = 3;
            if (m.role === "CLUB_HEAD") {
              roleBadge = "Club Head";
              rolePriority = 1;
            } else if (m.role === "COORDINATOR") {
              roleBadge = "Coordinator";
              rolePriority = 2;
            }

            memberMap.set(key, {
              id: key,
              name: st.name,
              branch: st.branch || "",
              email: st.email || "",
              profileImage: st.profileImage || "",
              role: m.role || "MEMBER",
              roleBadge,
              rolePriority,
              clubName,
              clubSlug,
              clubLogo,
              path: `/club/${clubSlug}`,
              type: "member",
            });
          }
        });
      }

      // 2. Faculty coordinator
      if (club.facultyCoordinator?.name || club.facultyName) {
        const facName = club.facultyCoordinator?.name || club.facultyName;
        const facEmail = club.facultyCoordinator?.email || "";
        const key = `fac-${clubSlug}-${facName}`;
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: key,
            name: facName,
            branch: "Faculty Lead",
            email: facEmail,
            profileImage: "",
            role: "FACULTY",
            roleBadge: "Faculty Lead",
            rolePriority: 0,
            clubName,
            clubSlug,
            clubLogo,
            path: `/club/${clubSlug}`,
            type: "member",
          });
        }
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => a.rolePriority - b.rolePriority);
  }, [clubs]);

  // Filter and score search results across all entities
  const searchResults = useMemo(() => {
    if (!query.trim()) return { events: [], clubs: [], members: [], pages: [], counts: { all: 0, events: 0, clubs: 0, members: 0, pages: 0 } };

    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    const matchedEvents = [];
    const matchedClubs = [];
    const matchedMembers = [];
    const matchedPages = [];

    // 1. Search Events
    events.forEach((ev) => {
      const title = ev.title || "";
      const desc = ev.description || "";
      const venue = ev.venue || "";
      const clubName = ev.club?.clubName || ev.organizerType || "";
      const searchableText = `${title} ${desc} ${venue} ${clubName}`.toLowerCase();

      const matchesAllTokens = tokens.every((t) => searchableText.includes(t));
      if (matchesAllTokens) {
        let score = 0;
        if (title.toLowerCase().startsWith(q)) score += 80;
        else if (title.toLowerCase().includes(q)) score += 50;
        if (venue.toLowerCase().includes(q)) score += 20;
        if (clubName.toLowerCase().includes(q)) score += 20;

        const isLive =
          ev.startTime &&
          ev.endTime &&
          new Date(ev.startTime) <= new Date() &&
          new Date(ev.endTime) >= new Date();

        const isFree = !ev.entryFee && !ev.registrationFee;
        const priceLabel = isFree ? "Free" : `₹${ev.entryFee || ev.registrationFee}`;

        matchedEvents.push({
          score,
          type: "event",
          id: ev._id || ev.id,
          title: ev.title,
          subtitle: `${ev.club?.clubName || "Campus Event"} · ${ev.venue || "Campus"}`,
          date: ev.startTime
            ? new Date(ev.startTime).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })
            : "",
          isLive,
          priceLabel,
          path: `/event/${ev.slug || ev._id || ev.id}`,
          image: ev.imageUrl,
          icon: "ri-calendar-event-line",
        });
      }
    });

    // 2. Search Clubs
    clubs.forEach((c) => {
      const name = c.clubName || "";
      const cat = c.category || "";
      const desc = c.description || "";
      const motto = c.motto || "";
      const fac = c.facultyName || c.facultyCoordinator?.name || "";
      const searchableText = `${name} ${cat} ${desc} ${motto} ${fac}`.toLowerCase();

      const matchesAllTokens = tokens.every((t) => searchableText.includes(t));
      if (matchesAllTokens) {
        let score = 0;
        if (name.toLowerCase().startsWith(q)) score += 90;
        else if (name.toLowerCase().includes(q)) score += 60;
        if (cat.toLowerCase().includes(q)) score += 30;

        matchedClubs.push({
          score,
          type: "club",
          id: c._id || c.id,
          title: c.clubName,
          subtitle: c.category || "Student Organization",
          description: c.motto || c.description || "",
          path: `/club/${c.slug || c._id || c.id}`,
          logo: c.clubLogo,
          icon: "ri-team-line",
        });
      }
    });

    // 3. Search Club Members & Leadership (without roll numbers)
    clubMembers.forEach((m) => {
      const name = m.name || "";
      const branch = m.branch || "";
      const club = m.clubName || "";
      const role = m.roleBadge || "";
      const searchableText = `${name} ${branch} ${club} ${role} ${m.email}`.toLowerCase();

      const matchesAllTokens = tokens.every((t) => searchableText.includes(t));
      if (matchesAllTokens) {
        let score = 0;
        if (name.toLowerCase().startsWith(q)) score += 95;
        else if (name.toLowerCase().includes(q)) score += 70;
        if (role.toLowerCase().includes(q)) score += 40;
        if (branch.toLowerCase().includes(q)) score += 30;
        if (club.toLowerCase().includes(q)) score += 20;

        matchedMembers.push({
          score,
          type: "member",
          id: m.id,
          title: m.name,
          subtitle: `${m.roleBadge} · ${m.clubName}`,
          branch: m.branch,
          roleBadge: m.roleBadge,
          clubName: m.clubName,
          path: m.path,
          profileImage: m.profileImage,
          icon: "ri-user-star-line",
        });
      }
    });

    // 4. Search Public Pages
    PUBLIC_PAGES.forEach((p) => {
      const title = p.title || "";
      const desc = p.description || "";
      const keywords = p.keywords || "";
      const cat = p.category || "";
      const searchableText = `${title} ${desc} ${keywords} ${cat} ${p.path}`.toLowerCase();

      const matchesAllTokens = tokens.every((t) => searchableText.includes(t));
      if (matchesAllTokens) {
        let score = 0;
        if (title.toLowerCase().startsWith(q)) score += 85;
        else if (title.toLowerCase().includes(q)) score += 55;
        if (keywords.includes(q)) score += 35;

        matchedPages.push({
          score,
          type: "page",
          id: p.path,
          title: p.title,
          subtitle: p.description,
          category: p.category,
          path: p.path,
          icon: p.icon,
        });
      }
    });

    // Sort items in each group by score
    matchedEvents.sort((a, b) => b.score - a.score);
    matchedClubs.sort((a, b) => b.score - a.score);
    matchedMembers.sort((a, b) => b.score - a.score);
    matchedPages.sort((a, b) => b.score - a.score);

    return {
      events: matchedEvents,
      clubs: matchedClubs,
      members: matchedMembers,
      pages: matchedPages,
      counts: {
        all:
          matchedEvents.length +
          matchedClubs.length +
          matchedMembers.length +
          matchedPages.length,
        events: matchedEvents.length,
        clubs: matchedClubs.length,
        members: matchedMembers.length,
        pages: matchedPages.length,
      },
    };
  }, [query, events, clubs, clubMembers]);

  // Grouped or flattened results for rendering and keyboard navigation
  const groupedSections = useMemo(() => {
    if (!query.trim() || !searchResults.counts) return [];

    if (activeTab === "events") {
      return searchResults.events.length > 0
        ? [{ title: "Events", type: "event", items: searchResults.events }]
        : [];
    }
    if (activeTab === "clubs") {
      return searchResults.clubs.length > 0
        ? [{ title: "Clubs & Societies", type: "club", items: searchResults.clubs }]
        : [];
    }
    if (activeTab === "members") {
      return searchResults.members.length > 0
        ? [{ title: "Leadership & Members", type: "member", items: searchResults.members }]
        : [];
    }
    if (activeTab === "pages") {
      return searchResults.pages.length > 0
        ? [{ title: "Public Pages & Guides", type: "page", items: searchResults.pages }]
        : [];
    }

    // "All" tab: grouped layout
    const sections = [];
    if (searchResults.events.length > 0) {
      sections.push({
        title: "Events",
        type: "event",
        items: searchResults.events.slice(0, 4),
      });
    }
    if (searchResults.clubs.length > 0) {
      sections.push({
        title: "Clubs & Societies",
        type: "club",
        items: searchResults.clubs.slice(0, 3),
      });
    }
    if (searchResults.members.length > 0) {
      sections.push({
        title: "Leadership & Members",
        type: "member",
        items: searchResults.members.slice(0, 4),
      });
    }
    if (searchResults.pages.length > 0) {
      sections.push({
        title: "Public Pages & Guides",
        type: "page",
        items: searchResults.pages.slice(0, 3),
      });
    }

    return sections;
  }, [searchResults, activeTab, query]);

  // Flatten all visible items across sections for unified keyboard navigation
  const flatVisibleItems = useMemo(() => {
    const list = [];
    groupedSections.forEach((section) => {
      section.items.forEach((item) => list.push(item));
    });
    return list;
  }, [groupedSections]);

  // Keep selected index in bounds and reset when query/tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Scroll active keyboard item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const tabKeys = CATEGORY_TABS.map((t) => t.id);
      const curIdx = tabKeys.indexOf(activeTab);
      const nextIdx = e.shiftKey
        ? (curIdx - 1 + tabKeys.length) % tabKeys.length
        : (curIdx + 1) % tabKeys.length;
      setActiveTab(tabKeys[nextIdx]);
      return;
    }

    if (flatVisibleItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatVisibleItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? flatVisibleItems.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatVisibleItems[selectedIndex];
      if (target?.path) {
        saveRecent(target.title || query);
        navigate(target.path);
        onClose();
      }
    }
  };

  const handleResultSelect = (item) => {
    saveRecent(item.title || query);
    navigate(item.path);
    onClose();
  };

  const handleQuickSearchClick = (searchTerm) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  // Helper for Member Avatar Initials
  const getInitials = (name) => {
    if (!name) return "CN";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Badges styling
  const getMemberRoleBadgeStyle = (roleBadge) => {
    switch (roleBadge) {
      case "Faculty Lead":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      case "Club Head":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "Coordinator":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/20";
    }
  };

  if (!isOpen) return null;

  const totalCount = searchResults.counts?.all || 0;
  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-2.5 sm:p-4 sm:pt-16 bg-black/70 dark:bg-black/85 backdrop-blur-md transition-all duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Command Palette"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[82vh] transition-transform duration-200 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Box */}
        <div className="relative flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0c0c]">
          <i className="ri-search-line text-lg text-orange-600 dark:text-orange-500 shrink-0 ml-0.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search CampusNode..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none tracking-wide"
            autoComplete="off"
            spellCheck="false"
          />

          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin shrink-0" />
          )}

          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <i className="ri-close-line text-base" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded">
              ESC
            </kbd>
          </div>
          <button
            onClick={onClose}
            className="sm:hidden p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-fill text-lg" />
          </button>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-neutral-50/90 dark:bg-neutral-900/70 border-b border-neutral-200/80 dark:border-neutral-800/80 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const count =
              query.trim() && searchResults.counts
                ? searchResults.counts[tab.id] ?? 0
                : null;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  inputRef.current?.focus();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/70"
                }`}
              >
                <span>{tab.label}</span>
                {count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results Container / Empty State */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2 sm:p-3 space-y-3"
        >
          {!query.trim() ? (
            /* Empty Query - Recent Searches, Popular Chips, and Compact Quick Access */
            <div className="py-2 px-1 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      Recent
                    </p>
                    <button
                      onClick={clearAllRecents}
                      className="text-[10.5px] font-semibold text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleQuickSearchClick(item)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-900/40 hover:bg-orange-500/10 dark:hover:bg-orange-500/15 border border-transparent hover:border-orange-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="ri-history-line text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">
                            {item}
                          </span>
                        </div>
                        <button
                          onClick={(e) => removeRecent(item, e)}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 transition-colors cursor-pointer"
                          title="Remove from history"
                        >
                          <i className="ri-close-line text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 px-1">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_QUICK_SEARCHES.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickSearchClick(tag.query)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-orange-500/50 hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer shadow-2xs group"
                    >
                      <i className={`${tag.icon} text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-orange-500 transition-colors font-light`} />
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Access (Compact Command Rows) */}
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 px-1">
                  Quick Access
                </p>
                <div className="space-y-1">
                  {PUBLIC_PAGES.slice(0, 4).map((p, idx) => (
                    <Link
                      key={idx}
                      to={p.path}
                      onClick={() => {
                        saveRecent(p.title);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 hover:border-orange-500/40 hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.06] transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs shrink-0">
                          <i className={p.icon} />
                        </div>
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">
                          {p.title}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline truncate">
                          · {p.description}
                        </span>
                      </div>
                      <i className="ri-arrow-right-s-line text-neutral-400 dark:text-neutral-500 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all text-sm shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : groupedSections.length > 0 ? (
            /* Grouped & Categorized Search Results */
            <div className="space-y-3">
              {groupedSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      {section.title}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                      {section.items.length}
                    </span>
                  </div>

                  {/* Section Result Cards */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      runningIndex += 1;
                      const itemIndex = runningIndex;
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <div
                          key={`${item.type}-${item.id || itemIndex}`}
                          ref={isSelected ? selectedItemRef : null}
                          onClick={() => handleResultSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-xl transition-all duration-150 cursor-pointer border ${
                            isSelected
                              ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/40 shadow-xs ring-1 ring-orange-500/20"
                              : "border-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-900/70"
                          }`}
                        >
                          {/* Visual Asset */}
                          <div className="relative shrink-0">
                            {item.type === "event" ? (
                              item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200 dark:border-orange-900/40">
                                  <i className="ri-calendar-event-line text-base" />
                                </div>
                              )
                            ) : item.type === "club" ? (
                              item.logo ? (
                                <img
                                  src={item.logo}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/40 font-black text-xs">
                                  {getInitials(item.title)}
                                </div>
                              )
                            ) : item.type === "member" ? (
                              item.profileImage ? (
                                <img
                                  src={item.profileImage}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-2xs"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                  {getInitials(item.title)}
                                </div>
                              )
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300 flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
                                <i className={`${item.icon} text-base`} />
                              </div>
                            )}
                          </div>

                          {/* Result Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                <HighlightMatch text={item.title} query={query} />
                              </span>

                              {/* Badges */}
                              {item.type === "member" && item.roleBadge && (
                                <span
                                  className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${getMemberRoleBadgeStyle(
                                    item.roleBadge
                                  )}`}
                                >
                                  {item.roleBadge}
                                </span>
                              )}

                              {item.type === "event" && item.isLive && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  LIVE
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300 font-medium truncate">
                              <HighlightMatch text={item.subtitle} query={query} />
                            </p>

                            {item.type === "member" && item.branch && (
                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                {item.branch}
                              </p>
                            )}
                          </div>

                          {/* Right Side Hint & Selection Indicator */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.type === "event" && item.priceLabel && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                {item.priceLabel}
                              </span>
                            )}

                            {item.type === "club" && (
                              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                Society
                              </span>
                            )}

                            {item.type === "page" && item.category && (
                              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                {item.category}
                              </span>
                            )}

                            {isSelected ? (
                              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-600 rounded">
                                ↵
                              </kbd>
                            ) : (
                              <i className="ri-arrow-right-line text-xs text-neutral-400 dark:text-neutral-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* No Results Found */
            <div className="py-10 px-4 text-center">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-2.5 border border-orange-100 dark:border-orange-900/30">
                <i className="ri-search-2-line text-xl" />
              </div>
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                No matching results found
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                We couldn't find anything matching &ldquo;{query}&rdquo;. Try searching with a club name, event title, member name, branch, or guide topic.
              </p>
            </div>
          )}
        </div>

        {/* Compact Footer Bar */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.2 text-[10px] font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.2 text-[10px] font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded">
                ↵
              </kbd>{" "}
              Open
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.2 text-[10px] font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded">
                Tab
              </kbd>{" "}
              Categories
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.2 text-[10px] font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>

          <div className="sm:hidden text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
            Tap a result to open
          </div>

          <div className="flex items-center gap-2 font-semibold text-neutral-500 dark:text-neutral-400">
            {query.trim() ? (
              <span>
                {totalCount} result{totalCount !== 1 ? "s" : ""}
              </span>
            ) : (
              <span></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
