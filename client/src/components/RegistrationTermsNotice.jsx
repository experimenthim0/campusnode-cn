import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, X, Check, AlertTriangle, ExternalLink } from 'lucide-react';

const ROLE_FIELD_SPECS = {
  student: [
    'Roll Number',
    'College Email',
    'Academic Program',
    'Branch / Department',
    'Expected Graduation Year',
  ],
  faculty: [
    'Official Institute Email',
    'Faculty Full Name',
    'Department',
    'Designation / Post',
    'Club Supervision Affiliation',
  ],
  external: [
    'Academic Email',
    'College / University',
    'Program / Degree',
    'Graduation Year',
  ],
};

const RegistrationTermsNotice = ({
  role = 'student',
  agreed = false,
  onAgreementChange,
  error = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);

  const lockedFields =
    ROLE_FIELD_SPECS[role] || ROLE_FIELD_SPECS.student;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const closePopup = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      {/* Terms Section */}
      <div
        className={`
          rounded-xl border px-3.5 py-3
          transition-colors duration-200
          ${
            error
              ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
              : agreed
              ? 'border-brand-200 bg-brand-50/30 dark:border-brand-900/50 dark:bg-brand-950/10'
              : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40'
          }
        `}
      >
        <div className="flex items-start gap-3">

          {/* Checkbox */}
          <div className="relative mt-0.5 shrink-0">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) =>
                onAgreementChange?.(e.target.checked)
              }
              className="peer sr-only"
            />

            <label
              htmlFor="terms"
              className={`
                flex h-[17px] w-[17px]
                cursor-pointer items-center justify-center
                rounded-[5px] border transition-colors
                peer-focus-visible:ring-2
                peer-focus-visible:ring-brand-500/40
                ${
                  agreed
                    ? 'border-brand-600 bg-brand-600'
                    : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800'
                }
              `}
            >
              {agreed && (
                <Check
                  className="h-3 w-3 text-white"
                  strokeWidth={3}
                />
              )}
            </label>
          </div>

          <div className="min-w-0 flex-1">

            {/* Agreement Text */}
            <div className="text-xs leading-5 text-neutral-700 dark:text-neutral-300">
              <label
                htmlFor="terms"
                className="cursor-pointer"
              >
                I agree to the{' '}
              </label>

              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Terms & Conditions
              </Link>
            </div>

            {/* Non-editable Fields Trigger */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-controls="locked-fields-popup"
              className="
                mt-1.5 inline-flex items-center gap-1.5
                rounded-sm text-[11px] font-medium
                text-neutral-500 transition-colors
                hover:text-brand-600
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-brand-500/40
                dark:text-neutral-400
                dark:hover:text-brand-400
              "
            >
              <Lock className="h-3 w-3 shrink-0" />

              <span>
                {lockedFields.length} fields cannot be edited later
              </span>

              <span className="text-brand-600 dark:text-brand-400">
                View
              </span>
            </button>

          </div>
        </div>
      </div>

      {/* Validation Error */}
      {error && (
        <p
          role="alert"
          className="
            mt-1.5 flex items-center gap-1.5
            text-xs font-medium text-rose-600
            dark:text-rose-400
          "
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Non-editable Fields Popup */}
      {isOpen && (
        <div
          id="locked-fields-popup"
          ref={popupRef}
          role="region"
          aria-label="Fields you cannot edit later"
          className="
            absolute bottom-full left-0 z-50 mb-2
            w-full max-w-[340px]
            overflow-hidden rounded-xl
            border border-neutral-200
            bg-white shadow-xl
            dark:border-neutral-700
            dark:bg-neutral-900
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              border-b border-neutral-100
              px-4 py-3
              dark:border-neutral-800
            "
          >
            <h3
              className="
                text-[13px] font-semibold
                text-neutral-900 dark:text-white
              "
            >
              Fields you cannot edit later
            </h3>

            <button
              type="button"
              onClick={closePopup}
              aria-label="Close popup"
              className="
                flex h-7 w-7 items-center justify-center
                rounded-md text-neutral-400
                transition-colors
                hover:bg-neutral-100
                hover:text-neutral-700
                dark:hover:bg-neutral-800
                dark:hover:text-neutral-200
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Field Names */}
          <div className="px-4 py-3">
            <ul className="space-y-2.5">
              {lockedFields.map((field) => (
                <li
                  key={field}
                  className="
                    flex items-center gap-2.5
                    text-xs leading-5
                    text-neutral-700
                    dark:text-neutral-300
                  "
                >
                  <span
                    className="
                      h-1.5 w-1.5 shrink-0
                      rounded-full bg-neutral-400
                      dark:bg-neutral-500
                    "
                  />

                  <span>{field}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div
            className="
              flex justify-end
              border-t border-neutral-100
              px-4 py-2.5
              dark:border-neutral-800
            "
          >
            <button
              type="button"
              onClick={closePopup}
              className="
                rounded-lg bg-neutral-900
                px-4 py-1.5
                text-xs font-medium text-white
                transition-colors
                hover:bg-neutral-800
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-brand-500
                dark:bg-white
                dark:text-neutral-900
                dark:hover:bg-neutral-200
              "
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationTermsNotice;