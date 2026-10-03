import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClubManagedEvents } from '../services/eventService';
import { getPaymentStats } from '../services/paymentService';
import ShimmerText from '../components/ShimmerText';
import TablePagination from '../components/TablePagination';
import { hasPermission, PERMISSIONS, isStudentLeadRole, isCoordinatorRole } from '../utils/rbac';

/**
 * Extracts and validates all clubs the user is authorized to review payments for.
 */
const getAuthorizedClubs = (user, currentRole) => {
  if (!user) return [];

  const clubsMap = new Map();
  const isFaculty = Boolean(
    currentRole === "facultyCoordinator" ||
    user?.role === "facultyCoordinator" ||
    user?.principalType === "FACULTY" ||
    user?.memberships?.some(
      (m) => m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || m.role === "FACULTY"
    )
  );

  // 1. Direct club account (role === 'club' or user.clubId)
  if (user.clubId) {
    const clubIdStr = String(user.clubId);
    clubsMap.set(clubIdStr, {
      id: clubIdStr,
      name: user.clubName || user.name || "My Club",
      role: isFaculty ? "Faculty Coordinator" : "Club",
    });
  }

  // 2. Faculty Coordinator clubs
  if (isFaculty) {
    (user.memberships || []).forEach((m) => {
      const cid = String(m.clubId || m.club?.id || m.club?._id || m.id || "");
      if (cid && (m.role === "FACULTY_COORDINATOR" || m.role === "facultyCoordinator" || isFaculty)) {
        if (!clubsMap.has(cid)) {
          clubsMap.set(cid, {
            id: cid,
            name: m.clubName || m.club?.name || `Club ${cid}`,
            role: "Faculty Coordinator",
          });
        }
      }
    });
  }

  // 3. Student memberships (Student Lead / Club Head / Coordinator / Custom Payment Reviewer)
  (user.memberships || []).forEach((m) => {
    const cid = String(m.clubId || m.club?.id || m.club?._id || m.id || "");
    if (!cid || m.status === "INACTIVE") return;

    const isLead = isStudentLeadRole(m.role);
    const isCoord = isCoordinatorRole(m.role);
    const canReview = isLead || isCoord || hasPermission(user, PERMISSIONS.PAYMENT_REVIEW, { clubId: cid });

    if (canReview) {
      const displayRole = isLead ? "Club Head" : isCoord ? "Coordinator" : "Payment Reviewer";
      clubsMap.set(cid, {
        id: cid,
        name: m.clubName || m.club?.name || `Club ${cid}`,
        role: displayRole,
      });
    }
  });

  return Array.from(clubsMap.values());
};

