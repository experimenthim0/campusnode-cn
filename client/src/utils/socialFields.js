/**
 * CampusNode - Social Media & Profile Fields Configuration & Helpers
 */

export const REQUIRED_SOCIAL_OPTIONS = [
  {
    id: 'githubProfile',
    label: 'GitHub Profile',
    icon: 'ri-github-fill',
    platform: 'GITHUB',
    placeholder: 'https://github.com/username',
    description: 'Require participant to link their GitHub profile',
  },
  {
    id: 'linkedinProfile',
    label: 'LinkedIn Profile',
    icon: 'ri-linkedin-box-fill',
    platform: 'LINKEDIN',
    placeholder: 'https://linkedin.com/in/username',
    description: 'Require participant to link their LinkedIn profile',
  },
  {
    id: 'xProfile',
    label: 'X (Twitter) Profile',
    icon: 'ri-twitter-x-fill',
    platform: 'X',
    placeholder: 'https://x.com/username',
    description: 'Require participant to link their X / Twitter profile',
  },
  {
    id: 'instagramProfile',
    label: 'Instagram Profile',
    icon: 'ri-instagram-line',
    platform: 'INSTAGRAM',
    placeholder: 'https://instagram.com/username',
    description: 'Require participant to link their Instagram profile',
  },
  {
    id: 'portfolioUrl',
    label: 'Portfolio / Website',
    icon: 'ri-global-line',
    platform: 'PORTFOLIO',
    placeholder: 'https://yourportfolio.com',
    description: 'Require participant to link their personal portfolio or website',
  },
];

export const SOCIAL_KEY_MAP = {
  githubProfile: 'GITHUB',
  linkedinProfile: 'LINKEDIN',
  xProfile: 'X',
  instagramProfile: 'INSTAGRAM',
  portfolioUrl: 'PORTFOLIO',
  whatsappNumber: 'WHATSAPP',
};

/**
 * Extract an existing field value from the user object (checking direct keys and socialLinks array)
 */
export const getUserSocialValue = (user, fieldId) => {
  if (!user) return '';

  if (user[fieldId] && typeof user[fieldId] === 'string' && user[fieldId].trim()) {
    return user[fieldId].trim();
  }

  const targetPlatform = SOCIAL_KEY_MAP[fieldId];
  if (targetPlatform && Array.isArray(user.socialLinks)) {
    const match = user.socialLinks.find(
      (l) => (l.platform || '').toUpperCase() === targetPlatform && l.url?.trim()
    );
    if (match) return match.url.trim();
  }

  return '';
};

/**
 * Filter out which required fields are missing on the given user object
 */
export const getMissingSocialFields = (user, requiredFields = []) => {
  if (!user || !Array.isArray(requiredFields) || requiredFields.length === 0) {
    return [];
  }

  return requiredFields.filter((fieldId) => {
    const val = getUserSocialValue(user, fieldId);
    return !val;
  });
};

/**
 * Formats field id into human-readable label
 */
export const formatSocialFieldLabel = (fieldId) => {
  const match = REQUIRED_SOCIAL_OPTIONS.find((opt) => opt.id === fieldId);
  if (match) return match.label;
  return fieldId
    .replace(/Profile|Url$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
};
