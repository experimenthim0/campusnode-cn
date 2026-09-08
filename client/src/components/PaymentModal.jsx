import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

const PaymentModal = ({
  isOpen,
  onClose,
  paymentType,
  event,
  onSubmit,
  isRegistering,
  showNotification
}) => {
  const [manualTxId, setManualTxId] = useState('');
  const [manualPayerName, setManualPayerName] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [collegePaymentStatusConfirmed, setCollegePaymentStatusConfirmed] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate UPI URL dynamically
  const amount = event?.registrationFee || event?.entryFee || 0;
  const upiLink = `upi://pay?pa=${event?.upiId || ''}&pn=${encodeURIComponent(
    event?.accountHolderName || event?.title || 'Event Payment'
  )}&am=${amount}&cu=INR`;

  useEffect(() => {
    if (isOpen && paymentType === 'MANUAL_TRANSACTION' && event?.upiId) {
      QRCode.toDataURL(upiLink, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, paymentType, event, upiLink]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setManualTxId('');
    setManualPayerName('');
    setManualRemarks('');
    setCollegePaymentStatusConfirmed(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4 py-6 transition-all duration-300">
      <div className="bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle rounded-2xl max-w-md w-full shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden transition-colors">
        
        <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
              <i className="ri-wallet-3-line text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-cn-text text-base leading-tight">
                Complete Payment
              </h3>
              <p className="text-cn-text-muted text-xs mt-0.5">
                Registering for {event?.title || 'Event'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
            title="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-cn-text-secondary">
          
          {/* Fee & Payment Type Header Summary */}
          <div className="bg-cn-surface-muted dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl p-4 flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-cn-text-muted block mb-0.5">
                Total Fee
              </span>
              <span className="text-2xl font-bold text-cn-text tracking-tight">
                ₹{amount}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-cn-text-muted block mb-0.5">
                Method
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-400 font-semibold text-xs border border-brand-200/60 dark:border-brand-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                {paymentType === 'MANUAL_TRANSACTION' ? 'Direct UPI' : 'College Portal'}
              </span>
            </div>
          </div>

          {/* MANUAL UPI TRANSACTION FLOW */}
          {paymentType === 'MANUAL_TRANSACTION' && (
            <div className="space-y-6">
              
              {/* QR Code and Primary UPI Info */}
              <div className="flex flex-col items-center p-5 border border-cn-border dark:border-cn-border-subtle rounded-xl bg-cn-surface-muted dark:bg-cn-surface-elevated space-y-4">
                
                {/* QR Container */}
                <div className="relative group">
                  {qrCodeUrl ? (
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-cn-border dark:border-cn-border-subtle">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-44 h-44 object-contain" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl flex items-center justify-center">
                      <i className="ri-qr-code-line text-4xl text-cn-text-muted" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-cn-text-muted text-center font-medium">
                  Scan QR with any app or select a payment app below
                </p>

                {/* Quick App Launch Buttons with Logos */}
                <div className="w-full grid grid-cols-4 gap-2 pt-1">
                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-cn-surface dark:bg-cn-surface-card hover:border-brand-500/50 hover:bg-cn-surface-muted transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 text-base font-bold">
                      <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png" alt="" className='rounded-full' />
                    </div>
                    <span className="text-[10px] font-semibold text-cn-text-secondary">GPay</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-cn-surface dark:bg-cn-surface-card hover:border-brand-500/50 hover:bg-cn-surface-muted transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 text-base font-bold">
                      <img src="https://img.logo.dev/phonepe.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark" alt="" className='rounded-full' />
                    </div>
                    <span className="text-[10px] font-semibold text-cn-text-secondary">PhonePe</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-cn-surface dark:bg-cn-surface-card hover:border-brand-500/50 hover:bg-cn-surface-muted transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-500 text-base font-bold">
                      <img src="https://img.logo.dev/paytm.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark" alt="" className='rounded-full'/>
                    </div>
                    <span className="text-[10px] font-semibold text-cn-text-secondary">Paytm</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-cn-surface dark:bg-cn-surface-card hover:border-brand-500/50 hover:bg-cn-surface-muted transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 text-base font-bold">
                      <img src="https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/bhim-app-icon.png" alt="" />
                    </div>
                    <span className="text-[10px] font-semibold text-cn-text-secondary">BHIM</span>
                  </a>
                </div>

                {/* UPI ID Copy Field */}
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle mt-2">
                  <div className="truncate pr-2">
                    <span className="text-[10px] uppercase font-bold text-cn-text-muted tracking-wider block">
                      UPI ID
                    </span>
                    <span className="text-xs font-mono font-semibold text-cn-text select-all truncate block">
                      {event?.upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(event?.upiId)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <i className={copiedUpi ? "ri-check-line" : "ri-file-copy-line"} />
                    {copiedUpi ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {event?.accountHolderName && (
                  <div className="w-full text-center">
                    <p className="text-[11px] text-cn-text-muted">
                      Payee: <span className="font-semibold text-cn-text">{event.accountHolderName}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {event?.paymentInstructions && (
                <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-brand-500 dark:text-brand-400 flex items-center gap-1.5">
                    <i className="ri-information-line" /> Instructions
                  </p>
                  <p className="text-cn-text-secondary leading-relaxed whitespace-pre-wrap">
                    {event.paymentInstructions}
                  </p>
                </div>
              )}

              <div className="space-y-4 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-cn-text-muted">
                  Verification Details
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Transaction ID / UTR <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12-digit Ref/UTR number"
                      value={manualTxId}
                      onChange={(e) => setManualTxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Payer Name <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name on bank/UPI account"
                      value={manualPayerName}
                      onChange={(e) => setManualPayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Remarks <span className="text-cn-text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Additional details"
                      value={manualRemarks}
                      onChange={(e) => setManualRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COLLEGE PAYMENT PORTAL FLOW */}
          {paymentType === 'COLLEGE_PAYMENT' && (
            <div className="space-y-5">
              <div className="p-5 border border-cn-border dark:border-cn-border-subtle rounded-xl bg-cn-surface-muted dark:bg-cn-surface-elevated flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-400 flex items-center justify-center text-xl">
                  <i className="ri-bank-card-line" />
                </div>
                <div>
                  <h4 className="font-bold text-cn-text text-sm">
                    Official College Payment Portal
                  </h4>
                  <p className="text-xs text-cn-text-secondary mt-1 max-w-xs leading-relaxed">
                    Click below to open the official fee portal in a new tab. Your registration state here will not be lost.
                  </p>
                </div>

                {event?.collegePaymentUrl && (
                  <a
                    href={event.collegePaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <i className="ri-external-link-line" /> Pay on College Portal
                  </a>
                )}
              </div>

              {event?.paymentInstructions && (
                <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-brand-500 dark:text-brand-400 flex items-center gap-1.5">
                    <i className="ri-information-line" /> Instructions
                  </p>
                  <p className="text-cn-text-secondary leading-relaxed whitespace-pre-wrap">
                    {event.paymentInstructions}
                  </p>
                </div>
              )}

              {/* Form Input Section (Receipt Number / Transaction ID) */}
              <div className="space-y-4 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-cn-text-muted">
                  Verification Details
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Receipt Number / Transaction ID <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Receipt No. or Transaction Ref"
                      value={manualTxId}
                      onChange={(e) => setManualTxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Payer Name <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name on payment receipt"
                      value={manualPayerName}
                      onChange={(e) => setManualPayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Remarks <span className="text-cn-text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Additional receipt details"
                      value={manualRemarks}
                      onChange={(e) => setManualRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <Link 
              to="/payment-policy" 
              target="_blank" 
              className="text-xs text-cn-text-muted hover:text-brand-500 font-medium transition-colors hover:underline inline-flex items-center gap-1"
            >
              By proceeding, you agree to our <span className="underline font-semibold text-brand-500">Payment Policy</span>
              <i className="ri-external-link-line text-[10px]" />
            </Link>
          </div>
        </div>

        <div className="p-4 px-6 bg-transparent dark:bg-cn-surface-card border-t border-cn-border-subtle flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-transparent hover:bg-cn-surface-muted text-cn-text font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              if (!manualTxId.trim() || !manualPayerName.trim()) {
                showNotification('Please fill in Receipt Number / Transaction ID and Payer Name.', 'warning');
                return;
              }
              onSubmit(manualTxId, manualPayerName, manualRemarks);
            }}
            disabled={isRegistering}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-neutral-900 font-bold text-xs transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRegistering && <i className="ri-loader-4-line animate-spin text-sm" />}
            {isRegistering ? 'Submitting...' : 'Submit Reference'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;