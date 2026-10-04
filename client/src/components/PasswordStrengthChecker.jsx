
import React from 'react';

/**
 * Password strength checker
 *
 * IMPORTANT:
 * This is a UX-oriented estimator, not a cryptographic password-strength
 * measurement. Always validate passwords on the backend as well.
 */

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'pass123',
  'pass@123',
  'qwerty',
  'qwerty123',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '123123',
  'admin',
  'admin123',
  'administrator',
  'welcome',
  'welcome123',
  'letmein',
  'iloveyou',
  'student',
  'student123',
  'college123',
  'campusnode',
  'nitj',
  'nitjalandhar',
  'coordinator',
]);

const KEYBOARD_PATTERNS = [
  'qwerty',
  'asdfgh',
  'zxcvbn',
  'qwertyui',
  'asdfghjk',
  'zxcvbnm',
  '123456',
  '654321',
  '12345678',
];

const LEET_MAP = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
  '8': 'b',
};

const normalize = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase();

const normalizeLeet = (value = '') =>
  normalize(value)
    .split('')
    .map((char) => LEET_MAP[char] || char)
    .join('');

/**
 * Converts user inputs into useful tokens.
 *
 * Example:
 * "Nikhil Yadav" + "nikhilydv0148@gmail.com"
 *
 * becomes tokens such as:
 * nikhil
 * yadav
 * nikhilydv0148
 * 0148
 */
const getUserTokens = (userInputs = []) => {
  const inputList = Array.isArray(userInputs)
    ? userInputs
    : Object.values(userInputs || {});

  const tokens = new Set();

  inputList.forEach((input) => {
    if (!input || typeof input !== 'string') return;

    const value = normalize(input);

    if (!value) return;

    // Full value
    if (value.length >= 3) {
      tokens.add(value);
    }

    // Split common separators
    const parts = value.split(/[\s._\-@+]+/);

    parts.forEach((part) => {
      if (part.length >= 3) {
        tokens.add(part);
      }
    });

    // Extract digit groups such as roll numbers / years
    const numbers = value.match(/\d+/g) || [];

    numbers.forEach((number) => {
      if (number.length >= 3) {
        tokens.add(number);
      }
    });

    // Remove digits from usernames
    const alphaOnly = value.replace(/\d+/g, '');

    if (alphaOnly.length >= 3) {
      tokens.add(alphaOnly);
    }
  });

  return [...tokens].sort((a, b) => b.length - a.length);
};

const hasSequentialPattern = (password) => {
  const value = normalize(password);

  if (value.length < 4) return false;

  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    '0123456789',
    '9876543210',
  ];

  return sequences.some((sequence) => {
    for (let i = 0; i <= sequence.length - 4; i++) {
      if (value.includes(sequence.slice(i, i + 4))) {
        return true;
      }
    }

    return false;
  });
};

const hasRepeatedPattern = (password) => {
  const value = normalize(password);

  // aaaaaaaa
  if (/^(.)\1{4,}$/.test(value)) {
    return true;
  }

  // abcabcabc
  if (/^(.{2,4})\1{2,}$/.test(value)) {
    return true;
  }

  // 12121212
  if (/^(.{1,2})\1{3,}$/.test(value)) {
    return true;
  }

  return false;
};

const hasYearPattern = (password) => {
  return /(19\d{2}|20\d{2})/.test(password);
};

const hasKeyboardPattern = (password) => {
  const value = normalize(password);

  return KEYBOARD_PATTERNS.some((pattern) =>
    value.includes(pattern)
  );
};

