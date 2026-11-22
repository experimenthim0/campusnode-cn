import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEventById } from '../services/eventService';
import api from '../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import { useNotification } from '../context/NotificationContext';
import {
  CheckCircle2,
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
  Lock,
  Calendar,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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
        showNotification('Access Denied: Lacking attendance permissions', 'error');
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
        data.rollNo || data.branch || 'Checked In'
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
      <div className="mysans min-h-screen flex items-center justify-center bg-cn-bg text-cn-text">
        <Card className="p-8 max-w-sm w-full text-center flex flex-col items-center gap-3 bg-cn-surface dark:bg-cn-surface-card border-cn-border">
          <ScanLine className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-pulse" />
          <CardTitle className="text-base text-cn-text">Initializing Attendance Portal</CardTitle>
          <CardDescription className="text-xs text-cn-text-secondary">
            Verifying event clearances and security credentials...
          </CardDescription>
          <Loader2 className="w-4 h-4 animate-spin text-cn-text-muted mt-2" />
        </Card>
      </div>
    );
  }

  const attendRate = event?.registeredCount
    ? Math.round((attendedCount / event.registeredCount) * 100)
    : 0;

  const showOverlay = scanState !== 'idle';

  return (
    <div className="mysans min-h-screen bg-cn-bg text-cn-text transition-colors duration-200">
      <style>{`
        @keyframes scan-sweep {
          0% { top: 8px; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: calc(100% - 8px); opacity: 0.8; }
        }
        .scan-line { animation: scan-sweep 2.4s ease-in-out infinite; }
        #reader video { border-radius: 0.75rem !important; }
        #reader { border: none !important; }
        #reader > div { border: none !important; }
      `}</style>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-cn-surface/90 backdrop-blur-md border-b border-cn-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-cn-border text-cn-text bg-cn-surface hover:bg-cn-surface-muted"
              onClick={() => navigate('/profile')}
              title="Return to Profile"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 text-xs text-cn-text-muted">
                <span className="font-medium uppercase tracking-wider text-[10px]">Events</span>
                <span>/</span>
                <span className="font-medium text-brand-600 dark:text-brand-400 text-[10px] uppercase tracking-wider">Attendance Check-In</span>
              </div>
              <h1 className="text-base sm:text-lg font-medium text-cn-text truncate leading-tight">
                {event?.title}
              </h1>
              {startTime && (
                <p className="text-xs text-cn-text-secondary truncate">
                  {startTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })},{' '}
                  {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {endTime ? ` – ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Window Status Badge */}
          <div className="shrink-0">
            {windowStatus === 'NOT_OPEN' ? (
              <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 py-1 px-3">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Opens in</span>
                <span className="font-mono">{formatCountdown(opensAt, currentTime)}</span>
              </Badge>
            ) : windowStatus === 'CLOSED' ? (
              <Badge variant="secondary" className="gap-1.5 py-1 px-3 border border-cn-border text-cn-text-secondary">
                <Lock className="w-3.5 h-3.5" />
                <span>Check-in Closed</span>
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white py-1 px-3 border-none">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Check-in Active</span>
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 sm:gap-8 items-start">

          {/* LEFT COLUMN: Metrics, Progress & Attendance Feed */}
          <div className="flex flex-col gap-6">

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Registrations */}
              <div className="p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card shadow-xs transition-colors flex items-center gap-4">
                <Users className="w-6 h-6 text-brand-600 dark:text-brand-400 shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-label text-cn-text-muted uppercase tracking-wider font-medium">
                    Registrations
                  </p>
                  <p className="text-2xl sm:text-3xl font-medium font-mono tracking-tight text-cn-text">
                    {event?.registeredCount ?? '—'}
                  </p>
                </div>
              </div>

              {/* Attended */}
              <div className="p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card shadow-xs transition-colors flex items-center gap-4">
                <BadgeCheck className="w-6 h-6 text-brand-600 dark:text-brand-400 shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-label text-cn-text-muted uppercase tracking-wider font-medium">
                    Attended
                  </p>
                  <p className="text-2xl sm:text-3xl font-medium font-mono tracking-tight text-cn-text">
                    {attendedCount}
                  </p>
                </div>
              </div>

              {/* Check-in Rate */}
              <div className="p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card shadow-xs transition-colors flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-brand-600 dark:text-brand-400 shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-label text-cn-text-muted uppercase tracking-wider font-medium">
                    Check-in Rate
                  </p>
                  <p className="text-2xl sm:text-3xl font-medium font-mono tracking-tight text-brand-600 dark:text-brand-400">
                    {attendRate}%
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Progress Card */}
            <div className="p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card shadow-xs transition-colors">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-label uppercase tracking-wider font-medium text-cn-text-muted">
                  Attendance Progress
                </span>
                <span className="text-xs font-mono font-medium text-brand-600 dark:text-brand-400">
                  {attendedCount} / {event?.registeredCount ?? 0}
                </span>
              </div>
              <div className="h-2.5 w-full bg-cn-surface-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-brand-600 dark:bg-brand-500 rounded-full"
                />
              </div>
            </div>

            {/* Session History Card */}
            <div className="rounded-xl sm:rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-card shadow-xs overflow-hidden">
              <div className="py-3.5 px-5 sm:px-6 border-b border-cn-border bg-cn-surface-muted/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cn-text-secondary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-cn-text">
                    Session Log
                  </span>
                </div>
                {attendanceLog.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-xs border border-cn-border text-cn-text">
                    {attendanceLog.length} recorded
                  </Badge>
                )}
              </div>
              <div className="p-0 max-h-[360px] overflow-y-auto divide-y divide-cn-border">
                {attendanceLog.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-4 gap-1.5">
                    <p className="text-sm font-medium text-cn-text-secondary">
                      No check-ins yet this session
                    </p>
                    <p className="text-xs text-cn-text-muted max-w-xs">
                      Verified attendees will appear here in real-time as they scan.
                    </p>
                  </div>
                ) : (
                  <ul className="m-0 p-0 list-none divide-y divide-cn-border">
                    {attendanceLog.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-cn-surface-muted transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cn-text truncate">
                            {entry.name}
                          </p>
                          {entry.identifier && (
                            <p className="text-xs text-cn-text-muted font-mono truncate">
                              {entry.identifier}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-cn-text-muted font-mono shrink-0">
                          {formatTimeAgo(entry.time)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-cn-surface-muted border border-cn-border rounded-xl">
              <span className={`w-2 h-2 rounded-full shrink-0 ${windowStatus === 'OPEN' ? 'bg-brand-500 animate-pulse' : windowStatus === 'NOT_OPEN' ? 'bg-amber-500' : 'bg-cn-text-muted'}`} />
              <span className="text-xs text-cn-text-secondary font-medium">
                {windowStatus === 'OPEN'
                  ? 'Scanner active — real-time ticket verification enabled'
                  : windowStatus === 'NOT_OPEN'
                  ? 'Attendance portal on standby until window opens'
                  : 'Attendance verification concluded for this event'}
              </span>
            </div>
              

          </div>

          {/* RIGHT COLUMN: Scanner Viewfinder / Roll Number Entry */}
          <div className="lg:sticky lg:top-20">
            <Card className="overflow-hidden shadow-xs border-cn-border bg-cn-surface dark:bg-cn-surface-card rounded-xl sm:rounded-2xl">
              
              {/* Segmented Tab Controls */}
              <div className="p-3 border-b border-cn-border bg-cn-surface-muted/50">
                <div className="grid grid-cols-2 gap-1 p-1 bg-cn-surface-muted rounded-lg border border-cn-border">
                  <Button
                    type="button"
                    variant={activeTab === 'scan' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 text-xs font-medium ${activeTab === 'scan' ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs' : 'text-cn-text-secondary hover:text-cn-text'}`}
                    onClick={() => setActiveTab('scan')}
                  >
                    <ScanLine className="w-3.5 h-3.5 mr-1.5" />
                    Scan QR
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === 'manual' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 text-xs font-medium ${activeTab === 'manual' ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs' : 'text-cn-text-secondary hover:text-cn-text'}`}
                    onClick={() => setActiveTab('manual')}
                  >
                    <Hash className="w-3.5 h-3.5 mr-1.5" />
                    Roll Number
                  </Button>
                </div>
              </div>

              {activeTab === 'scan' ? (
                <div>
                  {windowStatus === 'NOT_OPEN' ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <Clock className="w-8 h-8 text-amber-500 animate-pulse mb-3" />
                      <p className="text-sm font-medium text-cn-text mb-1">
                        Check-in opens in {formatCountdown(opensAt, currentTime)}
                      </p>
                      <p className="text-xs text-cn-text-muted max-w-xs">
                        Scanner activates 4 hours before event start ({opensAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})
                      </p>
                    </div>
                  ) : windowStatus === 'CLOSED' ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <Lock className="w-8 h-8 text-cn-text-muted mb-3" />
                      <p className="text-sm font-medium text-cn-text mb-1">Check-in Closed</p>
                      <p className="text-xs text-cn-text-muted max-w-xs">
                        Event concluded at {endTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="relative bg-black overflow-hidden m-4 rounded-xl border border-cn-border">
                        <div className="scan-line absolute left-3 right-3 h-[2px] bg-brand-400 rounded z-[9]" />
                        <div id="reader" className="w-full" />

                        {/* Result Overlay */}
                        <AnimatePresence>
                          {showOverlay && (
                            <ScanOverlay scanState={scanState} scanResult={scanResult} />
                          )}
                        </AnimatePresence>
                      </div>

                      <p className="m-0 p-3 text-xs text-center text-cn-text-muted bg-cn-surface-muted/50 border-t border-cn-border font-medium">
                        Align attendee QR ticket inside the viewfinder
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Roll Number Check-in Tab */
                <div className="p-5 sm:p-6">
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-cn-text mb-1">
                      Roll Number Lookup
                    </p>
                    <p className="text-xs text-cn-text-secondary leading-relaxed">
                      Search registered attendees by university roll number to record presence.
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-3">
                    <div className="relative flex items-center">
                      <Hash className="absolute left-3 w-4 h-4 text-cn-text-muted pointer-events-none" />
                      <Input
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
                        className="pl-9 pr-9 border-cn-border bg-cn-surface text-cn-text"
                        disabled={manualLoading || windowStatus !== 'OPEN'}
                        autoFocus={windowStatus === 'OPEN'}
                      />
                      {manualId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => { setManualId(''); setSearchResults([]); }}
                          className="absolute right-1 h-7 w-7 text-cn-text-muted"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full font-medium bg-brand-600 hover:bg-brand-700 text-white"
                      disabled={manualLoading || windowStatus !== 'OPEN' || !manualId.trim()}
                    >
                      {windowStatus === 'NOT_OPEN' ? (
                        'Check-in Not Open'
                      ) : windowStatus === 'CLOSED' ? (
                        'Check-in Closed'
                      ) : manualLoading && !markingId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          <span>Marking Attendance...</span>
                        </>
                      ) : (
                        'Mark Attendance'
                      )}
                    </Button>
                  </form>

                  {/* Registered Students Search Results */}
                  {manualId.trim() && (
                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-cn-text-muted uppercase tracking-wider">
                          Registered Attendees {searchLoading ? '...' : `(${searchResults.length})`}
                        </span>
                        {searchLoading && <Loader2 className="w-3 h-3 animate-spin text-cn-text-muted" />}
                      </div>

                      {searchLoading && searchResults.length === 0 ? (
                        <div className="p-4 text-center bg-cn-surface-muted border border-cn-border rounded-xl">
                          <p className="text-xs text-cn-text-muted">Searching attendees...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
                          {searchResults.map((item) => {
                            const isAttended = item.status === 'ATTENDED';
                            const isItemLoading = markingId === item.participationId;

                            return (
                              <div
                                key={item.participationId}
                                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                  isAttended
                                    ? 'bg-brand-500/10 border-brand-500/20 text-cn-text'
                                    : 'bg-cn-surface dark:bg-cn-surface-card border-cn-border hover:border-cn-border/80'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-medium text-cn-text truncate">
                                      {item.student?.name || 'Registered Attendee'}
                                    </p>
                                    {item.student?.rollNo && (
                                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-cn-border text-cn-text-secondary">
                                        {item.student.rollNo}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-cn-text-secondary truncate">
                                    {item.student?.branch || item.student?.program || 'Student'}
                                    {item.student?.expectedGraduationYear ? ` • Class of ${item.student.expectedGraduationYear}` : ''}
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  {isAttended ? (
                                    <Badge className="bg-brand-600 text-white gap-1 text-[10px]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Checked In</span>
                                    </Badge>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleMarkStudent(item)}
                                      disabled={manualLoading || isItemLoading}
                                      className="h-8 text-xs font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                                    >
                                      {isItemLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                      <span>Check In</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-cn-surface-muted border border-cn-border rounded-xl">
                          <p className="text-xs font-medium text-cn-text mb-1">
                            No registered attendees found
                          </p>
                          <p className="text-[11px] text-cn-text-muted">
                            Only students registered for this event can be checked in.
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
                          <div className="flex items-center gap-3 p-3.5 bg-brand-500/10 border border-brand-500/20 text-cn-text rounded-xl">
                            <CheckCircle2 className="w-5 h-5 shrink-0 text-brand-600 dark:text-brand-400" />
                            <div>
                              <p className="text-xs font-medium text-cn-text">Successfully Checked In</p>
                              <p className="text-xs font-medium text-cn-text-secondary opacity-90">
                                {scanResult?.participantName} — {scanResult?.rollNo || scanResult?.branch || 'Checked In'}
                              </p>
                            </div>
                          </div>
                        )}
                        {scanState === 'already_marked' && (
                          <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">Attendance Already Recorded</p>
                              <p className="text-xs font-medium opacity-90">
                                {scanResult?.message || 'Attendance is already recorded.'}
                              </p>
                            </div>
                          </div>
                        )}
                        {(scanState === 'not_open' || scanState === 'closed') && (
                          <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl">
                            <Clock className="w-5 h-5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">
                                {scanState === 'not_open' ? 'Check-in Not Open' : 'Check-in Closed'}
                              </p>
                              <p className="text-xs font-medium opacity-90">
                                {scanResult?.message}
                              </p>
                            </div>
                          </div>
                        )}
                        {scanState === 'wrong_event' && (
                          <div className="flex items-center gap-3 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">Wrong Event</p>
                              <p className="text-xs font-medium opacity-90">
                                {scanResult?.message || 'This pass is for a different event.'}
                              </p>
                            </div>
                          </div>
                        )}
                        {(scanState === 'not_found' || scanState === 'unauthorized' || scanState === 'invalid_signature' || scanState === 'network_error') && (
                          <div className="flex items-center gap-3 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">
                                {scanState === 'unauthorized'
                                  ? 'Access Denied'
                                  : scanState === 'invalid_signature'
                                  ? 'Security Verification Failed'
                                  : scanState === 'network_error'
                                  ? 'Connection Error'
                                  : 'Not Found'}
                              </p>
                              <p className="text-xs font-medium opacity-90">
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

            </Card>
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
      className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm p-4"
    >
      {scanState === 'processing' && (
        <div className="p-6 text-center max-w-[280px] w-full flex flex-col items-center gap-3 shadow-xl rounded-2xl border border-cn-border bg-cn-surface dark:bg-cn-surface-elevated">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
          <p className="text-xs font-medium text-cn-text">Validating pass...</p>
        </div>
      )}

      {scanState === 'success' && (
        <motion.div
          initial={{ scale: 0.95, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-[290px]"
        >
          <div className="p-6 flex flex-col items-center gap-3 text-center shadow-xl rounded-2xl border border-brand-500/30 bg-cn-surface dark:bg-cn-surface-elevated">
            <CheckCircle2 className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            <Badge className="bg-brand-600 text-white hover:bg-brand-700 uppercase tracking-wider text-[10px] px-2.5 py-0.5">
              Checked In
            </Badge>
            <p className="text-sm font-medium text-cn-text truncate max-w-full">
              {scanResult?.participantName || 'Attendee'}
            </p>
            <div className="w-full bg-cn-surface-muted rounded-xl p-3 border border-cn-border">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-medium text-cn-text-muted uppercase">
                  {scanResult?.rollNo ? 'Roll No' : scanResult?.branch ? 'Branch' : 'Email'}
                </span>
                <span className="font-mono font-medium text-cn-text truncate ml-2">
                  {scanResult?.rollNo || scanResult?.branch || 'Verified'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-cn-text-muted">Resuming scan in 2.5s</p>
          </div>
        </motion.div>
      )}

      {scanState === 'already_marked' && (
        <motion.div
          initial={{ scale: 0.95, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-[290px]"
        >
          <div className="p-6 flex flex-col items-center gap-3 text-center shadow-xl rounded-2xl border border-amber-500/30 bg-cn-surface dark:bg-cn-surface-elevated">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px] px-2.5 py-0.5">
              Already Marked
            </Badge>
            <p className="text-xs text-cn-text-secondary leading-relaxed">
              {scanResult?.message || 'Attendance record is already active.'}
            </p>
            <p className="text-[10px] text-cn-text-muted">Resuming scan in 2.5s</p>
          </div>
        </motion.div>
      )}

      {(scanState === 'not_open' || scanState === 'closed') && (
        <motion.div
          initial={{ scale: 0.95, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-[290px]"
        >
          <div className="p-6 flex flex-col items-center gap-3 text-center shadow-xl rounded-2xl border border-amber-500/30 bg-cn-surface dark:bg-cn-surface-elevated">
            <Clock className="w-8 h-8 text-amber-500" />
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px] px-2.5 py-0.5">
              {scanState === 'not_open' ? 'Check-in Not Open' : 'Check-in Closed'}
            </Badge>
            <p className="text-xs text-cn-text-secondary leading-relaxed">
              {scanResult?.message}
            </p>
            <p className="text-[10px] text-cn-text-muted">Resuming scan in 2.5s</p>
          </div>
        </motion.div>
      )}

      {scanState === 'wrong_event' && (
        <motion.div
          initial={{ scale: 0.95, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-[290px]"
        >
          <div className="p-6 flex flex-col items-center gap-3 text-center shadow-xl rounded-2xl border border-rose-500/30 bg-cn-surface dark:bg-cn-surface-elevated">
            <XCircle className="w-8 h-8 text-rose-500" />
            <Badge variant="destructive" className="uppercase tracking-wider text-[10px] px-2.5 py-0.5">
              Wrong Event
            </Badge>
            <p className="text-xs text-cn-text-secondary leading-relaxed">
              {scanResult?.message || 'This ticket is for a different event.'}
            </p>
            <p className="text-[10px] text-cn-text-muted">Resuming scan in 2.5s</p>
          </div>
        </motion.div>
      )}

      {(scanState === 'unauthorized' || scanState === 'not_found' || scanState === 'invalid_signature' || scanState === 'network_error') && (
        <motion.div
          initial={{ scale: 0.95, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-[290px]"
        >
          <div className="p-6 flex flex-col items-center gap-3 text-center shadow-xl rounded-2xl border border-rose-500/30 bg-cn-surface dark:bg-cn-surface-elevated">
            <XCircle className="w-8 h-8 text-rose-500" />
            <Badge variant="destructive" className="uppercase tracking-wider text-[10px] px-2.5 py-0.5">
              {scanState === 'unauthorized'
                ? 'Access Denied'
                : scanState === 'invalid_signature'
                ? 'Security Failed'
                : scanState === 'network_error'
                ? 'Connection Error'
                : 'Invalid Ticket'}
            </Badge>
            <p className="text-xs text-cn-text-secondary leading-relaxed">
              {scanResult?.message ||
                (scanState === 'unauthorized'
                  ? 'Lacking attendance clearance permissions.'
                  : scanState === 'invalid_signature'
                  ? 'This pass signature could not be verified.'
                  : 'Registration record not found.')}
            </p>
            <p className="text-[10px] text-cn-text-muted">Resuming scan in 2.5s</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default CheckIn;
