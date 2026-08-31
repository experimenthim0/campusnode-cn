/**
 * Unit and property-based tests for src/types/index.js
 *
 * Covers:
 *   - 9.1  Property 13: isValidObjectId returns true iff /^[a-f0-9]{24}$/
 *   - 9.11 Unit tests for ParticipationStatus and ClubMemberRole constant values
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidObjectId,
  ParticipationStatus,
  ClubMemberRole,
  MediaType,
} from '../../types/index.js';


describe('ParticipationStatus constants', () => {
  it('has exactly the four expected values', () => {
    expect(ParticipationStatus.REGISTERED).toBe('REGISTERED');
    expect(ParticipationStatus.ATTENDED).toBe('ATTENDED');
    expect(ParticipationStatus.WAITLISTED).toBe('WAITLISTED');
    expect(ParticipationStatus.CANCELLED).toBe('CANCELLED');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(ParticipationStatus)).toBe(true);
  });

  it('has exactly four keys', () => {
    expect(Object.keys(ParticipationStatus)).toHaveLength(4);
  });
});

describe('ClubMemberRole constants', () => {
  it('has exactly the three expected values', () => {
    expect(ClubMemberRole.CLUB_HEAD).toBe('CLUB_HEAD');
    expect(ClubMemberRole.COORDINATOR).toBe('COORDINATOR');
    expect(ClubMemberRole.MEMBER).toBe('MEMBER');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(ClubMemberRole)).toBe(true);
  });

  it('has exactly three keys', () => {
    expect(Object.keys(ClubMemberRole)).toHaveLength(3);
  });
});

describe('MediaType constants', () => {
  it('has IMAGE, VIDEO, SPONSOR_LOGO', () => {
    expect(MediaType.IMAGE).toBe('IMAGE');
    expect(MediaType.VIDEO).toBe('VIDEO');
    expect(MediaType.SPONSOR_LOGO).toBe('SPONSOR_LOGO');
  });
});


describe('isValidObjectId — unit examples', () => {
  it('accepts a valid 24-char lowercase hex string', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('000000000000000000000000')).toBe(true);
    expect(isValidObjectId('abcdef1234567890abcdef12')).toBe(true);
  });

  it('rejects strings that are too short', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
    expect(isValidObjectId('')).toBe(false);
  });

  it('rejects strings that are too long', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // 25 chars
  });

  it('rejects uppercase hex', () => {
    expect(isValidObjectId('507F1F77BCF86CD799439011')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false);
  });
});

/**
 * **Validates: Requirements 5.6**
 *
 * Property 13: For any string, isValidObjectId returns true iff it matches /^[a-f0-9]{24}$/
 */
describe('isValidObjectId — Property 13', () => {
  it('matches the reference regex for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = isValidObjectId(s);
        const expected = /^[a-f0-9]{24}$/.test(s);
        return result === expected;
      }),
      { numRuns: 1000 }
    );
  });

  it('always returns true for generated valid ObjectIds', () => {
    const hexChar = fc.constantFrom(...'abcdef0123456789'.split(''));
    const validId = fc.array(hexChar, { minLength: 24, maxLength: 24 }).map(a => a.join(''));
    fc.assert(
      fc.property(validId, (id) => {
        return isValidObjectId(id) === true;
      }),
      { numRuns: 500 }
    );
  });
});
