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
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const fetchClubInfo = useCallback(async (customClubId) => {
    const effectiveClubId =
      customClubId ||
      authUser?.clubId ||
      (authRole === 'club' ? (authUser?.id || authUser?._id) : null) ||
      authUser?.memberships?.find(m => m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR')?.clubId;

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
  }, [authUser, authRole]);

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

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setRole(authRole);
      fetchClubInfo();

      const isStudentUser = Boolean(authUser?.rollNo || authUser?.branch || authRole === 'member' || authRole === 'student' || authRole !== 'club');
      if (isStudentUser) {
        getUserEvents(authUser.id || authUser._id)
          .then(res => {
            const participations = res.data || [];
            const winningsList = [];
            participations.forEach(p => {
              const ev = p.eventId || p.event;
              if (ev && ev.showWinner && ev.winners) {
                const match = ev.winners.find(w =>
                  (w.rollNo && w.rollNo.trim() === authUser.rollNo?.trim()) ||
                  (w.name && w.name.toLowerCase().includes(authUser.name?.toLowerCase() || ''))
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
  }, [authUser?.id, authUser?.rollNo, authRole, fetchClubInfo]);

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
  if (loading) return <div className="text-center mt-10">Loading profile...</div>;

  const isStudentAccount = Boolean(
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
  const isClubAccount = !isStudentAccount && (role === 'club' || authRole === 'club' || user?.principalType === 'CLUB');

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

  const maskAccountNumber = (acc) => {
    if (!acc) return 'Not Set';
    const clean = String(acc).trim();
    if (showAccountNumber) return clean;
    if (clean.length <= 4) return `•••• ${clean}`;
    return `•••• •••• •••• ${clean.slice(-4)}`;
  };

  // Initials for fallback avatar
  const profileInitials = (clubData?.clubName || user?.name || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Active club logo resolution
  const resolvedClubLogo = clubData?.clubLogo || user?.clubLogo || user?.profileImage;

  // Handle direct club logo upload from profile page
  const handleClubLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotification('Image must be JPG, PNG or WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Maximum file size is 5 MB.', 'error');
      return;
    }

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('profilePhoto', file);

    try {
      const res = await uploadProfilePhoto(formData);
      if (res.data?.success) {
        const newUrl = res.data.imageUrl;
        setClubData(prev => prev ? ({ ...prev, clubLogo: newUrl }) : prev);
        const updatedUser = {
          ...user,
          profileImage: newUrl,
          clubLogo: newUrl,
          club: user?.club ? { ...user.club, clubLogo: newUrl } : { clubLogo: newUrl }
        };
        setUser(updatedUser);
        setSession(updatedUser, role);
        await invalidateCache(['/api/clubs/*', '/api/users/*']);
        showNotification(res.data.message || 'Club logo updated successfully', 'success');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to upload logo', 'error');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">

      {isClubAccount ? (
        <div className="space-y-6 md:space-y-8">

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left flex-1 min-w-0">
                {/* Club Logo */}
                <div
                  className="relative group cursor-pointer w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 hover:scale-102"
                  onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                  title="Click to upload/change club logo"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && logoInputRef.current?.click()}
                >
                  {resolvedClubLogo ? (
                    <ClubLogoImage clubLogo={resolvedClubLogo} clubName={clubData?.clubName || user.name} />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-extrabold text-neutral-800 dark:text-neutral-200 select-none">
                      {profileInitials}
                    </span>
                  )}

                  {/* Hover overlay with camera icon */}
                  {!isUploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white">
                      <i className="ri-camera-line text-lg" />
                      <span className="text-[10px] font-semibold mt-0.5">Change Logo</span>
                    </div>
                  )}

                  {/* Uploading overlay */}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-[9px] font-bold mt-1">Uploading...</span>
                    </div>
                  )}

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleClubLogoUpload}
                    className="hidden"
                    aria-hidden="true"
                  />
                </div>

                {/* Identity Hierarchy */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight truncate">
                      {clubData?.clubName || user.name}
                    </h1>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 my-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 rounded-full">
                      Club Account
                    </span>

                    {(clubData?.category || user.category) && (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full">
                        {clubData?.category || user.category}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <p className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">

                      {clubData?.clubEmail || user.email}
                    </span>
                    {(clubData?.slug || user.clubId) && (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <i className="ri-hashtag text-neutral-400" />
                        ID: <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">{clubData?.slug || user.clubId}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
                <Link
                  to="/profile/edit"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all font-semibold text-xs shadow-xs cursor-pointer w-full"
                >
                  <i className="ri-edit-line text-sm font-light" /> Edit Profile
                </Link>
                {(clubData?.slug || clubData?.id || user.clubId) && (
                  <Link
                    to={`/club/${clubData?.slug || clubData?.id || user.clubId}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors font-semibold text-xs cursor-pointer w-full"
                  >
                    <i className="ri-external-link-line text-sm" /> Public Page
                  </Link>
                )}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">

              <div className="min-w-0">
                <p className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight font-mono">
                  {totalMembersCount}
                </p>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
                  Club Members
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">

              <div className="min-w-0">
                <p className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight font-mono">
                  {totalEventsCount}
                </p>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
                  Total Events
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">

              <div className="min-w-0">
                <p className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight font-mono">
                  {totalRegistrationsCount}
                </p>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
                  Total Registrations
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <i className="ri-information-line text-lg text-orange-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Club Information
                </h2>
              </div>
              <Link
                to={`/club/edit/${clubData?.id || user.clubId || user.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-colors"
              >
                <i className="ri-edit-box-line text-xs" /> Edit Club Details
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Club Name</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{clubData?.clubName || user.name}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Club ID / Slug</p>
                <p className="text-sm font-semibold font-mono text-neutral-800 dark:text-neutral-200">{clubData?.slug || clubData?.id || user.clubId || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Category</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{clubData?.category || user.category || 'General'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Official Email</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 break-all">{clubData?.clubEmail || user.email}</p>
              </div>

              {clubData?.createdAt && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Established / Registered</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {new Date(clubData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              )}

              {websiteUrl && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Website</p>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange-600 hover:underline inline-flex items-center gap-1">
                    {websiteUrl.replace(/^https?:\/\//i, '')} <i className="ri-external-link-line text-xs" />
                  </a>
                </div>
              )}

              {clubData?.description && (
                <div className="md:col-span-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">About the Club</p>
                  <div
                    className="campusnode-markdown-preview text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed px-0"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(clubData.description),
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <i className="ri-user-star-line text-lg text-orange-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Club Leadership
                </h2>
              </div>
              <Link
                to={`/club/${clubData?.id || user.clubId || user.id}/team`}
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Manage Team <i className="ri-arrow-right-line" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {facultyCoordinator && (
                <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-md">
                    Faculty Coordinator
                  </span>
                  <p className="font-bold text-sm text-neutral-900 dark:text-white mt-2.5 truncate">
                    {facultyCoordinator.name}
                  </p>
                  {facultyCoordinator.email && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                      {facultyCoordinator.email}
                    </p>
                  )}
                </div>
              )}

              {/* Student Leads */}
              {studentLeads.length > 0 ? (
                studentLeads.map((head, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40 rounded-md">
                      Student Lead
                    </span>
                    <p className="font-bold text-sm text-neutral-900 dark:text-white mt-2.5 truncate">
                      {head.student?.name || head.name || 'Student Lead'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                      {head.student?.email || head.email || '—'}
                    </p>
                  </div>
                ))
              ) : savedCoordinators.length > 0 && clubCoordinators.length === 0 ? (
                savedCoordinators.map((name, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40 rounded-md">
                      Student Coordinator
                    </span>
                    <p className="font-bold text-sm text-neutral-900 dark:text-white mt-2.5 truncate">
                      {name}
                    </p>
                  </div>
                ))
              ) : null}

              {/* Coordinators */}
              {clubCoordinators.map((coord, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 rounded-md">
                    Coordinator
                  </span>
                  <p className="font-bold text-sm text-neutral-900 dark:text-white mt-2.5 truncate">
                    {coord.student?.name || coord.name || 'Coordinator'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {coord.student?.email || coord.email || '—'}
                  </p>
                </div>
              ))}

              {!facultyCoordinator && studentLeads.length === 0 && clubCoordinators.length === 0 && savedCoordinators.length === 0 && (
                <div className="col-span-full text-center py-4 text-xs text-neutral-500 dark:text-neutral-400">
                  No leadership roles assigned yet. Use <Link to={`/club/${clubData?.id || user.clubId || user.id}/team`} className="text-orange-600 font-bold hover:underline">Manage Team</Link> to assign Student Leads and Coordinators.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <i className="ri-shield-keyhole-line text-lg text-orange-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Security & Access
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">Two-Factor Authentication</p>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${user.isTwoStepEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                      {user.isTwoStepEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Protects the club account with an extra verification code upon login.
                  </p>
                </div>
                <Link
                  to="/profile/edit?tab=security"
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-orange-500 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors shrink-0 shadow-2xs"
                >
                  {user.isTwoStepEnabled ? 'Manage' : 'Enable'}
                </Link>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">Account Password</p>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Update administrative login password and access credentials.
                  </p>
                </div>
                <Link
                  to="/profile/edit?tab=security"
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-orange-500 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors shrink-0 shadow-2xs"
                >
                  Change Password
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <i className="ri-bank-card-line text-lg text-orange-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Payment Account
                </h2>
              </div>
              <Link
                to="/profile/edit#payment-details"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-colors"
              >
                <i className="ri-edit-line text-xs" /> Edit Payment Details
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 bg-neutral-50/50 dark:bg-neutral-800/30 p-5 sm:p-6 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Bank Name</p>
                <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200">{clubData?.bankName || user.bankName || 'Not Set'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Account Holder</p>
                <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200">{clubData?.accountHolderName || user.accountHolderName || 'Not Set'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Account Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200">
                    {maskAccountNumber(clubData?.accountNumber || user.accountNumber)}
                  </p>
                  {(clubData?.accountNumber || user.accountNumber) && (
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="text-neutral-400 hover:text-orange-600 transition-colors cursor-pointer"
                      title={showAccountNumber ? "Hide account number" : "Show account number"}
                    >
                      <i className={showAccountNumber ? "ri-eye-off-line text-sm" : "ri-eye-line text-sm"} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">IFSC Code</p>
                <p className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200">{clubData?.ifscCode || user.ifscCode || 'Not Set'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">UPI ID</p>
                <p className="font-semibold text-sm text-orange-600 dark:text-orange-400">{clubData?.upiId || user.upiId || 'Not Set'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Linked Phone</p>
                <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200">{clubData?.bankPhone || user.bankPhone || 'Not Set'}</p>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-3 flex items-center gap-1.5">
              <i className="ri-information-line text-xs" />
              Event ticket payouts and fee collections are disbursed to this configured account. Manage transactions in <Link to="/payments" className="text-orange-600 hover:underline font-semibold">Payments</Link>.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <i className="ri-links-line text-lg text-orange-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Connected Accounts & Socials
                </h2>
              </div>
              <Link
                to={`/club/edit/${clubData?.id || user.clubId || user.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Update Links <i className="ri-edit-line" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* Instagram */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-instagram-line text-xl text-pink-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Instagram</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {instagramUrl ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-pink-600 transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>

              {/* GitHub */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-github-fill text-xl text-neutral-800 dark:text-neutral-200" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">GitHub</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {githubUrl ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {githubUrl && (
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>

              {/* LinkedIn */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-linkedin-box-fill text-xl text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">LinkedIn</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {linkedinUrl ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-blue-600 transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>

              {/* X / Twitter */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-twitter-x-fill text-xl text-neutral-900 dark:text-neutral-100" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">X (Twitter)</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {twitterUrl ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>

              {/* WhatsApp */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-whatsapp-line text-xl text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">WhatsApp</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {whatsappUrl ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {whatsappUrl && (
                  <a href={`https://wa.me/${whatsappUrl.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-emerald-600 transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>

              {/* Official Website */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="ri-global-line text-xl text-orange-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Official Website</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {websiteUrl ? 'Connected' : 'Not added'}
                    </p>
                  </div>
                </div>
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-orange-600 transition-colors">
                    <i className="ri-external-link-line text-sm" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {clubEvents.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-7 shadow-xs">
              <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <i className="ri-history-line text-lg text-orange-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                    Recent Activity
                  </h2>
                </div>
                <Link
                  to={`/club-events/${clubData?.id || user.clubId || user.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  View All Events <i className="ri-arrow-right-line" />
                </Link>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {clubEvents.slice(0, 4).map((event, idx) => (
                  <div key={event.id || idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                        <i className="ri-calendar-check-line text-sm" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/event/${event.slug || event.id}`}
                          className="text-sm font-bold text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors truncate block"
                        >
                          {event.title}
                        </Link>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {new Date(event.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })} • <span className="font-semibold text-neutral-700 dark:text-neutral-300">{event.registeredCount || 0} registered</span>
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full shrink-0 border ${event.reviewStatus === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                      }`}>
                      {event.reviewStatus || 'ACTIVE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="space-y-8">
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
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 rounded-full">
                      {user.memberships?.some(m => m.role === 'CLUB_HEAD') ? 'Student • Club Head' : user.memberships?.some(m => m.role === 'COORDINATOR') ? 'Student • Coordinator' : 'Student'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 break-all">{user.email}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                    <Link
                      to="/profile/edit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-all font-semibold text-xs shadow-xs cursor-pointer border-0"
                    >
                      <i className="ri-edit-line text-sm font-light" /> Edit Profile
                    </Link>
                    {!user?.rollNo && (role === 'club' || authRole === 'club') ? (
                      <Link
                        to={`/club-events/${user.clubId || user.id || user._id || ''}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-orange-600 rounded-full transition-colors font-semibold text-xs shadow-xs cursor-pointer border-0"
                      >
                        <i className="ri-calendar-event-line text-sm" /> View Club Events
                      </Link>
                    ) : (
                      <Link
                        to="/my-events"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-orange-600 rounded-full transition-colors font-semibold text-xs shadow-xs cursor-pointer border-0"
                      >
                        <i className="ri-calendar-event-line text-sm" /> View My Events
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Attributes */}
            <div className="pt-8">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Academic & Account Attributes</h3>
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
                {displayGraduationYear && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Graduation Year</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{displayGraduationYear}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Profiles */}
            <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">Social Profiles</h3>
              <div className="flex flex-wrap gap-2.5">
                {user.githubProfile && (
                  <a href={user.githubProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-orange-500/50 transition-colors shadow-2xs">
                    <i className="ri-github-fill text-lg" /> GitHub
                  </a>
                )}
                {user.linkedinProfile && (
                  <a href={user.linkedinProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-blue-500/50 transition-colors shadow-2xs">
                    <i className="ri-linkedin-box-fill text-lg" /> LinkedIn
                  </a>
                )}
                {user.xProfile && (
                  <a href={user.xProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-800/50 transition-colors shadow-2xs">
                    <i className="ri-twitter-x-fill text-lg" /> X
                  </a>
                )}
                {user.instagramProfile && (
                  <a href={user.instagramProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-pink-600 dark:text-pink-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-pink-500/50 transition-colors shadow-2xs">
                    <i className="ri-instagram-line text-lg" /> Instagram
                  </a>
                )}
                {user.whatsappNumber && (
                  <a href={`https://wa.me/${user.whatsappNumber.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-emerald-500/50 transition-colors shadow-2xs">
                    <i className="ri-whatsapp-line text-lg" /> WhatsApp
                  </a>
                )}
                {user.portfolioUrl && (
                  <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-orange-500/50 transition-colors shadow-2xs">
                    <i className="ri-global-line text-lg" /> Portfolio
                  </a>
                )}
                {!user.githubProfile && !user.linkedinProfile && !user.xProfile && !user.instagramProfile && !user.whatsappNumber && !user.portfolioUrl && (
                  <p className="text-xs text-neutral-400 italic font-medium">No social profiles added.</p>
                )}
              </div>
            </div>
          </div>

          {/* Club Management & Leadership Hub for Student Leads & Coordinators */}
          {user?.memberships?.some(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR") && (
            <div className="p-6 md:p-8 bg-white dark:bg-neutral-900 border-2 border-orange-500/20 dark:border-orange-500/30 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <i className="ri-shield-star-line text-xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Club Leadership & Management Hub
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      You hold executive and management permissions for the following campus clubs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {user.memberships
                  .filter(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR")
                  .map((m, idx) => {
                    const isHead = m.role === "CLUB_HEAD";
                    const resolvedLogo =
                      m.clubLogo ||
                      m.club?.clubLogo ||
                      clubsMap[m.clubId] ||
                      clubsMap[m.slug] ||
                      (m.clubName && clubsMap[m.clubName.toLowerCase()]);

                    return (
                      <div
                        key={m.clubId || idx}
                        className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <ClubLogoImage clubLogo={resolvedLogo} clubName={m.clubName} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                                {m.clubName || "Club Management"}
                              </h3>
                              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${isHead
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                                  : "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-800"
                                }`}>
                                {isHead ? "★ Student Lead" : "Coordinator"}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {isHead
                                ? "Full executive access: Manage club events, registrations, attendance, certificates, settings & team delegation."
                                : "Full management access: Manage club events, registrations, attendance, certificates, payments & club settings."}
                            </p>
                          </div>
                        </div>

                        {/* Direct Action Hub */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Link
                            to={`/club-events/${m.clubId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <i className="ri-dashboard-line text-sm font-light" /> Club Dashboard
                          </Link>
                          {isHead && (
                            <Link
                              to={`/club/${m.clubId}/team`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                            >
                              <i className="ri-team-line text-sm text-neutral-500 font-light" /> Manage Team
                            </Link>
                          )}
                          <Link
                            to={`/club/edit/${m.clubId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                          >
                            <i className="ri-settings-4-line text-sm text-neutral-500 font-light" /> Settings
                          </Link>
                          <Link
                            to={`/club/${m.slug || m.clubId}`}
                            className="inline-flex items-center gap-1 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-medium transition-colors"
                          >
                            Public Page <i className="ri-external-link-line text-xs font-light" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Enrolled Clubs Section */}
          <div className="p-6 md:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-wider mb-6 flex items-center gap-2">
              Enrolled Clubs & Societies
            </h2>
            {user?.memberships && user.memberships.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {user.memberships.map((m, index) => {
                  const roleDisplay =
                    m.role === "CLUB_HEAD"
                      ? "Club Head"
                      : m.role === "COORDINATOR"
                        ? "Coordinator"
                        : "Member";

                  const badgeStyle =
                    m.role === "CLUB_HEAD"
                      ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 font-bold"
                      : m.role === "COORDINATOR"
                        ? "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 font-bold"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 font-medium";

                  const resolvedLogo =
                    m.clubLogo ||
                    m.club?.clubLogo ||
                    clubsMap[m.clubId] ||
                    clubsMap[m.slug] ||
                    (m.clubName && clubsMap[m.clubName.toLowerCase()]);

                  return (
                    <Link
                      key={index}
                      to={`/club/${m.slug || m.clubId}`}
                      className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500 rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-md"
                    >
                      <div className="w-14 h-14 rounded-full border border-neutral-200 dark:border-neutral-700 overflow-hidden flex items-center justify-center bg-white dark:bg-neutral-800 mb-3 shadow-2xs">
                        <ClubLogoImage
                          clubLogo={resolvedLogo}
                          clubName={m.clubName}
                        />
                      </div>

                      <h3 className="font-bold text-neutral-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {m.clubName || "Club Details"}
                      </h3>

                      <span className={`mt-3 px-3 py-1 text-[10px] uppercase tracking-wider border rounded-full ${badgeStyle}`}>
                        {roleDisplay}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                <i className="ri-building-4-line text-3xl text-neutral-400 mb-2 inline-block" />
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Not enrolled in any clubs yet</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-4">Discover campus clubs, join events, and get involved!</p>
                <Link
                  to="/clubs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs"
                >
                  <i className="ri-compass-3-line text-sm" /> Explore Clubs
                </Link>
              </div>
            )}
          </div>

          {/* Achievements / Trophy Room */}
          <div className="p-6 md:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              Achievements & Winnings
            </h2>
            {winnings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {winnings.map((w, index) => (
                  <div key={index} className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xs">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center shrink-0">
                      <i className="ri-award-fill text-amber-600 dark:text-amber-400 text-lg" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider leading-none mb-1">
                        {w.rank === 1 ? '🥇 1st Place / Winner' : w.rank === 2 ? '🥈 2nd Place / Runner Up' : w.rank === 3 ? '🥉 3rd Place' : `#${w.rank} Position`}
                      </p>
                      <Link to={`/event/${w.eventSlug}`} className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-orange-600 hover:underline truncate block">
                        {w.eventTitle}
                      </Link>
                      {w.clubName && (
                        <p className="text-[10px] text-neutral-400 font-medium">by {w.clubName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center">
                <i className="ri-trophy-line text-3xl text-amber-400/60 mb-2 inline-block" />
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No achievements recorded yet</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Participate and win in campus events to earn trophies and appear on the leaderboard!</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
