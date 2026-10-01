import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Copy,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPublicJson } from '../lib/publicDataCache';
import Section from '../components/layout/Section';

const extractFaculty = (club) => {
  const name =
    club.facultyCoordinator?.name ||
    club.facultyCoordinators?.[0]?.name ||
    club.facultyName ||
    'Not Assigned';

  const email =
    club.facultyCoordinator?.email ||
    club.facultyCoordinators?.[0]?.email ||
    club.facultyEmail ||
    null;

  return { name, email, isAssigned: name !== 'Not Assigned' };
};

const extractStudentLead = (club) => {
  const heads = (club.memberships || []).filter(
    (m) =>
      (m.role === 'CLUB_HEAD' || m.role === 'Club Head') &&
      m.student?.name &&
      m.student.name.toLowerCase().trim() !== (club.clubName || '').toLowerCase().trim()
  );

  const coordinators = (club.memberships || []).filter(
    (m) => (m.role === 'COORDINATOR' || m.role === 'Coordinator') && m.student?.name
  );

  const primaryHead = heads[0];

  const name =
    primaryHead?.student?.name ||
    (Array.isArray(club.studentHeads) && club.studentHeads[0]) ||
    (Array.isArray(club.studentcoordinators) && club.studentcoordinators[0]) ||
    (Array.isArray(club.studentCoordinators) && club.studentCoordinators[0]) ||
    coordinators[0]?.student?.name ||
    'Not Assigned';

  const email =
    primaryHead?.student?.email ||
    coordinators[0]?.student?.email ||
    null;

  const roleTitle = primaryHead
    ? (primaryHead.position || 'Student Lead')
    : coordinators[0]
      ? (coordinators[0].position || 'Coordinator')
      : 'Student Lead';

  return {
    name,
    email,
    roleTitle,
    isAssigned: name !== 'Not Assigned',
  };
};

