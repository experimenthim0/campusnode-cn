import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail, 
  User, 
  Lightbulb, 
  MessageSquare
} from 'lucide-react';

/**
 * ContactModal Component
 * Custom themed contact and suggestion form integrated with Google Apps Script.
 * Contains 3 fields (excluding auto timestamp): Name, Email, Description/Suggestion.
 */
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbh0efq5670_uTsHNXei5ItQS-JYhNIsoaM2DkfTchaumsn1nrTPRfgCukN5dISMnJ/exec";

const ContactModal = ({ 
  isOpen, 
  onClose, 
  scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || DEFAULT_SCRIPT_URL 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    suggestion: ''
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Auto-fill logged in user info when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          setFormData((prev) => ({
            ...prev,
            name: prev.name || storedUser.name || '',
            email: prev.email || storedUser.email || ''
          }));
        }
      } catch (err) {
        console.warn('[ContactModal] Could not parse stored user:', err);
      }
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (status === 'submitting') return;
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setFormData({ name: '', email: '', suggestion: '' });
      setFormErrors({});
      setErrorMessage('');
    }, 300);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Please enter your name';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.suggestion.trim()) {
      errors.suggestion = 'Please enter your description or suggestion';
    } else if (formData.suggestion.trim().length < 5) {
      errors.suggestion = 'Content should be at least 5 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');

    const targetUrl = scriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || DEFAULT_SCRIPT_URL;

    try {
      if (targetUrl) {
        const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const nameVal = formData.name.trim();
        const emailVal = formData.email.trim();
        const contentVal = formData.suggestion.trim();

        console.log('[ContactModal] Submitting form data to Google Apps Script:', {
          targetUrl,
          timestamp,
          name: nameVal,
          email: emailVal,
          suggestion: contentVal
        });

        // Build URLSearchParams (sends both 'suggestion' and 'description' to ensure compatibility with Apps Script)
        const params = new URLSearchParams();
        params.append('timestamp', timestamp);
        params.append('name', nameVal);
        params.append('email', emailVal);
        params.append('suggestion', contentVal);
        params.append('description', contentVal);
        params.append('description/suggestion', contentVal);

        // Send request via POST
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString()
        });

        console.log('[ContactModal] Form submitted successfully to Google Apps Script!');
      } else {
        console.info('[ContactModal] Google Apps Script URL not configured. Form data:', formData);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setStatus('success');
    } catch (err) {
      console.error('[ContactModal] Failed to submit suggestion:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to submit right now. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-300 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md max-h-[85dvh] flex flex-col bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle rounded-2xl shadow-2xl overflow-hidden my-auto transition-colors"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                  Send a Suggestion
                </h3>
                <p className="text-xs text-cn-text-muted font-normal truncate max-w-xs mt-0.5">
                  Have an idea or feedback? Share it below.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={status === 'submitting'}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Close modal"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto text-cn-text-secondary">
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-success-50 dark:bg-success-950/40 text-success-600 dark:text-success-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-cn-text">
                    Thank You!
                  </h3>
                  <p className="text-cn-text-secondary text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                    Your response has been recorded successfully. Thank you for helping us improve CampusNode!
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-3 w-full">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setFormData({ name: '', email: '', suggestion: '' });
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-cn-border dark:border-cn-border-subtle bg-transparent hover:bg-cn-surface-muted text-cn-text font-bold text-xs transition-colors cursor-pointer"
                  >
                    Submit Another
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white dark:text-neutral-900 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            ) : (
              <div>
                {status === 'error' && (
                  <div className="mb-4 p-3.5 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-900/60 rounded-xl text-xs text-danger-600 dark:text-danger-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Form - 3 fields only */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Your Name <span className="text-brand-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-cn-text-muted" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Himanshu"
                        disabled={status === 'submitting'}
                        className={`w-full pl-10 pr-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border ${
                          formErrors.name 
                            ? 'border-danger-500 focus:border-danger-500' 
                            : 'border-cn-border dark:border-cn-border-subtle focus:border-brand-500'
                        } rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:outline-none transition-colors`}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-[11px] text-danger-500 font-semibold mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold text-cn-text mb-1.5">
                      Email Address <span className="text-brand-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-cn-text-muted" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        disabled={status === 'submitting'}
                        className={`w-full pl-10 pr-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border ${
                          formErrors.email 
                            ? 'border-danger-500 focus:border-danger-500' 
                            : 'border-cn-border dark:border-cn-border-subtle focus:border-brand-500'
                        } rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:outline-none transition-colors`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-[11px] text-danger-500 font-semibold mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Description / Suggestion Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-cn-text">
                        Description / Suggestion <span className="text-brand-500">*</span>
                      </label>
                      <span className="text-[11px] text-cn-text-muted">
                        {formData.suggestion.length}/1000
                      </span>
                    </div>
                    <div className="relative">
                      <Lightbulb className="w-4 h-4 absolute left-3.5 top-3 text-cn-text-muted" />
                      <textarea
                        name="suggestion"
                        value={formData.suggestion}
                        onChange={handleChange}
                        maxLength={1000}
                        rows={4}
                        placeholder="Write your description or suggestion here..."
                        disabled={status === 'submitting'}
                        className={`w-full pl-10 pr-3.5 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border ${
                          formErrors.suggestion 
                            ? 'border-danger-500 focus:border-danger-500' 
                            : 'border-cn-border dark:border-cn-border-subtle focus:border-brand-500'
                        } rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted focus:outline-none transition-colors resize-none`}
                      />
                    </div>
                    {formErrors.suggestion && (
                      <p className="text-[11px] text-danger-500 font-semibold mt-1">{formErrors.suggestion}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-neutral-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Suggestion</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ContactModal;
