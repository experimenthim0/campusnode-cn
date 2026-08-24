/**
 * Shared constants and type definitions for the CampusNode frontend.
 * These mirror the backend Prisma enums exactly.
 */

export const ParticipationStatus = Object.freeze({
  REGISTERED: 'REGISTERED',
  ATTENDED:   'ATTENDED',
  WAITLISTED: 'WAITLISTED',
  CANCELLED:  'CANCELLED',
});

export const PrincipalType = Object.freeze({
  STUDENT: 'STUDENT',
  FACULTY: 'FACULTY',
  CLUB:    'CLUB',
  ADMIN:   'ADMIN',
});

export const ClubMemberRole = Object.freeze({
  CLUB_HEAD:   'CLUB_HEAD',
  COORDINATOR: 'COORDINATOR',
  MEMBER:      'MEMBER',
});

export const MediaType = Object.freeze({
  IMAGE:        'IMAGE',
  VIDEO:        'VIDEO',
  SPONSOR_LOGO: 'SPONSOR_LOGO',
});

export const PaymentMethod = Object.freeze({
  FREE: 'FREE',
  COLLEGE_PAYMENT: 'COLLEGE_PAYMENT',
  MANUAL_TRANSACTION: 'MANUAL_TRANSACTION',
});

export const PaymentStatus = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEED_MORE_DETAILS: 'NEED_MORE_DETAILS',
});

/**
 * @typedef {{ name: string, logoUrl: string, websiteUrl?: string }} Sponsor
 * @typedef {{ url: string, type: 'IMAGE'|'VIDEO'|'SPONSOR_LOGO' }} Media
 * @typedef {{
 *   id: string, eventId: string, studentId: string|null,
 *   externalEmail: string|null, externalName: string|null,
 *   status: string, qrCode: string|null,
 *   attendedAt: string|null, markedByMemberId: string|null
 * }} Participation
 */

/**
 * Returns true if and only if `str` is a valid 24-character lowercase hex ObjectId.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidObjectId(str) {
  return /^[a-f0-9]{24}$/.test(str);
}
