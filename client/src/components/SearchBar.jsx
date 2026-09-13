import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicJson } from "../lib/publicDataCache";
import {
  Search,
  Calendar,
  Users,
  FileText,
  X,
  ArrowRight,
  History,
  CornerDownLeft,
  Sparkles,
  BookOpen,
  Trophy,
  Shield,
  HelpCircle,
  UserPlus,
  LogIn,
  ExternalLink,
  Code,
  GitBranch,
  ShieldAlert,
  Loader2,
  Lock,
  Ticket,
  User
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const RECENT_SEARCHES_KEY = "campusnode_recent_searches";

// Comprehensive catalog of all public pages and guides on CampusNode
const PUBLIC_PAGES = [
  {
    title: "Home",
    path: "/",
    category: "General",
    description: "Main campus portal, live events feed, and top societies showcase",
    keywords: "home landing main feed nitj campus explore welcome",
    icon: Calendar,
  },
  {
    title: "Events Feed",
    path: "/events",
    category: "Events",
    description: "Browse upcoming workshops, hackathons, cultural & sports fests",
    keywords: "events fests hackathons workshops competitions technical cultural sports schedule registrations",
    icon: Calendar,
  },
  {
    title: "Clubs & Societies Directory",
    path: "/clubs",
    category: "Clubs",
    description: "Explore all student societies, technical chapters, and cultural teams",
    keywords: "clubs societies organizations chapters gdg robotics coding dramatics dance music teams",
    icon: Users,
  },
  {
    title: "Event Calendar",
    path: "/event-calendar",
    category: "Events",
    description: "Full interactive venue schedule and campus date timeline",
    keywords: "calendar schedule dates timeline venue booking slots",
    icon: Calendar,
  },
  {
    title: "Event Organizer Guide",
    path: "/event-guide",
    category: "Guides",
    description: "Handbook for hosting, managing, and publishing campus events",
    keywords: "event guide organizer manual hosting tickets certificate approval direct payments upi",
    icon: BookOpen,
  },
  {
    title: "Club Ranking Guide",
    path: "/ranking-guide",
    category: "Guides",
    description: "How club points, engagement rankings, and Hall of Fame are calculated",
    keywords: "ranking leaderboard points scoring hall of fame criteria guide metrics engagement",
    icon: Trophy,
  },
  {
    title: "About & Platform Features",
    path: "/about-features",
    category: "About",
    description: "Platform architecture, cryptographic ticketing, and student community tools",
    keywords: "about features architecture cryptographic qr security ferpa mission vision",
    icon: Shield,
  },
  {
    title: "FAQ & Help Center",
    path: "/faq",
    category: "Help",
    description: "Frequently asked questions for students, organizers, and faculty",
    keywords: "faq questions help support tickets refunds registration account login password",
    icon: HelpCircle,
  },
  {
    title: "Meet the Developers",
    path: "/team",
    category: "About",
    description: "Core developers, designers, and contributors behind CampusNode",
    keywords: "team developers creators contributors nikhil yadav nitj engineering maintainers",
    icon: Code,
  },
  {
    title: "Contribute & Open Source",
    path: "/contribute",
    category: "About",
    description: "Open source repository, contribution guide, tech stack, and bounties",
    keywords: "contribute open source github code repo git bug report tech stack pull request",
    icon: GitBranch,
  },
  {
    title: "Student Registration",
    path: "/register",
    category: "Account",
    description: "Sign up with official institutional student email",
    keywords: "register signup student account create profile nitj email",
    icon: UserPlus,
  },
  {
    title: "External Participant Registration",
    path: "/register/external",
    category: "Account",
    description: "Registration portal for non-NITJ inter-college fest participants",
    keywords: "external register inter college visitor outsider participant signup other colleges",
    icon: UserPlus,
  },
  {
    title: "Login Portal",
    path: "/login",
    category: "Account",
    description: "Access student, club organizer, coordinator, or institutional account",
    keywords: "login signin access portal account credentials student club faculty",
    icon: LogIn,
  },
  {
    title: "Admin & Faculty Portal",
    path: "/admin-secret-login",
    category: "Account",
    description: "Institutional administrative access and faculty coordinator portal",
    keywords: "admin login secret faculty coordinator portal dsw command management",
    icon: ShieldAlert,
  },
  {
    title: "Privacy Policy",
    path: "/privacy",
    category: "Legal",
    description: "Data privacy practices, information handling, and student privacy rights",
    keywords: "privacy policy data collection security protection rights confidentiality",
    icon: Lock,
  },
  {
    title: "Terms & Conditions",
    path: "/terms",
    category: "Legal",
    description: "Platform usage rules, code of conduct, and terms of service",
    keywords: "terms conditions rules regulations service user agreement conduct",
    icon: FileText,
  },
  {
    title: "Payment & Direct UPI Policy",
    path: "/payment-policy",
    category: "Legal",
    description: "Event fees, direct organizer UPI verification, and college payment terms",
    keywords: "payment policy upi fees refund transactions college central direct account",
    icon: Shield,
  },
  {
    title: "Data Privacy & Compliance",
    path: "/data-privacy",
    category: "Legal",
    description: "FERPA compliance, cryptographic signatures, and audit trails",
    keywords: "data privacy compliance ferpa encryption signatures security audit",
    icon: Lock,
  },
  {
    title: "My Events & Tickets",
    path: "/my-events",
    category: "Student",
    description: "View your registered event passes, QR tickets, and check-in status",
    keywords: "my events tickets qr pass registered bookings attendance certificate passes",
    icon: Ticket,
  },
  {
    title: "Student Profile",
    path: "/profile",
    category: "Student",
    description: "Update bio, social handles, portfolio link, and event achievements",
    keywords: "profile dashboard account settings resume badges bio edit avatar",
    icon: User,
  },
  {
    title: "Campus Notifications",
    path: "/notifications",
    category: "Student",
    description: "Campus announcements, team invitations, and event alerts",
    keywords: "notifications alerts messages announcements invites updates broadcasts",
    icon: History,
  }
];

const POPULAR_QUICK_SEARCHES = [
  { label: "Hackathons", query: "hackathon", icon: Code },
  { label: "Technical Clubs", query: "technical", icon: Users },
  { label: "Club Heads", query: "head", icon: User },
  { label: "Event Guidelines", query: "guide", icon: BookOpen },
  { label: "Dev Team", query: "team", icon: Code },
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
            className="text-primary font-bold underline decoration-primary/40 underline-offset-2"
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
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (e) {
      console.warn("Failed to load recent searches", e);
    }
  }, []);

  const saveRecent = (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const next = [clean, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const removeRecent = (term, e) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const clearAllRecents = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {}
  };

  // Lazy-fetch events and clubs on modal open
  useEffect(() => {
    if (isOpen && !hasFetched) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // cachedFetch (via getPublicJson) returns raw data, not an axios {data} wrapper
          const [eventsRaw, clubsRaw] = await Promise.all([
            getPublicJson("/api/events").catch(() => []),
            getPublicJson("/api/clubs").catch(() => []),
          ]);

          const eventsData = Array.isArray(eventsRaw)
            ? eventsRaw
            : eventsRaw?.events || [];
          const clubsData = Array.isArray(clubsRaw)
            ? clubsRaw
            : clubsRaw?.clubs || [];

          setEvents(eventsData);
          setClubs(clubsData);
          // Only mark as fetched if we actually got data — retry if empty
          if (eventsData.length > 0 || clubsData.length > 0) {
            setHasFetched(true);
          }
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

      if (Array.isArray(club.memberships)) {
        club.memberships.forEach((m) => {
          const st = m.student;
          if (!st || !st.name) return;

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
          icon: Calendar,
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
          icon: Users,
        });
      }
    });

    // 3. Search Club Members & Leadership
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
          icon: User,
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

  const flatVisibleItems = useMemo(() => {
    const list = [];
    groupedSections.forEach((section) => {
      section.items.forEach((item) => list.push(item));
    });
    return list;
  }, [groupedSections]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

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

  const getInitials = (name) => {
    if (!name) return "CN";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getMemberRoleBadgeVariant = (roleBadge) => {
    switch (roleBadge) {
      case "Faculty Lead":
        return "destructive";
      case "Club Head":
        return "default";
      default:
        return "secondary";
    }
  };

  if (!isOpen) return null;

  const totalCount = searchResults.counts?.all || 0;
  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 sm:pt-16 bg-background/80 backdrop-blur-sm transition-all animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Command Palette"
    >
      <Card
        className="w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-in zoom-in-95 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Box */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search events, clubs, members, guides..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium placeholder:text-muted-foreground focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          )}

          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="h-7 w-7 text-muted-foreground"
              title="Clear search"
            >
              <X size={14} />
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded">
              ESC
            </kbd>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="sm:hidden h-7 w-7 text-muted-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex items-center gap-1 px-4 py-2 bg-muted/40 border-b border-border overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const count =
              query.trim() && searchResults.counts
                ? searchResults.counts[tab.id] ?? 0
                : null;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setActiveTab(tab.id);
                  inputRef.current?.focus();
                }}
                className={`h-7 text-xs font-semibold px-2.5 gap-1.5 ${!isActive ? 'text-muted-foreground' : ''}`}
              >
                <span>{tab.label}</span>
                {count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Results Container / Empty State */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-border p-3 space-y-3"
        >
          {!query.trim() ? (
            /* Empty Query - Recent Searches & Popular Tags */
            <div className="py-2 px-1 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Recent Searches
                    </p>
                    <button
                      onClick={clearAllRecents}
                      className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleQuickSearchClick(item)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/70 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <History className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                          <span className="text-xs font-medium group-hover:text-primary truncate">
                            {item}
                          </span>
                        </div>
                        <button
                          onClick={(e) => removeRecent(item, e)}
                          className="text-muted-foreground hover:text-foreground p-0.5 transition-colors cursor-pointer"
                          title="Remove from history"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_QUICK_SEARCHES.map((tag, idx) => {
                    const TagIcon = tag.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuickSearchClick(tag.query)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
                      >
                        <TagIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Access */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Quick Access
                </p>
                <div className="space-y-1">
                  {PUBLIC_PAGES.slice(0, 4).map((p, idx) => {
                    const PageIcon = p.icon;
                    return (
                      <Link
                        key={idx}
                        to={p.path}
                        onClick={() => {
                          saveRecent(p.title);
                          onClose();
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border hover:border-primary/40 hover:bg-muted/60 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center text-primary text-xs shrink-0">
                            <PageIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold group-hover:text-primary truncate">
                            {p.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
                            · {p.description}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : groupedSections.length > 0 ? (
            /* Grouped Search Results */
            <div className="space-y-3">
              {groupedSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">
                      {section.items.length}
                    </Badge>
                  </div>

                  {/* Section Result Cards */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      runningIndex += 1;
                      const itemIndex = runningIndex;
                      const isSelected = itemIndex === selectedIndex;
                      const ItemIcon = item.icon || FileText;

                      return (
                        <div
                          key={`${item.type}-${item.id || itemIndex}`}
                          ref={isSelected ? selectedItemRef : null}
                          onClick={() => handleResultSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer border ${
                            isSelected
                              ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                              : "border-transparent hover:bg-muted/40"
                          }`}
                        >
                          {/* Visual Asset */}
                          <div className="shrink-0">
                            {item.type === "event" ? (
                              item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                  <Calendar className="w-4 h-4" />
                                </div>
                              )
                            ) : item.type === "club" ? (
                              item.logo ? (
                                <img
                                  src={item.logo}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 font-bold text-xs">
                                  {getInitials(item.title)}
                                </div>
                              )
                            ) : item.type === "member" ? (
                              item.profileImage ? (
                                <img
                                  src={item.profileImage}
                                  alt=""
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                  {getInitials(item.title)}
                                </div>
                              )
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center border border-border">
                                <ItemIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          {/* Result Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs sm:text-sm font-semibold truncate">
                                <HighlightMatch text={item.title} query={query} />
                              </span>

                              {item.type === "member" && item.roleBadge && (
                                <Badge
                                  variant={getMemberRoleBadgeVariant(item.roleBadge)}
                                  className="text-[9px] uppercase px-1.5 py-0 shrink-0 font-bold"
                                >
                                  {item.roleBadge}
                                </Badge>
                              )}

                              {item.type === "event" && item.isLive && (
                                <Badge className="text-[9px] font-bold px-1.5 py-0 bg-primary text-primary-foreground shrink-0 flex items-center gap-1 border-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  LIVE
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate">
                              <HighlightMatch text={item.subtitle} query={query} />
                            </p>

                            {item.type === "member" && item.branch && (
                              <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
                                {item.branch}
                              </p>
                            )}
                          </div>

                          {/* Right Side Indicator */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.type === "event" && item.priceLabel && (
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {item.priceLabel}
                              </Badge>
                            )}

                            {isSelected ? (
                              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground bg-primary rounded">
                                ↵
                              </kbd>
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
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
            <div className="py-12 px-4 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <h4 className="text-sm font-semibold mb-1">
                No matching results found
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                We couldn't find anything matching &ldquo;{query}&rdquo;. Try searching with an event title, club name, member name, or category.
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-muted border border-border rounded">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-muted border border-border rounded">
                ↵
              </kbd>{" "}
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-muted border border-border rounded">
                Tab
              </kbd>{" "}
              Categories
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-muted border border-border rounded">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>

          <div className="sm:hidden text-muted-foreground text-[11px]">
            Tap a result to open
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {query.trim() && (
              <span>
                {totalCount} result{totalCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SearchBar;
