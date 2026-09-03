import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  deleteClub,
  getClubMembers,
  createClubAnnouncement,
  deleteClubAnnouncement,
  togglePinClubAnnouncement,
  createClubAchievement,
  deleteClubAchievement,
  addClubGalleryMedia,
  deleteClubGalleryMedia,
  toggleEventFeatured,
} from "../services/clubService";
import { getUserEvents } from "../services/eventService";
import { markdownToHtml } from "../utils/htmlMarkdownConverter";
import "../components/WysiwygMarkdownEditor.css";
import { InstagramIcon } from "@/components/ui/instagram";
import { LinkedinIcon } from "@/components/ui/linkedin";
import { TwitterIcon } from "@/components/ui/twitter";
import { GithubIcon } from "@/components/ui/github";
import { MessageCircleIcon } from "@/components/ui/message-circle";
import { EarthIcon } from "@/components/ui/earth";
import EventCard from "../components/EventCard";
import BannerCropModal from "../components/BannerCropModal";
import { useTheme } from "../context/ThemeContext";
import { getPublicJson } from "../lib/publicDataCache";
import { registerUpdateCallback, unregisterUpdateCallback } from "../lib/cacheManager";
import ShimmerText from "../components/ShimmerText";
import { ClubMemberRole } from "../types/index.js";
import { useNotification } from "../context/NotificationContext";

const MemberSocials = ({ student }) => {
  if (!student) return null;
  const links = [];

  const formatUrl = (url) => {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  if (student.githubProfile)
    links.push({
      url: formatUrl(student.githubProfile),
      icon: <GithubIcon className="w-4 h-4" />,
      title: "GitHub",
    });
  if (student.linkedinProfile)
    links.push({
      url: formatUrl(student.linkedinProfile),
      icon: <LinkedinIcon className="w-4 h-4" />,
      title: "LinkedIn",
    });
  if (student.xProfile)
    links.push({
      url: formatUrl(student.xProfile),
      icon: <TwitterIcon className="w-4 h-4" />,
      title: "X",
    });
  if (student.instagramProfile)
    links.push({
      url: formatUrl(student.instagramProfile),
      icon: <InstagramIcon className="w-4 h-4" />,
      title: "Instagram",
    });
  if (student.whatsappNumber)
    links.push({
      url: `https://wa.me/${student.whatsappNumber.replace(/[^\d+]/g, "")}`,
      icon: <MessageCircleIcon className="w-4 h-4" />,
      title: "WhatsApp",
    });
  if (student.portfolioUrl)
    links.push({
      url: formatUrl(student.portfolioUrl),
      icon: <EarthIcon className="w-4 h-4" />,
      title: "Portfolio",
    });

  if (links.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-1 w-full">
      {links.map((l, idx) => (
        <a
          key={idx}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={l.title}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
};

const ClubCalendarView = ({ events }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Map events to day numbers
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!ev.startTime) return;
      const d = new Date(ev.startTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateNum = d.getDate();
        if (!map[dateNum]) map[dateNum] = [];
        map[dateNum].push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(null);

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {monthNames[month]} {year}
          </h3>
          <p className="text-xs text-neutral-400">Club schedule & upcoming events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span
            key={day}
            className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 py-1"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-12 sm:h-20 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-transparent"
              />
            );
          }

          const dayEvents = eventsByDay[day] || [];
          const hasEvents = dayEvents.length > 0;
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              onClick={() => {
                if (hasEvents) {
                  setSelectedDayEvents(dayEvents);
                  setSelectedDayNumber(day);
                }
              }}
              className={`h-12 sm:h-20 p-1 sm:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                hasEvents ? "cursor-pointer hover:border-orange-500 hover:shadow-xs" : ""
              } ${
                isToday
                  ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 font-bold"
                  : hasEvents
                  ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                  : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    isToday
                      ? "text-orange-600 dark:text-orange-400 font-bold"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {day}
                </span>
                {hasEvents && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                )}
              </div>
              {hasEvents && (
                <div className="hidden sm:block truncate">
                  <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded truncate block">
                    {dayEvents[0].title}
                  </span>
                  {dayEvents.length > 1 && (
                    <span className="text-[9px] text-neutral-400 block mt-0.5">
                      +{dayEvents.length - 1} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Event Drawer / Popup */}
      {selectedDayEvents && (
        <div className="mt-6 p-4 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Events on {monthNames[month]} {selectedDayNumber}, {year}
            </h4>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => (
              <Link
                key={ev._id || ev.id}
                to={`/events/${ev.slug || ev._id || ev.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500 transition group"
              >
                <div>
                  <h5 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-orange-600 transition">
                    {ev.title}
                  </h5>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(ev.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {ev.venue}
                  </p>
                </div>
                <i className="ri-arrow-right-line text-neutral-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Modern Portrait Team Member Card ───────────────────────────────────── */
const TeamMemberCard = ({
  name,
  role,
  image,
  subtitle,
  email,
  student,
  isLeadership = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl =
    image ||
    student?.profileImage ||
    student?.profilePicture ||
    student?.picture ||
    student?.user?.profileImage;

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const hasImage = imageUrl && !imgError;

  return (
    <div className="group relative flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300">
      {/* Top Portrait Image Section */}
      <div className="relative w-full aspect-[4/4.6] bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
        {hasImage ? (
          <img
            src={imageUrl}
            alt={name || "Member"}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200/70 dark:from-neutral-800 dark:to-neutral-900 select-none">
            <span className="text-3xl sm:text-4xl font-black tracking-wider text-neutral-600 dark:text-neutral-300">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Card Info Footer */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between text-left">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {name || "Member"}
          </h4>
          <p
            className={`text-[11px] sm:text-xs font-semibold truncate mt-0.5 ${
              isLeadership
                ? "text-orange-600 dark:text-orange-400"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {role}
          </p>
          {subtitle && (
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Email or Social Links */}
        {(email || student) && (
          <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium transition-colors truncate max-w-full"
                title={`Email ${name}`}
              >
                <i className="ri-mail-line text-sm shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            ) : (
              <MemberSocials student={student} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ClubDetails = () => {
  const { slug } = useParams();
  const { isDark } = useTheme();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { user: authUser, role: authRole } = useAuth();

  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [canEdit, setCanEdit] = useState(false);
  const [isHead, setIsHead] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Section Expansion States (capped at 6 items initially)
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(false);
  const [isUpcomingEventsExpanded, setIsUpcomingEventsExpanded] = useState(false);
  const [isPastEventsExpanded, setIsPastEventsExpanded] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);

  // Active sub-views
  const [eventViewMode, setEventViewMode] = useState("list"); // "list" | "calendar"
  const [lightboxImage, setLightboxImage] = useState(null);
  const [adminHubOpen, setAdminHubOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("announcements"); // "announcements" | "achievements" | "gallery" | "featured"

  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", isPinned: false });
  const [achievementForm, setAchievementForm] = useState({ title: "", description: "", date: "", imageUrl: "", externalUrl: "" });
  const [galleryForm, setGalleryForm] = useState({ url: "", caption: "", albumTitle: "General" });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const fallbackLogo = isDark ? "/darkthemelogo.png" : "/lightthemelogo.png";
  const [heroLogoSrc, setHeroLogoSrc] = useState(() => club?.clubLogo || fallbackLogo);

  useEffect(() => {
    const isClubOwner = authUser?.role === "club" && (authUser?.clubId === club?._id || authUser?.clubId === club?.id);
    const rawLogo = club?.clubLogo || (isClubOwner ? (authUser?.clubLogo || authUser?.profileImage) : null);
    if (!rawLogo) {
      setHeroLogoSrc(fallbackLogo);
      return;
    }
    setHeroLogoSrc(rawLogo);
    const img = new Image();
    img.src = rawLogo;
    img.onload = () => setHeroLogoSrc(rawLogo);
    img.onerror = () => setHeroLogoSrc(fallbackLogo);
  }, [club?.clubLogo, club?._id, club?.id, authUser?.role, authUser?.clubId, authUser?.clubLogo, authUser?.profileImage, fallbackLogo]);

  const fetchClubDetails = async () => {
    try {
      const clubData = await getPublicJson(`/api/clubs/${slug}`);
      setClub(clubData.club);
      setEvents(clubData.events || []);
      setFeaturedEvent(clubData.featuredEvent || null);

      if (authUser && (authRole === "member" || authRole === "student")) {
        try {
          const regRes = await getUserEvents(authUser.id || authUser._id);
          setRegisteredEvents(
            regRes.data.filter((r) => r.eventId).map((r) => r.eventId.id || r.eventId._id)
          );
        } catch (regErr) {
          console.error("Error fetching user registrations:", regErr);
        }
      }

      if (clubData?.club) {
        const clubId = clubData.club._id || clubData.club.id;
        try {
          const membersRes = await getClubMembers(clubId);
          const memberList = membersRes.data || [];
          setMembers(memberList);
          if (authUser) {
            const isGlobalAdmin = authRole === "admin" || authRole === "SUPER_ADMIN";
            const isFacultyCoord =
              (authRole === "faculty" || authRole === "facultyCoordinator") &&
              (clubData.club.facultyCoordinatorId === authUser.id ||
                clubData.club.facultyCoordinator?.id === authUser.id);
            const isClubAcct =
              (authRole === "club" || authRole === "CLUB") &&
              String(authUser.clubId) === String(clubId);

            const membership = memberList.find(
              (m) => m.studentId === authUser.id || m.student?.id === authUser.id
            );
            const isClubHeadRole = membership?.role === ClubMemberRole.CLUB_HEAD;

            setIsHead(isGlobalAdmin || isFacultyCoord || isClubAcct || isClubHeadRole);
            setCanEdit(isGlobalAdmin || isFacultyCoord || isClubAcct || isClubHeadRole || (membership?.canEditEvents ?? false));
          }
        } catch {
          // fetch members failed
        }
      }
    } catch (err) {
      console.error("Error fetching club details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubDetails();
  }, [slug, authUser?.id, authRole]);

  useEffect(() => {
    if (club) {
      document.title = `${club.clubName} - CampusNode`;
    }
  }, [club]);

  // Derived people grouping
  const studentMembers = useMemo(() => {
    return members.filter((m) => {
      if (!m.student || !m.student.id || !m.student.name) return false;
      const sName = m.student.name.toLowerCase().trim();
      const cName = (club?.clubName || "").toLowerCase().trim();
      const sEmail = (m.student.email || "").toLowerCase().trim();
      const cEmail = (club?.clubEmail || "").toLowerCase().trim();

      if (cName && sName === cName) return false;
      if (cEmail && sEmail === cEmail) return false;
      return true;
    });
  }, [members, club]);

  const studentHeads = useMemo(() => {
    return studentMembers.filter(
      (m) => m.role === ClubMemberRole.CLUB_HEAD || m.role === "CLUB_HEAD"
    );
  }, [studentMembers]);

  const studentCoordinators = useMemo(() => {
    return studentMembers.filter(
      (m) => m.role === ClubMemberRole.COORDINATOR || m.role === "COORDINATOR"
    );
  }, [studentMembers]);

  const regularMembers = useMemo(() => {
    return studentMembers.filter(
      (m) =>
        m.role !== ClubMemberRole.CLUB_HEAD &&
        m.role !== "CLUB_HEAD" &&
        m.role !== ClubMemberRole.COORDINATOR &&
        m.role !== "COORDINATOR"
    );
  }, [studentMembers]);

  const now = new Date();
  const liveEvents = events.filter(
    (e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now
  );
  const upcomingEvents = events.filter((e) => new Date(e.startTime) > now);
  const pastEvents = events
    .filter((e) => new Date(e.endTime) < now)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

 

  const handleShareClub = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${club.clubName} · CampusNode`,
          text: club.motto || club.description || `Explore ${club.clubName} on CampusNode`,
          url,
        });
      } catch (err) {
        // Share cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      showNotification("Club link copied to clipboard!", "success");
    }
  };

  // Admin Hub Handlers
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;
    setSubmittingAdmin(true);
    try {
      await createClubAnnouncement(club._id || club.id, announcementForm);
      showNotification("Announcement published successfully!", "success");
      setAnnouncementForm({ title: "", content: "", isPinned: false });
      await fetchClubDetails();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to post announcement", "error");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await deleteClubAnnouncement(club._id || club.id, announcementId);
      showNotification("Announcement deleted", "success");
      await fetchClubDetails();
    } catch (err) {
      showNotification("Failed to delete announcement", "error");
    }
  };

  const handleTogglePinAnnouncement = async (announcementId) => {
    try {
      await togglePinClubAnnouncement(club._id || club.id, announcementId);
      await fetchClubDetails();
    } catch (err) {
      showNotification("Failed to update pin status", "error");
    }
  };

  const handleCreateAchievement = async (e) => {
    e.preventDefault();
    if (!achievementForm.title) return;
    setSubmittingAdmin(true);
    try {
      await createClubAchievement(club._id || club.id, achievementForm);
      showNotification("Achievement added successfully!", "success");
      setAchievementForm({ title: "", description: "", date: "", imageUrl: "", externalUrl: "" });
      await fetchClubDetails();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to add achievement", "error");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteAchievement = async (achievementId) => {
    if (!window.confirm("Delete this achievement?")) return;
    try {
      await deleteClubAchievement(club._id || club.id, achievementId);
      showNotification("Achievement deleted", "success");
      await fetchClubDetails();
    } catch (err) {
      showNotification("Failed to delete achievement", "error");
    }
  };

  const handleAddGalleryMedia = async (e) => {
    e.preventDefault();
    if (!galleryForm.url) return;
    setSubmittingAdmin(true);
    try {
      await addClubGalleryMedia(club._id || club.id, galleryForm);
      showNotification("Photo added to club gallery!", "success");
      setGalleryForm({ url: "", caption: "", albumTitle: "General" });
      await fetchClubDetails();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to add photo", "error");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteGalleryMedia = async (mediaId) => {
    if (!window.confirm("Delete this photo from gallery?")) return;
    try {
      await deleteClubGalleryMedia(club._id || club.id, mediaId);
      showNotification("Photo deleted", "success");
      await fetchClubDetails();
    } catch (err) {
      showNotification("Failed to delete photo", "error");
    }
  };

  const handleToggleFeatureEvent = async (eventId) => {
    try {
      await toggleEventFeatured(eventId);
      showNotification("Event featured status updated", "success");
      await fetchClubDetails();
    } catch (err) {
      showNotification("Failed to feature event", "error");
    }
  };

  const getFullEvent = (e) => ({
    ...e,
    club: e.club || { clubName: club.clubName, clubLogo: club.clubLogo },
    status:
      e.status ||
      (new Date(e.startTime) <= now && new Date(e.endTime) >= now
        ? "LIVE"
        : new Date(e.startTime) > now
        ? "UPCOMING"
        : "ENDED"),
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ShimmerText text="Loading Club Details..." className="text-sm font-semibold tracking-wider" />
      </div>
    );

  if (!club)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-bold text-lg">Club not found.</p>
      </div>
    );

  const announcements = club.announcements || [];
  const achievements = club.achievements || [];
  const galleryMedia = club.mediaList || club.media || [];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-white pb-24 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xs relative">
          
          {/* Banner Cover Image Container */}
          <div className="relative w-full h-44 sm:h-56 md:h-64 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800 overflow-hidden">
            <img
              src={club.bannerImage || club.coverImage || "/mainbuilding.jpeg"}
              alt={`${club.clubName} Banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/collegeimg.jpeg";
              }}
            />
            
            {/* Subtle Gradient Shade on Banner */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />

            {/* LinkedIn-style Edit Banner Icon */}
            {canEdit && (
              <button
                onClick={() => setBannerModalOpen(true)}
                title="Change & Adjust Cover Banner"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 shadow-md backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60 hover:scale-105"
              >
                <i className="ri-pencil-line text-sm" />
              </button>
            )}
          </div>

          <div className="px-4 sm:px-7 pb-5 sm:pb-6 relative">
            
            {/* Top Row: Avatar overlapping banner + Action buttons aligned on right */}
            <div className="flex items-end justify-between gap-3 -mt-12 sm:-mt-16 md:-mt-18 mb-3 sm:mb-4">
              
              {/* Overlapping Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 border-white dark:border-neutral-900 bg-white dark:bg-neutral-800 shadow-md overflow-hidden flex items-center justify-center">
                  <img
                    src={heroLogoSrc}
                    alt={club.clubName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackLogo;
                    }}
                  />
                </div>
                {canEdit && (
                  <button
                    onClick={() => setAdminHubOpen(true)}
                    title="Change Logo"
                    className="absolute bottom-0.5 right-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 shadow-md border-2 border-white dark:border-neutral-900 flex items-center justify-center transition-all cursor-pointer text-xs"
                  >
                    <i className="ri-pencil-line" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pb-1">
                <button
                  onClick={handleShareClub}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition font-semibold text-xs uppercase tracking-wider shadow-2xs cursor-pointer"
                >
                  <i className="ri-share-line text-sm" />
                  <span>Share</span>
                </button>

                {canEdit && (
                  <button
                    onClick={() => setAdminHubOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:opacity-90 transition font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                  >
                    <i className="ri-dashboard-line text-sm" />
                    <span>Manage Club</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Info (Left) & Stats (Right) Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
              {/* Left Column: Category Badges, Club Title, Motto */}
              <div className="space-y-1.5 min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full">
                    {club.category || "Student Club"}
                  </span>
                  
                  {club.establishedYear && (
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                      Est. {club.establishedYear}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                  {club.clubName}
                </h1>

                {club.motto && (
                  <p className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400 italic tracking-wide">
                    "{club.motto}"
                  </p>
                )}

                {club.mission && !club.motto && (
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {club.mission}
                  </p>
                )}
              </div>

              {/* Right Column: Compact Stat Boxes */}
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-1 md:pt-0">
                <div className="text-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs min-w-[76px]">
                  <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white leading-tight">
                    {studentMembers.length}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Members
                  </div>
                </div>

                <div className="text-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs min-w-[76px]">
                  <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white leading-tight">
                    {upcomingEvents.length + liveEvents.length}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Upcoming
                  </div>
                </div>

                <div className="text-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs min-w-[76px]">
                  <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white leading-tight">
                    {pastEvents.length}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Past Events
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Fast-Action Bar (If authorized) */}
            {(canEdit || isHead) && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-neutral-100 dark:border-neutral-800/80">
                <Link
                  to="/create"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-xs uppercase tracking-wider shadow-xs"
                >
                  <i className="ri-add-line font-light" /> Create Event
                </Link>
                {isHead && (
                  <>
                    <Link
                      to={`/club/edit/${club._id || club.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition font-semibold text-xs uppercase tracking-wider"
                    >
                      <i className="ri-settings-3-line font-light" /> Club Settings
                    </Link>
                    <Link
                      to={`/club/${club._id || club.id}/team`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition font-semibold text-xs uppercase tracking-wider"
                    >
                      <i className="ri-team-line font-light" /> Manage Members
                    </Link>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 relative z-20 space-y-8">

      

        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 dark:text-neutral-500">
              About the Club
            </h2>
            {club.establishedYear && (
              <span className="text-xs text-neutral-500 font-medium">
                Serving NITJ since {club.establishedYear}
              </span>
            )}
          </div>

          {/* Mission Statement Banner */}
          {club.mission && (
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 shadow-2xs">
             
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-0.5">
                  Club Mission
                </p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed italic">
                  "{club.mission}"
                </p>
              </div>
            </div>
          )}

          {/* Rich Description */}
          {(() => {
            const descHtml =
              club.description ||
              "<p>The official student group dedicated to community, innovation, and campus spirit.</p>";
            const plainText = descHtml.replace(/<[^>]*>?/gm, "").trim();
            const isLong = plainText.length > 180;
            return (
              <div>
                <div
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isLong && !isDescriptionExpanded ? "max-h-[5.5rem] line-clamp-3" : "max-h-[2000px]"
                  }`}
                >
                  <div
                    className="campusnode-markdown-preview text-neutral-700 dark:text-neutral-300 text-sm font-medium leading-relaxed px-0"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(descHtml),
                    }}
                  />
                </div>
                {isLong && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-3 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline focus:outline-none inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isDescriptionExpanded ? "Show less" : "Read full overview"}</span>
                    <i
                      className={`ri-arrow-down-s-line text-sm transition-transform duration-300 ${
                        isDescriptionExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Quick Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                Faculty Coordinator
              </p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {club.facultyName || club.facultyCoordinator?.name || "Not Assigned"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                Student Coordinator / Lead
              </p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {studentHeads.length > 0
                  ? studentHeads.map((h) => h.student?.name).filter(Boolean).join(", ")
                  : club.studentCoordinators && club.studentCoordinators.length > 0
                  ? club.studentCoordinators.join(", ")
                  : "Not Assigned"}
              </p>
            </div>
          </div>
        </section>

        {club.socialLinks && club.socialLinks.length > 0 && (
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Connect with {club.clubName}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Follow our official social handles & community channels
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {club.socialLinks.map((link, i) => {
                const platform = link.platform?.toLowerCase() || "website";
                const iconProps = { className: "w-7 h-7" };

                const getIcon = () => {
                  if (platform.includes("instagram")) return <InstagramIcon {...iconProps} size={28}/>;
                  if (platform.includes("linkedin")) return <LinkedinIcon {...iconProps} size={28}/>;
                  if (platform.includes("twitter") || platform.includes("x"))
                    return <TwitterIcon {...iconProps} size={28}/>;
                  if (platform.includes("github")) return <GithubIcon {...iconProps} size={28}/>;
                  if (platform.includes("whatsapp")) return <MessageCircleIcon {...iconProps} size={28}/>;
                  if (platform.includes("website")) return <EarthIcon {...iconProps} size={32}/>;
                  return <i className="ri-links-line text-base" />;
                };

                return (
                  <a
                    key={link._id || i}
                    href={
                      platform === "whatsapp"
                        ? `https://wa.me/${link.url.replace(/\s+/g, "")}`
                        : link.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
                    title={link.platform}
                  >
                    {getIcon()}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {featuredEvent && (
          <section className=" text-black rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden shadow-orange-500 border border-orange-200 ">
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none transform translate-x-8 translate-y-8">
              <i className="ri-fire-fill text-[160px] text-orange-600" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1  rounded-full text-[10px] font-black uppercase tracking-widest text-orange-600">
                  Featured Club Event
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {featuredEvent.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-black pt-1">
                  <span>
                    <i className="ri-calendar-line mr-1" />
                    {new Date(featuredEvent.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>
                    <i className="ri-time-line mr-1" />
                    {new Date(featuredEvent.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>
                    <i className="ri-map-pin-line mr-1" />
                    {featuredEvent.venue}
                  </span>
                </div>
              </div>

              <Link
                to={`/events/${featuredEvent.slug || featuredEvent._id || featuredEvent.id}`}
                className="px-6 py-3 bg-white text-neutral-900 hover:bg-neutral-100 transition rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 flex-shrink-0"
              >
                View Event <i className="ri-arrow-right-line" />
              </Link>
            </div>
          </section>
        )}


        {(announcements.length > 0 || canEdit || isHead) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <i className="ri-megaphone-line text-orange-600 font-light" /> Club Announcements
              </h2>
              <div className="flex-1 border-b border-neutral-300 dark:border-neutral-600 mx-2"/>
                
              
              <div className="flex items-center gap-2">
                {announcements.length > 0 && (
                  <span className="text-xs text-neutral-400 font-medium mr-1">
                    {announcements.length} {announcements.length === 1 ? "update" : "updates"}
                  </span>
                )}
                {(canEdit || isHead) && (
                  <button
                    onClick={() => {
                      setAdminTab("announcements");
                      setAdminHubOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 hover:bg-orange-600 hover:text-white transition text-xs font-bold cursor-pointer"
                  >
                    <i className="ri-add-line" /> Post Announcement
                  </button>
                )}
              </div>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(isAnnouncementsExpanded ? announcements : announcements.slice(0, 6)).map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        item.isPinned
                          ? "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/30"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          {item.isPinned && (
                            <i className="ri-pushpin-fill text-orange-600 text-xs" title="Pinned Announcement" />
                          )}
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                      {item.authorName && (
                        <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                          Posted by {item.authorName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {announcements.length > 6 && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAnnouncementsExpanded((prev) => !prev)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700 hover:border-orange-500/50 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>
                        {isAnnouncementsExpanded
                          ? "Show Less"
                          : `View All Announcements (${announcements.length})`}
                      </span>
                      <i className={isAnnouncementsExpanded ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
                <i className="ri-megaphone-line text-2xl text-neutral-400 font-light" />
                <p className="text-xs font-semibold text-neutral-500">No announcements posted yet.</p>
                <button
                  onClick={() => {
                    setAdminTab("announcements");
                    setAdminHubOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-700 transition cursor-pointer"
                >
                  <i className="ri-add-line" /> Post First Announcement
                </button>
              </div>
            )}
          </section>
        )}

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
 Club Events & Calendar
              </h2>
              <p className="text-xs text-neutral-400">Browse schedules, workshops, and activities</p>
            </div>

            {/* View Switcher */}
            <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                onClick={() => setEventViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  eventViewMode === "list"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <i className="ri-list-check" /> Event List
              </button>
              <button
                onClick={() => setEventViewMode("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  eventViewMode === "calendar"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <i className="ri-calendar-line" /> Calendar View
              </button>
            </div>
          </div>

          {eventViewMode === "calendar" ? (
            <ClubCalendarView events={events} />
          ) : (
            <div className="space-y-8">
              {liveEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      Live Now
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveEvents.map((e) => (
                      <EventCard
                        key={e._id || e.id}
                        event={getFullEvent(e)}
                        isRegistered={registeredEvents.includes(e._id || e.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-500 mb-4">
                  Upcoming Events
                </h3>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(isUpcomingEventsExpanded ? upcomingEvents : upcomingEvents.slice(0, 6)).map((e) => (
                        <EventCard
                          key={e._id || e.id}
                          event={getFullEvent(e)}
                          isRegistered={registeredEvents.includes(e._id || e.id)}
                        />
                      ))}
                    </div>

                    {upcomingEvents.length > 6 && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setIsUpcomingEventsExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700 hover:border-orange-500/50 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>
                            {isUpcomingEventsExpanded
                              ? "Show Less"
                              : `View All Upcoming Events (${upcomingEvents.length})`}
                          </span>
                          <i className={isUpcomingEventsExpanded ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 py-10 text-center rounded-2xl">
                    <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                      No upcoming events scheduled right now.
                    </p>
                  </div>
                )}
              </div>

              {pastEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">
                    Past Events
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(isPastEventsExpanded ? pastEvents : pastEvents.slice(0, 6)).map((e) => (
                        <EventCard
                          key={e._id || e.id}
                          event={getFullEvent(e)}
                          isRegistered={registeredEvents.includes(e._id || e.id)}
                        />
                      ))}
                    </div>

                    {pastEvents.length > 6 && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPastEventsExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700 hover:border-orange-500/50 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>
                            {isPastEventsExpanded
                              ? "Show Less"
                              : `View All Past Events (${pastEvents.length})`}
                          </span>
                          <i className={isPastEventsExpanded ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

      

        {((club.facultyName || club.facultyCoordinator?.name) ||
          studentHeads.length > 0 ||
          studentCoordinators.length > 0 ||
          regularMembers.length > 0) && (
          <section className="w-full space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Club Leadership & Team
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">Guiding faculty, student coordinators, and active members</p>
              </div>
            </div>

            <div className="space-y-8 sm:space-y-10">
              {/* Leadership Row */}
              {((club.facultyName || club.facultyCoordinator?.name) || studentHeads.length > 0) && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-500">
                      Leadership
                    </h3>
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                    {(club.facultyName || club.facultyCoordinator?.name) && (
                      <TeamMemberCard
                        name={club.facultyName || club.facultyCoordinator?.name}
                        role="Faculty Coordinator"
                        image={club.facultyCoordinator?.profileImage}
                        email={club.facultyEmail || club.facultyCoordinator?.email}
                        isLeadership={true}
                      />
                    )}

                    {/* Student Lead Cards */}
                    {studentHeads.map((m) => (
                      <TeamMemberCard
                        key={m.id}
                        name={m.student?.name}
                        role="Student Lead"
                        image={m.student?.profileImage || m.student?.profilePicture || m.student?.picture}
                        subtitle={[m.student?.branch, m.student?.year].filter(Boolean).join(" · ")}
                        student={m.student}
                        isLeadership={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinators Grid */}
              {studentCoordinators.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-500">
                      Coordinators
                    </h3>
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-5">
                    {studentCoordinators.map((m) => (
                      <TeamMemberCard
                        key={m.id}
                        name={m.student?.name}
                        role="Coordinator"
                        image={m.student?.profileImage || m.student?.profilePicture || m.student?.picture}
                        subtitle={[m.student?.branch, m.student?.year].filter(Boolean).join(" · ")}
                        student={m.student}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Members Grid */}
              {regularMembers.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-500">
                      Club Members ({regularMembers.length})
                    </h3>
                    {/* <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-12 sm:w-16" /> */}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-5">
                    {regularMembers.map((m) => (
                      <TeamMemberCard
                        key={m.id}
                        name={m.student?.name}
                        role="Member"
                        image={m.student?.profileImage || m.student?.profilePicture || m.student?.picture}
                        subtitle={[m.student?.branch, m.student?.year].filter(Boolean).join(" · ")}
                        student={m.student}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}



        {achievements.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <i className="ri-trophy-line text-amber-500 font-light" /> Milestones & Achievements
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {item.date || "Milestone"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                    >
                      Read more <i className="ri-external-link-line text-xs" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {galleryMedia.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Club Gallery
              </h2>
              <div className="flex-1 border-b border-neutral-300 dark:border-neutral-600 mx-2"/>
              {galleryMedia.length > 0 && (
                <span className="text-xs text-neutral-400 font-semibold">
                  {galleryMedia.length} {galleryMedia.length === 1 ? "photo" : "photos"}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {(isGalleryExpanded ? galleryMedia : galleryMedia.slice(0, 6)).map((m, idx) => {
                  const imgUrl = typeof m === "string" ? m : m.url;
                  const caption = typeof m === "object" ? m.caption : null;
                  return (
                    <div
                      key={idx}
                      onClick={() => setLightboxImage(imgUrl)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-xs"
                    >
                      <img
                        src={imgUrl}
                        alt={caption || `Gallery ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[11px] font-medium truncate">
                          {caption}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {galleryMedia.length > 6 && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGalleryExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700 hover:border-orange-500/50 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>
                      {isGalleryExpanded
                        ? "Show Less"
                        : `View All Photos (${galleryMedia.length})`}
                    </span>
                    <i className={isGalleryExpanded ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"} />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {((club.sponsors && club.sponsors.length > 0) || (club.clubSponsors && club.clubSponsors.length > 0)) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Sponsors & Partners
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              {(club.sponsors || club.clubSponsors || []).map((s, idx) => {
                const logoUrl = typeof s === "string" ? s : s.logoUrl;
                const name = typeof s === "object" ? s.name : "Sponsor";
                const website = typeof s === "object" ? s.websiteUrl : null;
                return website ? (
                  <a
                    key={idx}
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 max-w-[140px] transition opacity-100 flex items-center justify-center"
                    title={name}
                  >
                    <img src={logoUrl} alt={name} className="h-full max-h-12 object-contain" />
                  </a>
                ) : (
                  <div
                    key={idx}
                    className="h-12 max-w-[140px] transition  flex items-center justify-center"
                    title={name}
                  >
                    <img src={logoUrl} alt={name} className="h-full max-h-12 object-contain" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        
      </div>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Lightbox"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-orange-400 font-bold text-sm flex items-center gap-1"
            >
              <i className="ri-close-line text-xl" /> Close
            </button>
          </div>
        </div>
      )}

      {adminHubOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center text-lg shrink-0">
                  <i className="ri-settings-3-line" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">
                    Club Management Hub
                  </h3>
                  <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">Post updates, achievements, and curate gallery</p>
                </div>
              </div>
              <button
                onClick={() => setAdminHubOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                title="Close"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 px-6 pt-4 pb-3 border-b border-[#F0F0F0] dark:border-[#2A2A2A] shrink-0">
              {[
                { id: "announcements", label: "Announcements", icon: "ri-megaphone-line" },
                { id: "achievements", label: "Achievements", icon: "ri-trophy-line" },
                { id: "gallery", label: "Gallery", icon: "ri-image-line" },
                { id: "featured", label: "Feature Event", icon: "ri-star-line" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    adminTab === tab.id
                      ? "bg-[#FFF7ED] text-[#F97316] border border-orange-200/80 dark:bg-[#2A1A0F] dark:text-[#FB923C] dark:border-orange-900/60"
                      : "bg-transparent text-[#555555] dark:text-[#B5B5B5] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] border border-transparent"
                  }`}
                >
                  <i className={tab.icon} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-[#555555] dark:text-[#B5B5B5]">
              {/* TAB: ANNOUNCEMENTS */}
              {adminTab === "announcements" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Publish New Announcement
                    </h4>
                    <input
                      type="text"
                      placeholder="Announcement Title"
                      value={announcementForm.title}
                      onChange={(e) =>
                        setAnnouncementForm({ ...announcementForm, title: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                      required
                    />
                    <textarea
                      rows="3"
                      placeholder="Announcement content..."
                      value={announcementForm.content}
                      onChange={(e) =>
                        setAnnouncementForm({ ...announcementForm, content: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors resize-none"
                      required
                    />
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#555555] dark:text-[#B5B5B5] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={announcementForm.isPinned}
                          onChange={(e) =>
                            setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })
                          }
                          className="rounded accent-[#F97316]"
                        />
                        Pin to top
                      </label>
                      <button
                        type="submit"
                        disabled={submittingAdmin}
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAdmin ? "Publishing..." : "Post Announcement"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3 pt-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Existing Announcements
                    </h4>
                    {announcements.map((a) => (
                      <div
                        key={a.id}
                        className="p-3.5 rounded-xl border border-[#E5E5E5] dark:border-[#303030] flex items-center justify-between gap-3 bg-[#FAFAFA] dark:bg-[#222222]"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5] truncate">
                            {a.title}
                          </h5>
                          <p className="text-[11px] text-[#888888] dark:text-[#808080] truncate">{a.content}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePinAnnouncement(a.id)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                              a.isPinned
                                ? "bg-[#FFF7ED] border-orange-200/80 text-[#F97316] dark:bg-[#2A1A0F] dark:border-orange-900/60 dark:text-[#FB923C]"
                                : "border-[#E5E5E5] dark:border-[#3A3A3A] text-[#888888] dark:text-[#808080]"
                            }`}
                            title={a.isPinned ? "Unpin" : "Pin"}
                          >
                            <i className="ri-pushpin-line" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(a.id)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs cursor-pointer"
                            title="Delete"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ACHIEVEMENTS */}
              {adminTab === "achievements" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateAchievement} className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Add Club Achievement / Award
                    </h4>
                    <input
                      type="text"
                      placeholder="Achievement Title (e.g. 1st Prize at Smart India Hackathon)"
                      value={achievementForm.title}
                      onChange={(e) =>
                        setAchievementForm({ ...achievementForm, title: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Year / Date (e.g. 2026 or Oct 2025)"
                        value={achievementForm.date}
                        onChange={(e) =>
                          setAchievementForm({ ...achievementForm, date: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                      />
                      <input
                        type="url"
                        placeholder="External Link / Certificate URL (Optional)"
                        value={achievementForm.externalUrl}
                        onChange={(e) =>
                          setAchievementForm({ ...achievementForm, externalUrl: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                      />
                    </div>
                    <textarea
                      rows="2"
                      placeholder="Brief description of the accomplishment..."
                      value={achievementForm.description}
                      onChange={(e) =>
                        setAchievementForm({ ...achievementForm, description: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingAdmin}
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAdmin ? "Adding..." : "Add Achievement"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3 pt-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Existing Achievements
                    </h4>
                    {achievements.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-[#E5E5E5] dark:border-[#303030] flex items-center justify-between gap-3 bg-[#FAFAFA] dark:bg-[#222222]"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5] truncate">
                            {item.title}
                          </h5>
                          <p className="text-[11px] text-[#888888] dark:text-[#808080] truncate">
                            {item.date} · {item.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAchievement(item.id)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs cursor-pointer"
                          title="Delete"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: GALLERY */}
              {adminTab === "gallery" && (
                <div className="space-y-6">
                  <form onSubmit={handleAddGalleryMedia} className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Add Photo to Club Gallery
                    </h4>
                    <input
                      type="url"
                      placeholder="Image URL (Direct Cloudinary / Web link)"
                      value={galleryForm.url}
                      onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Photo caption / Event name (Optional)"
                      value={galleryForm.caption}
                      onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl border border-[#E5E5E5] dark:border-[#3A3A3A] bg-white dark:bg-[#222222] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingAdmin}
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAdmin ? "Adding..." : "Add to Gallery"}
                      </button>
                    </div>
                  </form>

                  {/* Existing media items */}
                  <div className="space-y-3 pt-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Gallery Items
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {galleryMedia.map((m, i) => {
                        const imgUrl = typeof m === "string" ? m : m.url;
                        const mediaId = typeof m === "object" ? m.id : null;
                        return (
                          <div
                            key={i}
                            className="relative aspect-square rounded-xl overflow-hidden bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] group"
                          >
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            {mediaId && (
                              <button
                                onClick={() => handleDeleteGalleryMedia(mediaId)}
                                className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs shadow-xs"
                                title="Delete photo"
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FEATURE EVENT */}
              {adminTab === "featured" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                      Select Spotlight / Featured Event
                    </h4>
                    <p className="text-xs text-[#888888] dark:text-[#808080] mt-0.5">
                      Choose an event to feature prominently at the top banner of the Club Page.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {events.map((ev) => (
                      <div
                        key={ev._id || ev.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          ev.isFeatured
                            ? "bg-[#FFF7ED] border-orange-200/80 dark:bg-[#2A1A0F] dark:border-orange-900/60"
                            : "bg-[#FAFAFA] dark:bg-[#222222] border-[#E5E5E5] dark:border-[#303030]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5] truncate">
                            {ev.title}
                          </h5>
                          <p className="text-[11px] text-[#888888] dark:text-[#808080]">
                            {new Date(ev.startTime).toLocaleDateString()} · {ev.venue}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleFeatureEvent(ev._id || ev.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs ${
                            ev.isFeatured
                              ? "bg-[#F97316] text-white hover:bg-[#EA580C] dark:bg-[#FB923C] dark:text-[#111111] dark:hover:bg-[#F97316]"
                              : "bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#2A2A2A]"
                          }`}
                        >
                          {ev.isFeatured ? "Featured ✓" : "Feature"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BannerCropModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        clubId={club?._id || club?.id}
        currentBannerUrl={club?.bannerImage || club?.coverImage}
        onSuccess={(newBannerUrl) => {
          if (newBannerUrl) {
            setClub((prev) => (prev ? { ...prev, bannerImage: newBannerUrl } : prev));
          }
          fetchClubDetails();
        }}
      />
    </div>
  );
};

export default ClubDetails;