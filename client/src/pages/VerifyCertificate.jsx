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
  Loader2,
} from "lucide-react";
import { verifyCertificate } from "../services/certificateService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to CampusNode
          </Link>
          <span className="text-[11px] font-medium text-muted-foreground">
            Official Credential Registry
          </span>
        </div>

        {/* Search Bar */}
        {!token && (
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg font-bold">
                Verify Certificate
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Enter the unique certificate verification code to verify its authenticity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste certificate code or token…"
                  className="h-10 text-xs sm:text-sm flex-1"
                />
                <Button
                  type="submit"
                  disabled={!inputToken.trim()}
                  className="h-10 gap-1.5 font-semibold shadow-xs cursor-pointer"
                >
                  <Search className="size-4" /> Verify
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="border-border bg-card shadow-xs text-center p-8 sm:p-12 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Checking Certificate
              </h2>
              <p className="text-xs text-muted-foreground">
                Verifying issued certificate against CampusNode registry…
              </p>
            </div>
          </Card>
        )}

        {/* 1. VALID & ISSUED CERTIFICATE STATE */}
        {!loading && isVerified && cert && (
          <Card className="border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-semibold text-[10px] uppercase">
                        Authentic
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {cert.certificateNumber}
                      </span>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold tracking-tight mt-1">
                      Certificate Verified
                    </CardTitle>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-1.5 text-xs font-medium border-border"
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
                {/* Recipient Name */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <User className="size-3.5 text-muted-foreground" />
                    <span>Awarded To</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {cert.studentName}
                    </p>
                    {cert.rollNo && cert.rollNo !== "N/A" && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Roll No. {cert.rollNo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Award / Position */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Award className="size-3.5 text-muted-foreground" />
                    <span>Standing / Award</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge variant={cert.awardPosition === "Winner" ? "default" : "secondary"} className="text-xs font-semibold">
                      {cert.awardPosition || "Participant"}
                    </Badge>
                  </div>
                </div>

                {/* Event Name */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <FileCheck2 className="size-3.5 text-muted-foreground" />
                    <span>Event</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground text-left sm:text-right max-w-sm">
                    {cert.eventTitle}
                  </p>
                </div>

                {/* Issuing Organization */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span>Issued By</span>
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
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>Date of Issue</span>
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
                    <Hash className="size-3.5 text-muted-foreground" />
                    <span>Certificate ID</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono text-left sm:text-right break-all">
                    {cert.certificateNumber}
                  </p>
                </div>
              </div>

              {/* Bottom Info & Action */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Verified against CampusNode official registry.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSearch}
                  className="gap-1.5 text-xs text-foreground cursor-pointer h-7"
                >
                  <RotateCcw className="size-3" /> Check Another Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. REVOKED CERTIFICATE STATE */}
        {!loading && isRevoked && cert && (
          <Card className="border-destructive/30 bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-destructive/20">
              <div className="flex items-start sm:items-center gap-3">
                <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <Badge variant="destructive" className="text-[10px] uppercase">
                    Status: Invalidated
                  </Badge>
                  <CardTitle className="text-base sm:text-lg font-bold text-destructive mt-1">
                    Certificate Revoked
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive space-y-1.5">
                <p className="font-semibold">
                  This certificate has been revoked by the issuing club or administrator.
                </p>
                {cert.revocationReason && (
                  <p className="text-foreground">
                    <span className="font-semibold">Reason:</span> {cert.revocationReason}
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
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="size-3" /> Check Another Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. NOT FOUND / INVALID TOKEN STATE */}
        {!loading && (isNotFound || (errorStatus && !isRevoked)) && (
          <Card className="border-border bg-card shadow-xs text-center p-6 sm:p-8 space-y-4">
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Certificate Not Found
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  "The verification code provided does not match any certificate in our official records. Please verify the URL or code."}
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2"
            >
              <Input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Enter certificate code…"
                className="h-9 text-xs sm:text-sm flex-1"
              />
              <Button
                type="submit"
                disabled={!inputToken.trim()}
                className="h-9 gap-1.5 font-semibold cursor-pointer"
              >
                <Search className="size-3.5" /> Check
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
