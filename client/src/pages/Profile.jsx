import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cachedFetch, invalidateCache } from '../lib/cacheManager';
import { markdownToHtml } from '../utils/htmlMarkdownConverter';
import '../components/WysiwygMarkdownEditor.css';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getMe, uploadProfilePhoto } from '../services/userService';
import { getUserEvents, getClubManagedEvents } from '../services/eventService';
import { getClubById, getClubMembers } from '../services/clubService';
import { calculateAcademicProgress } from '../utils/academicProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Calendar, Trophy, Users, Shield, ArrowUpRight, ExternalLink } from 'lucide-react';
import { isClubManagementRole, isStudentLeadRole } from '../utils/rbac';
import ShimmerText from '../components/ShimmerText';


const ClubLogoImage = ({ clubLogo, clubName }) => {
  const { isDark } = useTheme();
  const fallbackLogo = isDark ? "/darkthemelogo.png" : "/lightthemelogo.png";
  const [logoSrc, setLogoSrc] = useState(() => clubLogo || fallbackLogo);

  useEffect(() => {
    if (clubLogo) {
      setLogoSrc(clubLogo);
    } else {
      setLogoSrc(fallbackLogo);
    }
  }, [clubLogo, fallbackLogo]);

  return (
    <img
      src={logoSrc}
      alt={clubName || 'Club Logo'}
      className="w-full h-full object-cover"
      onError={() => {
        if (logoSrc !== fallbackLogo) {
          setLogoSrc(fallbackLogo);
        }
      }}
    />
  );
};

