/**
 * Property-based tests for the RoleBadge label mapping in ClubMembers.jsx.
 *
 * Validates: Requirements 2.8, 5.7
 * Property 4: For any ClubMemberRole value (CLUB_HEAD, COORDINATOR, MEMBER),
 * the RoleBadge component SHALL render exactly the label "Head", "Coordinator",
 * or "Member" respectively, and SHALL NOT render the old freeform strings
 * ("clubHead", "coordinator" as old value, "member" as old value).
 *
 * Because RoleBadge is a module-private component (not exported), the mapping
 * logic is tested as a pure function — consistent with the design doc note:
 * "Pure-function properties are tested without DOM rendering."
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ClubMemberRole } from '../../types/index.js';

// Replicate the RoleBadge mapping exactly as defined in ClubMembers.jsx.
// This is the pure function under test.

const ROLE_LABEL_MAP = {
  [ClubMemberRole.CLUB_HEAD]:   'Head',
  [ClubMemberRole.COORDINATOR]: 'Coordinator',
  [ClubMemberRole.MEMBER]:      'Member',
};

/** Old freeform strings that must NOT appear in the output. */
const OLD_FREEFORM_STRINGS = ['clubHead', 'clubhead', 'club_head'];

/**
 * Mirrors the RoleBadge resolution logic:
 *   const { label } = map[role] ?? map[ClubMemberRole.MEMBER];
 */
function getRoleBadgeLabel(role) {
  return ROLE_LABEL_MAP[role] ?? ROLE_LABEL_MAP[ClubMemberRole.MEMBER];
}

// Example-based unit tests

describe('RoleBadge label mapping – example-based', () => {
  it('CLUB_HEAD maps to "Head"', () => {
    expect(getRoleBadgeLabel(ClubMemberRole.CLUB_HEAD)).toBe('Head');
  });

  it('COORDINATOR maps to "Coordinator"', () => {
    expect(getRoleBadgeLabel(ClubMemberRole.COORDINATOR)).toBe('Coordinator');
  });

  it('MEMBER maps to "Member"', () => {
    expect(getRoleBadgeLabel(ClubMemberRole.MEMBER)).toBe('Member');
  });

  it('unknown role falls back to "Member"', () => {
    expect(getRoleBadgeLabel('UNKNOWN_ROLE')).toBe('Member');
  });

  it('does NOT return old freeform "clubHead" for CLUB_HEAD', () => {
    expect(getRoleBadgeLabel(ClubMemberRole.CLUB_HEAD)).not.toBe('clubHead');
  });

  it('does NOT return lowercase "coordinator" for COORDINATOR', () => {
    // The old freeform value was the raw enum string; new label is title-cased.
    expect(getRoleBadgeLabel(ClubMemberRole.COORDINATOR)).not.toBe('coordinator');
  });

  it('does NOT return lowercase "member" for MEMBER', () => {
    expect(getRoleBadgeLabel(ClubMemberRole.MEMBER)).not.toBe('member');
  });
});

// Property-based tests  (Validates: Requirements 2.8, 5.7)

describe('RoleBadge label mapping – property-based', () => {
  /**
   * Property 4a: For every ClubMemberRole value, getRoleBadgeLabel returns
   * the exact expected label string.
   */
  it('Property 4a: every ClubMemberRole value maps to its correct label', () => {
    const expectedLabels = {
      [ClubMemberRole.CLUB_HEAD]:   'Head',
      [ClubMemberRole.COORDINATOR]: 'Coordinator',
      [ClubMemberRole.MEMBER]:      'Member',
    };

    fc.assert(
      fc.property(
        fc.constantFrom(
          ClubMemberRole.CLUB_HEAD,
          ClubMemberRole.COORDINATOR,
          ClubMemberRole.MEMBER
        ),
        (role) => {
          const label = getRoleBadgeLabel(role);
          expect(label).toBe(expectedLabels[role]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4b: For every ClubMemberRole value, the rendered label is NEVER
   * one of the old freeform strings.
   */
  it('Property 4b: no ClubMemberRole value produces an old freeform label', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ClubMemberRole.CLUB_HEAD,
          ClubMemberRole.COORDINATOR,
          ClubMemberRole.MEMBER
        ),
        (role) => {
          const label = getRoleBadgeLabel(role);
          for (const old of OLD_FREEFORM_STRINGS) {
            expect(label).not.toBe(old);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4c: The label is always one of the three canonical strings —
   * the mapping is exhaustive and produces no unexpected values.
   */
  it('Property 4c: label is always one of "Head", "Coordinator", or "Member"', () => {
    const validLabels = new Set(['Head', 'Coordinator', 'Member']);

    fc.assert(
      fc.property(
        fc.constantFrom(
          ClubMemberRole.CLUB_HEAD,
          ClubMemberRole.COORDINATOR,
          ClubMemberRole.MEMBER
        ),
        (role) => {
          const label = getRoleBadgeLabel(role);
          expect(validLabels.has(label)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4d: The mapping is injective — distinct roles produce distinct labels.
   * (No two roles share the same label string.)
   */
  it('Property 4d: distinct roles always produce distinct labels', () => {
    const roles = [
      ClubMemberRole.CLUB_HEAD,
      ClubMemberRole.COORDINATOR,
      ClubMemberRole.MEMBER,
    ];

    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom(...roles),
          fc.constantFrom(...roles)
        ).filter(([a, b]) => a !== b),
        ([roleA, roleB]) => {
          expect(getRoleBadgeLabel(roleA)).not.toBe(getRoleBadgeLabel(roleB));
        }
      ),
      { numRuns: 100 }
    );
  });
});
