import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { updateProfile } from '../services/userService';
import { REQUIRED_SOCIAL_OPTIONS } from '../utils/socialFields';

/**
 * Modal shown to team members when approving a team invitation
 * for an event that requires social media handles they haven't filled yet.
 */
const RequiredSocialHandlesModal = ({
  isOpen,
  onClose,
  missingFields = [],
  eventTitle = '',
  onSuccess,
}) => {
  const { user, role, setSession } = useAuth();
  const { showNotification } = useNotification();
  const [inputs, setInputs] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial = {};
      missingFields.forEach((field) => {
        initial[field] = '';
      });
      setInputs(initial);
      setErrors({});
    }
  }, [isOpen, missingFields]);

  if (!isOpen || !missingFields || missingFields.length === 0) {
    return null;
  }

  const handleInputChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    missingFields.forEach((field) => {
      const val = (inputs[field] || '').trim();
      if (!val) {
        newErrors[field] = 'This field is required';
      } else if (field === 'portfolioUrl' && !/^https?:\/\/.+/i.test(val)) {
        newErrors[field] = 'Please enter a valid URL starting with http:// or https://';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Clean inputs: ensure urls have https:// prefix if user just typed handle
      const cleanedData = {};
      missingFields.forEach((field) => {
        let val = (inputs[field] || '').trim();
        if (field === 'githubProfile' && !val.startsWith('http')) {
          val = `https://github.com/${val.replace(/^@/, '')}`;
        } else if (field === 'linkedinProfile' && !val.startsWith('http')) {
          val = `https://linkedin.com/in/${val.replace(/^@/, '')}`;
        } else if (field === 'xProfile' && !val.startsWith('http')) {
          val = `https://x.com/${val.replace(/^@/, '')}`;
        } else if (field === 'instagramProfile' && !val.startsWith('http')) {
          val = `https://instagram.com/${val.replace(/^@/, '')}`;
        } else if (field === 'portfolioUrl' && !val.startsWith('http')) {
          val = `https://${val}`;
        }
        cleanedData[field] = val;
      });

      // 1. Update user profile so handles are saved forever
      const targetRole = role || user?.role || 'student';
      const targetUserId = user?.id || user?._id;
      const res = await updateProfile(targetRole, targetUserId, cleanedData);
      
      const updatedUser = res.data?.user || { ...user, ...cleanedData };
      if (setSession) {
        setSession(updatedUser, targetRole);
      }
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (err) {
        console.warn('Could not sync user to localStorage:', err);
      }

      // 2. Trigger parent onSuccess callback (which finishes accepting invitation)
      if (onSuccess) {
        await onSuccess(cleanedData);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save profile or accept invitation:', err);
      showNotification(
        err.response?.data?.message || 'Failed to save profile handles. Please try again.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
              <i className="ri-share-line text-lg" />
            </div>
            <div>
              <h3 className="font-medium text-base sm:text-lg text-foreground leading-tight">
                Required Social Handles
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                Complete required information to accept team invitation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-foreground/90 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-medium text-brand-700 dark:text-brand-300">
                {eventTitle ? `"${eventTitle}"` : 'This event'}
              </span>{' '}
              requires team participants to provide the following profile handles. These will also be saved to your CampusNode profile so you won't need to enter them again.
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {missingFields.map((field) => {
              const opt = REQUIRED_SOCIAL_OPTIONS.find((o) => o.id === field) || {
                id: field,
                label: field.replace(/Profile|Url$/, ''),
                icon: 'ri-links-line',
                placeholder: 'https://...',
                description: 'Provide your link',
              };

              const hasError = Boolean(errors[field]);

              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <i className={`${opt.icon} text-sm text-brand-600 dark:text-brand-400`} />
                      <span>{opt.label}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">Required</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={opt.placeholder}
                      value={inputs[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] border bg-background text-foreground transition-all focus:outline-none focus:ring-2 placeholder:text-muted-foreground/60 ${
                        hasError
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-border focus:border-brand-500 focus:ring-brand-500/20'
                      }`}
                    />
                  </div>

                  {hasError && (
                    <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} />
                      <span>{errors[field]}</span>
                    </p>
                  )}
                  <p className="text-[10.5px] text-muted-foreground/80">{opt.description}</p>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Accepting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Accept Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequiredSocialHandlesModal;