const ClubDescription = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!description) return;
    const plainText = description.replace(/<[^>]*>?/gm, '').trim();
    const isLongText = plainText.length > 180 || description.includes('\n') || (description.match(/<p>/g) || []).length > 1;

    const checkOverflow = () => {
      if (contentRef.current) {
        const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight + 4;
        setShowButton(isLongText || isOverflowing);
      } else {
        setShowButton(isLongText);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [description]);

  if (!description) return null;

  return (
    <div>
      <div
        ref={contentRef}
        className={`transition-all duration-300 ${
          !isExpanded ? 'line-clamp-3 sm:line-clamp-4 overflow-hidden' : ''
        }`}
      >
        <div
          className="campusnode-markdown-preview text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed px-0"
          dangerouslySetInnerHTML={{
            __html: markdownToHtml(description),
          }}
        />
      </div>

      {showButton && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors focus:outline-none"
        >
          <span>{isExpanded ? 'Show less' : 'Expand description'}</span>
          <i
            className={`ri-arrow-down-s-line text-sm transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
};

const SocialProfilesSection = ({ user }) => (
  <div className="mt-8 pt-6 border-t border-border">
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Social Profiles</h3>
    <div className="flex flex-wrap gap-2">
      {user?.githubProfile && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border">
          <a href={user.githubProfile} target="_blank" rel="noopener noreferrer">
            <i className="ri-github-fill text-base" /> GitHub
          </a>
        </Button>
      )}
      {user?.linkedinProfile && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border text-blue-600 dark:text-blue-400">
          <a href={user.linkedinProfile} target="_blank" rel="noopener noreferrer">
            <i className="ri-linkedin-box-fill text-base" /> LinkedIn
          </a>
        </Button>
      )}
      {user?.xProfile && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border">
          <a href={user.xProfile} target="_blank" rel="noopener noreferrer">
            <i className="ri-twitter-x-fill text-base" /> X
          </a>
        </Button>
      )}
      {user?.instagramProfile && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border text-pink-600 dark:text-pink-400">
          <a href={user.instagramProfile} target="_blank" rel="noopener noreferrer">
            <i className="ri-instagram-line text-base" /> Instagram
          </a>
        </Button>
      )}
      {user?.whatsappNumber && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border text-emerald-600 dark:text-emerald-400">
          <a href={`https://wa.me/${user.whatsappNumber.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer">
            <i className="ri-whatsapp-line text-base" /> WhatsApp
          </a>
        </Button>
      )}
      {user?.portfolioUrl && (
        <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs font-medium border-border text-primary">
          <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer">
            <i className="ri-global-line text-base" /> Portfolio
          </a>
        </Button>
      )}
      {!user?.githubProfile && !user?.linkedinProfile && !user?.xProfile && !user?.instagramProfile && !user?.whatsappNumber && !user?.portfolioUrl && (
        <p className="text-xs text-muted-foreground italic font-medium">No social profiles added.</p>
      )}
    </div>
  </div>
);

const AchievementsSection = ({ winnings }) => (
  <Card className="border-border bg-card shadow-xs">
    <CardHeader className="pb-4">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        <CardTitle className="text-base font-bold">Achievements & Winnings</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      {winnings && winnings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {winnings.map((w, index) => (
            <div key={index} className="flex items-center gap-3 bg-muted/20 p-3.5 border border-border rounded-xl">
              <div className="size-9 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                <i className="ri-award-fill text-amber-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none mb-1">
                  {w.rank === 1 ? '🥇 1st Place / Winner' : w.rank === 2 ? '🥈 2nd Place / Runner Up' : w.rank === 3 ? '🥉 3rd Place' : `#${w.rank} Position`}
                </p>
                <Link to={`/event/${w.eventSlug}`} className="text-sm font-semibold text-foreground hover:text-primary hover:underline truncate block">
                  {w.eventTitle}
                </Link>
                {w.clubName && (
                  <p className="text-[10px] text-muted-foreground font-medium">by {w.clubName}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 p-6 rounded-xl border border-border text-center">
          <Trophy className="size-8 text-amber-500/50 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No achievements recorded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Participate and win in campus events to earn trophies and appear on the leaderboard!</p>
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Unified club section — management cards for leads/coordinators, simple tiles for members.
 * Replaces the two old separate sections: EnrolledClubsSection + Club Leadership Hub.
 */
const ClubsSection = ({ user, clubsMap }) => {
  const memberships = user?.memberships || [];

  const roleLabel = (role) =>
    role === 'CLUB_HEAD' ? 'Student Lead'
    : role === 'COORDINATOR' ? 'Coordinator'
    : 'Member';

  const resolveLogo = (m) =>
    m.clubLogo ||
    m.club?.clubLogo ||
    clubsMap?.[m.clubId] ||
    clubsMap?.[m.slug] ||
    (m.clubName && clubsMap?.[m.clubName.toLowerCase()]);

  const managementMemberships = memberships.filter(m => isClubManagementRole(m.role));
  const memberOnlyMemberships = memberships.filter(m => !isClubManagementRole(m.role));

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <CardTitle className="text-base font-bold">Clubs & Societies</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {memberships.length === 0 && (
          <div className="bg-muted/20 p-6 border border-border rounded-xl text-center">
            <i className="ri-building-4-line text-3xl text-muted-foreground mb-2 inline-block" />
            <p className="text-sm font-semibold text-foreground">Not enrolled in any clubs yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Discover campus clubs, join events, and get involved!</p>
            <Button asChild size="sm" className="font-semibold shadow-xs">
              <Link to="/clubs">
                <i className="ri-compass-3-line text-sm mr-1" /> Explore Clubs
              </Link>
            </Button>
          </div>
        )}

        {/* Management cards: Student Leads & Coordinators */}
        {managementMemberships.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <i className="ri-shield-star-line text-sm" /> Leadership & Management
            </p>
            {managementMemberships.map((m, idx) => {
              const isLead = isStudentLeadRole(m.role);
              const logo = resolveLogo(m);
              return (
                <div
                  key={m.clubId || idx}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Club identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-2xs">
                      <ClubLogoImage clubLogo={logo} clubName={m.clubName} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm">{m.clubName || 'Club'}</h3>
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full border ${
                          isLead
                            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-brand-50 text-brand-800 border-brand-300 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-800'
                        }`}>
                          {roleLabel(m.role)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {isLead
                          ? 'Full authority over events, memberships, and settings.'
                          : 'Coordinate events and manage member rosters.'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800 shrink-0">
                    <Link
                      to={`/club-events/${m.clubId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                    >
                      <i className="ri-calendar-event-line text-xs font-light" /> Events
                    </Link>
                    <Link
                      to={`/club/${m.clubId}/team`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200/70 dark:bg-neutral-700/60 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <i className="ri-team-line text-xs font-light" /> Team
                    </Link>
                    {isLead && (
                      <Link
                        to={`/club/edit/${m.clubId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200/70 dark:bg-neutral-700/60 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <i className="ri-settings-4-line text-xs text-neutral-500 font-light" /> Settings
                      </Link>
                    )}
                    <Link
                      to={`/club/${m.slug || m.clubId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-medium transition-colors"
                    >
                      Public Page <i className="ri-external-link-line text-xs font-light" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Simple member tiles */}
        {memberOnlyMemberships.length > 0 && (
          <div className="space-y-3">
            {managementMemberships.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Also a member of
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {memberOnlyMemberships.map((m, index) => {
                const logo = resolveLogo(m);
                return (
                  <Link
                    key={index}
                    to={`/club/${m.slug || m.clubId}`}
                    className="group bg-muted/10 border border-border hover:border-primary/40 rounded-xl p-4 flex flex-col items-center text-center transition-all duration-200 hover:shadow-xs"
                  >
                    <div className="size-12 rounded-full border border-border overflow-hidden flex items-center justify-center bg-card mb-2.5">
                      <ClubLogoImage clubLogo={logo} clubName={m.clubName} />
                    </div>
                    <h3 className="font-semibold text-foreground text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                      {m.clubName || 'Club Details'}
                    </h3>
                    <Badge variant="secondary" className="mt-2 text-[10px] uppercase font-semibold px-2 py-0">
                      Member
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const { user: authUser, role: authRole, setSession } = useAuth();
  const { showNotification } = useNotification();
  const location = useLocation();
  const [user, setUser] = useState(authUser);
  const [role, setRole] = useState(authRole);
  const [loading, setLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const [winnings, setWinnings] = useState([]);
  const [clubsMap, setClubsMap] = useState({});

  const [clubData, setClubData] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [clubEvents, setClubEvents] = useState([]);

  const fetchClubInfo = useCallback(async (customClubId) => {
    const effectiveClubId =
      customClubId ||
      authUser?.clubId ||
      user?.clubId ||
      authUser?.memberships?.find(m => m.role === 'facultyCoordinator' || m.role === 'FACULTY' || m.role === 'FACULTY_COORDINATOR' || m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR')?.clubId ||
      user?.memberships?.find(m => m.role === 'facultyCoordinator' || m.role === 'FACULTY' || m.role === 'FACULTY_COORDINATOR' || m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR')?.clubId ||
      authUser?.memberships?.[0]?.clubId ||
      user?.memberships?.[0]?.clubId;

    if (effectiveClubId) {
      try {
        const res = await getClubById(effectiveClubId);
        const fetchedClub = res.data?.club || res.data;
        if (fetchedClub) setClubData(fetchedClub);
      } catch (err) {
        console.debug("Error fetching club details in Profile.jsx:", err);
      }

      try {
        const membersRes = await getClubMembers(effectiveClubId);
        const members = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
        setClubMembers(members);
      } catch (err) {
        console.debug("Error fetching club members in Profile.jsx:", err);
      }

      try {
        const eventsRes = await getClubManagedEvents(effectiveClubId);
        const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];
        setClubEvents(events);
      } catch (err) {
        console.debug("Error fetching club events in Profile.jsx:", err);
      }
    }
  }, [authUser, authRole, user?.clubId, user?.memberships]);

  useEffect(() => {
    cachedFetch('/api/clubs', { ttlMs: 15 * 60 * 1000 })
      .then(resData => {
        const clubsList = Array.isArray(resData) ? resData : (resData?.clubs || []);
        const map = {};
        clubsList.forEach(c => {
          if (c.clubLogo) {
            if (c.id || c._id) map[c.id || c._id] = c.clubLogo;
            if (c.slug) map[c.slug] = c.clubLogo;
            if (c.clubName) map[c.clubName.toLowerCase()] = c.clubLogo;
          }
        });
        setClubsMap(map);
      })
      .catch(err => console.debug("Could not fetch clubs map in Profile:", err));
  }, []);

  const isExternalAccount = Boolean(
    role === 'external' ||
    authRole === 'external' ||
    user?.role === 'external' ||
    user?.isExternal ||
    user?.principalType === 'EXTERNAL' ||
    localStorage.getItem('role') === 'external'
  );

  const isFacultyCoordinator = !isExternalAccount && Boolean(
    role === 'facultyCoordinator' ||
    authRole === 'facultyCoordinator' ||
    user?.principalType === 'FACULTY' ||
    user?.role === 'facultyCoordinator' ||
    (user?.userType === 'admin' && user?.role === 'facultyCoordinator') ||
    user?.memberships?.some(m => m.role === 'FACULTY_COORDINATOR' || m.role === 'facultyCoordinator' || m.role === 'FACULTY') ||
    localStorage.getItem('role') === 'facultyCoordinator'
  );

  const isStudentAccount = !isFacultyCoordinator && !isExternalAccount && Boolean(
    user?.rollNo ||
    user?.branch ||
    user?.expectedGraduationYear ||
    user?.academicYear ||
    user?.year ||
    role === 'student' ||
    role === 'member' ||
    localStorage.getItem('role') === 'member' ||
    localStorage.getItem('role') === 'student'
  );

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setRole(authRole);
      fetchClubInfo();

      const canFetchEvents = Boolean(
        isFacultyCoordinator ||
        authUser?.rollNo ||
        authUser?.branch ||
        authUser?.collegeName ||
        authRole === 'member' ||
        authRole === 'student' ||
        authRole === 'external' ||
        authRole === 'facultyCoordinator' ||
        authUser?.principalType === 'FACULTY'
      );
      if (canFetchEvents) {
        getUserEvents(authUser.id || authUser._id)
          .then(res => {
            const participations = res.data || [];
            const winningsList = [];
            participations.forEach(p => {
              const ev = p.eventId || p.event;
              if (ev && ev.winners && Array.isArray(ev.winners)) {
                const match = ev.winners.find(w =>
                  (w.studentId && String(w.studentId) === String(authUser.id || authUser._id)) ||
                  (w.rollNo && authUser.rollNo && String(w.rollNo).trim().toLowerCase() === authUser.rollNo.trim().toLowerCase()) ||
                  (w.email && authUser.email && String(w.email).trim().toLowerCase() === authUser.email.trim().toLowerCase()) ||
                  (w.name && authUser.name && String(w.name).toLowerCase().includes(authUser.name.toLowerCase()))
                );
                if (match) {
                  winningsList.push({
                    eventTitle: ev.title,
                    eventSlug: ev.slug || ev.id || ev._id,
                    rank: match.rank,
                    date: ev.startTime,
                    clubName: ev.club?.clubName
                  });
                }
              }
            });
            setWinnings(winningsList);
          })
          .catch(err => {
            console.error("Error fetching winnings in Profile.jsx:", err);
          });
      }
    }
    setLoading(false);
  }, [authUser?.id, authUser?.rollNo, authRole, fetchClubInfo, isFacultyCoordinator]);

  // Handle hash scrolling (e.g. #announcements)
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (hash) {
      const targetId = hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [location.hash, clubData]);

  if (!user) return <div className="text-center mt-10">Please login to view profile.</div>;
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <ShimmerText text="Loading profile..." className="text-sm font-semibold tracking-wider" />
      </div>
    );
  }

  // Dynamic Academic Progress for Students / Student Leads
  const studentProgress = isStudentAccount ? calculateAcademicProgress(user) : null;
  const displayAcademicYear = user?.academicYearLabel || studentProgress?.academicYearLabel || user?.year;
  const displaySemester = user?.semesterLabel || studentProgress?.semesterLabel;
  const displayAcademicStanding = [displayAcademicYear, displaySemester].filter(Boolean).join(" • ");
  const displayGraduationYear = user?.expectedGraduationYear || studentProgress?.expectedGraduationYear;

  // Statistics calculations for Club Profile
  const totalMembersCount = clubMembers.filter(m => !m.isClubAccount).length;
  const totalEventsCount = clubEvents.length;
  const totalRegistrationsCount = clubEvents.reduce((sum, ev) => sum + (Number(ev.registeredCount) || 0), 0);

  const isClubSelf = (m) => {
    if (m.isClubAccount) return true;
    const studentEmail = (m.student?.email || m.email || '').trim().toLowerCase();
    const clubEmail = (clubData?.clubEmail || user?.email || '').trim().toLowerCase();
    if (studentEmail && clubEmail && studentEmail === clubEmail) return true;
    if (clubData?.slug && studentEmail.startsWith(clubData.slug.toLowerCase())) return true;
    const studentName = (m.student?.name || m.name || '').trim().toLowerCase();
    const clubName = (clubData?.clubName || user?.name || '').trim().toLowerCase();
    if (studentName && clubName && studentName === clubName) return true;
    if (!m.student?.rollNo && !m.rollNo) return true;
    return false;
  };

  // Leadership groupings (Student Leads, Coordinators, Faculty Coordinator only - strictly no generic members or club itself)
  const facultyCoordinator = clubData?.facultyCoordinator || (clubData?.facultyName ? { name: clubData.facultyName, email: clubData.facultyEmail } : null);
  const studentLeads = clubMembers.filter(m => {
    if (isClubSelf(m)) return false;
    const r = (m.role || '').toUpperCase();
    return r === 'CLUB_HEAD' || r === 'STUDENT_LEAD' || (m.role || '').toLowerCase() === 'clubhead';
  });
  const clubCoordinators = clubMembers.filter(m => {
    if (isClubSelf(m)) return false;
    const r = (m.role || '').toUpperCase();
    return r === 'COORDINATOR' || (m.role || '').toLowerCase() === 'coordinator';
  });

  const roleCoordinatorNames = clubCoordinators.map(c => c.student?.name || c.name).filter(Boolean);
  const roleLeadNames = studentLeads.map(l => l.student?.name || l.name).filter(Boolean);
  const savedCoordinators = Array.isArray(clubData?.studentCoordinators)
    ? clubData.studentCoordinators.filter(Boolean)
    : (typeof clubData?.studentCoordinators === 'string' && clubData.studentCoordinators
      ? clubData.studentCoordinators.split(',').map(s => s.trim()).filter(Boolean)
      : []);

  const displayStudentLead = roleLeadNames.length > 0
    ? roleLeadNames.join(', ')
    : (savedCoordinators.length > 0 ? savedCoordinators[0] : 'Not Assigned');

  const displayStudentCoordinators = roleCoordinatorNames.length > 0
    ? roleCoordinatorNames.join(', ')
    : (savedCoordinators.length > 0
      ? savedCoordinators.join(', ')
      : (roleLeadNames.length > 0 ? roleLeadNames.join(', ') : 'Not Assigned'));

  const getSocialLink = (platformQuery) => {
    if (Array.isArray(clubData?.socialLinks) && clubData.socialLinks.length > 0) {
      return clubData.socialLinks.find(l => (l.platform || '').toLowerCase().includes(platformQuery))?.url || null;
    }
    if (Array.isArray(user?.socialLinks) && user.socialLinks.length > 0) {
      return user.socialLinks.find(l => (l.platform || '').toLowerCase().includes(platformQuery))?.url || null;
    }
    return null;
  };

  const instagramUrl = getSocialLink('instagram') || user.instagramProfile;
  const githubUrl = getSocialLink('github') || user.githubProfile;
  const linkedinUrl = getSocialLink('linkedin') || user.linkedinProfile;
  const twitterUrl = getSocialLink('twitter') || getSocialLink('x') || user.xProfile;
  const whatsappUrl = getSocialLink('whatsapp') || user.whatsappNumber;
  const websiteUrl = getSocialLink('website') || user.portfolioUrl;

  // Initials for fallback avatar
  const profileInitials = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Assigned clubs for faculty coordinator
  const assignedClubs = [];
  if (clubData && (clubData.id || clubData._id || clubData.clubName)) {
    assignedClubs.push(clubData);
  }
  (user?.memberships || []).forEach(m => {
    const cid = m.clubId || m.slug;
    if (cid && !assignedClubs.some(c => (c.id || c._id || c.slug) === cid)) {
      assignedClubs.push({
        id: m.clubId,
        _id: m.clubId,
        slug: m.slug || m.clubId,
        clubName: m.clubName || m.club?.name || "Assigned Club",
        clubLogo: m.clubLogo || m.club?.clubLogo || clubsMap[m.clubId],
        category: m.category || m.club?.category,
        description: m.description || m.club?.description,
      });
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* 1. FACULTY COORDINATOR DASHBOARD */}
      {isFacultyCoordinator ? (
        <div className="space-y-8">
          {/* Identity Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-8 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-4xl font-bold text-black dark:text-white select-none">{profileInitials}</span>
                  )}
                </div>

                {/* Identity details & Header Action Buttons */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                      {user.name}
                    </h1>
                    <Badge variant="secondary" className="font-bold text-primary bg-primary/10 border-primary/20 text-[10px] uppercase">
                      Faculty Coordinator
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 break-all">{user.email}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
                    <Button asChild size="sm" className="font-semibold shadow-xs">
                      <Link to="/profile/edit">
                        <Edit className="size-3.5 mr-1" /> Edit Profile
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="font-semibold border-border">
                      <Link to="/my-events">
                        <Calendar className="size-3.5 mr-1" /> View My Events
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Faculty Details */}
            {(user.department || user.branch || user.designation || user.phone) && (
              <div className="pt-8">
                <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
                  Faculty & Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {user.department && (
                    <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Department</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.department}</p>
                    </div>
                  )}
                  {user.branch && (
                    <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Branch / Dept</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.branch}</p>
                    </div>
                  )}
                  {user.designation && (
                    <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Designation</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.designation}</p>
                    </div>
                  )}
                  {user.phone && (
                    <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Contact Phone</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Profiles */}
            <SocialProfilesSection user={user} />
          </div>

          {/* Assigned Club Section */}
          <div className="p-6 md:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-wider flex items-center gap-2">
                  <i className="ri-shield-user-line text-brand-600 dark:text-brand-400" />
                  Assigned Club
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  The campus club or society you supervise as Faculty Coordinator.
                </p>
              </div>
            </div>
            {assignedClubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedClubs.map((club, index) => {
                  const clubId = club.id || club._id || club.slug;
                  const resolvedLogo =
                    club.clubLogo ||
                    clubsMap[clubId] ||
                    clubsMap[club.slug] ||
                    (club.clubName && clubsMap[club.clubName.toLowerCase()]);
                  return (
                    <div
                      key={clubId || index}
                      className="bg-neutral-50/60 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-brand-300 dark:hover:border-brand-800/60 transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex items-center justify-center bg-white dark:bg-neutral-800 shrink-0 shadow-2xs">
                          <ClubLogoImage clubLogo={resolvedLogo} clubName={club.clubName} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-neutral-900 dark:text-white text-base leading-snug">
                              {club.clubName || "Assigned Club"}
                            </h3>
                            <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full border border-brand-300 bg-brand-50 text-brand-800 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-800">
                              Faculty In-Charge
                            </span>
                          </div>
                          {club.category && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 capitalize">
                              {club.category}
                            </p>
                          )}
                          {club.description && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                              {club.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Management actions for faculty */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-200/60 dark:border-neutral-800">
                        <Link
                          to={`/club-events/${clubId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                        >
                          <i className="ri-calendar-event-line text-xs" /> Club Events
                        </Link>
                        <Link
                          to={`/club/${clubId}/team`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200/70 dark:bg-neutral-700/60 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <i className="ri-team-line text-xs" /> Team Management
                        </Link>
                        <Link
                          to={`/club/${club.slug || clubId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-medium ml-auto transition-colors"
                        >
                          Public Page <i className="ri-external-link-line text-xs font-light" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                <i className="ri-shield-user-line text-3xl text-neutral-400 mb-2 inline-block" />
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No club assigned yet</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">You will be assigned as coordinator for campus clubs by administration.</p>
              </div>
            )}
          </div>

          {/* Achievements & Winnings */}
          <AchievementsSection winnings={winnings} />
        </div>
      ) : isExternalAccount ? (
        /* 2. EXTERNAL STUDENT DASHBOARD */
        <div className="space-y-8">
          {/* Identity Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-8 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-4xl font-bold text-black dark:text-white select-none">{profileInitials}</span>
                  )}
                </div>

                {/* Identity details & Header Action Buttons */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                      {user.name}
                    </h1>
                    <Badge variant="secondary" className="font-bold text-primary bg-primary/10 border-primary/20 text-[10px] uppercase">
                      External Participant
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 break-all">{user.email}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
                    <Button asChild size="sm" className="font-semibold shadow-xs">
                      <Link to="/profile/edit">
                        <Edit className="size-3.5 mr-1" /> Edit Profile
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="font-semibold border-border">
                      <Link to="/my-events">
                        <Calendar className="size-3.5 mr-1" /> View My Events
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Participant & Institution Details */}
            <div className="pt-8">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
                Participant & Institution Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(user.collegeName || user.college) && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">College / Institution</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.collegeName || user.college}</p>
                  </div>
                )}
                {user.phone && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Contact Phone</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Profiles */}
            <SocialProfilesSection user={user} />
          </div>

          {/* Enrolled Clubs Section */}
          <EnrolledClubsSection user={user} clubsMap={clubsMap} />

          {/* Achievements & Winnings */}
          <AchievementsSection winnings={winnings} />
        </div>
      ) : (
        /* 3. STUDENT DASHBOARD (Internal Student with/without leadership) */
        <div className="space-y-8">
          {/* Identity Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-8 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-4xl font-bold text-black dark:text-white select-none">{profileInitials}</span>
                  )}
                </div>

                {/* Identity details & Header Action Buttons */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                      {user.name}
                    </h1>
                    <Badge variant="secondary" className="font-bold text-primary bg-primary/10 border-primary/20 text-[10px] uppercase">
                      {user.memberships?.some(m => m.role === 'CLUB_HEAD') ? 'Student • Student Lead' : user.memberships?.some(m => m.role === 'COORDINATOR') ? 'Student • Coordinator' : 'Student'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 break-all">{user.email}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
                    <Button asChild size="sm" className="font-semibold shadow-xs">
                      <Link to="/profile/edit">
                        <Edit className="size-3.5 mr-1" /> Edit Profile
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="font-semibold border-border">
                      <Link to="/my-events">
                        <Calendar className="size-3.5 mr-1" /> View My Events
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Account Attributes */}
            <div className="pt-8">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
                Academic & Account Attributes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {user.rollNo && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Roll No</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">{user.rollNo}</p>
                  </div>
                )}
                {user.program && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Program</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.program}</p>
                  </div>
                )}
                {user.branch && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Branch</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.branch}</p>
                  </div>
                )}
                {displayAcademicStanding && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Academic Standing</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {displayAcademicStanding}
                    </p>
                  </div>
                )}
                {(user.graduationYear || displayGraduationYear) && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Graduation Year</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{user.graduationYear || displayGraduationYear}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Profiles */}
            <SocialProfilesSection user={user} />
          </div>

          {/* Clubs & Societies — unified section */}
          <ClubsSection user={user} clubsMap={clubsMap} />

          {/* Achievements & Winnings */}
          <AchievementsSection winnings={winnings} />
        </div>
      )}

    </div>
  );
};

export default Profile;
