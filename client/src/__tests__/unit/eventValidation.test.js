import { describe, it, expect } from 'vitest';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateEventStep,
  validateAllEventSteps,
} from '../../utils/eventValidation';

describe('Event Validation Utilities', () => {
  describe('Step 1: Basic Details', () => {
    it('should reject missing or short event title', () => {
      const emptyRes = validateStep1({ title: '', venue: 'Main Auditorium' });
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.errors.title).toBeDefined();

      const shortRes = validateStep1({ title: 'Hi', venue: 'Main Auditorium' });
      expect(shortRes.isValid).toBe(false);
      expect(shortRes.errors.title).toContain('at least 3 characters');
    });

    it('should require venue when not in draft mode', () => {
      const res = validateStep1({ title: 'Tech Symposium' }, { isDraft: false });
      expect(res.isValid).toBe(false);
      expect(res.errors.venue).toBeDefined();
    });

    it('should allow empty venue in draft mode', () => {
      const res = validateStep1({ title: 'Tech Symposium' }, { isDraft: true });
      expect(res.isValid).toBe(true);
      expect(res.errors.venue).toBeUndefined();
    });
  });

  describe('Step 2: Schedule & Access', () => {
    it('should reject end time before start time', () => {
      const res = validateStep2({
        startTime: '2026-10-15T14:00',
        endTime: '2026-10-15T12:00',
        allowedPrograms: ['BTECH'],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.endTime).toContain('after start time');
    });

    it('should reject registration deadline after event start time', () => {
      const res = validateStep2({
        startTime: '2026-10-15T14:00',
        endTime: '2026-10-15T16:00',
        registrationDeadline: '2026-10-15T15:00',
        allowedPrograms: ['BTECH'],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.registrationDeadline).toContain('cannot be after');
    });

    it('should require at least one allowed program when not in draft', () => {
      const res = validateStep2(
        {
          startTime: '2026-10-15T14:00',
          endTime: '2026-10-15T16:00',
          allowedPrograms: [],
        },
        { isDraft: false }
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.allowedPrograms).toBeDefined();
    });
  });

  describe('Step 3: Registration & Payment', () => {
    it('should enforce minTeamSize <= maxTeamSize for team events', () => {
      const res = validateStep3({
        registrationType: 'team',
        minTeamSize: 5,
        maxTeamSize: 2,
        totalSeats: 100,
        paymentMethod: 'FREE',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.maxTeamSize).toBeDefined();
    });

    it('should require UPI ID for manual transaction payment', () => {
      const res = validateStep3({
        registrationType: 'individual',
        totalSeats: 100,
        paymentMethod: 'MANUAL_TRANSACTION',
        registrationFee: 100,
        upiId: '',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.upiId).toBeDefined();
    });

    it('should require valid HTTP(S) URL for college portal payment', () => {
      const res = validateStep3({
        registrationType: 'individual',
        totalSeats: 100,
        paymentMethod: 'COLLEGE_PAYMENT',
        registrationFee: 150,
        collegePaymentUrl: 'ftp://not-http.com',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.collegePaymentUrl).toBeDefined();
    });

    it('should require total seats if not unlimited', () => {
      const res = validateStep3(
        {
          registrationType: 'individual',
          totalSeats: 0,
          paymentMethod: 'FREE',
        },
        { isUnlimited: false }
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.totalSeats).toBeDefined();
    });

    it('should accept 0 seats if unlimited seats is enabled', () => {
      const res = validateStep3(
        {
          registrationType: 'individual',
          totalSeats: 0,
          paymentMethod: 'FREE',
        },
        { isUnlimited: true }
      );
      expect(res.isValid).toBe(true);
    });
  });

  describe('Step 4: Extras', () => {
    it('should validate sponsor name and logo URL', () => {
      const res = validateStep4({
        sponsors: [{ name: '', logoUrl: 'not-a-url' }],
        media: [],
      });
      expect(res.isValid).toBe(false);
      expect(res.sponsorItemErrors[0].name).toBeDefined();
      expect(res.sponsorItemErrors[0].logoUrl).toBeDefined();
    });

    it('should validate media items have valid URLs', () => {
      const res = validateStep4({
        sponsors: [],
        media: [{ url: 'invalid-url', type: 'IMAGE' }],
      });
      expect(res.isValid).toBe(false);
      expect(res.mediaItemErrors[0].url).toBeDefined();
    });
  });

  describe('validateAllEventSteps (Preview & Submission)', () => {
    it('should report invalid steps accurately when incomplete', () => {
      const incompleteEvent = {
        title: 'Tech Fest 2026',
        description: '', // missing description
        venue: 'Main Auditorium',
        startTime: '2026-10-15T10:00',
        endTime: '2026-10-15T18:00',
        allowedPrograms: ['BTECH'],
        totalSeats: 0, // missing seats without isUnlimited
        paymentMethod: 'FREE',
      };

      const result = validateAllEventSteps(incompleteEvent, {
        isUnlimited: false,
        sponsors: [],
        media: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.stepErrors[1]).toBe(true); // description missing
      expect(result.stepErrors[3]).toBe(true); // totalSeats missing
      expect(result.invalidSteps.length).toBeGreaterThan(0);
    });

    it('should pass when all sections are complete and valid', () => {
      const completeEvent = {
        title: 'Annual Coding Hackathon 2026',
        description: 'A 24-hour hackathon for building full-stack applications.',
        venue: 'IT Building Lab 1',
        startTime: '2026-11-01T09:00',
        endTime: '2026-11-02T09:00',
        registrationDeadline: '2026-10-31T23:59',
        allowedPrograms: ['BTECH', 'MTECH'],
        registrationType: 'team',
        minTeamSize: 2,
        maxTeamSize: 4,
        totalSeats: 50,
        paymentMethod: 'FREE',
      };

      const result = validateAllEventSteps(completeEvent, {
        isUnlimited: false,
        sponsors: [],
        media: [],
      });

      expect(result.isValid).toBe(true);
      expect(result.invalidSteps.length).toBe(0);
    });
  });
});
