import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Info,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

const ROLE_FIELD_SPECS = {
  student: {
    roleTitle: 'NITJ Student Registration',
    roleBadge: 'NITJian Academic Profile',
    lockedFields: [
      {
        label: 'Roll Number',
        desc: 'Official institute roll number',
      },
      {
        label: 'College Email',
        desc: 'Official @nitj.ac.in email address',
      },
      {
        label: 'Academic Program',
        desc: 'Your enrolled degree program',
      },
      {
        label: 'Branch / Department',
        desc: 'Your assigned department',
      },
      {
        label: 'Expected Graduation Year',
        desc: 'Your expected year of graduation',
      },
    ],
    editableLater: [
      'Full Name',
      'Profile Photo',
      'Contact Number',
      'Social Links',
      'Password & 2FA',
    ],
  },

  faculty: {
    roleTitle: 'Faculty Coordinator Registration',
    roleBadge: 'Institute Faculty Profile',
    lockedFields: [
      {
        label: 'Official Institute Email',
        desc: 'Official @nitj.ac.in faculty email',
      },
      {
        label: 'Faculty Full Name',
        desc: 'Your official faculty name',
      },
      {
        label: 'Department',
        desc: 'Your assigned department',
      },
      {
        label: 'Designation / Post',
        desc: 'Your current designation',
      },
      {
        label: 'Club Supervision Affiliation',
        desc: 'Managed by the institute administration',
      },
    ],
    editableLater: [
      'Profile Photo',
      'Password',
      'Two-Factor Authentication',
      'Office / Mobile Contact',
    ],
  },

  external: {
    roleTitle: 'External Participant Registration',
    roleBadge: 'External Guest Profile',
    lockedFields: [
      {
        label: 'Academic Email',
        desc: 'Your registered college or university email',
      },
      {
        label: 'College / University',
        desc: 'Your current institution',
      },
      {
        label: 'Program / Degree',
        desc: 'Your current degree program',
      },
      {
        label: 'Graduation Year',
        desc: 'Your expected graduation year',
      },
    ],
    editableLater: [
      'Full Name',
      'Profile Photo',
      'Contact Number',
      'Social Links',
      'Password',
    ],
  },
};

const RegistrationTermsNotice = ({
  role = 'student',
  agreed = false,
  onAgreementChange,
  error = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  const spec =
    ROLE_FIELD_SPECS[role] || ROLE_FIELD_SPECS.student;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  const toggleOpen = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsOpen((prev) => !prev);
  };

  const handleAcknowledgeAndAgree = () => {
    onAgreementChange(true);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative select-none pt-1"
    >
      {/* Terms Row */}
      <div
        className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
          error
            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
            : agreed
            ? 'bg-brand-50/40 dark:bg-brand-950/15 border-brand-200/70 dark:border-brand-900/40'
            : 'bg-neutral-50/80 dark:bg-neutral-900/40 border-neutral-200/80 dark:border-neutral-800'
        }`}
      >
        {/* Checkbox */}
        <div className="pt-0.5 shrink-0">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={agreed}
            onChange={(e) =>
              onAgreementChange(e.target.checked)
            }
            className="sr-only peer"
          />

          <label
            htmlFor="terms"
            className="w-4 h-4 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 peer-checked:bg-brand-600 dark:peer-checked:bg-brand-500 peer-checked:border-brand-600 dark:peer-checked:border-brand-500 flex items-center justify-center cursor-pointer transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30"
          >
            {agreed && (
              <Check className="w-3 h-3 text-white stroke-[3]" />
            )}
          </label>
        </div>

        {/* Terms Text */}
        <div className="flex-1 min-w-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5">
            <label
              htmlFor="terms"
              className="cursor-pointer"
            >
              I agree to the{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
              >
                Terms & Conditions
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </Link>
            </label>

            <button
              type="button"
              onClick={toggleOpen}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              aria-label="View non-editable fields"
              aria-expanded={isOpen}
              title="View non-editable fields"
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                isOpen
                  ? 'bg-brand-600 text-white shadow-xs scale-110'
                  : 'bg-neutral-200 hover:bg-brand-100 text-neutral-700 hover:text-brand-700 dark:bg-neutral-800 dark:hover:bg-brand-950/60 dark:text-neutral-300 dark:hover:text-brand-300'
              }`}
            >
              <Info className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-1">
            <button
              type="button"
              onClick={toggleOpen}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>
                Non-editable fields ({spec.lockedFields.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Popup */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute z-50 left-0 right-0 bottom-full mb-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 transition-all animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white leading-tight">
                  Non-Editable Fields
                </h4>

                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {spec.roleBadge}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Short Notice */}
          <div className="mt-3 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />

            <span>
              These details cannot be changed after registration.
            </span>
          </div>

          {/* Locked Fields */}
          <div className="mt-3 space-y-1.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
            {spec.lockedFields.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/50 flex items-start gap-2"
              >
                <div className="w-4 h-4 rounded-full bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-2.5 h-2.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100 leading-tight">
                    {item.label}
                  </p>

                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Editable Fields */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3 h-3" />
              Editable later
            </p>

            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-normal">
              {spec.editableLater.join(' • ')}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-3.5 pt-2 flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
            >
              Read full policy
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>

            <button
              type="button"
              onClick={handleAcknowledgeAndAgree}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-[11px] font-medium transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {agreed ? 'Understood' : 'I Understand & Agree'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationTermsNotice;