import React from 'react';

/**
 * AutosaveStatusBadge
 * Non-intrusive autosave status rendered as simple gray text.
 * States: 'idle' | 'saving' | 'saved' | 'error' | 'draft'
 */
const AutosaveStatusBadge = ({
  status = 'saved',
  lastSavedTime = null,
  onRetry,
  label = null,
  className = '',
}) => {
  if (status === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 select-none ${className}`}>
        <svg
          className="w-3 h-3 animate-spin text-neutral-400 dark:text-neutral-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        <span>Saving...</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400 select-none ${className}`}>
        <span>Save failed</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="underline font-medium hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer ml-0.5"
          >
            Retry
          </button>
        )}
      </span>
    );
  }

  if (status === 'saved') {
    const savedText = label
      ? `${label} ${lastSavedTime || 'just now'}`
      : `Saved ${lastSavedTime || 'just now'}`;

    return (
      <span className={`text-xs text-neutral-500 dark:text-neutral-400 select-none ${className}`}>
        {savedText}
      </span>
    );
  }

  if (status === 'draft') {
    return (
      <span className={`text-xs text-neutral-500 dark:text-neutral-400 select-none ${className}`}>
        Draft
      </span>
    );
  }

  return null;
};

export default AutosaveStatusBadge;
