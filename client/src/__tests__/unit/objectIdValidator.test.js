/**
 * Property-based and unit tests for `isValidObjectId`.
 *
 * Validates: Requirements 13
 * Property 13: For any string value, the ObjectId validator SHALL return true
 * if and only if the string matches /^[a-f0-9]{24}$/, and SHALL return false
 * for all other strings (including strings of different lengths, uppercase hex,
 * or non-hex characters).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isValidObjectId } from '../../types/index.js';


const HEX_LOWER = '0123456789abcdef';
const VALID_REGEX = /^[a-f0-9]{24}$/;

/** Arbitrary that produces valid 24-char lowercase hex strings. */
const validObjectId = fc.stringOf(
  fc.constantFrom(...HEX_LOWER.split('')),
  { minLength: 24, maxLength: 24 }
);

// Example-based unit tests

describe('isValidObjectId – example-based', () => {
  it('returns true for a known valid ObjectId', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('returns true for all-zeros ObjectId', () => {
    expect(isValidObjectId('000000000000000000000000')).toBe(true);
  });

  it('returns true for all-f ObjectId', () => {
    expect(isValidObjectId('ffffffffffffffffffffffff')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('returns false for 23-char lowercase hex (too short)', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);
  });

  it('returns false for 25-char lowercase hex (too long)', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false);
  });

  it('returns false for uppercase hex ObjectId', () => {
    expect(isValidObjectId('507F1F77BCF86CD799439011')).toBe(false);
  });

  it('returns false for mixed-case hex ObjectId', () => {
    expect(isValidObjectId('507f1F77bcf86cd799439011')).toBe(false);
  });

  it('returns false for string with non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false);
  });

  it('returns false for string with spaces', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901 ')).toBe(false);
  });
});

// Property-based tests  (Validates: Requirements 13)

describe('isValidObjectId – property-based', () => {
  it('Property 13a: returns true for every valid 24-char lowercase hex string', () => {
    fc.assert(
      fc.property(validObjectId, (id) => {
        expect(isValidObjectId(id)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13b: returns false for strings shorter than 24 chars', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...HEX_LOWER.split('')), { minLength: 0, maxLength: 23 }),
        (id) => {
          expect(isValidObjectId(id)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13c: returns false for strings longer than 24 chars', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...HEX_LOWER.split('')), { minLength: 25, maxLength: 48 }),
        (id) => {
          expect(isValidObjectId(id)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13d: returns false for 24-char strings containing uppercase hex', () => {
    // Build a 24-char string that has at least one uppercase hex character.
    const upperHex = '0123456789ABCDEF';
    const mixedArb = fc
      .tuple(
        fc.integer({ min: 0, max: 23 }),          // position of uppercase char
        fc.constantFrom(...upperHex.split('')),    // uppercase hex char
        fc.stringOf(fc.constantFrom(...HEX_LOWER.split('')), { minLength: 23, maxLength: 23 })
      )
      .map(([pos, upper, rest]) => {
        const arr = rest.split('');
        arr.splice(pos, 0, upper);
        return arr.slice(0, 24).join('');
      });

    fc.assert(
      fc.property(mixedArb, (id) => {
        // Only assert false when the string actually contains an uppercase letter
        // (the map could still produce all-lowercase if upper is a digit).
        if (/[A-F]/.test(id)) {
          expect(isValidObjectId(id)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13e: returns false for 24-char strings with non-hex characters', () => {
    // Characters outside [0-9a-f]
    const nonHexChar = fc.char().filter((c) => !/^[a-f0-9]$/.test(c));
    const withNonHex = fc
      .tuple(
        fc.integer({ min: 0, max: 23 }),
        nonHexChar,
        fc.stringOf(fc.constantFrom(...HEX_LOWER.split('')), { minLength: 23, maxLength: 23 })
      )
      .map(([pos, bad, rest]) => {
        const arr = rest.split('');
        arr.splice(pos, 0, bad);
        return arr.slice(0, 24).join('');
      });

    fc.assert(
      fc.property(withNonHex, (id) => {
        expect(isValidObjectId(id)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13f: result matches VALID_REGEX for any arbitrary string', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(isValidObjectId(s)).toBe(VALID_REGEX.test(s));
      }),
      { numRuns: 200 }
    );
  });
});
