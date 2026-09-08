import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEventById } from '../services/eventService';
import api from '../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import { useNotification } from '../context/NotificationContext';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  BadgeCheck,
  Clock,
  ArrowLeft,
  ScanLine,
  Search,
  Hash,
  Loader2,
  UserCheck,
  X,
  Sparkles,
  Calendar,
  Lock,
  ShieldCheck,
  Hourglass,
  CalendarClock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ShimmerText from '../components/ShimmerText';

const formatTimeAgo = (date) => {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
};

const formatCountdown = (targetDate, now = new Date()) => {
  if (!targetDate) return '';
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

const CheckIn = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Live timer for real-time window tracking and countdown
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tab state: 'scan' or 'manual'
  const [activeTab, setActiveTab] = useState('scan');
  // Manual / Roll Number entry
  const [manualId, setManualId] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  // Session attendance history (successful check-ins only)
  const [attendanceLog, setAttendanceLog] = useState([]);

  const [scanState, setScanState] = useState('idle');
  const [scanResult, setScanResult] = useState(null);
  const [attendedCount, setAttendedCount] = useState(0);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef(null);

  // RBAC guard + event load
  const { user: authUser, role: authRole } = useAuth();

  useEffect(() => {
    if (authUser) {
      fetchEventDetails(authUser, authRole);
    }
  }, [id, authUser, authRole]);

  const fetchEventDetails = async (storedUser, storedRole) => {
    try {
      const res = await getEventById(id);
      const eventData = res.data;
      setEvent(eventData);
      setAttendedCount(eventData.attendedCount ?? 0);

      const memberships = storedUser?.memberships || storedUser?.clubMemberships || [];
      const targetClubId = String(eventData.clubId?._id || eventData.clubId || eventData.club?.id || eventData.club?._id || '');
      const membership = memberships.find(m => String(m.clubId?._id || m.clubId) === targetClubId);
      
      const isClubHead = membership?.role === 'CLUB_HEAD' || storedRole === 'club' || storedUser?.role === 'club';
      const isCoordinator = membership?.role === 'COORDINATOR';
      const hasAttendancePermission = 
        membership?.canTakeAttendance === true || 
        membership?.permissions?.canTakeAttendance === true;

      let canTakeAttendance = 
        isClubHead || 
        isCoordinator || 
        hasAttendancePermission || 
        storedRole === 'admin' || 
        storedRole === 'facultyCoordinator';

      if (!canTakeAttendance && targetClubId) {
        try {
          const membersRes = await api.get(`/api/club-members/${targetClubId}/members`);
          const membersList = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
          const userId = String(storedUser?.id || storedUser?._id);
          const freshMem = membersList.find(m => String(m.studentId?._id || m.studentId || m.student?.id || m.student?._id) === userId);
          if (freshMem) {
            const isFreshHead = freshMem.role === 'CLUB_HEAD';
            const isFreshCoord = freshMem.role === 'COORDINATOR';
            const freshCanScan = Boolean(freshMem.canTakeAttendance ?? freshMem.permissions?.canTakeAttendance);
            if (isFreshHead || isFreshCoord || freshCanScan) {
              canTakeAttendance = true;
            }
          }
        } catch (e) {
          // ignore error and proceed to check
        }
      }

      if (!canTakeAttendance) {
        showNotification('Access Denied', 'error');
        navigate('/my-events');
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load event details', 'error');
      navigate('/my-events');
    }
  };

  // Check-In Time Window Calculations
  // Restriction: Check-in opens 4 hours before event starts and closes when event ends
  const { startTime, endTime, opensAt, endsAt, windowStatus } = useMemo(() => {
    if (!event?.startTime) {
      return {
        startTime: null,
        endTime: null,
        opensAt: null,
        endsAt: null,
        windowStatus: 'OPEN',
      };
    }

    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : null;
    const open = new Date(start.getTime() - 4 * 60 * 60 * 1000);

    let status = 'OPEN';
    if (currentTime < open) {
      status = 'NOT_OPEN';
    } else if (end && currentTime > end) {
      status = 'CLOSED';
    }

    return {
      startTime: start,
      endTime: end,
      opensAt: open,
      endsAt: end,
      windowStatus: status,
    };
  }, [event, currentTime]);

  // QR Scanner init/cleanup - strictly gated by windowStatus === 'OPEN'
  useEffect(() => {
    if (loading || !scanning || activeTab !== 'scan' || windowStatus !== 'OPEN') {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    let html5QrCode = null;
    const timer = setTimeout(() => {
      const readerElement = document.getElementById('reader');
      if (readerElement) {
        try {
          html5QrCode = new Html5Qrcode('reader');
          html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            onScanSuccess,
            onScanFailure
          );
          scannerRef.current = html5QrCode;
        } catch (e) {
          console.error('Camera start error:', e);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (html5QrCode) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(err => console.error('Scanner stop error:', err));
        scannerRef.current = null;
      }
    };
  }, [loading, scanning, activeTab, windowStatus]);

  // Stop scanner when switching to manual tab
  useEffect(() => {
    if (activeTab === 'manual' && scannerRef.current) {
      scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      scannerRef.current = null;
    }
  }, [activeTab]);

  // Debounced search for registered students by roll number
  useEffect(() => {
    if (activeTab !== 'manual' || !manualId.trim() || windowStatus !== 'OPEN') {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const query = manualId.trim();
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/participation/event/${id}/search-participants?q=${encodeURIComponent(query)}`);
        setSearchResults(res.data?.participants || []);
      } catch (err) {
        console.error('Failed to search registered participants:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualId, activeTab, id, windowStatus]);

  const addToHistory = (name, identifier) => {
    setAttendanceLog(prev => [{
      id: Date.now() + Math.random(),
      name: name || 'Unknown',
      identifier: identifier || '',
      time: new Date(),
    }, ...prev]);
  };

  async function processVerification(qrCode, isManual = false) {
    if (windowStatus === 'NOT_OPEN') {
      setScanResult({ message: 'Check-in is not open yet. It opens 4 hours before the event starts.' });
      setScanState('not_open');
      return;
    }

    if (windowStatus === 'CLOSED') {
      setScanResult({ message: 'Check-in has closed as the event has already ended.' });
      setScanState('closed');
      return;
    }

    if (!isManual) {
      if (isProcessingRef.current || (qrCode === lastScannedCodeRef.current)) return;
      isProcessingRef.current = true;
      lastScannedCodeRef.current = qrCode;
    }

    setProcessing(true);
    setScanState('processing');
    setScanResult(null);

    try {
      const res = await api.post(
        '/api/participation/verify',
        {
          qrCode,
          rollNo: qrCode,
          identifier: qrCode,
          eventId: id,
        }
      );

      const data = res.data || {};
      setScanResult(data);
      setScanState('success');
      setAttendedCount(prev => prev + 1);

      // Optimistically update local search results matching this student
      setSearchResults(prev =>
        prev.map(item => {
          const isRollMatch = data.rollNo && item.student?.rollNo?.toLowerCase() === data.rollNo?.toLowerCase();
          const isNameMatch = data.participantName && item.student?.name?.toLowerCase() === data.participantName?.toLowerCase();
          if (isRollMatch || isNameMatch) {
            return { ...item, status: 'ATTENDED', attendedAt: new Date() };
          }
          return item;
        })
      );

      // Only successful check-in records are added to session log
      addToHistory(
        data.participantName,
        data.rollNo || data.externalEmail || data.branch || 'Checked In'
      );
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};
      const errorStatus = data.status;
      const errorMessage =
        data.message ||
        (status === 404
          ? 'Ticket not found in registration database.'
          : status === 401 || status === 403
          ? 'Unauthorized: scanner clearance required.'
          : 'Verification failed. Please check network connection.');

      setScanResult({ message: errorMessage, ...data });

      if (status === 409 || errorStatus === 'ALREADY_ATTENDED') {
        setScanState('already_marked');
      } else if (errorStatus === 'CHECKIN_NOT_OPEN') {
        setScanState('not_open');
      } else if (errorStatus === 'CHECKIN_CLOSED') {
        setScanState('closed');
      } else if (status === 403 || errorStatus === 'UNAUTHORIZED') {
        setScanState('unauthorized');
      } else if (errorStatus === 'WRONG_EVENT') {
        setScanState('wrong_event');
      } else if (errorStatus === 'INVALID_SIGNATURE') {
        setScanState('invalid_signature');
      } else if (!err.response) {
        setScanState('network_error');
      } else {
        setScanState('not_found');
      }
    } finally {
      const cooldownMs = isManual ? 2500 : 2800;
      setTimeout(() => {
        setScanState('idle');
        setProcessing(false);
        isProcessingRef.current = false;
        lastScannedCodeRef.current = null;
      }, cooldownMs);
    }
  }

  async function onScanSuccess(decodedText) {
    if (isProcessingRef.current || windowStatus !== 'OPEN') return;
    await processVerification(decodedText, false);
  }

  function onScanFailure() {}

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (windowStatus !== 'OPEN') return;
    const trimmed = manualId.trim();
    if (!trimmed) return;
    setManualLoading(true);
    await processVerification(trimmed, true);
    setManualLoading(false);
  };

  const handleMarkStudent = async (studentItem) => {
    if (windowStatus !== 'OPEN') return;
    const rollNo = studentItem.student?.rollNo || studentItem.ticketId;
    if (!rollNo || markingId) return;

    setMarkingId(studentItem.participationId);
    setManualLoading(true);
    await processVerification(rollNo, true);
    setManualLoading(false);
    setMarkingId(null);

    // Update in-place in search results
    setSearchResults(prev =>
      prev.map(item =>
        item.participationId === studentItem.participationId
          ? { ...item, status: 'ATTENDED', attendedAt: new Date() }
          : item
      )
    );
  };

  if (loading) {
    return (
      <div className="mysans min-h-screen flex items-center justify-center bg-cn-bg text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] opacity-40 dark:opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="flex flex-col items-center gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-10 md:px-12 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] text-center relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1">
            <ScanLine className="w-6 h-6 animate-pulse" />
          </div>
          <ShimmerText text="Initializing Attendance Portal..." className="font-bold text-sm tracking-tight" />
          <p className="m-0 text-xs text-zinc-500 dark:text-zinc-400 font-medium">Verifying event clearances and security credentials</p>
        </div>
      </div>
    );
  }

  const attendRate = event?.registeredCount
    ? Math.round((attendedCount / event.registeredCount) * 100)
    : 0;

  const showOverlay = scanState !== 'idle';

  return (
    <div className="myfont min-h-screen bg-cn-bg text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      <style>{`
        @keyframes scan-sweep {
          0% { top: 8px; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: calc(100% - 8px); opacity: 0.8; }
        }
        .scan-line { animation: scan-sweep 2.4s ease-in-out infinite; }
        #reader video { border-radius: 1rem !important; }
        #reader { border: none !important; }
        #reader > div { border: none !important; }
      `}</style>

      {/* ── Background Ambient Atmosphere ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── Top Bar with Frosted Glass ── */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              to={`/club-events/${event.orgId}`}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-all flex-shrink-0"
              title="Return to My Events"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Events</span>
                <span className="text-[10px] text-zinc-300 dark:text-zinc-700">/</span>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Attendance</span>
              </div>
              <h1 className="m-0 text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight truncate">
                {event?.title}
              </h1>
              {startTime && (
                <p className="m-0 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
                  {startTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })},{' '}
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {endTime ? ` – ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Window Status Badge */}
          <div className="flex-shrink-0">
            {windowStatus === 'NOT_OPEN' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <Clock size={13} className="animate-pulse" />
                <span className="hidden sm:inline">Opens in</span>
                <span>{formatCountdown(opensAt, currentTime)}</span>
              </div>
            ) : windowStatus === 'CLOSED' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                <Lock size={13} />
                <span>Check-in Closed</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Check-in Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 sm:gap-8 items-start">

          {/* LEFT COLUMN: Stats & Progress & Logs */}
          <div className="flex flex-col gap-6">

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Registrations', val: event?.registeredCount ?? '—', icon: Users, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
                { label: 'Attended', val: attendedCount, icon: BadgeCheck, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Check-in Rate', val: `${attendRate}%`, icon: CheckCircle, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] flex items-center gap-4 transition-all hover:-translate-y-0.5 duration-200"
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="m-0 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                        {stat.label}
                      </p>
                      <p className="m-0 text-2xl font-bold text-zinc-900 dark:text-white font-mono tracking-tight">
                        {stat.val}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attendance Progress Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Attendance Progress
                </span>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">
                  {attendedCount} / {event?.registeredCount ?? 0}
                </span>
              </div>
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                />
              </div>
            </div>

            {/* Session History Card */}
            <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden">
              <div className="flex items-center gap-2 p-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                <Clock size={14} className="text-zinc-400 dark:text-zinc-500" />
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Session History
                </span>
                {attendanceLog.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-0.5">
                    {attendanceLog.length} checked in
                  </span>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {attendanceLog.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2 text-center px-4">
                    <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 m-0">
                      No check-ins yet this session
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 m-0">
                      Successful check-ins will display here in real-time as they scan
                    </p>
                  </div>
                ) : (
                  <ul className="m-0 p-0 list-none">
                    {attendanceLog.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="m-0 text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {entry.name}
                          </p>
                          {entry.identifier && (
                            <p className="m-0 text-xs text-zinc-400 dark:text-zinc-500 font-mono truncate">
                              {entry.identifier}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                          {formatTimeAgo(entry.time)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2.5 p-3.5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-2xl">
              <span className={`w-2 h-2 rounded-full ${windowStatus === 'OPEN' ? 'bg-emerald-500 animate-pulse' : windowStatus === 'NOT_OPEN' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {windowStatus === 'OPEN'
                  ? 'Scanner active — Real-time ticket verification enabled'
                  : windowStatus === 'NOT_OPEN'
                  ? 'Attendance portal standby'
                  : 'Attendance verification concluded'}
              </span>
            </div>

          </div>

          {/* RIGHT COLUMN: Scanner / Roll Number Check-in */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden">

              {/* Tab Toggle */}
              <div className="flex bg-zinc-100/70 dark:bg-zinc-800/70 backdrop-blur-md p-1.5 m-3 rounded-2xl gap-1">
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeTab === 'scan'
                      ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <ScanLine size={14} />
                  <span>Scan QR</span>
                </button>
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeTab === 'manual'
                      ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <Hash size={14} />
                  <span>Roll Number</span>
                </button>
              </div>

              {activeTab === 'scan' ? (
                <>
                  {windowStatus === 'NOT_OPEN' ? (
                    <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center m-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                        <Clock size={20} className="animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white m-0 mb-1">
                        Check-in opens in {formatCountdown(opensAt, currentTime)}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 m-0 max-w-xs">
                        Scanner activates 4 hours before event start ({opensAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </p>
                    </div>
                  ) : windowStatus === 'CLOSED' ? (
                    <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center m-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800">
                      <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 flex items-center justify-center mb-3">
                        <Lock size={20} />
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white m-0 mb-1">
                        Check-in Closed
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 m-0 max-w-xs">
                        Event concluded at {endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative bg-black/90 overflow-hidden m-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                        <div className="scan-line absolute left-3 right-3 h-[2px] bg-gradient-to-r from-cn-teal-500 via-emerald-400 to-cn-teal-500 rounded z-[9]" />
                        <div id="reader" className="w-full" />

                        {/* Result Overlay */}
                        <AnimatePresence>
                          {showOverlay && (
                            <ScanOverlay scanState={scanState} scanResult={scanResult} />
                          )}
                        </AnimatePresence>
                      </div>

                      <p className="m-0 p-3.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-200/80 dark:border-zinc-800">
                        Align attendee QR pass inside the target viewfinder
                      </p>
                    </>
                  )}
                </>
              ) : (
                    /* Roll Number Check-in Tab */
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-1">
                          Roll Number Check-in
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed m-0">
                          Search registered attendees by university roll number to record their presence.
                        </p>
                      </div>

                      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                            <Hash size={16} />
                          </div>
                          <input
                            type="text"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            placeholder={
                              windowStatus === 'NOT_OPEN'
                                ? `Opens in ${formatCountdown(opensAt, currentTime)}`
                                : windowStatus === 'CLOSED'
                                ? 'Check-in closed'
                                : 'e.g. 21BCS001 or roll number...'
                            }
                            className="w-full pl-10 pr-9 py-3 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-medium outline-none text-zinc-900 dark:text-white focus:border-cn-blue-500 transition-all placeholder:text-zinc-400 disabled:opacity-60"
                            disabled={manualLoading || windowStatus !== 'OPEN'}
                            autoFocus={windowStatus === 'OPEN'}
                          />
                          {manualId && (
                            <button
                              type="button"
                              onClick={() => { setManualId(''); setSearchResults([]); }}
                              className="absolute right-3 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={manualLoading || windowStatus !== 'OPEN' || !manualId.trim()}
                          className={`w-full py-3 rounded-2xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            manualLoading || windowStatus !== 'OPEN' || !manualId.trim()
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                              : 'bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer shadow-xs'
                          }`}
                        >
                          {windowStatus === 'NOT_OPEN'
                            ? 'Check-in Not Open'
                            : windowStatus === 'CLOSED'
                            ? 'Check-in Closed'
                            : manualLoading && !markingId ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Marking Attendance...</span>
                            </>
                          ) : (
                            'Mark Attendance'
                          )}
                        </button>
                      </form>

                      {/* Registered Students Search Results */}
                      {manualId.trim() && (
                        <div className="mt-5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Registered Attendees {searchLoading ? '...' : `(${searchResults.length})`}
                            </span>
                            {searchLoading && <Loader2 size={12} className="animate-spin text-zinc-400" />}
                          </div>

                          {searchLoading && searchResults.length === 0 ? (
                            <div className="p-5 text-center bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                              <p className="text-xs text-zinc-400 m-0">Searching registered attendees...</p>
                            </div>
                          ) : searchResults.length > 0 ? (
                            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
                              {searchResults.map((item) => {
                                const isAttended = item.status === 'ATTENDED';
                                const isItemLoading = markingId === item.participationId;

                                return (
                                  <div
                                    key={item.participationId}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                      isAttended
                                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                                        : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <p className="m-0 text-sm font-bold text-zinc-900 dark:text-white truncate">
                                          {item.student?.name || 'Registered Attendee'}
                                        </p>
                                        {item.student?.rollNo && (
                                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                                            {item.student.rollNo}
                                          </span>
                                        )}
                                      </div>
                                      <p className="m-0 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                        {item.student?.branch || item.student?.program || 'Student'}
                                        {item.student?.expectedGraduationYear ? ` • Class of ${item.student.expectedGraduationYear}` : ''}
                                      </p>
                                    </div>

                                    <div className="flex-shrink-0">
                                      {isAttended ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                                          <CheckCircle size={13} />
                                          <span>Checked In</span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkStudent(item)}
                                          disabled={manualLoading || isItemLoading}
                                          className="px-3 py-1.5 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                          {isItemLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                                          <span>Check In</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-5 text-center bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                                No registered attendees found
                              </p>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 m-0">
                                Only students registered for this event appear here. Unregistered students cannot be checked in.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual Feedback Notification */}
                      <AnimatePresence>
                        {showOverlay && activeTab === 'manual' && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="mt-4"
                          >
                            {scanState === 'success' && (
                              <div className="flex items-center gap-3 p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">Successfully Checked In</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {scanResult?.participantName} — {scanResult?.rollNo || scanResult?.externalEmail || 'Checked In'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {scanState === 'already_marked' && (
                              <div className="flex items-center gap-3 p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">Attendance Already Recorded</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {scanResult?.message || 'Attendance is already recorded.'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {(scanState === 'not_open' || scanState === 'closed') && (
                              <div className="flex items-center gap-3 p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                                <Clock size={18} className="text-amber-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {scanState === 'not_open' ? 'Check-in Not Open' : 'Check-in Closed'}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {scanResult?.message}
                                  </p>
                                </div>
                              </div>
                            )}
                            {scanState === 'wrong_event' && (
                              <div className="flex items-center gap-3 p-4 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl">
                                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">Wrong Event</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {scanResult?.message || 'This pass is for a different event.'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {(scanState === 'not_found' || scanState === 'unauthorized' || scanState === 'invalid_signature' || scanState === 'network_error') && (
                              <div className="flex items-center gap-3 p-4 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl">
                                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {scanState === 'unauthorized'
                                      ? 'Access Denied'
                                      : scanState === 'invalid_signature'
                                      ? 'Security Verification Failed'
                                      : scanState === 'network_error'
                                      ? 'Connection Error'
                                      : 'Not Found'}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {scanResult?.message ||
                                      (scanState === 'unauthorized'
                                        ? 'Lacking attendance clearance level.'
                                        : 'Invalid registration identifier.')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

function ScanOverlay({ scanState, scanResult }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-md bg-black/75 p-4"
    >
      {scanState === 'processing' && (
        <div className="flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/80 dark:border-white/10 w-[290px] text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
          <ShimmerText text="Validating pass..." className="text-xs font-semibold" />
        </div>
      )}

      {scanState === 'success' && (
        <motion.div
          initial={{ scale: 0.92, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center gap-2.5 w-[290px] shadow-2xl border border-white/80 dark:border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-0.5">
            <CheckCircle size={26} />
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Checked In
          </p>
          <p className="m-0 text-sm font-bold text-zinc-900 dark:text-white text-center truncate max-w-full">
            {scanResult?.participantName || 'Attendee'}
          </p>
          <div className="w-full bg-zinc-50/80 dark:bg-zinc-950/80 rounded-2xl p-3 mt-1 border border-zinc-200/60 dark:border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {scanResult?.rollNo ? 'Roll No' : scanResult?.branch ? 'Branch' : 'Email'}
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono truncate ml-2">
                {scanResult?.rollNo || scanResult?.branch || scanResult?.externalEmail || 'Verified'}
              </span>
            </div>
          </div>
          <p className="m-0 text-[10px] font-medium text-zinc-400 mt-1">Resuming scan in 2.5s</p>
        </motion.div>
      )}

      {scanState === 'already_marked' && (
        <motion.div
          initial={{ scale: 0.92, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center gap-2.5 w-[290px] shadow-2xl border border-white/80 dark:border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-0.5">
            <AlertTriangle size={26} />
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-amber-500">
            Already Marked
          </p>
          <p className="m-0 text-xs font-medium text-zinc-600 dark:text-zinc-300 text-center leading-relaxed">
            {scanResult?.message || 'Attendance record is already active.'}
          </p>
          <p className="m-0 text-[10px] font-medium text-zinc-400 mt-1">Resuming scan in 2.5s</p>
        </motion.div>
      )}

      {(scanState === 'not_open' || scanState === 'closed') && (
        <motion.div
          initial={{ scale: 0.92, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center gap-2.5 w-[290px] shadow-2xl border border-white/80 dark:border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-0.5">
            <Clock size={26} />
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-amber-500">
            {scanState === 'not_open' ? 'Check-in Not Open' : 'Check-in Closed'}
          </p>
          <p className="m-0 text-xs font-medium text-zinc-600 dark:text-zinc-300 text-center leading-relaxed">
            {scanResult?.message}
          </p>
          <p className="m-0 text-[10px] font-medium text-zinc-400 mt-1">Resuming scan in 2.5s</p>
        </motion.div>
      )}

      {scanState === 'wrong_event' && (
        <motion.div
          initial={{ scale: 0.92, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center gap-2.5 w-[290px] shadow-2xl border border-white/80 dark:border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 mb-0.5">
            <XCircle size={26} />
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-red-500">
            Wrong Event
          </p>
          <p className="m-0 text-xs font-medium text-zinc-600 dark:text-zinc-300 text-center leading-relaxed">
            {scanResult?.message || 'This ticket is for a different event.'}
          </p>
          <p className="m-0 text-[10px] font-medium text-zinc-400 mt-1">Resuming scan in 2.5s</p>
        </motion.div>
      )}

      {(scanState === 'unauthorized' || scanState === 'not_found' || scanState === 'invalid_signature' || scanState === 'network_error') && (
        <motion.div
          initial={{ scale: 0.92, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center gap-2.5 w-[290px] shadow-2xl border border-white/80 dark:border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 mb-0.5">
            <XCircle size={26} />
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-red-500">
            {scanState === 'unauthorized'
              ? 'Access Denied'
              : scanState === 'invalid_signature'
              ? 'Security Failed'
              : scanState === 'network_error'
              ? 'Connection Error'
              : 'Invalid Ticket'}
          </p>
          <p className="m-0 text-xs font-medium text-zinc-600 dark:text-zinc-300 text-center leading-relaxed">
            {scanResult?.message ||
              (scanState === 'unauthorized'
                ? 'Lacking attendance clearance permissions.'
                : scanState === 'invalid_signature'
                ? 'This pass signature could not be verified.'
                : 'Registration record not found.')}
          </p>
          <p className="m-0 text-[10px] font-medium text-zinc-400 mt-1">Resuming scan in 2.5s</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default CheckIn;
