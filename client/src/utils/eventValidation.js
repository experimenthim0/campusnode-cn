/**
 * Event validation utilities for CampusNode
 * Supports multi-level validation:
 * - Level 1: Draft save (non-blocking, minimal requirements)
 * - Level 2: Step continuation (validates only current step)
 * - Level 3: Preview / Final Submission (validates all required event fields across all steps)
 */

export const URL_REGEX = /^https?:\/\/.+/i;

export const validateStep1 = (formData, { isDraft = false } = {}) => {
  const errors = {};

  if (!formData.title || !formData.title.trim()) {
    errors.title = 'Event title is required.';
  } else if (formData.title.trim().length < 3) {
    errors.title = 'Event title must be at least 3 characters.';
  }

  // In strict mode (Continue or Submit), venue is required
  if (!isDraft) {
    if (!formData.venue || !formData.venue.trim() || formData.venue === 'TBD') {
      errors.venue = 'Please select a venue for your event.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorField: Object.keys(errors)[0] || null,
  };
};

export const validateStep2 = (formData, { isDraft = false } = {}) => {
  const errors = {};

  if (!isDraft) {
    if (!formData.startTime) {
      errors.startTime = 'Start date and time are required.';
    }
    if (!formData.endTime) {
      errors.endTime = 'End date and time are required.';
    }
  }

  if (formData.startTime && formData.endTime) {
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (isNaN(start.getTime())) {
      errors.startTime = 'Invalid start time format.';
    }
    if (isNaN(end.getTime())) {
      errors.endTime = 'Invalid end time format.';
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
      errors.endTime = 'End time must be after start time.';
    }
  }

  if (formData.registrationDeadline && formData.startTime) {
    const deadline = new Date(formData.registrationDeadline);
    const start = new Date(formData.startTime);
    if (!isNaN(deadline.getTime()) && !isNaN(start.getTime()) && deadline > start) {
      errors.registrationDeadline = 'Registration deadline cannot be after event start time.';
    }
  }

  if (!isDraft) {
    if (!formData.allowedPrograms || formData.allowedPrograms.length === 0) {
      errors.allowedPrograms = 'At least one academic program must be selected.';
    }
    if (formData.allYears === false && (!formData.allowedYears || formData.allowedYears.length === 0)) {
      errors.allowedYears = 'Please select at least one allowed year or enable "Allow All Years".';
    }
    if (formData.allBranches === false && (!formData.allowedBranches || formData.allowedBranches.length === 0)) {
      errors.allowedBranches = 'Please select at least one allowed branch or enable "Allow All Branches".';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorField: Object.keys(errors)[0] || null,
  };
};

export const validateStep3 = (formData, { isDraft = false, isUnlimited = false } = {}) => {
  const errors = {};

  if (formData.registrationType === 'team' || formData.registrationType === 'both') {
    const min = Number(formData.minTeamSize || 1);
    const max = Number(formData.maxTeamSize || 1);
    if (min < 1) {
      errors.minTeamSize = 'Minimum team size must be at least 1.';
    }
    if (max < min) {
      errors.maxTeamSize = 'Maximum team size cannot be less than minimum team size.';
    }
  }

  if (!isDraft && !isUnlimited) {
    const seats = Number(formData.totalSeats);
    if (!formData.totalSeats || isNaN(seats) || seats < 1) {
      errors.totalSeats = 'Total seats must be specified or enable "Unlimited Seats".';
    }
  }

  if (formData.paymentMethod && formData.paymentMethod !== 'FREE') {
    const fee = Number(formData.registrationFee || 0);
    if (fee <= 0) {
      errors.registrationFee = 'Registration fee must be greater than ₹0 for paid events.';
    }

    if (formData.paymentMethod === 'MANUAL_TRANSACTION') {
      if (!formData.upiId || !formData.upiId.trim()) {
        errors.upiId = 'UPI ID is required for manual UPI payment.';
      }
    } else if (formData.paymentMethod === 'COLLEGE_PAYMENT') {
      if (!formData.collegePaymentUrl || !formData.collegePaymentUrl.trim()) {
        errors.collegePaymentUrl = 'Official College Payment Portal URL is required.';
      } else {
        const portalVal = formData.collegePaymentUrl.trim();
        const isUrlLike = URL_REGEX.test(portalVal);
        if (!isUrlLike) {
          errors.collegePaymentUrl = 'Enter a valid URL (e.g. https://www.onlinesbi.sbi/...).';
        }
      }
    }
  }

  if (Array.isArray(formData.customFields)) {
    for (let i = 0; i < formData.customFields.length; i++) {
      if (!formData.customFields[i].label?.trim()) {
        errors[`customField_${i}`] = `Custom field #${i + 1} requires a field label.`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorField: Object.keys(errors)[0] || null,
  };
};

export const validateStep4 = ({ sponsors = [], media = [] } = {}) => {
  const errors = {};
  const sponsorItemErrors = [];
  const mediaItemErrors = [];
  let hasSponsorError = false;
  let hasMediaError = false;

  (sponsors || []).forEach((s, idx) => {
    const errs = {};
    if (!s.name || !s.name.trim()) errs.name = 'Sponsor name is required.';
    if (!s.logoUrl || !URL_REGEX.test(s.logoUrl.trim())) {
      errs.logoUrl = 'Valid logo URL (https://...) is required.';
    }
    if (s.websiteUrl && !URL_REGEX.test(s.websiteUrl.trim())) {
      errs.websiteUrl = 'Website URL must begin with http:// or https://';
    }
    sponsorItemErrors[idx] = errs;
    if (Object.keys(errs).length > 0) hasSponsorError = true;
  });

  (media || []).forEach((m, idx) => {
    const errs = {};
    if (!m.url || !URL_REGEX.test(m.url.trim())) {
      errs.url = 'Valid media URL (https://...) is required.';
    }
    mediaItemErrors[idx] = errs;
    if (Object.keys(errs).length > 0) hasMediaError = true;
  });

  if (hasSponsorError) errors.sponsors = 'Please fix the sponsor errors before saving.';
  if (hasMediaError) errors.media = 'Please fix the media item errors before saving.';

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sponsorItemErrors,
    mediaItemErrors,
    firstErrorField: Object.keys(errors)[0] || null,
  };
};

/**
 * Validate a specific step (1, 2, 3, or 4)
 */
export const validateEventStep = (stepNumber, formData, options = {}) => {
  switch (stepNumber) {
    case 1:
      return validateStep1(formData, options);
    case 2:
      return validateStep2(formData, options);
    case 3:
      return validateStep3(formData, options);
    case 4:
      return validateStep4(options);
    default:
      return { isValid: true, errors: {}, firstErrorField: null };
  }
};

/**
 * Validate all event steps for Preview / Final Submission
 */
export const validateAllEventSteps = (formData, { sponsors = [], media = [], isUnlimited = false } = {}) => {
  const step1 = validateStep1(formData, { isDraft: false });
  const step2 = validateStep2(formData, { isDraft: false });
  const step3 = validateStep3(formData, { isDraft: false, isUnlimited });
  const step4 = validateStep4({ sponsors, media });

  // Check description completeness for final submission
  if (!formData.description || formData.description.trim().length < 10) {
    step1.errors.description = 'Event description is required (min 10 characters).';
    step1.isValid = false;
    if (!step1.firstErrorField) step1.firstErrorField = 'description';
  }

  const errorsByStep = {
    1: step1.errors,
    2: step2.errors,
    3: step3.errors,
    4: step4.errors,
  };

  const stepErrors = {
    1: !step1.isValid,
    2: !step2.isValid,
    3: !step3.isValid,
    4: !step4.isValid,
  };

  const STEP_NAMES = {
    1: 'Basic Details',
    2: 'Schedule & Access',
    3: 'Registration & Payment',
    4: 'Extras',
  };

  const invalidSteps = [];
  [1, 2, 3, 4].forEach((stepId) => {
    if (stepErrors[stepId]) {
      const issues = Object.values(errorsByStep[stepId]).filter(Boolean);
      invalidSteps.push({
        stepId,
        stepName: STEP_NAMES[stepId],
        issues,
      });
    }
  });

  const totalErrorCount = invalidSteps.reduce((acc, curr) => acc + curr.issues.length, 0);

  return {
    isValid: invalidSteps.length === 0,
    errorsByStep,
    stepErrors,
    invalidSteps,
    totalErrorCount,
  };
};
