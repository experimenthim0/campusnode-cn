import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Html5Qrcode } from "html5-qrcode";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Shield,
  Clock,
  ArrowLeft,
  ScanLine,
  Search,
  MapPin,
  RefreshCw,
  QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ShimmerText from "../components/ShimmerText";

const formatTimeAgo = (date) => {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
};

const StaffAttendanceView = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [activeTab, setActiveTab] = useState("scan"); // "scan" | "manual" | "log"
  const [manualInput, setManualInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const [attendedCount, setAttendedCount] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);

  // Session check-in history
  const [attendanceLog, setAttendanceLog] = useState([]);

  const [scanState, setScanState] = useState("idle"); // "idle" | "processing" | "success" | "already_marked" | "unauthorized" | "wrong_event" | "error"
  const [scanResult, setScanResult] = useState(null);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef(null);

  const loadEventAndStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/event-staff/events/${eventId}/overview`);
      setEventData(res.data.event);
      setAttendedCount(res.data.attendedCount || 0);
      setRegisteredCount(res.data.registeredCount || 0);

      const permissions = res.data.permissions || [];
      if (!permissions.includes("ATTENDANCE_OPERATOR")) {
        alert("You do not have Attendance Operator permission for this event.");
        navigate("/event-staff");
        return;
      }

      setLoading(false);
    } catch (err) {
      alert(err.response?.data?.message || "Unauthorized to manage attendance for this event.");
      navigate("/event-staff");
    }
  };

  useEffect(() => {
    if (eventId) loadEventAndStaff();
  }, [eventId]);

  useEffect(() => {
    if (loading || !scanning || activeTab !== "scan") return;

    let html5QrCode = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const element = document.getElementById("staff-qr-reader");
        if (!element) return;

        html5QrCode = new Html5Qrcode("staff-qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          () => {} // silent on scan failure
        );
      } catch (err) {
        console.error("Camera start failed:", err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
  }, [loading, scanning, activeTab]);

  const addToHistory = (name, rollNo) => {
    setAttendanceLog((prev) => [
      {
        id: Date.now() + Math.random(),
        name: name || "Attendee",
        rollNo: rollNo || "",
        time: new Date(),
      },
      ...prev,
    ]);
  };

  const processAttendanceScan = async (qrPayload, manualEntry = false) => {
    if (!manualEntry) {
      if (isProcessingRef.current || qrPayload === lastScannedCodeRef.current) return;
      isProcessingRef.current = true;
      lastScannedCodeRef.current = qrPayload;
    }

    setScanState("processing");
    setScanResult(null);

    try {
      // Use the standard scanner check-in endpoint with server-enforced event-staff validation
      const res = await api.post('/api/scanner/attendance/check-in', {
        eventId,
        rollNo: qrPayload,
        mode: manualEntry ? "MANUAL_STAFF" : "QR_STAFF",
      });

      const data = res.data;
      setScanResult(data);
      setScanState("success");
      setAttendedCount((prev) => prev + 1);
      addToHistory(data.participant?.name, data.participant?.rollNo || data.participant?.branch);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};
      const errorStatus = data.status;

      setScanResult(data);

      if (status === 409 || errorStatus === "ALREADY_ATTENDED") {
        setScanState("already_marked");
      } else if (status === 403) {
        setScanState("unauthorized");
      } else if (errorStatus === "WRONG_EVENT") {
        setScanState("wrong_event");
      } else {
        setScanState("error");
      }
    } finally {
      const cooldown = isManual ? 2000 : 2500;
      setTimeout(() => {
        setScanState("idle");
        isProcessingRef.current = false;
        lastScannedCodeRef.current = null;
      }, cooldown);
    }
  };

  const onScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    await processAttendanceScan(decodedText, false);
  };

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setManualLoading(true);
    await processAttendanceScan(manualInput.trim(), true);
    setManualLoading(false);
    setManualInput("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ShimmerText text="Authorizing Staff Access..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  const attendancePercent = registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/event-staff"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Staff Portal
          </Link>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
            <Shield size={12} /> Attendance Operator
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-500">
                Staff Check-In Gate
              </span>
              <h1 className="text-xl font-black text-neutral-900 dark:text-neutral-50 mt-0.5">
                {eventData?.title}
              </h1>
              <p className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
                <MapPin size={13} className="text-brand-500" /> {eventData?.venue}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Present</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{attendedCount}</p>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Registered</p>
                <p className="text-2xl font-black text-neutral-700 dark:text-neutral-200">{registeredCount}</p>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Turnout</p>
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">{attendancePercent}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-neutral-200/80 dark:bg-neutral-800/80 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "scan"
                ? "bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <ScanLine size={15} />
            Camera Scanner
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Search size={15} />
            Search / Manual Entry
          </button>
          <button
            onClick={() => setActiveTab("log")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "log"
                ? "bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Users size={15} />
            Session Log ({attendanceLog.length})
          </button>
        </div>

        {activeTab === "scan" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-neutral-950 aspect-square max-w-sm mx-auto flex items-center justify-center">
              <div id="staff-qr-reader" className="w-full h-full" />

              {/* Status Overlay */}
              <AnimatePresence>
                {scanState !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-md ${
                      scanState === "success"
                        ? "bg-emerald-600/90"
                        : scanState === "already_marked"
                        ? "bg-amber-600/90"
                        : scanState === "processing"
                        ? "bg-neutral-900/90"
                        : "bg-red-600/90"
                    }`}
                  >
                    {scanState === "processing" && (
                      <>
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                        <p className="font-bold text-base">Verifying Ticket...</p>
                      </>
                    )}

                    {scanState === "success" && (
                      <>
                        <CheckCircle size={56} className="mb-2" />
                        <p className="text-xl font-black">{scanResult?.participant?.name || "Checked In!"}</p>
                        <p className="text-xs opacity-90 mt-1">
                          {scanResult?.participant?.rollNo || scanResult?.participant?.branch || "Valid Attendance"}
                        </p>
                      </>
                    )}

                    {scanState === "already_marked" && (
                      <>
                        <AlertTriangle size={56} className="mb-2" />
                        <p className="text-lg font-black">Already Checked In</p>
                        <p className="text-xs opacity-90 mt-1">
                          {scanResult?.participant?.name || "Attendee was already marked present."}
                        </p>
                      </>
                    )}

                    {(scanState === "error" || scanState === "unauthorized" || scanState === "wrong_event") && (
                      <>
                        <XCircle size={56} className="mb-2" />
                        <p className="text-lg font-black">Scan Rejected</p>
                        <p className="text-xs opacity-90 mt-1">
                          {scanResult?.message || "Invalid pass or not authorized for this event."}
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-center text-xs text-neutral-500">
              Point camera at student QR pass. Scans are cryptographically verified against event records.
            </p>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Manual Attendee Check-In
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                If the student cannot show a QR code, enter their signed ticket ID or payload.
              </p>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Ticket Code / QR Payload *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste QR payload or Ticket ID..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={manualLoading || !manualInput.trim()}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {manualLoading ? "Verifying..." : "Verify & Mark Present"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "log" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Session Check-Ins ({attendanceLog.length})
              </h3>
              <span className="text-xs text-neutral-500">Live feed</span>
            </div>

            {attendanceLog.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                No check-ins recorded in this session yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {attendanceLog.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{item.name}</p>
                        <p className="text-xs text-neutral-500">{item.rollNo}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Clock size={12} /> {formatTimeAgo(item.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAttendanceView;
