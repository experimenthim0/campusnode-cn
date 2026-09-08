import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { verifyCertificate } from "../services/certificateService";

const VerifyCertificate = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState(token || "");
  const [loading, setLoading] = useState(!!token);
  const [data, setData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
  }, [token]);

  const handleVerify = async (tokenToVerify) => {
    const trimmed = (tokenToVerify || "").trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorStatus(null);
    setErrorMessage("");
    setData(null);

    try {
      const res = await verifyCertificate(trimmed);
      setData(res.data);
      if (res.data.status === "REVOKED") {
        setErrorStatus("REVOKED");
      }
    } catch (err) {
      console.error("Verification query error:", err);
      const errRes = err.response?.data;
      if (err.response?.status === 404) {
        setErrorStatus("NOT_FOUND");
        setErrorMessage(
          errRes?.message ||
            "Certificate not found. This credential may not exist or the verification code is invalid."
        );
      } else if (errRes?.status === "INVALID_TOKEN") {
        setErrorStatus("INVALID_TOKEN");
        setErrorMessage("Invalid verification code format.");
      } else {
        setErrorStatus("ERROR");
        setErrorMessage(
          errRes?.message || "Failed to verify certificate. Please try again."
        );
      }
    } finally {
      setLoading(false);
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
    } catch {
      // ignore
    }
  };

  const handleResetSearch = () => {
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
    <div className="mysans min-h-screen bg-cn-bg text-cn-text py-8 sm:py-14 px-4 sm:px-6 flex flex-col justify-center items-center transition-colors">
      <div className="w-full max-w-xl space-y-4 sm:space-y-5">
        {/* Navigation & Registry Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cn-text-muted hover:text-cn-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CampusNode
          </Link>
          <span className="text-[11px] font-medium text-cn-text-muted">
            Official Credential Registry
          </span>
        </div>

        {/* Search Bar (shown when no token provided or user wants to verify another) */}
        {!token && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-cn-surface border border-cn-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Verify Certificate
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Enter the unique certificate verification code to verify its authenticity.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Paste certificate code or token…"
                className="w-full flex-1 px-3.5 py-2.5 bg-neutral-50 dark:bg-cn-surface-elevated border border-neutral-300 dark:border-cn-border rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-cn-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputToken.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 text-xs sm:text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" /> Verify
              </button>
            </form>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-cn-surface border border-cn-border rounded-2xl p-8 sm:p-12 shadow-xs text-center space-y-3">
            <div className="w-9 h-9 border-2 border-neutral-200 dark:border-cn-border border-t-cn-blue-600 dark:border-t-cn-blue-400 rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Checking Certificate
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Verifying issued certificate against CampusNode registry…
              </p>
            </div>
          </div>
        )}

        {/* 1. VALID & ISSUED CERTIFICATE STATE */}
        {!loading && isVerified && cert && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-cn-surface border border-cn-border rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs space-y-5"
          >
            {/* Header: Status & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-cn-border">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cn-teal-50 dark:bg-cn-teal-950/40 border border-cn-teal-200 dark:border-cn-teal-800/60 text-cn-teal-600 dark:text-cn-teal-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cn-teal-50 dark:bg-cn-teal-950/40 border border-cn-teal-200 dark:border-cn-teal-800/60 text-cn-teal-700 dark:text-cn-teal-300">
                      Authentic
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 break-all">
                      {cert.certificateNumber}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mt-0.5">
                    Certificate Verified
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy verification link"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-cn-border bg-neutral-50 dark:bg-cn-surface-elevated hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cn-teal-600 dark:text-cn-teal-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Credential Data List */}
            <div className="space-y-0.5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {/* Recipient Name */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Awarded To</span>
                </div>
                <div className="text-left sm:text-right min-w-0">
                  <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 break-words">
                    {cert.studentName}
                  </p>
                  {cert.rollNo && cert.rollNo !== "N/A" && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Roll No. {cert.rollNo}
                    </p>
                  )}
                </div>
              </div>

              {/* Award / Position */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <Award className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Standing / Award</span>
                </div>
                <div className="text-left sm:text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      cert.awardPosition === "Winner"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : cert.awardPosition === "Runner-Up"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {cert.awardPosition === "Winner" && "Winner"}
                    {cert.awardPosition === "Runner-Up" && "Runner-Up"}
                    {!["Winner", "Runner-Up"].includes(cert.awardPosition) &&
                      (cert.awardPosition || "Participant")}
                  </span>
                </div>
              </div>

              {/* Event Name */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <FileCheck2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Event</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-left sm:text-right max-w-sm break-words">
                  {cert.eventTitle}
                </p>
              </div>

              {/* Issuing Organization */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Issued By</span>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {cert.issuingClubLogo && (
                    <img
                      src={cert.issuingClubLogo}
                      alt={cert.issuingClub}
                      className="w-4 h-4 rounded object-cover"
                    />
                  )}
                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">
                    {cert.issuingClub}
                  </p>
                </div>
              </div>

              {/* Issue Date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Date of Issue</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 text-left sm:text-right">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Certificate ID</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 text-left sm:text-right break-all">
                  {cert.certificateNumber}
                </p>
              </div>
            </div>

            {/* Bottom Info & Action */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Verified against CampusNode official registry.</span>
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" /> Check Another Certificate
              </button>
            </div>
          </motion.div>
        )}

        {/* 2. REVOKED CERTIFICATE STATE */}
        {!loading && isRevoked && cert && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs space-y-5"
          >
            <div className="flex items-start sm:items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                  Status: Invalidated
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight mt-0.5">
                  Certificate Revoked
                </h1>
              </div>
            </div>

            {/* Revocation Details */}
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-2 text-xs text-rose-800 dark:text-rose-200">
              <p className="font-semibold">
                This certificate has been revoked by the issuing club or administrator.
              </p>
              {cert.revocationReason && (
                <p className="text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-white">Reason:</span>{" "}
                  {cert.revocationReason}
                </p>
              )}
              {cert.revokedAt && (
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Revoked on: {new Date(cert.revokedAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Historical Details */}
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs space-y-2.5 text-zinc-600 dark:text-zinc-400">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                <span>Original Recipient</span>
                <span className="font-semibold text-zinc-900 dark:text-white break-words">
                  {cert.studentName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                <span>Event</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 break-words">
                  {cert.eventTitle}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                <span>Certificate Number</span>
                <span className="break-all">{cert.certificateNumber}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Check Another Certificate
              </button>
            </div>
          </motion.div>
        )}

        {/* 3. NOT FOUND / INVALID TOKEN STATE */}
        {!loading && (isNotFound || (errorStatus && !isRevoked)) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-4"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Certificate Not Found
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  "The verification code provided does not match any certificate in our official records. Please verify the URL or code."}
              </p>
            </div>

            {/* Quick search input to retry */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2"
            >
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Enter certificate code…"
                className="w-full flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={!inputToken.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" /> Check
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