const PaymentTracking = () => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clubId: pathClubId } = useParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [paymentStats, setPaymentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(25);

  const authorizedClubs = useMemo(() => getAuthorizedClubs(user, role), [user, role]);

  const isGlobalAdmin = Boolean(
    role === "admin" ||
    role === "SUPER_ADMIN" ||
    role === "paymentAdmin" ||
    user?.principalType === "ADMIN"
  );

  const hasAnyAccess = isGlobalAdmin || authorizedClubs.length > 0;

  const queryClubId = searchParams.get("clubId");
  const requestedClubId = pathClubId || queryClubId;

  // Determine active club ID and whether access is forbidden for requested club
  let activeClubId = null;
  let isForbiddenForClub = false;

  if (requestedClubId) {
    if (isGlobalAdmin || authorizedClubs.some((c) => c.id === requestedClubId)) {
      activeClubId = requestedClubId;
    } else {
      isForbiddenForClub = true;
    }
  } else if (authorizedClubs.length > 0) {
    activeClubId = authorizedClubs[0].id;
  }

  // Sync URL query when no club is specified in URL but authorized clubs exist
  useEffect(() => {
    if (!requestedClubId && authorizedClubs.length > 0) {
      setSearchParams({ clubId: authorizedClubs[0].id }, { replace: true });
    }
  }, [requestedClubId, authorizedClubs, setSearchParams]);

  useEffect(() => {
    setLedgerPage(1);
  }, [selectedEvent]);

  // Auth redirect check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Data fetching strictly scoped to activeClubId
  useEffect(() => {
    if (!user || !hasAnyAccess || !activeClubId || isForbiddenForClub) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const eventsRes = await getClubManagedEvents(activeClubId);
        const rawEvents = eventsRes.data || [];
        const paidEvents = rawEvents.filter(
          (e) => (e.entryFee > 0) || (e.registrationFee > 0) || (e.paymentMethod && e.paymentMethod !== 'FREE')
        );

        if (!isMounted) return;
        setEvents(paidEvents);

        const statsPromises = paidEvents.map((event) =>
          getPaymentStats(event.id || event._id)
            .then((res) => ({ eventId: event.id || event._id, ...res.data }))
            .catch(() => ({ eventId: event.id || event._id, totalCollected: 0, registrations: [] }))
        );

        const allStats = await Promise.all(statsPromises);
        const statsMap = {};
        allStats.forEach((s) => {
          statsMap[s.eventId] = s;
        });

        if (!isMounted) return;
        setPaymentStats(statsMap);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch payment data for club:', err);
        if (isMounted) {
          setEvents([]);
          setPaymentStats({});
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user, role, activeClubId, hasAnyAccess, isForbiddenForClub]);

  const handleClubChange = (newClubId) => {
    setSelectedEvent(null);
    setLedgerPage(1);
    setSearchParams({ clubId: newClubId });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ShimmerText text="Loading payment tracking..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-2xl shadow-sm max-w-sm text-center">
          <i className="ri-error-warning-line text-4xl text-rose-500 mb-3 block" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Access Restricted</h3>
          <p className="text-xs text-neutral-500 mt-2 font-medium">
            This panel is only accessible to authorized club heads and coordinators.
          </p>
        </div>
      </div>
    );
  }

  if (isForbiddenForClub) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-6 lg:px-12 text-neutral-900 dark:text-neutral-100 flex items-center justify-center">
        <div className="bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/40 p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-4 text-rose-500">
            <i className="ri-shield-cross-line text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Permission Denied</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
            You do not have coordinator or club head permissions to review payments for this specific club.
          </p>
          {authorizedClubs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
                Switch to your authorized clubs:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {authorizedClubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => handleClubChange(club.id)}
                    className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border-0"
                  >
                    {club.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeClub = authorizedClubs.find((c) => c.id === activeClubId) || {
    id: activeClubId,
    name: "Club Finances",
    role: "",
  };

  const totalRevenue = Object.values(paymentStats).reduce((sum, s) => sum + (s.totalCollected || 0), 0);
  const totalPaidRegistrations = Object.values(paymentStats).reduce((sum, s) => sum + (s.registrations?.length || 0), 0);
  const totalPaidEventsCount = events.length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10 px-6 lg:px-12 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Multi-Club Switcher (When user coordinates / manages multiple clubs) */}
        {authorizedClubs.length > 1 && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base shrink-0 border border-brand-500/20">
                <i className="ri-building-line text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Active Club Scope
                  </span>
                  {activeClub.role && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-md border border-brand-200/50 dark:border-brand-900/30">
                      {activeClub.role}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                  {activeClub.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <label htmlFor="club-switcher" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                Club:
              </label>
              <select
                id="club-switcher"
                value={activeClubId || ""}
                onChange={(e) => handleClubChange(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold rounded-xl px-3.5 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors cursor-pointer"
              >
                {authorizedClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} ({club.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Title Section */}
        <div className="mb-10 text-left">
          {authorizedClubs.length === 1 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-950/20 border border-brand-200/50 dark:border-brand-900/30 rounded-full mb-3 text-brand-600 dark:text-brand-400">
              <i className="ri-building-line text-xs" />
              <span className="font-semibold text-xs tracking-wide">{activeClub.name}</span>
              {activeClub.role && (
                <span className="text-[10px] opacity-75 font-medium">({activeClub.role})</span>
              )}
            </div>
          )}
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">
            Payment <span className="text-brand-600 dark:text-brand-500">Tracking</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 font-medium max-w-xl">
            Track entry fees collected from participants, verify transaction receipts, and monitor paid event registrations for {activeClub.name}.
          </p>
        </div>

        {/* Summary Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
            <div className="absolute right-4 top-4 opacity-10 dark:opacity-20">
              <i className="ri-copper-coin-line text-4xl text-neutral-900 dark:text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Total Revenue Collected</p>
            <p className="text-3xl font-semibold text-brand-600 dark:text-brand-500">₹{totalRevenue}</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
            <div className="absolute right-4 top-4 opacity-10 dark:opacity-20">
              <i className="ri-user-heart-line text-4xl text-neutral-900 dark:text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Paid Registrations</p>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{totalPaidRegistrations}</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
            <div className="absolute right-4 top-4 opacity-10 dark:opacity-20">
              <i className="ri-calendar-event-line text-4xl text-neutral-900 dark:text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Total Paid Events</p>
            <p className="text-3xl font-semibold text-brand-600 dark:text-brand-500">
              {totalPaidEventsCount}
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-16 text-center shadow-sm">
            <i className="ri-money-dollar-circle-line text-5xl text-neutral-300 dark:text-neutral-700 mb-3 block animate-pulse" />
            <p className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No Paid Events Registered</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium max-w-md mx-auto">
              Create an event with a manual payment method or registration fee for {activeClub.name} to start tracking finances here.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm mb-10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-950/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Event</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Entry Fee</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Collected</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Registrations</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Payment Mode</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                    {events.map((event) => {
                      const stats = paymentStats[event.id || event._id] || {};
                      const isSelected = selectedEvent === (event.id || event._id);
                      return (
                        <tr key={event.id || event._id} className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-850/20 transition-colors ${isSelected ? 'bg-brand-50/5 dark:bg-brand-950/5' : ''}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {event.title}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-350">
                            ₹{event.registrationFee || event.entryFee}
                          </td>
                          <td className="px-6 py-4 text-base font-bold text-brand-650 dark:text-brand-500">
                            ₹{stats.totalCollected || 0}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                            {stats.registrations?.length || 0} students
                          </td>
                          <td className="px-6 py-4">
                            {event.paymentMethod === 'MANUAL_TRANSACTION' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-neutral-200 dark:border-neutral-750">
                                <i className="ri-qr-code-line text-xs text-neutral-500 dark:text-neutral-400" />
                                Direct UPI
                              </span>
                            ) : event.paymentMethod === 'COLLEGE_PAYMENT' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-200/50 dark:border-blue-900/50">
                                <i className="ri-bank-line text-xs" />
                                College Portal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200/50 dark:border-emerald-900/50">
                                Free
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedEvent(isSelected ? null : (event.id || event._id))}
                              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-semibold rounded-lg shadow-sm border-0 outline-none transition-colors cursor-pointer"
                            >
                              {isSelected ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Details Sub-Panel */}
            {selectedEvent && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm mb-10">
                <div className="bg-neutral-50 dark:bg-neutral-950 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Transaction Audit Ledger — {events.find((e) => (e.id || e._id) === selectedEvent)?.title}
                  </h3>
                  <span className="font-mono text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                    {paymentStats[selectedEvent]?.registrations?.length || 0} entries
                  </span>
                </div>

                {!paymentStats[selectedEvent]?.registrations || paymentStats[selectedEvent].registrations.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-neutral-900">
                    <p className="text-neutral-400 dark:text-neutral-500 font-bold text-sm">No transaction records logged for this event.</p>
                  </div>
                ) : (() => {
                  const currentRegistrations = paymentStats[selectedEvent]?.registrations || [];
                  const totalLedger = currentRegistrations.length;
                  const totalLedgerPages = Math.max(1, Math.ceil(totalLedger / ledgerPageSize));
                  const safeLedgerPage = Math.min(Math.max(1, ledgerPage), totalLedgerPages);
                  const ledgerStartIndex = (safeLedgerPage - 1) * ledgerPageSize;
                  const ledgerEndIndex = Math.min(ledgerStartIndex + ledgerPageSize, totalLedger);
                  const paginatedLedger = currentRegistrations.slice(ledgerStartIndex, ledgerEndIndex);

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                          <thead className="bg-neutral-50 dark:bg-neutral-950/20">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Student</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-550 dark:text-neutral-400">Payment ID / UTR</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                            {paginatedLedger.map((reg, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-850/20 transition-colors">
                                <td className="px-6 py-3.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                  {reg.studentName || 'N/A'}
                                </td>
                                <td className="px-6 py-3.5 text-xs font-mono text-neutral-500 dark:text-neutral-405 select-all font-bold">
                                  {reg.paymentId || 'N/A'}
                                </td>
                                <td className="px-6 py-3.5 text-sm font-bold text-brand-655 dark:text-brand-500">
                                  ₹{reg.amountPaid || 0}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    reg.paymentStatus === 'SUCCESS' || reg.paymentStatus === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                      : reg.paymentStatus === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
                                        : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50 animate-pulse'
                                  }`}>
                                    {reg.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-xs text-neutral-450 dark:text-neutral-500 font-medium">
                                  {reg.paymentTimestamp ? new Date(reg.paymentTimestamp).toLocaleString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <TablePagination
                        currentPage={safeLedgerPage}
                        totalItems={totalLedger}
                        pageSize={ledgerPageSize}
                        onPageChange={setLedgerPage}
                        onPageSizeChange={setLedgerPageSize}
                        pageSizeOptions={[10, 25, 50, 100]}
                        itemName="transactions"
                        className="border-t border-neutral-200 dark:border-neutral-800 rounded-none"
                      />
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentTracking;
