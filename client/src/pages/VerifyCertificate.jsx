import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
  Award,
  Calendar,
  User,
  Hash,
  Building2,
  Check,
  Copy,
  Search,
  ArrowLeft,
  FileCheck2,
  RotateCcw,
  Loader2,
  Camera,
  ScanLine,
  Upload,
  X,
  RefreshCw,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyCertificate } from "../services/certificateService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Parses scanned QR text which can be:
 * - A full URL: https://campusnode.in/verify/certificate/:token
 * - A path: /verify/certificate/:token
 * - A raw certificate ID or verification token: CN-CERT-... or 64f1...
 */
export const extractCertificateToken = (scannedText) => {
  if (!scannedText) return "";
  const raw = String(scannedText).trim();

  try {
    const url = new URL(raw);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const certIndex = pathParts.indexOf("certificate");
    if (certIndex !== -1 && pathParts[certIndex + 1]) {
      return decodeURIComponent(pathParts[certIndex + 1]).trim();
    }
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) return tokenParam.trim();
  } catch {
    // Not a valid URL, continue to regex
  }

  const match = raw.match(/(?:verify\/certificate\/|certificate\/)([^/?#\s]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]).trim();
  }

  return raw;
};

const VerifyCertificate = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState(token || "");
  const [loading, setLoading] = useState(Boolean(token));
  const [data, setData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleVerify = useCallback(async (tokenToVerify) => {
    const trimmed = (tokenToVerify || "").trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorStatus(null);
    setErrorMessage("");
    setData(null);

    try {
      const res = await verifyCertificate(trimmed);
      setData(res.data);
      if (res.data?.status === "REVOKED") {
        setErrorStatus("REVOKED");
      }
    } catch (err) {
      console.error("Verification query error:", err);
      const errRes = err.response?.data;
      if (err.response?.status === 404) {
        setErrorStatus("NOT_FOUND");
        setErrorMessage(errRes?.message || "No certificate found with this code.");
      } else if (errRes?.status === "INVALID_TOKEN") {
        setErrorStatus("INVALID_TOKEN");
        setErrorMessage("Invalid certificate code format.");
      } else {
        setErrorStatus("ERROR");
        setErrorMessage(errRes?.message || "Unable to verify certificate. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      setInputToken(token);
      handleVerify(token);
    } else {
      setData(null);
      setErrorStatus(null);
      setErrorMessage("");
      setLoading(false);
    }
  }, [token, handleVerify]);

  // Clean up scanner hardware on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop cleanup:", err);
      }
      scannerRef.current = null;
    }
    setScannerLoading(false);
  }, []);

  const closeScanner = useCallback(async () => {
    await stopScanner();
    setScannerOpen(false);
    setScannerError("");
  }, [stopScanner]);

  const onScanSuccess = useCallback(
    async (decodedText) => {
      const extracted = extractCertificateToken(decodedText);
      if (!extracted) return;

      // Haptic confirmation if supported
      try {
        if (navigator.vibrate) navigator.vibrate(50);
      } catch {}

      await stopScanner();
      setScannerOpen(false);
      setInputToken(extracted);
      navigate(`/verify/certificate/${extracted}`);
    },
    [navigate, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraIndex = 0) => {
      setScannerError("");
      setScannerLoading(true);
      setScannerOpen(true);

      await stopScanner();

      // Defer briefly to allow DOM mount of #cert-qr-reader
      setTimeout(async () => {
        const el = document.getElementById("cert-qr-reader");
        if (!el) {
          setScannerLoading(false);
          return;
        }

        try {
          const html5QrCode = new Html5Qrcode("cert-qr-reader");
          scannerRef.current = html5QrCode;

          let deviceId = null;
          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              setCameras(devices);
              const validIndex = cameraIndex % devices.length;
              setCurrentCameraIndex(validIndex);
              deviceId = devices[validIndex].id;
            }
          } catch {
            // Camera enumeration not supported or failed
          }

          const cameraConfig = deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "environment" };

          const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(edge * 0.75);
            return {
              width: Math.min(size, 260),
              height: Math.min(size, 260),
            };
          };

          await html5QrCode.start(
            cameraConfig,
            {
              fps: 10,
              qrbox: qrboxFunction,
              aspectRatio: 1.0,
            },
            onScanSuccess,
            () => {
              // Frame scan missed, keep scanning
            }
          );

          setScannerLoading(false);
        } catch (err) {
          console.error("Camera start failed:", err);
          setScannerLoading(false);
          let msg = "Camera could not be started.";
          if (err?.name === "NotAllowedError" || String(err).includes("NotAllowedError")) {
            msg = "Camera permission was denied. Please allow camera access in your browser settings.";
          } else if (err?.name === "NotFoundError" || String(err).includes("NotFoundError")) {
            msg = "No camera found on this device.";
          }
          setScannerError(msg);
        }
      }, 150);
    },
    [onScanSuccess, stopScanner]
  );

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    startScanner(nextIndex);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerLoading(true);
    setScannerError("");

    try {
      const helper = new Html5Qrcode("cert-qr-reader-file-helper");
      const decodedText = await helper.scanFile(file, false);
      helper.clear();

      const extracted = extractCertificateToken(decodedText);
      if (extracted) {
        await closeScanner();
        setInputToken(extracted);
        navigate(`/verify/certificate/${extracted}`);
      } else {
        setScannerError("Could not extract a certificate code from this image.");
      }
    } catch (err) {
      console.error("File scan failed:", err);
      setScannerError("No QR code detected in this photo. Try another image or enter manually.");
    } finally {
      setScannerLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = inputToken.trim();
    if (!clean) return;
    if (clean === token) {
      handleVerify(clean);
    } else {
      navigate(`/verify/certificate/${clean}`);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleResetSearch = async () => {
    await closeScanner();
    setInputToken("");
    setData(null);
    setErrorStatus(null);
    setErrorMessage("");
    navigate("/verify/certificate");
  };

  const cert = data?.certificate;
  const isVerified = data?.valid && data?.status === "ISSUED";
  const isRevoked = data?.status === "REVOKED" || errorStatus === "REVOKED";
  const isNotFound = errorStatus === "NOT_FOUND" || errorStatus === "INVALID_TOKEN";

  return (
    <div className="mysans min-h-[70vh] bg-cn-bg text-cn-text py-6 sm:py-12 px-3 sm:px-6 flex flex-col justify-center items-center transition-colors">
      {/* Hidden file scanner container */}
      <div id="cert-qr-reader-file-helper" className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="w-full max-w-lg space-y-4 sm:space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to CampusNode
          </Link>
          
        </div>

        {/* Input & Scanner Section */}
        {!token && (
          <Card className="border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                  Verify Certificate
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={!scannerOpen ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (scannerOpen) closeScanner();
                    }}
                    className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer"
                  >
                    <Search className="size-3.5" />
                    <span>Enter Code</span>
                  </Button>
                  <Button
                    type="button"
                    variant={scannerOpen ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!scannerOpen) {
                        startScanner();
                      } else {
                        closeScanner();
                      }
                    }}
                    className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer"
                  >
                    <Camera className="size-3.5" />
                    <span>{scannerOpen ? "Close Scanner" : "Scan QR"}</span>
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Enter the certificate ID or scan the QR code to check its validity.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* CAMERA SCANNER VIEWPORT */}
              {scannerOpen ? (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="relative w-full aspect-square max-w-[320px] sm:max-w-[340px] mx-auto overflow-hidden rounded-2xl bg-black border border-border shadow-inner">
                    {/* Html5Qrcode video container */}
                    <div
                      id="cert-qr-reader"
                      className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl"
                    />

                    {/* Viewfinder Target Overlay */}
                    {!scannerError && !scannerLoading && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                        <div className="relative w-48 h-48 border-2 border-dashed border-emerald-400/70 rounded-2xl flex items-center justify-center">
                          {/* Corner brackets */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                          {/* Animated scan indicator line */}
                          <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-pulse" />
                        </div>
                      </div>
                    )}

                    {/* Scanner Loading Overlay */}
                    {scannerLoading && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                        <Loader2 className="size-6 animate-spin text-emerald-400" />
                        <span className="text-xs font-medium">Starting camera…</span>
                      </div>
                    )}

                    {/* Scanner Error Display */}
                    {scannerError && (
                      <div className="absolute inset-0 bg-black/85 p-5 flex flex-col items-center justify-center text-center gap-2.5 text-white">
                        <AlertCircle className="size-7 text-amber-400" />
                        <p className="text-xs text-neutral-300 leading-relaxed max-w-xs">
                          {scannerError}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => startScanner(currentCameraIndex)}
                          className="h-8 text-xs font-medium mt-1 cursor-pointer"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}

                    {/* Controls overlay: Camera Switch & Close */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      {cameras.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors cursor-pointer"
                          title="Switch camera"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeScanner}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors cursor-pointer"
                        title="Close camera"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scanner Help & Upload Fallback */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-[11px]">
                      <ScanLine className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      Align QR code inside frame
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="size-3" /> Upload QR image
                    </button>
                  </div>
                </div>
              ) : (
                /* MANUAL INPUT FORM */
                <form onSubmit={handleSearchSubmit} className="space-y-2.5">
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      placeholder="e.g. CN-CERT-2026-0001 or paste code"
                      className="h-10 text-xs sm:text-sm pr-20"
                      autoFocus
                    />
                    <div className="absolute right-1.5 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startScanner()}
                        className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                        title="Scan with Camera"
                      >
                        <Camera className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="size-3.5" />
                      <span>Upload QR screenshot</span>
                    </button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={!inputToken.trim()}
                      className="h-9 px-4 gap-1.5 font-medium shadow-xs cursor-pointer text-sm"
                    >
                      <Search className="size-3.5" /> Verify
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="border-border bg-card shadow-xs text-center p-8 sm:p-12 space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-medium text-foreground">
                Verifying...
              </h2>
              <p className="text-xs text-muted-foreground">
                Checking certificate details...
              </p>
            </div>
          </Card>
        )}

        {/* 1. VALID & ISSUED CERTIFICATE STATE */}
        {!loading && isVerified && cert && (
          <Card className="border-border bg-card shadow-xs overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-[10px] uppercase">
                        Verified
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {cert.certificateNumber}
                      </span>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight mt-1 text-foreground">
                      Valid Certificate
                    </CardTitle>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-1.5 text-xs font-medium border-border h-8 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <div className="divide-y divide-border text-xs">
                {/* Recipient */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <User className="size-3.5" />
                    <span>Recipient</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {cert.studentName}
                    </p>
                    {cert.rollNo && cert.rollNo !== "N/A" && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Roll No: {cert.rollNo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Award / Position */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Award className="size-3.5" />
                    <span>Award</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge variant={cert.awardPosition === "Winner" ? "default" : "secondary"} className="text-xs font-medium">
                      {cert.awardPosition || "Participant"}
                    </Badge>
                  </div>
                </div>

                {/* Event Name */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <FileCheck2 className="size-3.5" />
                    <span>Event</span>
                  </div>
                  <p className="text-xs font-medium text-foreground text-left sm:text-right max-w-sm">
                    {cert.eventTitle}
                  </p>
                </div>

                {/* Issuing Club */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Building2 className="size-3.5" />
                    <span>Issuing Club</span>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    {cert.issuingClubLogo && (
                      <img
                        src={cert.issuingClubLogo}
                        alt={cert.issuingClub}
                        className="size-4 rounded object-cover"
                      />
                    )}
                    <p className="text-xs font-medium text-foreground">
                      {cert.issuingClub}
                    </p>
                  </div>
                </div>

                {/* Issue Date */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Calendar className="size-3.5" />
                    <span>Issue Date</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-left sm:text-right font-medium">
                    {cert.issuedAt
                      ? new Date(cert.issuedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>

                {/* Certificate Number */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Hash className="size-3.5" />
                    <span>Certificate ID</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono text-left sm:text-right break-all">
                    {cert.certificateNumber}
                  </p>
                </div>
              </div>

              {/* Bottom Info & Action */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Issued and verified on CampusNode</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSearch}
                  className="gap-1.5 text-xs text-foreground cursor-pointer h-8"
                >
                  <RotateCcw className="size-3" /> Check another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. REVOKED CERTIFICATE STATE */}
        {!loading && isRevoked && cert && (
          <Card className="border-destructive/30 bg-card shadow-xs overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="pb-3 border-b border-destructive/20">
              <div className="flex items-start sm:items-center gap-3">
                <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <Badge variant="destructive" className="text-[10px] uppercase">
                    Revoked
                  </Badge>
                  <CardTitle className="text-base sm:text-lg font-semibold text-destructive mt-1">
                    Certificate Revoked
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 bg-destructive/5 border border-destructive/20 rounded-xl text-xs text-destructive space-y-1.5">
                <p className="font-medium">
                  This certificate was revoked by the club organizer.
                </p>
                {cert.revocationReason && (
                  <p className="text-foreground">
                    <span className="font-medium">Reason:</span> {cert.revocationReason}
                  </p>
                )}
                {cert.revokedAt && (
                  <p className="text-muted-foreground text-[11px]">
                    Revoked on: {new Date(cert.revokedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetSearch}
                  className="gap-1.5 text-xs h-8 cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Check another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. NOT FOUND STATE */}
        {!loading && (isNotFound || (errorStatus && !isRevoked)) && (
          <Card className="border-border bg-card shadow-xs text-center p-6 sm:p-8 space-y-4 animate-in fade-in duration-200">
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6 stroke-[2]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Certificate Not Found
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  "No certificate found with this ID. Please check the code or scan again."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto pt-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSearch}
                className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Search className="size-3.5" /> Try Another Code
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  handleResetSearch();
                  setTimeout(() => startScanner(), 50);
                }}
                className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Camera className="size-3.5" /> Scan QR Code
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