const ClubDirectory = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    document.title = 'Club Directory - CampusNode';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadClubs = async () => {
      try {
        setLoading(true);
        const data = await getPublicJson('/api/clubs');
        if (isMounted) {
          const sorted = Array.isArray(data)
            ? [...data].sort((a, b) => (a.clubName || '').localeCompare(b.clubName || ''))
            : [];
          setClubs(sorted);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load clubs directory');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadClubs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (text, key, label = 'Email') => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`, { id: `copy-${key}` });
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return clubs;

    const q = searchQuery.toLowerCase().trim();
    return clubs.filter((club) => {
      const clubName = (club.clubName || '').toLowerCase();
      const clubEmail = (club.clubEmail || '').toLowerCase();
      const faculty = extractFaculty(club);
      const student = extractStudentLead(club);

      return (
        clubName.includes(q) ||
        clubEmail.includes(q) ||
        faculty.name.toLowerCase().includes(q) ||
        (faculty.email && faculty.email.toLowerCase().includes(q)) ||
        student.name.toLowerCase().includes(q) ||
        (student.email && student.email.toLowerCase().includes(q))
      );
    });
  }, [clubs, searchQuery]);

  const handleCopyAllEmails = () => {
    const emails = clubs
      .map((c) => c.clubEmail)
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error('No club emails available');
      return;
    }

    navigator.clipboard?.writeText(emails.join(', '));
    toast.success(`Copied ${emails.length} club emails!`);
  };

  return (
    <div className="min-h-screen bg-cn-bg text-cn-text transition-colors duration-200">
      {/* ── Page Header: Simple "Club Directory" ─────────────────────── */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pt-24 sm:pt-28 pb-5 transition-colors">
        <Section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Club Directory
            </h1>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleCopyAllEmails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                title="Copy all official club emails"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Copy Emails</span>
              </button>

              <Link
                to="/clubs"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors"
              >
                <span>Cards View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Section>
      </header>

      {/* ── Main Content: Search & Responsive Table ───────────────────── */}
      <main className="py-5 sm:py-7">
        <Section>
          {/* Simple Search Bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search club, coordinator, or email..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              {filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'}
            </span>
          </div>

          {/* ── Table Container ────────────────────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden transition-colors">
            {loading ? (
              // Simple Loading Skeleton
              <div className="p-5 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/60 animate-pulse"
                  >
                    <div className="flex items-center gap-3 w-1/4">
                      <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
                    </div>
                    <div className="w-1/4 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="w-1/4 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="w-1/6 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredClubs.length === 0 ? (
              // Simple Empty State
              <div className="py-14 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                <p className="font-medium text-neutral-900 dark:text-neutral-200">No clubs found</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  No clubs matched "{searchQuery}".
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs underline hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <>
                {/* ── DESKTOP & TABLET TABLE (md and up) ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <th className="py-3 px-4">Club</th>
                        <th className="py-3 px-4">Faculty Coordinator</th>
                        <th className="py-3 px-4">Student Lead</th>
                        <th className="py-3 px-4">Official Email</th>
                        <th className="py-3 px-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredClubs.map((club, idx) => {
                        const faculty = extractFaculty(club);
                        const student = extractStudentLead(club);
                        const clubUrl = `/club/${club.slug || club.id || club._id}`;

                        return (
                          <tr
                            key={club.id || club._id || idx}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors"
                          >
                            {/* Club */}
                            <td className="py-3 px-4 align-middle">
                              <Link to={clubUrl} className="flex items-center gap-3">
                                {club.clubLogo ? (
                                  <img
                                    src={club.clubLogo}
                                    alt={club.clubName}
                                    className="w-8 h-8 rounded object-cover bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                                    {(club.clubName || 'C')[0]}
                                  </div>
                                )}
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline truncate max-w-[220px]">
                                  {club.clubName}
                                </span>
                              </Link>
                            </td>

                            {/* Faculty Coordinator */}
                            <td className="py-3 px-4 align-middle">
                              <div className="min-w-0">
                                <div className="font-medium text-neutral-900 dark:text-neutral-200 truncate max-w-[190px]">
                                  {faculty.name}
                                </div>
                                {faculty.email ? (
                                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    <a
                                      href={`mailto:${faculty.email}`}
                                      className="hover:underline truncate max-w-[160px]"
                                      title={faculty.email}
                                    >
                                      {faculty.email}
                                    </a>
                                    <button
                                      onClick={() => handleCopy(faculty.email, `fac-${club.id}`, 'Faculty email')}
                                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                      title="Copy email"
                                      aria-label={`Copy email for ${faculty.name}`}
                                    >
                                      {copiedKey === `fac-${club.id}` ? (
                                        <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-400 italic">None</span>
                                )}
                              </div>
                            </td>

                            {/* Student Lead */}
                            <td className="py-3 px-4 align-middle">
                              <div className="min-w-0">
                                <div className="font-medium text-neutral-900 dark:text-neutral-200 truncate max-w-[190px]">
                                  {student.name}
                                </div>
                                {student.email ? (
                                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    <a
                                      href={`mailto:${student.email}`}
                                      className="hover:underline truncate max-w-[160px]"
                                      title={student.email}
                                    >
                                      {student.email}
                                    </a>
                                    <button
                                      onClick={() => handleCopy(student.email, `stu-${club.id}`, 'Student lead email')}
                                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                      title="Copy email"
                                      aria-label={`Copy email for ${student.name}`}
                                    >
                                      {copiedKey === `stu-${club.id}` ? (
                                        <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-400 italic">None</span>
                                )}
                              </div>
                            </td>

                            {/* Official Club Email */}
                            <td className="py-3 px-4 align-middle">
                              {club.clubEmail ? (
                                <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                                  <a
                                    href={`mailto:${club.clubEmail}`}
                                    className="hover:underline truncate max-w-[180px]"
                                    title={club.clubEmail}
                                  >
                                    {club.clubEmail}
                                  </a>
                                  <button
                                    onClick={() => handleCopy(club.clubEmail, `club-${club.id}`, 'Club email')}
                                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                    title="Copy official email"
                                    aria-label={`Copy official email for ${club.clubName}`}
                                  >
                                    {copiedKey === `club-${club.id}` ? (
                                      <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-neutral-400">—</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 align-middle text-right">
                              <Link
                                to={clubUrl}
                                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:underline"
                              >
                                <span>Profile</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── MOBILE LIST VIEW (Below md) ── */}
                <div className="block md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredClubs.map((club, idx) => {
                    const faculty = extractFaculty(club);
                    const student = extractStudentLead(club);
                    const clubUrl = `/club/${club.slug || club.id || club._id}`;

                    return (
                      <div key={club.id || club._id || idx} className="p-3.5 space-y-2.5">
                        {/* Club Header */}
                        <div className="flex items-center justify-between gap-3">
                          <Link to={clubUrl} className="flex items-center gap-2.5 min-w-0">
                            {club.clubLogo ? (
                              <img
                                src={club.clubLogo}
                                alt={club.clubName}
                                className="w-7 h-7 rounded object-cover bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                                {(club.clubName || 'C')[0]}
                              </div>
                            )}
                            <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                              {club.clubName}
                            </h3>
                          </Link>

                          <Link
                            to={clubUrl}
                            className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:underline shrink-0"
                          >
                            View
                          </Link>
                        </div>

                        {/* Contacts List */}
                        <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          {/* Faculty Coordinator */}
                          <div className="flex items-baseline justify-between gap-2 bg-neutral-50 dark:bg-neutral-850/60 p-2 rounded border border-neutral-100 dark:border-neutral-800/80">
                            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] shrink-0 font-medium">
                              Faculty:
                            </span>
                            <div className="flex items-center gap-1.5 text-right truncate">
                              <span className="text-neutral-900 dark:text-neutral-200 font-medium truncate">
                                {faculty.name}
                              </span>
                              {faculty.email && (
                                <>
                                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                  <a
                                    href={`mailto:${faculty.email}`}
                                    className="truncate hover:underline text-neutral-500 max-w-[120px]"
                                  >
                                    {faculty.email}
                                  </a>
                                  <button
                                    onClick={() => handleCopy(faculty.email, `m-fac-${club.id}`, 'Faculty email')}
                                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  >
                                    {copiedKey === `m-fac-${club.id}` ? (
                                      <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Student Lead */}
                          <div className="flex items-baseline justify-between gap-2 bg-neutral-50 dark:bg-neutral-850/60 p-2 rounded border border-neutral-100 dark:border-neutral-800/80">
                            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] shrink-0 font-medium">
                              Lead:
                            </span>
                            <div className="flex items-center gap-1.5 text-right truncate">
                              <span className="text-neutral-900 dark:text-neutral-200 font-medium truncate">
                                {student.name}
                              </span>
                              {student.email && (
                                <>
                                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                  <a
                                    href={`mailto:${student.email}`}
                                    className="truncate hover:underline text-neutral-500 max-w-[120px]"
                                  >
                                    {student.email}
                                  </a>
                                  <button
                                    onClick={() => handleCopy(student.email, `m-stu-${club.id}`, 'Student email')}
                                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  >
                                    {copiedKey === `m-stu-${club.id}` ? (
                                      <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Official Email */}
                          {club.clubEmail && (
                            <div className="flex items-baseline justify-between gap-2 px-2 py-1.5 rounded bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-100 dark:border-neutral-800/80">
                              <span className="text-neutral-400 dark:text-neutral-500 text-[11px] shrink-0 font-medium">
                                Email:
                              </span>
                              <div className="flex items-center gap-1.5 text-right truncate">
                                <a
                                  href={`mailto:${club.clubEmail}`}
                                  className="truncate hover:underline font-mono text-[11px]"
                                >
                                  {club.clubEmail}
                                </a>
                                <button
                                  onClick={() => handleCopy(club.clubEmail, `m-club-${club.id}`, 'Club email')}
                                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                >
                                  {copiedKey === `m-club-${club.id}` ? (
                                    <Check className="w-3 h-3 text-neutral-900 dark:text-white" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Section>
      </main>
    </div>
  );
};

export default ClubDirectory;
