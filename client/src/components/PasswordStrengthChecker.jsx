import React from 'react';

/**
 * Evaluates password strength and detects guessable patterns or user-specific inputs
 * @param {string} password 
 * @param {Array<string>|Object} userInputs - e.g. [name, email, rollNo]
 * @returns {Object} strength details
 */
export const getPasswordStrength = (password, userInputs = []) => {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: '',
      color: 'bg-neutral-200 dark:bg-neutral-800',
      textColor: 'text-neutral-400 dark:text-neutral-500',
      segments: 0,
      feedback: '',
      isGuessable: false,
    };
  }

  const cleanPass = password.toLowerCase();

  const forbiddenSubstrings = new Set();
  const inputList = Array.isArray(userInputs) ? userInputs : Object.values(userInputs || {});

  inputList.forEach((input) => {
    if (!input || typeof input !== 'string') return;
    const cleanInput = input.trim().toLowerCase();
    if (cleanInput.length >= 3) {
      forbiddenSubstrings.add(cleanInput);
      // Also split multi-word inputs like "Aman Yadav" -> "aman", "yadav"
      const words = cleanInput.split(/[\s._\-@]+/);
      words.forEach((w) => {
        if (w.length >= 3) forbiddenSubstrings.add(w);
      });
    }
  });

  // Common easily guessable patterns / passwords
  const commonGuessableWords = [
    'password', 'pass123', 'qwerty', '123456', '12345678', '123456789',
    'admin123', 'campusnode', 'welcome', 'letmein', 'iloveyou',
    'nitjalandhar', 'coordinator', 'student123',
  ];
  commonGuessableWords.forEach((w) => forbiddenSubstrings.add(w));

  let isGuessable = false;
  let matchedWord = '';
  for (const forbidden of forbiddenSubstrings) {
    if (cleanPass.includes(forbidden)) {
      isGuessable = true;
      matchedWord = forbidden;
      break;
    }
  }

  // Also check for repeating single character e.g. "aaaaaa", "111111"
  if (/^(.)\1{4,}$/.test(password)) {
    isGuessable = true;
  }

  if (isGuessable) {
    return {
      score: 1,
      label: 'Guessable',
      color: 'bg-rose-500',
      textColor: 'text-rose-500 dark:text-rose-400',
      segments: 1,
      feedback: matchedWord ? `Contains "${matchedWord}" — easily guessable` : 'Easily guessable pattern',
      isGuessable: true,
    };
  }

  // Check if Too Short (< 6 chars)
  if (password.length < 6) {
    return {
      score: 1,
      label: 'Too short',
      color: 'bg-red-500',
      textColor: 'text-red-500 dark:text-red-400',
      segments: 1,
      feedback: 'At least 6 characters required',
      isGuessable: false,
    };
  }

  let points = 0;

  // Length points
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;

  // Character diversity
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasLower) points += 1;
  if (hasUpper) points += 1;
  if (hasDigit) points += 1;
  if (hasSpecial) points += 1;

  const typeCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (typeCount >= 3) points += 1;

  // Score mapping:
  // Points <= 3 or length < 7 -> Weak (2 segments)
  // Points 4-5 -> Medium (3 segments)
  // Points >= 6 and length >= 8 -> Hard (4 segments)
  if (points <= 3 || password.length < 7 || typeCount < 2) {
    return {
      score: 2,
      label: 'Weak',
      color: 'bg-brand-500',
      textColor: 'text-brand-500 dark:text-brand-400',
      segments: 2,
      feedback: 'Add uppercase letters, numbers, or symbols',
      isGuessable: false,
    };
  }

  if (points <= 5 || typeCount < 3) {
    return {
      score: 3,
      label: 'Medium',
      color: 'bg-amber-500',
      textColor: 'text-amber-500 dark:text-amber-400',
      segments: 3,
      feedback: 'Add special characters to make it hard',
      isGuessable: false,
    };
  }

  return {
    score: 4,
    label: 'Hard',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    segments: 4,
    feedback: 'Strong and secure password',
    isGuessable: false,
  };
};

/**
 * Minimalist Password Strength Progress Bar Component
 */
const PasswordStrengthChecker = ({ password = '', userInputs = [], className = '' }) => {
  if (!password) return null;

  const strength = getPasswordStrength(password, userInputs);

  return (
    <div className={`mt-2 transition-all duration-200 ${className}`}>
      {/* Progress Bar & Label */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-1">
          {[1, 2, 3, 4].map((segIndex) => {
            const isActive = segIndex <= strength.segments;
            return (
              <div
                key={segIndex}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? strength.color
                    : 'bg-neutral-100 dark:bg-neutral-800'
                }`}
              />
            );
          })}
        </div>

        <span
          className={`text-[11px] font-light tracking-wide shrink-0 capitalize ${strength.textColor}`}
        >
          {strength.label}
        </span>
      </div>

      {/* Micro feedback line */}
      {strength.feedback && (
        <p className="text-[10.5px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
          {strength.feedback}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthChecker;