const getCharacterTypes = (password) => ({
  lower: /[a-z]/.test(password),
  upper: /[A-Z]/.test(password),
  digit: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

const getStrength = (password, userInputs = []) => {
  if (!password) {
    return {
      score: 0,
      label: '',
      segments: 0,
      color: 'bg-neutral-200 dark:bg-neutral-800',
      textColor: 'text-neutral-400 dark:text-neutral-500',
      feedback: '',
      isGuessable: false,
      reasons: [],
    };
  }

  const normalized = normalize(password);
  const leetNormalized = normalizeLeet(password);

  const userTokens = getUserTokens(userInputs);

  const reasons = [];

  // ------------------------------------------------------------
  // 1. User-specific information
  // ------------------------------------------------------------

  const matchedUserToken = userTokens.find((token) => {
    if (token.length < 3) return false;

    return (
      normalized.includes(token) ||
      leetNormalized.includes(normalizeLeet(token))
    );
  });

  if (matchedUserToken) {
    reasons.push(`Avoid personal information like "${matchedUserToken}"`);
  }

  // ------------------------------------------------------------
  // 2. Common passwords
  // ------------------------------------------------------------

  const isCommonPassword =
    COMMON_PASSWORDS.has(normalized) ||
    COMMON_PASSWORDS.has(leetNormalized);

  if (isCommonPassword) {
    reasons.push('This is a commonly guessed password');
  }

  // ------------------------------------------------------------
  // 3. Keyboard patterns
  // ------------------------------------------------------------

  if (hasKeyboardPattern(password)) {
    reasons.push('Avoid keyboard patterns like "qwerty" or "123456"');
  }

  // ------------------------------------------------------------
  // 4. Sequential patterns
  // ------------------------------------------------------------

  if (hasSequentialPattern(password)) {
    reasons.push('Avoid predictable sequences like "abcd" or "1234"');
  }

  // ------------------------------------------------------------
  // 5. Repeated patterns
  // ------------------------------------------------------------

  if (hasRepeatedPattern(password)) {
    reasons.push('Avoid repeated characters or patterns');
  }

  // ------------------------------------------------------------
  // 6. Years
  // ------------------------------------------------------------

  if (hasYearPattern(password) && password.length <= 10) {
    reasons.push('Avoid using simple years such as "2026"');
  }

  const isGuessable =
    Boolean(matchedUserToken) ||
    isCommonPassword ||
    hasKeyboardPattern(password) ||
    hasSequentialPattern(password) ||
    hasRepeatedPattern(password);

  // ------------------------------------------------------------
  // Very short passwords
  // ------------------------------------------------------------

  if (password.length < 8) {
    return {
      score: 1,
      label: 'Too short',
      segments: 1,
      color: 'bg-red-500',
      textColor: 'text-red-500 dark:text-red-400',
      feedback: 'Use at least 8 characters',
      isGuessable,
      reasons,
    };
  }

  // ------------------------------------------------------------
  // Guessable passwords
  // ------------------------------------------------------------

  if (isGuessable) {
    return {
      score: 1,
      label: 'Easy to guess',
      segments: 1,
      color: 'bg-red-500',
      textColor: 'text-red-500 dark:text-red-400',
      feedback: reasons[0] || 'Avoid predictable patterns',
      isGuessable: true,
      reasons,
    };
  }

  // ------------------------------------------------------------
  // Character analysis
  // ------------------------------------------------------------

  const types = getCharacterTypes(password);

  const typeCount = Object.values(types).filter(Boolean).length;

  // Unique character ratio
  const uniqueCharacters = new Set(password).size;
  const uniquenessRatio = uniqueCharacters / password.length;

  // ------------------------------------------------------------
  // Score based primarily on length + unpredictability
  // ------------------------------------------------------------

  let points = 0;

  // Length matters more than character classes
  if (password.length >= 8) points += 1;
  if (password.length >= 10) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  // Character diversity
  if (types.lower) points += 1;
  if (types.upper) points += 1;
  if (types.digit) points += 1;
  if (types.special) points += 1;

  // Diversity bonus
  if (typeCount >= 3) points += 1;

  // Penalize highly repetitive passwords
  if (uniquenessRatio < 0.5) {
    points -= 1;
  }

  // ------------------------------------------------------------
  // Final strength
  // ------------------------------------------------------------

  if (points <= 3) {
    return {
      score: 2,
      label: 'Weak',
      segments: 2,
      color: 'bg-amber-500',
      textColor: 'text-amber-500 dark:text-amber-400',
      feedback:
        password.length < 10
          ? 'Make it longer and less predictable'
          : 'Add more variety or use a longer passphrase',
      isGuessable: false,
      reasons,
    };
  }

  if (points <= 6) {
    return {
      score: 3,
      label: 'Good',
      segments: 3,
      color: 'bg-blue-500',
      textColor: 'text-blue-500 dark:text-blue-400',
      feedback:
        password.length < 12
          ? 'Good. A longer password would be stronger'
          : 'Good password. Keep it unique',
      isGuessable: false,
      reasons,
    };
  }

  return {
    score: 4,
    label: 'Strong',
    segments: 4,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    feedback: 'Strong and difficult to guess',
    isGuessable: false,
    reasons,
  };
};

/**
 * Public API retained for compatibility with the old component.
 */
export const getPasswordStrength = (password, userInputs = []) =>
  getStrength(password, userInputs);


/**
 * Password Strength UI
 */
const PasswordStrengthChecker = ({
  password = '',
  userInputs = [],
  className = '',
}) => {
  if (!password) return null;

  const strength = getStrength(password, userInputs);

  const requirements = [
    {
      label: '8+ characters',
      passed: password.length >= 8,
    },
    {
      label: 'Uppercase',
      passed: /[A-Z]/.test(password),
    },
    {
      label: 'Lowercase',
      passed: /[a-z]/.test(password),
    },
    {
      label: 'Number',
      passed: /\d/.test(password),
    },
    {
      label: 'Symbol',
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className={`mt-2 ${className}`}>
      {/* Strength bar */}
      <div className="flex items-center gap-3">
        <div
          className="flex flex-1 gap-1"
          aria-label={`Password strength: ${strength.label}`}
        >
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                segment <= strength.segments
                  ? strength.color
                  : 'bg-neutral-200 dark:bg-neutral-800'
              }`}
            />
          ))}
        </div>

        <span
          className={`shrink-0 text-[11px] font-medium ${strength.textColor}`}
        >
          {strength.label}
        </span>
      </div>

      {/* Feedback */}
      {strength.feedback && (
        <p className="mt-1.5 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
          {strength.feedback}
        </p>
      )}

      {/* Requirements */}
      {strength.score < 4 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {requirements.map((requirement) => (
            <span
              key={requirement.label}
              className={`text-[10.5px] transition-colors ${
                requirement.passed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {requirement.passed ? '✓' : '○'} {requirement.label}
            </span>
          ))}
        </div>
      )}

      {/* Guessability warning */}
      {strength.reasons.length > 0 && (
        <div className="mt-2">
          {strength.reasons.slice(0, 2).map((reason) => (
            <p
              key={reason}
              className="text-[10.5px] leading-4 text-rose-500 dark:text-rose-400"
            >
              {reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthChecker;

