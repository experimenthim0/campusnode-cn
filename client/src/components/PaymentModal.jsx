import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Info,
  Loader2,
  Building2,
  ShieldCheck,
  Clock,
  RefreshCw,
  AlertCircle,
  Smartphone,
  ChevronRight,
  Lock,
} from 'lucide-react';

const PaymentModal = ({
  isOpen,
  onClose,
  paymentType,
  event,
  onSubmit,
  isRegistering,
  showNotification,
}) => {
  const [manualTxId, setManualTxId] = useState('');
  const [manualPayerName, setManualPayerName] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  // 5-Minute Payment Checkup Timer (300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerExpired, setTimerExpired] = useState(false);

  // Detect College Portal URL
  const collegePortalUrl = useMemo(() => {
    const raw = event?.collegePaymentUrl?.trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (!raw.includes('@') && (raw.startsWith('www.') || raw.includes('.'))) {
      return `https://${raw}`;
    }
    return '';
  }, [event]);

  // Strictly distinguish College Portal vs Manual UPI (mutually exclusive)
  const isCollegePortal = Boolean(
    collegePortalUrl ||
    event?.paymentMethod === 'COLLEGE_PAYMENT' ||
    paymentType === 'COLLEGE_PAYMENT'
  );

  // Resolve UPI ID dynamically ONLY when it is a manual transaction
  const resolvedUpiId = useMemo(() => {
    if (isCollegePortal) return '';
    if (event?.upiId && event.upiId.trim()) return event.upiId.trim();
    const match =
      event?.paymentInstructions?.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/)?.[0] ||
      event?.paymentInstructions?.match(/UPI ID:\s*([^\s\n]+)/i)?.[1];
    return match ? match.trim() : '';
  }, [event, isCollegePortal]);

  const hasUpi = Boolean(resolvedUpiId);
  const amount = Number(event?.registrationFee || event?.entryFee || 0);

  // Filter instructions if in college portal mode to avoid stale UPI ID notes
  const displayInstructions = useMemo(() => {
    if (!event?.paymentInstructions) return '';
    if (isCollegePortal) {
      return event.paymentInstructions
        .split('\n')
        .filter((line) => !line.trim().toLowerCase().startsWith('upi id:'))
        .join('\n')
        .trim();
    }
    return event.paymentInstructions.trim();
  }, [event?.paymentInstructions, isCollegePortal]);

  // Reset timer to 5 minutes whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300);
      setTimerExpired(false);
    }
  }, [isOpen]);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, [isOpen]);

  // 3-Minute countdown interval
  useEffect(() => {
    if (!isOpen) return;

    if (timeLeft <= 0) {
      setTimerExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Format timer as mm:ss
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  // UPI link containing strictly: UPI ID (pa), Amount (am), Currency (cu=INR), and Remarks (tn)
  const upiLink = useMemo(() => {
  if (!resolvedUpiId) return '';
  const remarks = (event?.title ? `Event: ${event.title}` : 'Event Registration').slice(0, 50);
  const params = [
    `pa=${resolvedUpiId}`,
    amount > 0 ? `am=${amount}` : '',
    'cu=INR',
    `tn=${remarks}`,
  ].filter(Boolean).join('&');
  return `upi://pay?${params}`;
}, [resolvedUpiId, amount, event?.title]);

  // Dynamic QR Code generation (only for manual UPI)
  useEffect(() => {
    if (isOpen && !isCollegePortal && resolvedUpiId && upiLink) {
      setQrGenerating(true);
      QRCode.toDataURL(upiLink, {
        width: 360,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => {
          setQrCodeUrl(url);
          setQrGenerating(false);
        })
        .catch((err) => {
          console.error('Failed to generate dynamic QR code:', err);
          setQrGenerating(false);
        });
    } else {
      setQrCodeUrl('');
      setQrGenerating(false);
    }
  }, [isOpen, isCollegePortal, resolvedUpiId, upiLink]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setManualTxId('');
    setManualPayerName('');
    setManualRemarks('');
    setTimeLeft(300);
    setTimerExpired(false);
  };

  const handleResetTimer = () => {
    setTimeLeft(300);
    setTimerExpired(false);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = () => {
    if (!manualTxId.trim() || !manualPayerName.trim()) {
      if (showNotification) {
        showNotification('Please enter Transaction ID / UTR and Payer Name.', 'warning');
      }
      return;
    }
    onSubmit(manualTxId.trim(), manualPayerName.trim(), manualRemarks.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 md:p-6 transition-all duration-300 animate-in fade-in overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-4xl bg-card rounded-2xl shadow-2xl border border-border flex flex-col md:flex-row overflow-y-auto md:overflow-hidden max-h-[94vh] md:max-h-[88vh] overscroll-contain">
        {/* =========================================================================
            LEFT PANEL: RAZORPAY-STYLE BRAND, ORDER SUMMARY & SECURITY (38% on desktop)
            ========================================================================= */}
        <div className="w-full md:w-[38%] bg-gradient-to-b from-slate-900 via-zinc-900 to-black text-white p-5 sm:p-6 md:p-7 flex flex-col justify-between shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-52 h-52 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-brand-500/30">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold tracking-tight text-white text-sm block leading-none">
                    CampusNode
                  </span>
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-brand-400">
                    Secure Checkout
                  </span>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[9px] uppercase tracking-wider font-bold border-emerald-500/40 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified
              </Badge>
            </div>

            {/* Event Item Summary Card */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-2.5">
              <div className="flex items-start gap-3">
                {event?.club?.clubLogo ? (
                  <img
                    src={event.club.clubLogo}
                    alt={event.title}
                    className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-black text-base shrink-0">
                    {event?.title?.charAt(0) || 'E'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
                    {event?.club?.clubName || 'College Fest / Event'}
                  </p>
                  <h4 className="font-bold text-white text-sm leading-snug line-clamp-2 mt-0.5">
                    {event?.title || 'Event Registration'}
                  </h4>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Entry Fee</span>
                  <span className="text-zinc-200 font-medium">₹{amount}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Platform / Gateway Fee</span>
                  <span className="text-emerald-400 font-medium">₹0 (Free)</span>
                </div>
              </div>
            </div>

            {/* Prominent Amount Due */}
            <div className="p-3.5 rounded-xl bg-brand-500/15 border border-brand-500/30">
              <span className="text-[11px] font-semibold text-zinc-300 block uppercase tracking-wider">
                Total Payable Amount
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ₹{amount}
                </span>
                <span className="text-xs text-brand-300 font-medium">INR</span>
              </div>
            </div>

            {/* Instructions snippet if present */}
            {displayInstructions && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                <p className="font-bold text-brand-300 flex items-center gap-1.5 text-[11px]">
                  <Info className="w-3.5 h-3.5" /> Organizer Instructions
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed line-clamp-3">
                  {displayInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Security Assurance & Policy */}
          <div className="relative z-10 pt-4 mt-4 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>256-Bit Encrypted Reference Submission</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <Link
                to="/payment-policy"
                target="_blank"
                className="text-zinc-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1 underline underline-offset-2"
              >
                Payment & Refund Policy
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </Link>
              <span className="text-[10px] text-zinc-500">CampusNode v2</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[62%] flex flex-col justify-between bg-card md:overflow-y-auto">
          {/* Top Bar: 3-Minute Countdown Timer & Close Button */}
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  timerExpired
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
                    : timeLeft < 60
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 animate-pulse'
                    : 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {timerExpired ? 'Session Expired' : `Complete in ${formattedTime}`}
                </span>
              </div>

              {timerExpired && (
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Restart 5m
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title="Close payment window"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {/* EXCLUSIVE PAYMENT FLOW: EITHER COLLEGE PORTAL OR MANUAL UPI QR */}
            {isCollegePortal ? (
              /* COLLEGE PAYMENT PORTAL FLOW ONLY */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-border bg-muted/20 flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-900/50 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <h4 className="font-bold text-foreground text-sm">
                      Official College Payment Gateway
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pay registration fees on the institution portal (e.g. SBI Collect / College Fee System).
                    </p>
                  </div>

                  {collegePortalUrl ? (
                    <div className="w-full space-y-2">
                      <Button
                        asChild
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs h-11 rounded-xl shadow-md shadow-brand-500/20 gap-2 cursor-pointer"
                      >
                        <a
                          href={collegePortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" /> Open Official College Portal (New Tab)
                        </a>
                      </Button>
                      <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-500" /> Opens in a new tab • This window will remain open
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
                      Portal link not specified. Please check instructions or contact organizer.
                    </div>
                  )}

                  {/* 3 Steps guide */}
                  <div className="w-full text-left bg-card p-3 rounded-xl border border-border space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>Click the button above to pay on the college portal in a new tab.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>Copy your Reference / Challan / Receipt number from the receipt.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>Return here and paste your details below to confirm registration.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MANUAL UPI / QR SCAN FLOW ONLY */
              <div className="space-y-4">
                {hasUpi ? (
                  <div className="p-4 sm:p-5 rounded-2xl border border-border bg-muted/20 flex flex-col items-center text-center space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Scan & Pay Using Any UPI App
                      </span>
                      <p className="text-xs text-foreground font-semibold">
                        GPay • PhonePe • Paytm • BHIM • CRED
                      </p>
                    </div>

                    {/* QR Code Frame */}
                    <div className="relative group p-3 bg-white rounded-2xl shadow-sm border border-neutral-200">
                      {qrGenerating ? (
                        <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 bg-neutral-50 rounded-xl">
                          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                          <span className="text-[10px] font-semibold text-neutral-500">
                            Generating QR Code...
                          </span>
                        </div>
                      ) : qrCodeUrl ? (
                        <div className="relative">
                          <img
                            src={qrCodeUrl}
                            alt="UPI QR Code"
                            className="w-44 h-44 object-contain rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-9 h-9 rounded-full bg-white shadow-md border border-neutral-200 flex items-center justify-center text-brand-600 font-black text-xs">
                              ₹
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 bg-neutral-100 rounded-xl text-neutral-400">
                          <QrCode className="w-10 h-10" />
                          <span className="text-[10px] font-medium">QR Unavailable</span>
                        </div>
                      )}
                    </div>

                    {/* Quick App Launchers */}
                    <div className="w-full">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                        Or Pay Directly via UPI App
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        <a
                          href={upiLink}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border bg-card hover:border-brand-500/60 hover:bg-muted/50 transition-all text-center group"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                            <img
                              src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png"
                              alt="GPay"
                              className="w-5 h-5 rounded-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                            GPay
                          </span>
                        </a>

                        <a
                          href={upiLink}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border bg-card hover:border-brand-500/60 hover:bg-muted/50 transition-all text-center group"
                        >
                          <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                            <img
                              src="https://img.logo.dev/phonepe.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark"
                              alt="PhonePe"
                              className="w-5 h-5 rounded-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                            PhonePe
                          </span>
                        </a>

                        <a
                          href={upiLink}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border bg-card hover:border-brand-500/60 hover:bg-muted/50 transition-all text-center group"
                        >
                          <div className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center">
                            <img
                              src="https://img.logo.dev/paytm.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark"
                              alt="Paytm"
                              className="w-5 h-5 rounded-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                            Paytm
                          </span>
                        </a>

                        <a
                          href={upiLink}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border bg-card hover:border-brand-500/60 hover:bg-muted/50 transition-all text-center group"
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                            <img
                              src="/bhim.jpg"
                              alt="BHIM"
                              className="w-5 h-5 rounded-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                            BHIM
                          </span>
                        </a>
                      </div>
                    </div>

                    {/* Copy UPI ID Bar */}
                    <div className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl bg-card border border-border text-left">
                      <div className="truncate pr-2">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Beneficiary UPI ID
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground select-all truncate block">
                          {resolvedUpiId}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resolvedUpiId)}
                        className="h-7 text-xs font-semibold gap-1 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/50 hover:bg-brand-50 dark:hover:bg-brand-950/40 shrink-0 cursor-pointer"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUpi ? 'Copied' : 'Copy'}
                      </Button>
                    </div>

                    <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Remarks:</span>
                      <strong className="text-foreground truncate max-w-[220px]">{event?.title || 'Event Registration'}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Direct UPI Not Configured
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please refer to organizer instructions or contact the organizer.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SHARED VERIFICATION FORM (TRANSACTION ID & PAYER NAME) */}
            <div className="space-y-3 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Verification Proof
                </span>
                <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">
                  Required for approval
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Transaction ID / UTR / Receipt No. <span className="text-brand-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 12-digit UTR or SBI Collect Ref Number"
                    value={manualTxId}
                    onChange={(e) => setManualTxId(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payer Name <span className="text-brand-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Name appearing on bank account / receipt"
                    value={manualPayerName}
                    onChange={(e) => setManualPayerName(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Remarks / Bank Name <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Paid via Google Pay or HDFC account"
                    value={manualRemarks}
                    onChange={(e) => setManualRemarks(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background border-input focus-visible:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 border-t border-border flex items-center gap-3 bg-muted/20 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 font-semibold text-xs h-10 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isRegistering || !manualTxId.trim() || !manualPayerName.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs h-10 rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Proof & Register</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;