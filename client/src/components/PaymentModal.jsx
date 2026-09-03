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
      <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-md w-full shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden transition-colors">
        
        <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
              <i className="ri-wallet-3-line text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-[#111111] dark:text-[#F5F5F5] text-base leading-tight">
                Complete Payment
              </h3>
              <p className="text-[#888888] dark:text-[#808080] text-xs mt-0.5">
                Registering for {event?.title || 'Event'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
            title="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-[#555555] dark:text-[#B5B5B5]">
          
          {/* Fee & Payment Type Header Summary */}
          <div className="bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl p-4 flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-[#888888] dark:text-[#808080] block mb-0.5">
                Total Fee
              </span>
              <span className="text-2xl font-bold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
                ₹{amount}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-[#888888] dark:text-[#808080] block mb-0.5">
                Method
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] font-semibold text-xs border border-orange-200/60 dark:border-orange-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
                {paymentType === 'MANUAL_TRANSACTION' ? 'Direct UPI' : 'College Portal'}
              </span>
            </div>
          </div>

          {/* MANUAL UPI TRANSACTION FLOW */}
          {paymentType === 'MANUAL_TRANSACTION' && (
            <div className="space-y-6">
              
              {/* QR Code and Primary UPI Info */}
              <div className="flex flex-col items-center p-5 border border-[#E5E5E5] dark:border-[#303030] rounded-xl bg-[#FAFAFA] dark:bg-[#222222] space-y-4">
                
                {/* QR Container */}
                <div className="relative group">
                  {qrCodeUrl ? (
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-[#E5E5E5] dark:border-[#3A3A3A]">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-44 h-44 object-contain" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl flex items-center justify-center">
                      <i className="ri-qr-code-line text-4xl text-[#888888]" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#888888] dark:text-[#808080] text-center font-medium">
                  Scan QR with any app or select a payment app below
                </p>

                {/* Quick App Launch Buttons with Logos */}
                <div className="w-full grid grid-cols-4 gap-2 pt-1">
                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-white dark:bg-[#181818] hover:border-[#F97316]/50 hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 text-base font-bold">
                      <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png" alt="" className='rounded-full' />
                    </div>
                    <span className="text-[10px] font-semibold text-[#555555] dark:text-[#B5B5B5]">GPay</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-white dark:bg-[#181818] hover:border-[#F97316]/50 hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 text-base font-bold">
                      <img src="https://img.logo.dev/phonepe.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark" alt="" className='rounded-full' />
                    </div>
                    <span className="text-[10px] font-semibold text-[#555555] dark:text-[#B5B5B5]">PhonePe</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-white dark:bg-[#181818] hover:border-[#F97316]/50 hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-500 text-base font-bold">
                      <img src="https://img.logo.dev/paytm.com?token=live_6a1a28fd-6420-4492-aeb0-b297461d9de2&size=128&retina=true&format=png&theme=dark" alt="" className='rounded-full'/>
                    </div>
                    <span className="text-[10px] font-semibold text-[#555555] dark:text-[#B5B5B5]">Paytm</span>
                  </a>

                  <a
                    href={upiLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-white dark:bg-[#181818] hover:border-[#F97316]/50 hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 text-base font-bold">
                      <img src="https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/bhim-app-icon.png" alt="" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#555555] dark:text-[#B5B5B5]">BHIM</span>
                  </a>
                </div>

                {/* UPI ID Copy Field */}
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] mt-2">
                  <div className="truncate pr-2">
                    <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-[#808080] tracking-wider block">
                      UPI ID
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#111111] dark:text-[#F5F5F5] select-all truncate block">
                      {event?.upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(event?.upiId)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#F97316] dark:text-[#FB923C] bg-[#FFF7ED] dark:bg-[#2A1A0F] hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <i className={copiedUpi ? "ri-check-line" : "ri-file-copy-line"} />
                    {copiedUpi ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {event?.accountHolderName && (
                  <div className="w-full text-center">
                    <p className="text-[11px] text-[#888888] dark:text-[#808080]">
                      Payee: <span className="font-semibold text-[#111111] dark:text-[#F5F5F5]">{event.accountHolderName}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {event?.paymentInstructions && (
                <div className="p-3.5 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-orange-200/60 dark:border-orange-900/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-[#F97316] dark:text-[#FB923C] flex items-center gap-1.5">
                    <i className="ri-information-line" /> Instructions
                  </p>
                  <p className="text-[#555555] dark:text-[#B5B5B5] leading-relaxed whitespace-pre-wrap">
                    {event.paymentInstructions}
                  </p>
                </div>
              )}

              <div className="space-y-4 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                  Verification Details
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Transaction ID / UTR <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12-digit Ref/UTR number"
                      value={manualTxId}
                      onChange={(e) => setManualTxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Payer Name <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name on bank/UPI account"
                      value={manualPayerName}
                      onChange={(e) => setManualPayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Remarks <span className="text-[#888888] dark:text-[#808080] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Additional details"
                      value={manualRemarks}
                      onChange={(e) => setManualRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COLLEGE PAYMENT PORTAL FLOW */}
          {paymentType === 'COLLEGE_PAYMENT' && (
            <div className="space-y-5">
              <div className="p-5 border border-[#E5E5E5] dark:border-[#303030] rounded-xl bg-[#FAFAFA] dark:bg-[#222222] flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center text-xl">
                  <i className="ri-bank-card-line" />
                </div>
                <div>
                  <h4 className="font-bold text-[#111111] dark:text-[#F5F5F5] text-sm">
                    Official College Payment Portal
                  </h4>
                  <p className="text-xs text-[#555555] dark:text-[#B5B5B5] mt-1 max-w-xs leading-relaxed">
                    Click below to open the official fee portal in a new tab. Your registration state here will not be lost.
                  </p>
                </div>

                {event?.collegePaymentUrl && (
                  <a
                    href={event.collegePaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <i className="ri-external-link-line" /> Pay on College Portal
                  </a>
                )}
              </div>

              {event?.paymentInstructions && (
                <div className="p-3.5 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-orange-200/60 dark:border-orange-900/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-[#F97316] dark:text-[#FB923C] flex items-center gap-1.5">
                    <i className="ri-information-line" /> Instructions
                  </p>
                  <p className="text-[#555555] dark:text-[#B5B5B5] leading-relaxed whitespace-pre-wrap">
                    {event.paymentInstructions}
                  </p>
                </div>
              )}

              {/* Form Input Section (Receipt Number / Transaction ID) */}
              <div className="space-y-4 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080]">
                  Verification Details
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Receipt Number / Transaction ID <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Receipt No. or Transaction Ref"
                      value={manualTxId}
                      onChange={(e) => setManualTxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Payer Name <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name on payment receipt"
                      value={manualPayerName}
                      onChange={(e) => setManualPayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                      Remarks <span className="text-[#888888] dark:text-[#808080] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Additional receipt details"
                      value={manualRemarks}
                      onChange={(e) => setManualRemarks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
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
              className="text-xs text-[#888888] dark:text-[#808080] hover:text-[#F97316] dark:hover:text-[#FB923C] font-medium transition-colors hover:underline inline-flex items-center gap-1"
            >
              By proceeding, you agree to our <span className="underline font-semibold text-[#F97316] dark:text-[#FB923C]">Payment Policy</span>
              <i className="ri-external-link-line text-[10px]" />
            </Link>
          </div>
        </div>

        <div className="p-4 px-6 bg-transparent dark:bg-[#181818] border-t border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] font-bold text-xs transition-colors cursor-pointer"
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] font-bold text-xs transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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