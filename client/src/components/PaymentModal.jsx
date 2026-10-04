import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
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
  // 5-Minute Payment Window Timer (300 seconds)
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

  // 5-Minute countdown interval
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
      `tn=${encodeURIComponent(remarks)}`,
    ]
      .filter(Boolean)
      .join('&');
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

  const isSubmitDisabled = isRegistering || !manualTxId.trim() || !manualPayerName.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 transition-all duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-[960px] bg-card text-card-foreground rounded-2xl border border-border shadow-xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:max-h-[88vh]">
        {/* =========================================================================
            LEFT PANEL: EVENT SUMMARY & AMOUNT (Desktop 36%, Mobile Header)
            ========================================================================= */}
        <div className="w-full md:w-[36%] md:max-w-[340px] bg-neutral-950 text-neutral-100 p-4 sm:p-5 md:p-6 flex flex-col justify-between shrink-0 border-b md:border-b-0 md:border-r border-neutral-800">
          <div className="space-y-4 md:space-y-5">
            {/* CampusNode Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-xs tracking-tight text-white block leading-tight">
                    CampusNode
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    Secure Checkout
                  </span>
                </div>
              </div>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close dialog"
                className="md:hidden text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Summary */}
            <div className="flex items-start gap-3 py-3 border-y border-neutral-800/90">
              {event?.club?.clubLogo ? (
                <img
                  src={event.club.clubLogo}
                  alt={event?.club?.clubName || 'Club Logo'}
                  className="w-10 h-10 rounded-lg object-cover border border-neutral-800 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 font-semibold text-sm shrink-0">
                  {event?.title?.charAt(0) || 'E'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-neutral-400 font-medium truncate">
                  {event?.club?.clubName || 'Club Event'}
                </p>
                <h3
                  id="payment-modal-title"
                  className="font-semibold text-white text-sm leading-snug line-clamp-2 mt-0.5"
                >
                  {event?.title || 'Event Registration'}
                </h3>
              </div>
            </div>

            {/* Prominent Amount */}
            <div>
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                Total payable
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-bold tracking-tight text-white">
                  ₹{amount}
                </span>
                <span className="text-xs text-neutral-400 font-medium">INR</span>
              </div>
            </div>

            {/* Short Organizer Instructions Preview */}
            {displayInstructions && (
              <div className="rounded-lg bg-neutral-900/90 border border-neutral-800/80 p-3 text-xs space-y-1">
                <p className="font-medium text-neutral-300 text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  Organizer instructions
                </p>
                <p className="text-neutral-400 text-xs leading-relaxed line-clamp-3">
                  {displayInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Security & Policy (Desktop Footer) */}
          <div className="pt-4 mt-4 border-t border-neutral-800/80 space-y-2 hidden md:block">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Your payment details are submitted securely.</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
              <Link
                to="/payment-policy"
                target="_blank"
                className="text-neutral-400 hover:text-neutral-200 transition-colors inline-flex items-center gap-1 underline underline-offset-2"
              >
                Payment &amp; Refund Policy
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: PAYMENT / VERIFICATION FORM (Desktop 64%, Mobile Body)
            ========================================================================= */}
        <div className="w-full md:w-[64%] flex flex-col h-full bg-background min-w-0 flex-1">
          {/* Header Bar: Status & Close */}
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {timerExpired ? (
                  <span>Payment window ended</span>
                ) : (
                  <span>Payment window · {formattedTime}</span>
                )}
              </span>
              {timerExpired && (
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 font-medium underline ml-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
            {/* PAYMENT INSTRUCTION / QR SECTION */}
            {isCollegePortal ? (
              /* College Payment Flow */
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    Official College Payment Portal
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pay the registration fee through the institution's official payment system.
                  </p>
                </div>

                {collegePortalUrl ? (
                  <div className="space-y-1.5 pt-1">
                    <Button
                      asChild
                      className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs h-10 rounded-xl gap-2 cursor-pointer shadow-xs"
                    >
                      <a
                        href={collegePortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open College Payment Portal
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Opens in a new tab
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                    Portal link not specified. Please check instructions or contact organizer.
                  </div>
                )}

                {/* 3 Step Guide */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs text-muted-foreground border border-border/50">
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-border">
                      1
                    </span>
                    <span>Complete payment</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-border">
                      2
                    </span>
                    <span>Copy the receipt/reference number</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-border">
                      3
                    </span>
                    <span>Return here and submit the details</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Manual UPI Flow */
              <div className="space-y-4">
                {hasUpi ? (
                  <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                    {/* Step 1 & 2 */}
                    <div className="text-center space-y-1">
                      <span className="text-xs font-semibold text-foreground block">
                        Scan QR with any UPI app
                      </span>
                      <p className="text-xs text-muted-foreground">
                        GPay · PhonePe · Paytm · BHIM
                      </p>
                    </div>

                    {/* Prominent QR Display (approx 176px - 200px) */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-2.5 bg-white rounded-xl border border-neutral-200 shadow-xs inline-block">
                        {qrGenerating ? (
                          <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 bg-neutral-50 rounded-lg">
                            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                            <span className="text-[11px] text-neutral-500">Generating QR...</span>
                          </div>
                        ) : qrCodeUrl ? (
                          <img
                            src={qrCodeUrl}
                            alt={`Payment QR code for ${event?.title || 'event registration'}`}
                            className="w-44 h-44 object-contain rounded-md"
                          />
                        ) : (
                          <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 bg-neutral-50 rounded-lg text-neutral-400">
                            <QrCode className="w-8 h-8" />
                            <span className="text-xs">QR unavailable</span>
                          </div>
                        )}
                      </div>

                      {/* Secondary link for direct pay if on mobile/UPI app */}
                      {upiLink && (
                        <a
                          href={upiLink}
                          className="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 font-medium inline-flex items-center gap-1.5 mt-2.5 underline underline-offset-2"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Pay directly via UPI app
                        </a>
                      )}
                    </div>

                    {/* Step 4: UPI ID with Copy Button */}
                    <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-muted/50 border border-border text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                          UPI ID
                        </span>
                        <span className="font-mono font-medium text-foreground select-all truncate block">
                          {resolvedUpiId}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resolvedUpiId)}
                        className="h-7 px-2.5 text-xs font-medium gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center space-y-1.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto" />
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                      Direct UPI Not Configured
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please refer to organizer instructions or contact the organizer.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VERIFICATION FORM */}
            <div className="space-y-3.5 pt-1">
              <div>
                <h4 className="text-xs font-semibold text-foreground">
                  Confirm your payment
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter the details shown on your payment receipt.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="manualTxId"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Transaction ID / UTR / Receipt No. <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="manualTxId"
                    type="text"
                    required
                    placeholder="Enter your transaction or receipt number"
                    value={manualTxId}
                    onChange={(e) => setManualTxId(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manualPayerName"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Payer Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="manualPayerName"
                    type="text"
                    required
                    placeholder="Name shown on the payment"
                    value={manualPayerName}
                    onChange={(e) => setManualPayerName(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manualRemarks"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Payment App / Bank <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <Input
                    id="manualRemarks"
                    type="text"
                    placeholder="e.g. Google Pay, PhonePe, SBI"
                    value={manualRemarks}
                    onChange={(e) => setManualRemarks(e.target.value)}
                    className="h-10 text-xs sm:text-sm bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky/Fixed Footer Actions */}
          <div className="p-3 sm:p-4 md:px-6 border-t border-border flex items-center justify-end gap-3 bg-muted/20 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 md:flex-initial text-xs h-11 md:h-9 px-4 rounded-xl md:rounded-lg cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex-1 md:flex-initial bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs h-11 md:h-9 px-5 rounded-xl md:rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit &amp; Register</span>
                  <span aria-hidden="true">&rarr;</span>
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